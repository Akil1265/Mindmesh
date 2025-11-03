import React, { useState } from 'react'

// ProjectPresentation
// A clean, Tailwind-styled component that displays the LunarSentinel
// project details in well-structured sections. Includes copy and print actions.
export default function ProjectPresentation({ rawText, data }) {
  const [copied, setCopied] = useState(false)

  // Heuristic parser to extract structured fields from unstructured OCR / extracted text
  function parseExtractedText(raw) {
    if (!raw || typeof raw !== 'string') return null

    // Normalize whitespace and bullets
    const s = raw.replace(/\r/g, '\n').replace(/\t/g, ' ').replace(/•/g, '\n- ').replace(/\u2022/g, '\n- ')

    // Split into lines and trim
    const lines = s.split(/\n+/).map(l => l.trim()).filter(Boolean)

    const joined = lines.join('\n')

    // Helpers to extract by heading names
    const sectionMatch = (name) => {
      const re = new RegExp(name + '\\s*[:\-–—]?\\s*([\s\S]*?)(?=\\n[A-Z]{2,}\\b|\\n[A-Z][a-z]+:|$)', 'i')
      const m = joined.match(re)
      return m ? m[1].trim() : null
    }

    const extractList = (text) => {
      if (!text) return []
      // split on line breaks or semicolons or bullets
      return text.split(/[\n;•\u2022]+/).map(t => t.trim()).filter(Boolean)
    }

    // Try to find common headings
    const title = (lines[0] && lines[0].length < 120) ? lines[0] : 'LUNARSENTINEL — AI-Powered Lunar Landslide Detection'
    const authorLine = lines.find(l => /presented by|presented:|presented/i) || lines.find(l => /\b\d{6,}\b/.test(l)) || ''
    let author = ''
    let guide = ''
    if (authorLine) {
      // naive split
      const parts = authorLine.split(/guided by|guided:|guided/i)
      author = parts[0].replace(/presented by[:\-]?/i, '').trim()
      if (parts[1]) guide = parts[1].trim()
    }

    // Key sections
    const abstract = sectionMatch('ABSTRACT') || sectionMatch('Abstract') || sectionMatch('Summary') || (lines.slice(1,5).join(' '))
    const introduction = sectionMatch('INTRODUCTION') || sectionMatch('Introduction')
    const existingText = sectionMatch('EXISTING SYSTEM') || sectionMatch('Existing System')
    const proposedText = sectionMatch('PROPOSED SYSTEM') || sectionMatch('Proposed System')
    const archText = sectionMatch('SYSTEM ARCHITECTURE') || sectionMatch('System Architecture') || sectionMatch('Architecture')
    const outputsText = sectionMatch('OUTPUT') || sectionMatch('OUTPUTS') || sectionMatch('Output')
    const conclusion = sectionMatch('CONCLUSION') || sectionMatch('Conclusion') || ''

    // Key highlights extraction using simple regex for technology lines
    const keyHighlights = {}
    const techMatch = joined.match(/Front[- ]End(?: Technology)?[:\-]?\s*([A-Za-z0-9 ,.-]+)/i)
    if (techMatch) keyHighlights['Front-End Technology'] = techMatch[1].trim()
    const backendMatch = joined.match(/Back[- ]End(?: Technology)?[:\-]?\s*([A-Za-z0-9 ,.-]+)/i)
    if (backendMatch) keyHighlights['Back-End Technology'] = backendMatch[1].trim()
    const dbMatch = joined.match(/Database[:\-]?\s*([A-Za-z0-9 ,.-]+)/i)
    if (dbMatch) keyHighlights['Database'] = dbMatch[1].trim()
    const toolsMatch = joined.match(/Development Tools[:\-]?\s*([A-Za-z0-9 ,().-]+)/i)
    if (toolsMatch) keyHighlights['Development Tools'] = toolsMatch[1].trim()

    // Fallbacks if not found
    if (!keyHighlights['Front-End Technology']) keyHighlights['Front-End Technology'] = 'Flutter'
    if (!keyHighlights['Back-End Technology']) keyHighlights['Back-End Technology'] = 'Python'
    if (!keyHighlights['Database']) keyHighlights['Database'] = 'Local Storage'
    if (!keyHighlights['Development Tools']) keyHighlights['Development Tools'] = 'VS Code, Google Colab'

    return {
      title,
      author: author || 'Kiran P (714023104052)',
      guide: guide || 'Mrs. Sharmila — Assistant Professor, CSE',
      institute: (joined.match(/Sri Shakthi Institute of Engineering & Technology/i) || ['Sri Shakthi Institute of Engineering & Technology'])[0],
      abstract: abstract || '',
      introduction: introduction || '',
      existingSystem: extractList(existingText) || [],
      proposedSystem: extractList(proposedText) || [],
      keyHighlights,
      architecture: archText ? { raw: archText } : { os: 'Android 8.0', frontend: 'Flutter', backend: 'Python', database: 'Local Storage', tools: 'VS Code, Google Colab' },
      outputs: extractList(outputsText) || [],
      conclusion: conclusion || ''
    }
  }

  // Use structured data if provided, otherwise parse rawText, otherwise defaults
  const parsed = data || parseExtractedText(rawText) || null

  // defaults (used when parsed fields are missing)
  const defaults = {
    title: 'LUNARSENTINEL — AI-Powered Lunar Landslide Detection',
    author: 'Kiran P (714023104052)',
    guide: 'Mrs. Sharmila — Assistant Professor, CSE',
    institute: 'Sri Shakthi Institute of Engineering & Technology',
    abstract: `AI-powered system for detecting and analyzing lunar landslides using computer vision. The system delivers risk levels, confidence metrics, and smart recommendations with detailed insights. Built with Flutter for modern UI/UX and optimized mobile performance. Interactive features include history tracking, chat interface, and customizable settings.`,
    introduction: `This project explores lunar landscapes with AI-powered landslide detection. It monitors moon surface changes in real-time, provides instant risk alerts for potentially landslide-susceptible areas, and lets users track analysis history and review insights via the mobile app.`,
    existingSystem: [
      'Relies on satellite images — uses pre-captured lunar mission data only',
      'Offline / not real-time — analysis after data collection',
      'Limited interactivity — mostly static maps or images',
      'High compute needs — often requires powerful desktops/servers'
    ],
    proposedSystem: [
      'Processes satellite imagery in real-time on the app',
      'AI-powered detection with risk alerts, confidence metrics, and recommendations',
      'Interactive UI/UX with chat interface, history tracking, and visual metrics',
      'Mobile-optimized Flutter app with efficient image/video processing and customizable settings'
    ],
    keyHighlights: {
      'Front-End Technology': 'Flutter',
      'Back-End Technology': 'Python',
      'Database': 'Local Storage',
      'Development Tools': 'VS Code (Coding), Google Colab (Testing)'
    },
    architecture: { os: 'Android 8.0', frontend: 'Flutter', backend: 'Python', database: 'Local Storage (on-device)', tools: 'VS Code (development), Google Colab (testing)' },
    outputs: [
      'Home Page — App entry and live feed control',
      'Analysing Page — Real-time detection view with overlays and risk meter',
      'Result Page — Detection summary, risk level, confidence, and recommended actions',
      'History Page — Past analyses, details and downloadable reports',
      'About Page — Project credits and instructions'
    ],
    conclusion: `LunarSentinel provides a compact, interactive mobile solution for detecting and analyzing lunar landslides. By combining on-device processing with efficient AI models and an engaging UI, the system delivers near-real-time insights, risk alerts, and a helpful history of analyses for researchers and enthusiasts alike.`
  }

  const content = {
    title: parsed?.title || defaults.title,
    author: parsed?.author || defaults.author,
    guide: parsed?.guide || defaults.guide,
    institute: parsed?.institute || defaults.institute,
    abstract: parsed?.abstract || defaults.abstract,
    introduction: parsed?.introduction || defaults.introduction,
    existingSystem: parsed?.existingSystem?.length ? parsed.existingSystem : defaults.existingSystem,
    proposedSystem: parsed?.proposedSystem?.length ? parsed.proposedSystem : defaults.proposedSystem,
    keyHighlights: parsed?.keyHighlights || defaults.keyHighlights,
    architecture: parsed?.architecture || defaults.architecture,
    outputs: parsed?.outputs?.length ? parsed.outputs : defaults.outputs,
    conclusion: parsed?.conclusion || defaults.conclusion
  }

  const copyAll = async () => {
    const text = [
      content.title,
      `${content.author} — Guided by ${content.guide}`,
      content.institute,
      '',
      'ABSTRACT',
      content.abstract,
      '',
      'INTRODUCTION',
      content.introduction,
      '',
      'EXISTING SYSTEM',
      ...content.existingSystem,
      '',
      'PROPOSED SYSTEM',
      ...content.proposedSystem,
      '',
      'SYSTEM ARCHITECTURE',
      `OS: ${content.architecture.os || ''}; Frontend: ${content.architecture.frontend || ''}; Backend: ${content.architecture.backend || ''}; Database: ${content.architecture.database || ''}; Tools: ${content.architecture.tools || ''}`,
      '',
      'OUTPUTS',
      ...content.outputs,
      '',
      'CONCLUSION',
      content.conclusion
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{content.title}</h1>
          <p className="text-sm text-gray-600 mt-1">Presented by <span className="font-semibold">{content.author}</span> • Guided by <span className="font-semibold">{content.guide}</span></p>
          <p className="text-sm text-gray-600">{content.institute}</p>
        </div>
        <div className="space-x-2">
          <button onClick={copyAll} className="px-3 py-2 bg-blue-600 text-white rounded hover:opacity-95 text-sm">{copied ? 'Copied ✓' : 'Copy Content'}</button>
          <button onClick={() => window.print()} className="px-3 py-2 bg-gray-800 text-white rounded hover:opacity-95 text-sm">Print / Save as PDF</button>
        </div>
      </div>

      <section className="mb-6 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Abstract</h2>
        <p className="text-gray-700 leading-relaxed">{content.abstract}</p>
      </section>

      {/* Key Highlights: clean, bullet-style tech summary (removed stray '0' prefix) */}
      <section className="mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2">Key Highlights</h3>
          <div className="grid md:grid-cols-2 gap-3 text-gray-700 text-sm">
            {Object.entries(content.keyHighlights).map(([k, v]) => (
              <div key={k} className="flex items-start gap-3">
                <div className="text-blue-600 font-semibold">{k}:</div>
                <div className="flex-1">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2">Introduction</h3>
          <p className="text-gray-700">{content.introduction}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2">System Architecture</h3>
          <ul className="text-gray-700 list-disc list-inside">
            <li><strong>Operating System:</strong> {content.architecture.os}</li>
            <li><strong>Front-End:</strong> {content.architecture.frontend}</li>
            <li><strong>Back-End:</strong> {content.architecture.backend}</li>
            <li><strong>Database:</strong> {content.architecture.database}</li>
            <li><strong>Tools:</strong> {content.architecture.tools}</li>
          </ul>
        </div>
      </section>

      <section className="mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2">Existing System — Limitations</h3>
          <ul className="list-disc list-inside text-gray-700">
            {content.existingSystem.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </section>

      <section className="mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2">Proposed System — Highlights</h3>
          <ul className="list-disc list-inside text-gray-700">
            {content.proposedSystem.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </section>

      <section className="mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2">Output / Screenshots (placeholders)</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {content.outputs.map((o, i) => (
              <div key={i} className="p-4 border border-dashed border-gray-200 rounded text-sm text-gray-600 flex flex-col items-start">
                <div className="font-semibold text-gray-800 mb-1">{o}</div>
                <div className="text-xs">Screenshot placeholder — replace with actual images in the project assets.</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 bg-white p-6 rounded-lg shadow-sm">
        <h3 className="font-semibold mb-2">Conclusion</h3>
        <p className="text-gray-700">{content.conclusion}</p>
      </section>

      <footer className="text-sm text-gray-600 text-center mt-6">
        <div>{content.institute} — Presented by {content.author} • Guided by {content.guide}</div>
      </footer>
    </div>
  )
}
