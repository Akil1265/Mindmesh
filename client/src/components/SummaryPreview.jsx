import React from 'react'

function SummaryPreview({ summary, highlights, meta, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Processing...</h2>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Working</span>
          </div>
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-11/12" />
          <div className="h-4 bg-gray-200 rounded w-3/5" />
          <div className="pt-4 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-3 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-200 rounded w-40" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Summary Preview</h2>
          {meta && meta.file && (
            <p className="text-sm text-gray-600">
              📄 {meta.file.originalName} ({(meta.file.size / 1024 / 1024).toFixed(1)}MB)
            </p>
          )}
        </div>
        {meta && (
          <div className="text-right">
            <div className="flex items-center space-x-3 text-xs text-gray-500 mb-1">
              {meta.provider && (
                <span className="inline-flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${
                    meta.provider === 'gemini' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></span>
                  <span className="font-medium">{meta.provider === 'gemini' ? 'Gemini AI' : 'Local'}</span>
                </span>
              )}
              {meta.chunks > 1 && (
                <span>📃 {meta.chunks} chunks</span>
              )}
            </div>
            {meta.processingTime && (
              <div className="text-xs text-gray-400">
                ⚡ {meta.processingTime}ms
              </div>
            )}
          </div>
        )}
      </div>
      {summary ? (
        <div className="space-y-5">
          <div className="relative">
            <div className="absolute top-2 right-2 text-xs text-gray-400">
              {summary.split(' ').length} words • {summary.length} chars
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600">🧠</span>
                <span className="text-sm font-medium text-blue-800">AI Summary</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{summary}</p>
            </div>
          </div>
          {highlights && highlights.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-amber-600">🔍</span>
                <h3 className="text-sm font-semibold text-amber-800">Key Highlights</h3>
                <span className="text-xs text-amber-600 bg-amber-200 px-2 py-1 rounded-full">
                  {highlights.length} found
                </span>
              </div>
              <ul className="space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-amber-500 mt-1.5 text-xs">•</span>
                    <span className="text-sm text-gray-700 leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => navigator.clipboard.writeText(summary)}
              className="inline-flex items-center space-x-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <span>📋</span>
              <span>Copy Summary</span>
            </button>
            <button
              onClick={() => {
                const fullContent = `Summary:\n${summary}${highlights.length ? `\n\nKey Highlights:\n${highlights.map((h, i) => `${i+1}. ${h}`).join('\n')}` : ''}`
                navigator.clipboard.writeText(fullContent)
              }}
              className="inline-flex items-center space-x-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <span>📋</span>
              <span>Copy All</span>
            </button>
            <button
              onClick={() => {
                const fullContent = `Summary:\n${summary}${highlights.length ? `\n\nKey Highlights:\n${highlights.map((h, i) => `${i+1}. ${h}`).join('\n')}` : ''}`
                const element = document.createElement('a')
                const file = new Blob([fullContent], { type: 'text/plain' })
                element.href = URL.createObjectURL(file)
                element.download = 'mind-mesh-summary.txt'
                document.body.appendChild(element)
                element.click()
                document.body.removeChild(element)
              }}
              className="inline-flex items-center space-x-1 px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <span>📄</span>
              <span>Download .txt</span>
            </button>
            {meta && meta.provider === 'gemini' && (
              <div className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg">
                <span>✨</span>
                <span>AI Generated</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-gray-300 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Your summary will appear here...</h3>
          <p className="text-gray-500 text-sm mb-4">Choose your input method and generate a summary</p>
          <div className="flex justify-center space-x-6 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <span>🌐</span>
              <span>Web URLs</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>📄</span>
              <span>Documents</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>📝</span>
              <span>Raw Text</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SummaryPreview
