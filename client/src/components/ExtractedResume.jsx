import React, { useState } from 'react'

// Reusable component to present extracted resume/text in a clean layout
export default function ExtractedResume({ data }) {
  const defaultData = {
    name: 'Akileshwaran B',
    location: 'Coimbatore, India',
    phone: '+91-7904122501',
    email: 'akil20052622@gmail.com',
    linkedin: 'https://www.linkedin.com/in/akil26/',
    github: 'https://github.com/Akil1265',
    education: [
      {
        school: 'Sri Shakthi Institute of Engineering and Technology',
        location: 'Coimbatore, India',
        degree: 'B.E. Computer Science and Engineering',
        years: '2023 – 2027'
      },
      {
        school: "M.N.U. Jayaraj Nadar Higher Secondary School",
        location: 'Madurai, India',
        degree: 'Higher Secondary (Bio-Maths)',
        years: '2021 – 2022'
      }
    ],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'Casual Clothings Fashion Pvt Ltd',
        location: 'Tirupur (Remote)',
        dates: 'Jul 2025 – Present',
        bullets: [
          'Designed and developed a MERN stack eCommerce platform with user/admin modules and a dynamic T-shirt design tool.',
          'Implemented refunds, returns, order cancellations, and role-based access APIs.',
          'Integrated Razorpay for secure transactions and optimized backend performance.',
          'Collaborated with remote team for deployment; project live at casualclothings.shop.'
        ]
      }
    ],
    projects: [
      {
        name: 'Roomie – Room Finder & Group Chat App',
        year: '2025',
        desc: 'Mobile app to find rooms, form groups and collaborate via private & group chats. Google Sign-In, Phone OTP, role-based access, real-time chat with Socket.IO + Firebase. Expense tracking included.',
        tech: 'Flutter, Firebase, Cloudinary, Socket.IO'
      },
      {
        name: 'Mind-Mesh – AI-Powered Document Summarizer',
        year: '2025',
        desc: 'Full-stack web app extracting and summarizing content from PDFs, DOCX, PPTX, images, and URLs. Integrated Gemini API with Tesseract OCR and multi-format export.',
        tech: 'Vite, React, Tailwind, Node, Express, Tesseract.js, Gemini API'
      },
      {
        name: 'Mini Projects',
        year: '2024',
        desc: 'GIF project (Python), Terminal game, Chatbot-NLP (deployed on Vercel).',
        tech: 'Python, JS'
      }
    ],
    skills: ['Python', 'C', 'Java', 'Dart', 'JavaScript', 'React', 'Tailwind CSS', 'Node.js', 'Express.js', 'MongoDB', 'Firebase'],
    certificates: ['Python Essential Training (LinkedIn 2024)', 'Machine Learning Foundations Course'],
    summary: 'Full-stack developer with experience building production web and mobile apps, specializing in AI integrations, OCR, real-time systems, and eCommerce platforms.'
  }

  const profile = data || defaultData
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = [
      profile.name,
      profile.location,
      profile.phone,
      profile.email,
      profile.linkedin,
      profile.github,
      '',
      'Summary:',
      profile.summary,
      '',
      'Education:',
      ...profile.education.map(e => `${e.degree}, ${e.school} (${e.years})`),
      '',
      'Experience:',
      ...profile.experience.map(x => `${x.title} @ ${x.company} — ${x.dates}\n${x.bullets.join('; ')}`),
      '',
      'Projects:',
      ...profile.projects.map(p => `${p.name} — ${p.desc}`),
      '',
      'Skills:',
      profile.skills.join(', ')
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden md:flex">
        <div className="md:w-1/3 bg-gradient-to-b from-blue-600 to-purple-600 text-white p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-sm opacity-90 mt-1">{profile.summary}</p>
          </div>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Location:</span> {profile.location}</div>
            <div><span className="font-semibold">Phone:</span> {profile.phone}</div>
            <div><span className="font-semibold">Email:</span> <a href={`mailto:${profile.email}`} className="underline">{profile.email}</a></div>
            <div>
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="underline">LinkedIn</a> • <a href={profile.github} target="_blank" rel="noreferrer" className="underline">GitHub</a>
            </div>
          </div>
          <div className="mt-auto">
            <button onClick={handleCopy} className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-md text-sm">
              {copied ? 'Copied ✓' : 'Copy as text'}
            </button>
          </div>
        </div>
        <div className="md:w-2/3 p-6">
          <section className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Education</h3>
            <div className="space-y-3">
              {profile.education.map((edu, i) => (
                <div key={i} className="p-3 rounded-md bg-gray-50">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">{edu.degree}</div>
                    <div className="text-sm text-gray-600">{edu.years}</div>
                  </div>
                  <div className="text-sm text-gray-700">{edu.school} • {edu.location}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Work Experience</h3>
            <div className="space-y-4">
              {profile.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold text-gray-800">{exp.title} — <span className="text-gray-600">{exp.company}</span></div>
                    <div className="text-sm text-gray-600">{exp.dates}</div>
                  </div>
                  <ul className="list-disc list-inside mt-2 text-gray-700 text-sm">
                    {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Projects</h3>
            <div className="space-y-3">
              {profile.projects.map((p, i) => (
                <div key={i} className="p-3 rounded-md bg-gray-50">
                  <div className="font-semibold">{p.name} <span className="text-sm text-gray-600">• {p.year}</span></div>
                  <div className="text-sm text-gray-700 mt-1">{p.desc}</div>
                  <div className="text-xs text-gray-500 mt-2">Tech: {p.tech}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Technical Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">{s}</span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Certificates & Achievements</h3>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {profile.certificates.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
