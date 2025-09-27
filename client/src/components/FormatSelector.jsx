import React from 'react'

export const EXPORT_FORMATS = [
  { key: 'pdf', label: 'PDF' },
  { key: 'docx', label: 'DOCX' },
  { key: 'pptx', label: 'PPTX' },
  { key: 'txt', label: 'Plain Text' },
  { key: 'image', label: 'Image (PNG)' }
]

// futureStatus: optional mapping { formatKey: 'pending' | 'done' | 'error' }
export default function FormatSelector({ selected, onChange, disabled, futureStatus = {} }) {
  const toggle = (k) => {
    if (disabled) return
    if (selected.includes(k)) {
      onChange(selected.filter(f => f !== k))
    } else {
      onChange([...selected, k])
    }
  }
  const allKeys = EXPORT_FORMATS.map(f => f.key)
  const allSelected = allKeys.every(k => selected.includes(k))
  const handleSelectAll = () => {
    if (disabled) return
    if (allSelected) {
      onChange([])
    } else {
      onChange(allKeys)
    }
  }
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Export Formats</h3>
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled}
          className={`text-[10px] tracking-wide font-medium px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>
      <div className="space-y-2">
        {EXPORT_FORMATS.map(f => {
          const status = futureStatus[f.key]
          return (
            <label key={f.key} className={`flex items-center justify-between text-sm cursor-pointer px-2 py-1 rounded hover:bg-gray-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes(f.key)}
                  onChange={() => toggle(f.key)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{f.label}</span>
              </span>
              {status && (
                <span className={`text-[10px] uppercase tracking-wide font-medium ${
                  status === 'done' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {status === 'pending' && '…'}
                  {status === 'done' && 'OK'}
                  {status === 'error' && 'ERR'}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}
