import React, { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import SummaryPreview from './components/SummaryPreview'
import FormatSelector from './components/FormatSelector'
import ProgressBar from './components/ProgressBar'
import { ToastProvider } from './components/ToastHost'
import pkg from '../package.json'

function App() {
  const [summary, setSummary] = useState('')
  const [highlights, setHighlights] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [formatStatus, setFormatStatus] = useState({})
  const [formats, setFormats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mm.formats') || '[]') } catch { return [] }
  })
  const [providerPref, setProviderPref] = useState(() => localStorage.getItem('mm.provider') || 'gemini')
  const [stylePref, setStylePref] = useState(() => localStorage.getItem('mm.style') || 'short')

  useEffect(() => { localStorage.setItem('mm.formats', JSON.stringify(formats)) }, [formats])
  useEffect(() => { localStorage.setItem('mm.provider', providerPref) }, [providerPref])
  useEffect(() => { localStorage.setItem('mm.style', stylePref) }, [stylePref])

  return (
    <ToastProvider>
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
                selectedFormats={formats}
                providerPref={providerPref}
                stylePref={stylePref}
                onProviderChange={setProviderPref}
                onStyleChange={setStylePref}
                setFormatStatus={setFormatStatus}
                setProgressLabel={setProgressLabel}
              />
              <FormatSelector selected={formats} onChange={setFormats} disabled={loading} futureStatus={formatStatus} />
              <ProgressBar visible={loading} label={progressLabel || (formats.length > 0 ? 'Generating & preparing download...' : 'Summarizing...')} />
            </div>
            <div className="lg:col-span-2">
              <SummaryPreview summary={summary} highlights={highlights} meta={meta} loading={loading} />
            </div>
          </div>
          <footer className="mt-12 text-center text-xs text-gray-400 space-y-1">
            <div>Mind-Mesh v{pkg.version}</div>
            <div>Env: {import.meta.env.MODE} | API: {import.meta.env.VITE_API_URL || 'http://localhost:4000'}</div>
          </footer>
        </div>
      </div>
    </div>
    </ToastProvider>
  )
}

export default App
