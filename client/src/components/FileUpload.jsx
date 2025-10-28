import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from './ToastHost'

// Utility to download blobs with a filename
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 1000)
}

const STYLES = [
  { key: 'standard', label: 'Standard', desc: 'Professional balanced tone', icon: '📄' },
  { key: 'executive', label: 'Executive', desc: 'C-suite strategic brief', icon: '💼' },
  { key: 'academic', label: 'Academic', desc: 'Formal scholarly tone', icon: '🎓' },
  { key: 'casual', label: 'Casual', desc: 'Friendly conversational', icon: '💬' },
  { key: 'technical', label: 'Technical', desc: 'Precise terminology', icon: '⚙️' },
  { key: 'storytelling', label: 'Story', desc: 'Narrative flow style', icon: '📖' }
]

const LENGTHS = [
  { key: 'short', label: 'Short', desc: '1-2 sentences', icon: '⚡' },
  { key: 'medium', label: 'Medium', desc: 'One paragraph', icon: '📝' },
  { key: 'long', label: 'Long', desc: 'Multiple paragraphs', icon: '📚' },
  { key: 'bullets', label: 'Bullets', desc: 'Quick points', icon: '📌' }
]

function FileUpload({
  setSummary,
  setHighlights,
  setMeta,
  setLoading,
  loading,
  providerPref,
  stylePref,
  onProviderChange,
  onStyleChange,
  setProgressLabel,
  setExtractedText
}) {
  // State declarations
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [provider, setProvider] = useState(providerPref || 'gemini')
  const [styleType, setStyleType] = useState('standard') // Style: standard, executive, academic, etc.
  const [length, setLength] = useState('medium') // Length: short, medium, long, bullets
  const [style, setStyle] = useState(stylePref || 'medium') // Combined for backward compatibility
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('url')
  const toast = useToast()
  const dropRef = useRef(null)
  const abortRef = useRef(null)
  const streamingRef = useRef(false)
  const startTimeRef = useRef(null)
  
  // URL Validation function
  const validateUrl = (urlString) => {
    if (!urlString || urlString.trim().length === 0) {
      setUrlError('')
      return false
    }
    
    try {
      const urlObj = new URL(urlString)
      // Only accept http and https protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        setUrlError('URL must start with http:// or https://')
        return false
      }
      // Check if it has a valid domain
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        setUrlError('Invalid domain name')
        return false
      }
      setUrlError('')
      return true
    } catch (e) {
      setUrlError('Please enter a valid website URL (e.g., https://example.com)')
      return false
    }
  }
  
  // Handle URL input change with validation
  const handleUrlChange = (e) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    if (newUrl.trim().length > 0) {
      validateUrl(newUrl)
    } else {
      setUrlError('')
    }
  }

  useEffect(() => { onProviderChange && onProviderChange(provider) }, [provider])
  useEffect(() => { 
    // Combine styleType and length into a single style string
    const combinedStyle = styleType === 'standard' ? length : `${styleType}-${length}`
    setStyle(combinedStyle)
    onStyleChange && onStyleChange(combinedStyle) 
  }, [styleType, length])

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  // Derived variables
  const hasUrl = url.trim().length > 0
  const hasFile = !!file
  const hasText = rawText.trim().length > 0

  const canSubmit = (
    (activeTab === 'url' && hasUrl) ||
    (activeTab === 'file' && hasFile) ||
    (activeTab === 'text' && hasText)
  )

  const getSubmitError = () => {
    if (activeTab === 'url' && !hasUrl) return 'Please enter a URL'
    if (activeTab === 'file' && !hasFile) return 'Please select a file'
    if (activeTab === 'text' && !hasText) return 'Please enter some text'
    return null
  }

  // Handle tab switching with field clearing
  const switchTab = (newTab) => {
    if (newTab !== activeTab) {
      if (newTab === 'url') {
        setFile(null)
        setRawText('')
      } else if (newTab === 'file') {
        setUrl('')
        setRawText('')
      } else if (newTab === 'text') {
        setUrl('')
        setFile(null)
      }
      setActiveTab(newTab)
      setError(null)
    }
  }

  const onDrop = useCallback((evt) => {
    evt.preventDefault()
    evt.stopPropagation()
    if (evt.dataTransfer.files && evt.dataTransfer.files[0]) {
      setFile(evt.dataTransfer.files[0])
      setActiveTab('file')
      setUrl('')
      setRawText('')
    }
  }, [])

  const onDragOver = (evt) => {
    evt.preventDefault()
    evt.stopPropagation()
  }

  const handlePaste = (evt) => {
    if (evt.clipboardData && evt.clipboardData.files.length) {
      setFile(evt.clipboardData.files[0])
      setActiveTab('file')
      setUrl('')
      setRawText('')
    }
  }

  const resetStatuses = () => {
    // No longer needed - format status removed
  }

  const cancelActive = () => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      streamingRef.current = false
      setProgressLabel && setProgressLabel('Cancelled')
      setLoading(false)
      setSummary('')
      setHighlights([])
      setMeta(null)
      toast?.push('Operation cancelled', { type: 'info', ttl: 2500 })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate URL if using URL tab
    if (activeTab === 'url' && url) {
      if (!validateUrl(url)) {
        toast?.push(urlError || 'Please enter a valid website URL', { type: 'error' })
        return
      }
    }

    if (!canSubmit) {
      setError(getSubmitError())
      return
    }

    // Check for conflicts
    const inputCount = (hasUrl ? 1 : 0) + (hasFile ? 1 : 0) + (hasText ? 1 : 0)
    if (inputCount > 1) {
      setError('Multiple inputs detected. Please clear unused fields to avoid conflicts.')
      return
    }

    setError(null)
    setLoading(true)
    setSummary('')
    setHighlights([])
    setMeta(null)
    setProgressLabel && setProgressLabel('Summarizing…')
    
    // Start timer
    startTimeRef.current = Date.now()

    // File upload endpoint
    if (activeTab === 'file' && file) {
      try {
        // Create abort controller for file uploads too
        const controller = new AbortController()
        abortRef.current = controller
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('summaryStyle', style)
        formData.append('language', 'en')

        const response = await axios.post(`${apiUrl}/api/upload-and-summarize`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: controller.signal
        })

        if (response.data.success) {
          const { summary: summaryData, file: fileInfo, extraction, extracted, totalProcessingTime } = response.data
          setSummary(summaryData.summary)
          setHighlights(summaryData.highlights || [])
          setMeta({
            provider: summaryData.provider,
            chunks: summaryData.chunks,
            file: fileInfo,
            extraction,
            processingTime: totalProcessingTime
          })
          // Set extracted text for file uploads (prefer 'extracted' string; fall back safely)
          if (setExtractedText) {
            if (typeof extracted === 'string' && extracted.trim().length > 0) {
              setExtractedText(extracted)
            } else if (extraction && typeof extraction.text === 'string') {
              setExtractedText(extraction.text)
            } else {
              // Clear to avoid rendering errors
              setExtractedText('')
            }
          }
          toast?.push(`File processed successfully in ${totalProcessingTime}ms`, { type: 'success', ttl: 3000 })
        } else {
          throw new Error('Upload failed')
        }
        abortRef.current = null
        setLoading(false)
        return
      } catch (err) {
        // Handle abort/cancellation
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          // Already handled by cancelActive
          return
        }
        
        console.error('Upload error:', err)
        const errorMessage = err.response?.data?.error || err.message || 'Upload failed'
        setError(errorMessage)
        abortRef.current = null
        setLoading(false)
        // Provide more specific error feedback
        if (err.response?.status === 413) {
          toast?.push('File too large. Maximum size is 50MB.', { type: 'error' })
        } else if (err.response?.status === 415) {
          toast?.push('Unsupported file type. Please use PDF, DOCX, TXT, or image files.', { type: 'error' })
        } else {
          toast?.push('Upload failed: ' + errorMessage, { type: 'error' })
        }
        return
      }
    }

    // URL and text streaming endpoint
    console.log('Starting URL/text processing. URL:', url, 'Text:', rawText.slice(0, 50))
    try {
      resetStatuses()

      // Prepare JSON payload for backend
      let requestBody = {}
      if (activeTab === 'url' && url) {
        requestBody.url = url
      } else if (activeTab === 'text' && rawText) {
        requestBody.text = rawText
        // Store the raw text for download
        if (setExtractedText) {
          setExtractedText(rawText)
        }
      }
      requestBody.provider = provider === 'auto' ? null : provider // Let backend auto-select if auto
      requestBody.summaryStyle = style

      console.log('Request body prepared for tab:', activeTab, requestBody)

      const controller = new AbortController()
      abortRef.current = controller
      streamingRef.current = true
      console.log('Making request to stream endpoint...')
      const resp = await fetch(`${apiUrl}/api/summarize/stream`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'x-stream-progress': 'true'
        },
        signal: controller.signal
      })

      console.log('Response received:', resp.ok, resp.status, resp.statusText)
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Unknown error')
        throw new Error(`Server returned ${resp.status}: ${errorText}`)
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const rawEvent = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 2)
          if (!rawEvent) continue

          const lines = rawEvent.split(/\n/)
          let eventName = null
          let dataLine = ''
          for (const ln of lines) {
            if (ln.startsWith('event:')) eventName = ln.replace('event:', '').trim()
            else if (ln.startsWith('data:')) dataLine += ln.replace('data:', '').trim()
          }
          if (!eventName) continue

          try {
            const payload = dataLine ? JSON.parse(dataLine) : {}
            handleStreamEvent(eventName, payload)
          } catch (e2) {
            console.warn('Failed to parse event payload', e2)
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Already handled
      } else {
        console.error('Streaming error:', err)
        const errorMsg = err.message || 'Streaming failed'
        setError(errorMsg)
        toast?.push(`Streaming failed: ${errorMsg}`, { type: 'error', ttl: 5000 })
      }
    } finally {
      streamingRef.current = false
      abortRef.current = null
      setLoading(false)
    }
  }

  const handleStreamEvent = (event, payload) => {
    console.log('Stream event received:', event, payload)
    switch (event) {
      case 'stage':
        if (payload.stage === 'extracting') setProgressLabel && setProgressLabel('Extracting text…')
        else if (payload.stage === 'fetching-url') setProgressLabel && setProgressLabel('Fetching URL…')
        else if (payload.stage === 'summarizing') setProgressLabel && setProgressLabel('Generating summary…')
        else if (payload.stage === 'start') setProgressLabel && setProgressLabel('Starting…')
        break
      case 'summary':
        console.log('Setting summary:', payload.summary ? payload.summary.slice(0, 100) + '...' : 'empty')
        console.log('Extracted text length:', payload.extracted ? payload.extracted.length : 0)
        console.log('Active tab:', activeTab)
        
        // Calculate processing time
        const processingTime = startTimeRef.current ? Date.now() - startTimeRef.current : null
        
        setSummary(payload.summary || '')
        setHighlights(payload.highlights || [])
        setMeta({ 
          provider: payload.provider, 
          chunks: payload.chunks,
          processingTime: processingTime
        })
        
        // Store extracted text ONLY for text input and file uploads, NOT for URL
        if (setExtractedText && payload.extracted && activeTab !== 'url') {
          console.log('Setting extracted text for', activeTab)
          setExtractedText(payload.extracted)
        } else {
          console.log('NOT setting extracted text. Tab:', activeTab)
          // Clear extracted text for URL inputs
          if (activeTab === 'url' && setExtractedText) {
            setExtractedText('')
          }
        }
        setProgressLabel && setProgressLabel('Summary ready')
        toast?.push('Summary generated', { type: 'success', ttl: 2500 })
        break
      case 'export-start':
        // Format export tracking removed
        break
      case 'export-done':
        // Format export tracking removed
        break
      case 'export-error':
        // Format export tracking removed
        toast?.push('Export error: ' + (payload.error || ''), { type: 'error', ttl: 4000 })
        break
      case 'download':
        if (payload.base64 && payload.filename && payload.mime) {
          try {
            const binary = atob(payload.base64)
            const len = binary.length
            const arr = new Uint8Array(len)
            for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i)
            const blob = new Blob([arr], { type: payload.mime })
            triggerDownload(blob, payload.filename)
            toast?.push('Download ready', { type: 'success', ttl: 3200 })
          } catch (e) {
            console.error('Download decode failed', e)
            toast?.push('Failed to prepare download', { type: 'error', ttl: 3500 })
          }
        }
        break
      case 'error':
        setError(payload.error || 'Error')
        toast?.push('Error: ' + (payload.error || 'Error'), { type: 'error', ttl: 4000 })
        break
      case 'done':
        if (!payload.error) {
          setProgressLabel && setProgressLabel('Done')
        } else {
          setProgressLabel && setProgressLabel('Failed')
        }
        break
      default:
        break
    }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm" onPaste={handlePaste}>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload / Input</h2>

      {/* Input Method Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {[
          { key: 'url', label: '🌐 URL', desc: 'Summarize web pages' },
          { key: 'file', label: '📁 File', desc: 'Upload documents' },
          { key: 'text', label: '📝 Text', desc: 'Paste raw content' }
        ].map(tab => {
          const hasContent = (tab.key === 'url' && hasUrl) || (tab.key === 'file' && hasFile) || (tab.key === 'text' && hasText)
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors relative ${activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <span>{tab.label}</span>
                  {hasContent && (
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  )}
                </div>
                <div className="text-xs opacity-70">{tab.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Warning for multiple inputs */}
      {((hasUrl ? 1 : 0) + (hasFile ? 1 : 0) + (hasText ? 1 : 0)) > 1 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800 text-sm">
              <span>⚠️</span>
              <span>Multiple inputs detected. Clear unused fields to avoid routing conflicts.</span>
            </div>
            <div className="flex space-x-2">
              {hasUrl && activeTab !== 'url' && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300"
                >
                  Clear URL
                </button>
              )}
              {hasFile && activeTab !== 'file' && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300"
                >
                  Clear File
                </button>
              )}
              {hasText && activeTab !== 'text' && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300"
                >
                  Clear Text
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* URL Input Section */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🌐</span>
              <label className="text-sm font-semibold text-gray-700">Web Page URL</label>
            </div>
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com/article"
              className={`w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                urlError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              autoFocus
            />
            {urlError && (
              <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <span>⚠️</span>
                <span>{urlError}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 flex items-center space-x-1">
              <span>💡</span>
              <span>Enter a complete website URL to extract and analyze ALL content from that page</span>
            </p>
            {hasUrl && !urlError && (
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <span>✅</span>
                <span>Ready to extract full website content and summarize</span>
              </div>
            )}
          </div>
        )}

        {/* File Upload Section */}
        {activeTab === 'file' && (
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <input
              type="file"
              id="fileInput"
              className="hidden"
              accept=".txt,.pdf,.docx,.pptx,.jpg,.jpeg,.png,.doc,.ppt"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="font-semibold text-gray-700">Selected: {file.name}</p>
                <p className="text-xs text-green-600">Ready to extract and summarize</p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <label htmlFor="fileInput" className="block cursor-pointer space-y-2">
                <div className="text-4xl">📎</div>
                <div className="font-semibold">Drag & Drop / Click to Select</div>
                <div className="text-xs text-blue-500">Or paste a file here</div>
              </label>
            )}
          </div>
        )}

        {/* Text Input Section */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">📝</span>
              <label className="text-sm font-semibold text-gray-700">Plain Text Content</label>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste or type your text content here...

This is useful when you have raw text you want to summarize without uploading a file."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
              autoFocus
            />
            <p className="text-xs text-gray-500 flex items-center space-x-1">
              <span>💡</span>
              <span>Use this when you have text content to summarize directly</span>
            </p>
            {hasText && (
              <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <span>✅</span>
                <span>Ready to summarize {rawText.trim().length} characters</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 Summary Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStyleType(s.key)}
                  className={`flex flex-col items-center p-3 border-2 rounded-lg transition-all ${
                    styleType === s.key 
                      ? 'border-blue-500 bg-blue-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl mb-1">{s.icon}</span>
                  <span className="text-xs font-medium text-gray-800">{s.label}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{s.desc}</span>
                  {styleType === s.key && <span className="text-blue-600 text-xs mt-1">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📏 Summary Length
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LENGTHS.map(l => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLength(l.key)}
                  className={`flex flex-col items-center p-3 border-2 rounded-lg transition-all ${
                    length === l.key 
                      ? 'border-green-500 bg-green-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl mb-1">{l.icon}</span>
                  <span className="text-xs font-medium text-gray-800">{l.label}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{l.desc}</span>
                  {length === l.key && <span className="text-green-600 text-xs mt-1">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <span>📊</span>
              <span className="font-medium">
                Selected: <span className="font-bold">{STYLES.find(s => s.key === styleType)?.label}</span> + <span className="font-bold">{LENGTHS.find(l => l.key === length)?.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Error display */}
        {(error || (!canSubmit && (hasUrl || hasFile || hasText))) && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2" aria-live="polite">
            {error || getSubmitError()}
          </div>
        )}

        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150 font-medium text-sm shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {activeTab === 'url' ? 'Fetching & Summarizing...' :
                    activeTab === 'file' ? 'Extracting & Summarizing...' : 'Summarizing...'}
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>
                    {activeTab === 'url' ? '🌐 Summarize URL' :
                      activeTab === 'file' ? '📁 Summarize File' : '📝 Summarize Text'}
                  </span>
                </span>
              )}
            </button>
            {loading && (
              <button
                type="button"
                onClick={cancelActive}
                className="px-4 py-3 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium"
              >Cancel</button>
            )}
          </div>
          <div className="flex justify-start items-center text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setUrl('')
                setFile(null)
                setRawText('')
                setError(null)
                setStyleType('standard')
                setLength('medium')
                setUrlError('')
              }}
              className="text-red-600 hover:underline disabled:text-gray-400"
            >Clear All Fields</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default FileUpload