// Mind-Mesh Logo Component
function MindMeshLogo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { box: 32, text: 'text-lg' },
    md: { box: 40, text: 'text-2xl' },
    lg: { box: 56, text: 'text-3xl' }
  }
  
  const currentSize = sizes[size]

  return (
    <div className="flex items-center space-x-3">
      {/* Logo Icon */}
      <div 
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 shadow-lg"
        style={{ width: currentSize.box, height: currentSize.box }}
      >
        {/* Brain/Network Pattern */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-2/3 h-2/3"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Central Node */}
          <circle cx="12" cy="12" r="2.5" fill="white" fillOpacity="0.9"/>
          
          {/* Surrounding Nodes */}
          <circle cx="6" cy="6" r="1.5" fill="white" fillOpacity="0.7"/>
          <circle cx="18" cy="6" r="1.5" fill="white" fillOpacity="0.7"/>
          <circle cx="6" cy="18" r="1.5" fill="white" fillOpacity="0.7"/>
          <circle cx="18" cy="18" r="1.5" fill="white" fillOpacity="0.7"/>
          
          {/* Connection Lines */}
          <line x1="12" y1="12" x2="6" y2="6" stroke="white" strokeWidth="1.5" strokeOpacity="0.6"/>
          <line x1="12" y1="12" x2="18" y2="6" stroke="white" strokeWidth="1.5" strokeOpacity="0.6"/>
          <line x1="12" y1="12" x2="6" y2="18" stroke="white" strokeWidth="1.5" strokeOpacity="0.6"/>
          <line x1="12" y1="12" x2="18" y2="18" stroke="white" strokeWidth="1.5" strokeOpacity="0.6"/>
          
          {/* Outer Nodes */}
          <circle cx="12" cy="4" r="1" fill="white" fillOpacity="0.5"/>
          <circle cx="12" cy="20" r="1" fill="white" fillOpacity="0.5"/>
          <circle cx="4" cy="12" r="1" fill="white" fillOpacity="0.5"/>
          <circle cx="20" cy="12" r="1" fill="white" fillOpacity="0.5"/>
        </svg>
        
        {/* Shine Effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
      </div>

      {/* Text Logo */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${currentSize.text} font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-none`}>
            Mind-Mesh
          </span>
          {size === 'md' || size === 'lg' ? (
            <span className="text-xs text-gray-500 mt-0.5">AI Summarizer</span>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default MindMeshLogo
