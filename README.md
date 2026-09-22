# 🧠 DocuMind: AI-Powered PDF Intelligence

This project is a decoupled Retrieval-Augmented Generation (RAG) web application that intelligently answers user queries strictly based on the content of an uploaded PDF document, ensuring highly contextual and accurate responses without hallucinating.

## Tech Stack Used
### Frontend
- **React 19**: Modern UI library for building dynamic interfaces.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS v4**: Utility-first CSS framework for rapid and responsive styling.
- **Axios & Lucide React**: For API calls and beautiful iconography.

### Backend
- **Python & FastAPI**: Asynchronous and fast web framework for handling REST APIs.
- **LangChain**: Framework for orchestrating Large Language Models (LLMs) and RAG pipelines.

### AI & Machine Learning
- **OpenAI API**: GPT-4o-mini and OpenAI text embeddings (text-embedding-3-small).
- **Google Gemini API**: Gemini 3.5 Flash and Google Generative AI embeddings (gemini-embedding-2).
- **FAISS**: Facebook AI Similarity Search for fast, local vector database storage and retrieval.

## Project Overview

- Built a complete **Retrieval-Augmented Generation (RAG)** pipeline to answer questions strictly bound to the uploaded **PDF document context**.
- Implemented robust **Document Ingestion** using LangChain's **PyPDFLoader** to extract structured text from varied PDF formats.
- Utilized the **RecursiveCharacterTextSplitter** for effective **Document Segmentation**, chunking large texts into manageable, overlapping pieces to preserve semantic meaning.
- Leveraged both **OpenAI** and **Google Gemini** embedding models to **Vectorize** textual chunks, storing them in a local, highly efficient **FAISS Vector Database**.
- Engineered **Context-Grounded Generation** prompts that instruct modern LLMs (**GPT-4o-mini** & **Gemini 3.5 Flash**) to synthesize answers solely from the retrieved context, effectively minimizing **AI Hallucinations**.
- Implemented **Source Tracking and Citations**, mapping the extracted answers directly to the original **Metadata (Page Numbers & Snippets)** to increase transparency and user trust.
- Designed a **Decoupled Architecture** featuring a highly responsive **React / Vite** frontend communicating asynchronously with the **FastAPI** backend via CORS-enabled REST endpoints.

## Setup Instructions

### 1. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
pip install -r ../requirements.txt
```
Create a `.env` file in the root directory (based on `.env.example` if available) and add your API keys:
```env
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```
Run the FastAPI application:
```bash
uvicorn main:app --reload
```
*The API will start at `http://localhost:8000`*

### 2. Frontend Setup
Navigate to the frontend directory and start the dev server:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will run at `http://localhost:5173`*
