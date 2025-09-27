import React from 'react'

export default function ProgressBar({ visible, label }) {
  if (!visible) return null
  return (
    <div className="w-full mt-4">
      <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
        <div className="h-full bg-blue-600 animate-pulse" style={{ width: '85%' }}></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{label || 'Processing...'}</p>
    </div>
  )
}
