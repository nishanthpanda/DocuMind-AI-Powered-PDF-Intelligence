import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Upload, FileText, Send, User, Bot, AlertCircle, Loader2, Key, Settings } from 'lucide-react'

function App() {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadStatus(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const headers = { 
      'Content-Type': 'multipart/form-data',
      'x-api-provider': provider
    }
    if (apiKey.trim()) {
      headers['x-api-key'] = apiKey.trim()
    }

    try {
      const res = await axios.post('http://localhost:8000/upload', formData, { headers })
      setUploadStatus({ type: 'success', message: res.data.message })
      setMessages([])
    } catch (err) {
      console.error(err)
      setUploadStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || 'An error occurred during upload.' 
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading || uploadStatus?.type !== 'success') return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const headers = {
      'x-api-provider': provider
    }
    if (apiKey.trim()) {
      headers['x-api-key'] = apiKey.trim()
    }

    try {
      const res = await axios.post('http://localhost:8000/chat', { question: userMessage.content }, { headers })
      const aiMessage = { 
        role: 'assistant', 
        content: res.data.answer,
        sources: res.data.sources
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error: ' + (err.response?.data?.detail || err.message),
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* Sidebar for Upload */}
      <div className="w-80 bg-white border-r flex flex-col p-6 shadow-sm overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">PDF Q&A System</h1>
        </div>

        <div className="flex flex-col gap-6">
          {/* API Provider Toggle */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Settings className="w-4 h-4" /> AI Provider
            </div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="openai">OpenAI (GPT-4o-mini)</option>
              <option value="gemini">Google Gemini (3.5-Flash)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Key className="w-4 h-4" /> {provider === 'openai' ? 'OpenAI' : 'Gemini'} API Key
            </div>
            <input 
              type="password" 
              placeholder={`Key (optional if in .env)`} 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <hr className="border-gray-100" />

          {/* Document Upload */}
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-600">Document Upload</div>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Upload className={`w-8 h-8 mb-2 ${file ? 'text-blue-500' : 'text-gray-400'}`} />
              <div className="text-sm font-medium text-gray-700">
                {file ? file.name : 'Click to select PDF'}
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>

            {uploadStatus && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 mt-2 ${
                uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{uploadStatus.message}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-auto pt-6">
          <div className="text-xs text-gray-400 text-center">
            Powered by LangChain, {provider === 'openai' ? 'OpenAI' : 'Gemini'} & FAISS
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <Bot className="w-16 h-16 text-blue-100 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome!</h2>
              <p className="text-gray-500">
                Upload a PDF document using the sidebar, then ask questions about its contents. 
                I will answer strictly based on the document provided.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-4xl mx-auto w-full ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                
                <div className={`flex flex-col gap-2 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className={`px-5 py-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : msg.isError 
                        ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  
                  {/* Sources Dropdown (only for assistant) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <details className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 w-full max-w-2xl">
                      <summary className="text-gray-500 cursor-pointer font-medium hover:text-gray-700 transition-colors">
                        View Retrieved Sources
                      </summary>
                      <div className="mt-3 flex flex-col gap-3">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="text-xs border-l-2 border-blue-400 pl-3">
                            <span className="font-semibold text-gray-700 block mb-1">Page {src.page}</span>
                            <span className="text-gray-600 font-mono">{src.content}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4 max-w-4xl mx-auto w-full">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-white">
          <form 
            onSubmit={handleSend} 
            className="max-w-4xl mx-auto flex items-end gap-3 bg-gray-50 p-2 rounded-2xl border focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all"
          >
            <textarea
              className="flex-1 max-h-32 bg-transparent border-0 focus:ring-0 resize-none px-3 py-2 text-gray-800 outline-none"
              placeholder={uploadStatus?.type === 'success' ? "Ask a question about your document..." : "Please upload a document first"}
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              disabled={uploadStatus?.type !== 'success' || loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || uploadStatus?.type !== 'success' || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center text-xs text-gray-400 mt-3">
            AI can make mistakes. Verify information using the provided sources.
          </div>
        </div>

      </div>

    </div>
  )
}

export default App
