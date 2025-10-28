import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import pkg from '../../package.json'
import FileUpload from '../components/FileUpload'
import ProgressBar from '../components/ProgressBar'
import SummaryPreview from '../components/SummaryPreview'
import MindMeshLogo from '../components/MindMeshLogo'
import { useToast } from '../components/ToastHost'

function MainApp() {
  const navigate = useNavigate()
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

  const handleDownload = async (format) => {
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
          output: format
        },
        {
          responseType: 'blob'
        }
      )

      // Extract filename from content-disposition header or generate one
      const contentDisposition = response.headers['content-disposition']
      let filename = `summary.${format}`
      if (contentDisposition) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MindMeshLogo size="sm" showText={true} />
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <span>←</span>
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
              AI Summarizer
            </h1>
            <p className="text-gray-600 text-lg">Transform lengthy documents into concise summaries instantly</p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Input Section */}
            <div className="lg:col-span-1 space-y-4">
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

            {/* Right Column - Output Section */}
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

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-200">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <MindMeshLogo size="sm" showText={false} />
                <span>Mind-Mesh v{pkg.version}</span>
              </div>
              <p className="text-xs text-gray-400">
                Powered by Advanced AI • Built with ❤️
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default MainApp
