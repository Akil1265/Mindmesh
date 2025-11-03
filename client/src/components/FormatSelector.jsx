import React from 'react'

export const EXPORT_FORMATS = [
  { key: 'pdf', label: 'PDF' },
  { key: 'docx', label: 'DOCX' },
  { key: 'pptx', label: 'PPTX' },
  { key: 'txt', label: 'Plain Text' },
  { key: 'image', label: 'Image (PNG)' }
]

// Single format selection for simplified workflow
export default function FormatSelector({ selected, onChange, disabled }) {
  const selectFormat = (formatKey) => {
    if (disabled) return
    onChange(formatKey)
  }
  const getFormatIcon = (key) => {
    const icons = {
      pdf: '📄',
      docx: '📄',
      pptx: '📊',
      txt: '📝',
      image: '🖼️'
    }
    return icons[key] || '📄'
  }

  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">📥 Choose Download Format</h3>
        <p className="text-xs text-gray-500 mt-1">Select one format for your summary download</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {EXPORT_FORMATS.map(f => {
          const isSelected = selected === f.key
          return (
            <button
              key={f.key}
              type="button"
              disabled={disabled}
              onClick={() => selectFormat(f.key)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <span className="text-lg">{getFormatIcon(f.key)}</span>
              <span>{f.label}</span>
              {isSelected && <span className="text-blue-600 text-xs">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
