import { useNavigate } from 'react-router-dom'
import pkg from '../../package.json'
import MindMeshLogo from '../components/MindMeshLogo'

function LandingPage() {
  const navigate = useNavigate()

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Summarization',
      description: 'Advanced Gemini 2.5 Flash AI instantly transforms lengthy documents into concise, meaningful summaries.'
    },
    {
      icon: '📁',
      title: 'Multiple Input Methods',
      description: 'Upload files (PDF, DOCX, PPTX), paste text directly, or fetch content from any URL - all in one place.'
    },
    {
      icon: '💡',
      title: 'Smart Key Highlights',
      description: 'Automatically extracts and highlights the most important points from your content.'
    },
    {
      icon: '🎨',
      title: 'Flexible Summary Styles',
      description: 'Choose from Short, Medium, Long, or Bullet Points format to match your needs perfectly.'
    },
    {
      icon: '💾',
      title: 'Export to Multiple Formats',
      description: 'Download your summaries as PDF, Word, PowerPoint, Text, or Image - ready to share anywhere.'
    },
    {
      icon: '⚡',
      title: 'Real-Time Processing',
      description: 'Live progress updates and streaming responses keep you informed every step of the way.'
    }
  ]

  const useCases = [
    {
      icon: '🎓',
      title: 'Students & Researchers',
      description: 'Quickly digest research papers, textbooks, and study materials to save hours of reading time.'
    },
    {
      icon: '💼',
      title: 'Professionals & Executives',
      description: 'Summarize reports, presentations, and lengthy emails to make faster, informed decisions.'
    },
    {
      icon: '✍️',
      title: 'Content Creators & Writers',
      description: 'Extract key insights from articles and sources to create compelling content efficiently.'
    },
    {
      icon: '👨‍💼',
      title: 'Business Analysts',
      description: 'Process market research, competitor analysis, and business documents at lightning speed.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <MindMeshLogo size="sm" showText={true} />
            <button
              onClick={() => navigate('/app')}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
            >
              Try Now →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            ✨ Powered by Advanced AI Technology
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Long Documents into
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Actionable Insights</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Stop wasting time reading lengthy documents. Let our AI-powered summarizer extract the key information in seconds, 
            giving you more time to focus on what truly matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/app')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              🚀 Get Started Free
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white text-gray-700 rounded-lg text-lg font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-all duration-300"
            >
              Learn More
            </button>
          </div>
          <div className="mt-12 flex justify-center items-center space-x-8 text-sm text-gray-600">
            {['No Sign-up Required', '100% Free to Use', 'Instant Results'].map((label, idx) => (
              <div key={idx} className="flex items-center">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-green-500 rounded-full text-white mr-3">
                  <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8.364 8.364a1 1 0 0 1-1.414 0L3.293 11.364a1 1 0 1 1 1.414-1.414l3.03 3.03 7.657-7.657a1 1 0 0 1 1.313-.03z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-gray-700 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features at Your Fingertips</h2>
            <p className="text-xl text-gray-600">Everything you need to summarize, analyze, and export your content</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get your summary in 3 simple steps</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-start space-x-6 bg-white p-8 rounded-2xl shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Content</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Choose your input method: upload a file (PDF, DOCX, PPTX), paste text, or provide a URL. 
                    We support multiple formats for maximum flexibility.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-6 bg-white p-8 rounded-2xl shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Processes Your Document</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our advanced Gemini AI analyzes your content, extracts key information, and generates 
                    a concise summary with highlighted important points.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-6 bg-white p-8 rounded-2xl shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Download & Share</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Get your summary instantly and export it in your preferred format: PDF, Word, PowerPoint, 
                    Text, or Image. Ready to share with your team!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Perfect For Everyone</h2>
            <p className="text-xl text-gray-600">No matter your profession, Mind-Mesh saves you valuable time</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{useCase.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Save Hours of Reading Time?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already making smarter, faster decisions with Mind-Mesh
          </p>
          <button
            onClick={() => navigate('/app')}
            className="px-10 py-5 bg-white text-blue-600 rounded-lg text-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Start Summarizing Now →
          </button>
          <p className="text-blue-100 mt-4 text-sm">No credit card required • No installation needed</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <MindMeshLogo size="sm" showText={true} />
              <p className="text-sm leading-relaxed mt-4">
                AI-powered document summarization that transforms how you process information. 
                Fast, accurate, and completely free.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li>• AI Summarization</li>
                <li>• Multiple Formats</li>
                <li>• Export Options</li>
                <li>• Real-time Processing</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => navigate('/app')} className="hover:text-white transition-colors">
                    Try the App
                  </button>
                </li>
                <li>
                  <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://github.com/Akil1265" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    GitHub: Akil1265
                  </a>
                </li>
                <li>
                  <a href="mailto:akil20052622@gmail.com" className="hover:text-white">
                    Email: akil20052622@gmail.com
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/in/akil26/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    LinkedIn: akil26
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 Mind-Mesh v{pkg.version} • All rights reserved</p>
            <p className="mt-2">Powered by Advanced AI Technology</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
