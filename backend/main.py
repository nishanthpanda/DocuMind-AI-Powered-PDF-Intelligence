import os
import tempfile
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load environment variables
load_dotenv(dotenv_path="../.env", override=True)

app = FastAPI(title="DocuMind API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store our LangChain components in memory
vectorstore = None
retriever = None

# --- Constants ---
CHUNK_SIZE = 4000
CHUNK_OVERLAP = 500

# Ensure API Key is available

# --- Prompt Template ---
qa_prompt_template = """
You are an expert Q&A assistant. Your task is to answer the user's question STRICTLY based on the provided Context.

Follow these rules:
1. If the answer is not contained in the Context, say exactly: "I cannot answer this based on the document."
2. Do not use outside knowledge or hallucinate information.
3. Where possible, explicitly cite the relevant snippets or pages from the context in your answer.

Context:
{context}

Question: {question}
Answer:
"""
prompt = ChatPromptTemplate.from_template(qa_prompt_template)

def get_llm_and_embeddings(provider: str = "openai", client_api_key: str = None):
    # Reload environment variables on every request in case the .env file was modified
    load_dotenv(dotenv_path="../.env", override=True)
    
    if provider.lower() == "gemini":
        final_api_key = client_api_key if client_api_key else os.getenv("GOOGLE_API_KEY")
        if not final_api_key or "your_api_key" in final_api_key.lower():
            raise ValueError("No valid Gemini API key found. Please provide one in the UI or .env file.")
        
        llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0, google_api_key=final_api_key)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2", google_api_key=final_api_key)
        
    else: # Default to OpenAI
        final_api_key = client_api_key if client_api_key else os.getenv("OPENAI_API_KEY")
        if not final_api_key or "your_api_key" in final_api_key.lower():
            raise ValueError("No valid OpenAI API key found. Please provide one in the UI or .env file.")
            
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, openai_api_key=final_api_key)
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small", openai_api_key=final_api_key)
        
    return llm, embeddings

def format_docs(docs):
    """Format retrieved documents for the prompt context, adding metadata."""
    formatted_texts = []
    for i, doc in enumerate(docs):
        page = doc.metadata.get("page", "Unknown")
        content = doc.page_content.strip()
        formatted_texts.append(f"[Source {i+1} | Page {page}]\n{content}\n")
    return "\n".join(formatted_texts)

class ChatRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), x_api_key: str | None = Header(default=None), x_api_provider: str | None = Header(default="openai")):
    global vectorstore, retriever
    
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        llm, embeddings = get_llm_and_embeddings(provider=x_api_provider, client_api_key=x_api_key)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Save to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_file_path = tmp_file.name

    try:
        # 1. Ingestion
        loader = PyPDFLoader(tmp_file_path)
        docs = loader.load()
        
        # 2. Segmentation
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        splits = text_splitter.split_documents(docs)
        
        # 3. Embedding
        vectorstore = FAISS.from_documents(splits, embeddings)
        retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        
        return {"message": f"PDF processed successfully using {x_api_provider}", "chunks": len(splits), "pages": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(tmp_file_path)

@app.post("/chat")
async def chat(request: ChatRequest, x_api_key: str | None = Header(default=None), x_api_provider: str | None = Header(default="openai")):
    global retriever
    
    if retriever is None:
        raise HTTPException(status_code=400, detail="Please upload a PDF first")

    try:
        llm, _ = get_llm_and_embeddings(provider=x_api_provider, client_api_key=x_api_key)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
        
    question = request.question

    try:
        # Retrieve relevant chunks
        retrieved_docs = retriever.invoke(question)
        context = format_docs(retrieved_docs)
        
        # Setup LCEL Chain
        chain = (
            {"context": lambda x: context, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        
        response = chain.invoke(question)
        
        # Format sources to send back to frontend
        sources = [
            {"page": doc.metadata.get("page", "Unknown"), "content": doc.page_content}
            for doc in retrieved_docs
        ]
        
        return {"answer": response, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
