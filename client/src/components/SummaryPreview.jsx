function SummaryPreview({ summary, highlights, meta, loading, onDownload, isDownloading, extractedText }) {
  // Debug log
  console.log('SummaryPreview - extractedText:', extractedText ? `${extractedText.length} chars` : 'empty')
  
  const formats = [
    { key: 'pdf', label: 'PDF', icon: '📕', color: 'red' },
    { key: 'docx', label: 'Word', icon: '📘', color: 'blue' },
    { key: 'pptx', label: 'PowerPoint', icon: '📙', color: 'orange' },
    { key: 'txt', label: 'Text', icon: '📄', color: 'gray' },
    { key: 'png', label: 'Image', icon: '🖼️', color: 'green' }
  ]

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">Processing...</h2>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <div className="text-center py-16">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Your summary will appear here...</h3>
          <p className="text-gray-500 text-sm">Upload a file, enter text, or provide a URL to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Summary Section */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">📝 AI Summary</h2>
          <div className="flex items-center gap-2">
            {meta && meta.processingTime && (
              <span className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium border border-green-200">
                ⚡ {meta.processingTime}ms
              </span>
            )}
            {meta && meta.chunks > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {meta.chunks} chunks
              </span>
            )}
          </div>
        </div>
        
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100 mb-4">
          <div className="prose max-w-none">
            {summary.split('\n\n').map((paragraph, idx) => {
              // Check if it's a bullet point
              if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-') || paragraph.trim().startsWith('*')) {
                const items = paragraph.split('\n').filter(item => item.trim());
                return (
                  <ul key={idx} className="list-disc list-inside space-y-2 my-3">
                    {items.map((item, i) => (
                      <li key={i} className="text-gray-700 leading-relaxed">
                        {item.replace(/^[•\-*]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                )
              }
              // Check if it's a numbered list
              if (/^\d+[\.)]\s/.test(paragraph.trim())) {
                const items = paragraph.split('\n').filter(item => item.trim());
                return (
                  <ol key={idx} className="list-decimal list-inside space-y-2 my-3">
                    {items.map((item, i) => (
                      <li key={i} className="text-gray-700 leading-relaxed">
                        {item.replace(/^\d+[\.)]\s*/, '')}
                      </li>
                    ))}
                  </ol>
                )
              }
              // Regular paragraph
              return paragraph.trim() ? (
                <p key={idx} className="text-gray-700 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ) : null
            })}
          </div>
        </div>

        <button
          onClick={() => navigator.clipboard.writeText(summary)}
          className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          📋 Copy Summary
        </button>
      </div>

      {/* Key Highlights Section */}
      {highlights && highlights.length > 0 && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 Key Highlights</h3>
          <ul className="space-y-2">
            {highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-blue-600 mr-2 mt-1">•</span>
                <span className="text-gray-700 leading-relaxed">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted Text Section */}
      {typeof extractedText === 'string' && extractedText.trim().length > 0 && (
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">📄 Extracted Text</h3>
            <span className="text-xs text-gray-500">
              {extractedText.length.toLocaleString()} characters
            </span>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              {extractedText.split('\n\n').map((section, idx) => {
                // Check if it's a heading
                if (section.trim().match(/^[A-Z\s]{3,}:?$/) || section.trim().startsWith('===') || section.trim().startsWith('###')) {
                  return (
                    <h4 key={idx} className="font-bold text-gray-900 text-sm mt-4 mb-2 pb-1 border-b border-gray-300">
                      {section.replace(/^[=#\s]+/, '').replace(/[=#\s]+$/, '')}
                    </h4>
                  )
                }
                // Check if it's a bullet list
                if (section.trim().startsWith('•') || section.trim().startsWith('-') || section.trim().startsWith('*')) {
                  const items = section.split('\n').filter(item => item.trim());
                  return (
                    <ul key={idx} className="list-disc list-inside space-y-1 my-2 pl-2">
                      {items.map((item, i) => (
                        <li key={i} className="text-gray-600 text-sm leading-relaxed">
                          {item.replace(/^[•\-*]\s*/, '')}
                        </li>
                      ))}
                    </ul>
                  )
                }
                // Check if it's a numbered list
                if (/^\d+[\.)]\s/.test(section.trim())) {
                  const items = section.split('\n').filter(item => item.trim());
                  return (
                    <ol key={idx} className="list-decimal list-inside space-y-1 my-2 pl-2">
                      {items.map((item, i) => (
                        <li key={i} className="text-gray-600 text-sm leading-relaxed">
                          {item.replace(/^\d+[\.)]\s*/, '')}
                        </li>
                      ))}
                    </ol>
                  )
                }
                // Check if it's a table row
                if (section.includes('|')) {
                  return (
                    <div key={idx} className="my-2 p-2 bg-white rounded border border-gray-300 overflow-x-auto">
                      <pre className="text-xs text-gray-600 whitespace-pre font-mono">{section}</pre>
                    </div>
                  )
                }
                // Regular paragraph
                return section.trim() ? (
                  <p key={idx} className="text-gray-600 text-sm leading-relaxed mb-2">
                    {section}
                  </p>
                ) : null
              })}
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(extractedText)}
            className="mt-3 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            📋 Copy Extracted Text
          </button>
        </div>
      )}

      {/* Export Section - refreshed card design */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">💾 Export Summary</h3>
          {isDownloading && (
            <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">Preparing download…</span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4">Pick a format. We’ll generate a clean, share-ready file.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {formats.map((format) => {
            const accent =
              format.color === 'red'
                ? 'from-rose-50 to-red-50 border-red-200 hover:border-red-300'
                : format.color === 'blue'
                ? 'from-sky-50 to-blue-50 border-blue-200 hover:border-blue-300'
                : format.color === 'orange'
                ? 'from-amber-50 to-orange-50 border-orange-200 hover:border-orange-300'
                : format.color === 'green'
                ? 'from-emerald-50 to-green-50 border-green-200 hover:border-green-300'
                : 'from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'
            const circle =
              format.color === 'red'
                ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                : format.color === 'blue'
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                : format.color === 'orange'
                ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                : format.color === 'green'
                ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
                : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
            const note =
              format.key === 'pdf'
                ? 'Best for printing'
                : format.key === 'docx'
                ? 'Edit in Word'
                : format.key === 'pptx'
                ? 'Present slides'
                : format.key === 'png'
                ? 'Share as image'
                : 'Plain text'

            const onKey = (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onDownload(format.key)
              }
            }

            return (
              <div
                key={format.key}
                role="button"
                tabIndex={0}
                onKeyDown={onKey}
                onClick={() => onDownload(format.key)}
                aria-label={`Download ${format.label}`}
                className={`group relative overflow-hidden rounded-xl border ${accent} bg-gradient-to-br p-4 shadow-sm transition-all duration-200
                  hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-200
                  ${isDownloading ? 'pointer-events-none opacity-60' : ''}`}
                title={`Download as ${format.label}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 flex items-center justify-center rounded-full ${circle}`}>
                    <span className="text-xl leading-none">{format.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{format.label}</div>
                    <div className="text-xs text-gray-500">{note}</div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-md" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SummaryPreview