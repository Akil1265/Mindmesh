import { useEffect, useState } from 'react'
import axios from 'axios'
import pkg from '../package.json'
import FileUpload from './components/FileUpload'
import ProgressBar from './components/ProgressBar'
import SummaryPreview from './components/SummaryPreview'
import { ToastProvider, useToast } from './components/ToastHost'

function AppContent() {
  const toast = useToast()
  const [summary, setSummary] = useState('')
  const [highlights, setHighlights] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [extractedText, setExtractedText] = useState('') // Store original text
  const [providerPref, setProviderPref] = useState(() => localStorage.getItem('mm.provider') || 'gemini')
  const [stylePref, setStylePref] = useState(() => localStorage.getItem('mm.style') || 'short')

  useEffect(() => { localStorage.setItem('mm.provider', providerPref) }, [providerPref])
  useEffect(() => { localStorage.setItem('mm.style', stylePref) }, [stylePref])

  const handleDownload = async (format, customFilename = null) => {
    if (!summary || !format) {
      toast?.push('No summary to download', { type: 'error' })
      return
    }

    setIsDownloading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      
      // Create export request with the summary data
      const response = await axios.post(
        `${apiUrl}/api/summarize`,
        {
          text: extractedText || summary, // Use original text or fallback to summary
          provider: providerPref,
          summaryStyle: stylePref,
          output: format,
          filename: customFilename // Pass custom filename to backend
        },
        {
          responseType: 'blob'
        }
      )

      // Use custom filename or extract from header
      let filename = customFilename ? `${customFilename}.${format}` : `summary.${format}`
      
      const contentDisposition = response.headers['content-disposition']
      if (contentDisposition && !customFilename) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Create download link
      const blob = new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        URL.revokeObjectURL(url)
        a.remove()
      }, 100)

      toast?.push(`Downloaded ${format.toUpperCase()} successfully`, { type: 'success' })
    } catch (error) {
      console.error('Download error:', error)
      toast?.push('Download failed: ' + (error.response?.data?.error || error.message), { type: 'error' })
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => { localStorage.setItem('mm.provider', providerPref) }, [providerPref])
  useEffect(() => { localStorage.setItem('mm.style', stylePref) }, [stylePref])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Mind-Mesh</h1>
            <p className="text-gray-600">AI-Powered Document Summarizer</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4 lg:col-span-1">
              <FileUpload
                setSummary={setSummary}
                setHighlights={setHighlights}
                setMeta={setMeta}
                setLoading={setLoading}
                loading={loading}
                providerPref={providerPref}
                stylePref={stylePref}
                onProviderChange={setProviderPref}
                onStyleChange={setStylePref}
                setProgressLabel={setProgressLabel}
                setExtractedText={setExtractedText}
              />
              <ProgressBar visible={loading} label={progressLabel || 'Processing...'} />
            </div>
            <div className="lg:col-span-2">
              <SummaryPreview 
                summary={summary} 
                highlights={highlights} 
                meta={meta} 
                loading={loading} 
                onDownload={handleDownload}
                isDownloading={isDownloading}
                extractedText={extractedText}
              />
            </div>
          </div>
          <footer className="mt-12 text-center text-xs text-gray-400 space-y-1">
            <div>Mind-Mesh v{pkg.version}</div>
            <div>Env: {import.meta.env.MODE} | API: {import.meta.env.VITE_API_URL || 'http://localhost:4000'}</div>
          </footer>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
