/**
 * Video Generator Utility - Simplified and Reliable
 * Creates MP4 videos from text summaries using Canvas + Audio
 */

/**
 * Generate video from summary text with embedded audio
 * @param {string} text - The summary text to convert
 * @param {Object} options - Video generation options
 * @returns {Promise<{blob: Blob, extension: string}>} - Video result
 */
export async function generateSummaryVideo(text, options = {}) {
  const {
    width = 1280,
    height = 720,
    backgroundColor = '#1e3a8a',
    textColor = '#ffffff',
    fontSize = 28,
    fontFamily = 'Arial, sans-serif',
    padding = 80,
    lineHeight = 1.6,
    title = 'AI Summary'
  } = options

  console.log('Starting video generation...')

  return new Promise(async (resolve, reject) => {
    try {
      // Create canvas and drawing context
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // Prepare text content - split into sentences
      const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text]
      const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0)
      console.log('Text split into', cleanSentences.length, 'sentences')

      // Setup video recording with silent playback in browser
      const stream = canvas.captureStream(30)

      // Create Web Audio API context for direct audio generation
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const destination = audioContext.createMediaStreamDestination()

      // Request TTS audio from the backend and pipe it into the recording stream
      const speechAudio = await (async () => {
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            credentials: 'include'
          })

          if (!response.ok) {
            throw new Error(`TTS request failed with status ${response.status}`)
          }

          const audioArrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer)

          const source = audioContext.createBufferSource()
          source.buffer = audioBuffer

          const gainNode = audioContext.createGain()
          gainNode.gain.setValueAtTime(1, audioContext.currentTime)

          source.connect(gainNode)
          gainNode.connect(destination)

          return {
            start() {
              try {
                const startAt = Math.max(audioContext.currentTime + 0.1, audioContext.currentTime)
                source.start(startAt)
              } catch (error) {
                console.warn('Speech playback start failed:', error)
              }
            },
            stop() {
              try { source.stop() } catch (_) { /* no-op */ }
              try { gainNode.disconnect() } catch (_) { /* no-op */ }
            },
            duration: audioBuffer.duration || Math.max(text.split(/\s+/).length * 0.45, 6)
          }
        } catch (error) {
          console.error('Falling back to silent audio track:', error)

          const silentGain = audioContext.createGain()
          silentGain.gain.setValueAtTime(0, audioContext.currentTime)
          silentGain.connect(destination)

          return {
            start() {},
            stop() {
              try { silentGain.disconnect() } catch (_) { /* no-op */ }
            },
            duration: Math.max(text.split(/\s+/).length * 0.45, 6)
          }
        }
      })()

      // Add audio track (remains inaudible in browser) to the video stream
      destination.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track)
      })

      console.log('🎙️ Server TTS ready - audio stays muted in the browser but will ship inside the video')

      // Try video formats with audio support
      let mimeType = 'video/webm;codecs=vp9,opus'
      let blobType = 'video/mp4'
      let fileExtension = '.mp4'

      const supportedTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ]

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          console.log('Using video format:', type)
          break
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2000000
      })

      const recordedChunks = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: blobType })
        console.log('Video recording complete, blob size:', blob.size)
        
        // Clean up audio resources
        speechAudio.stop()
        audioContext.close()
        
        resolve({ blob, extension: fileExtension })
      }

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error)
        
        // Clean up on error
        speechAudio.stop()
        audioContext.close()
        
        reject(error)
      }

      // Animation state
      let currentSentenceIndex = 0
      let startTime = Date.now()
      
      // Calculate timing
    const wordCount = text.split(' ').length
    const totalDuration = Math.max(wordCount * 400, speechAudio.duration * 1000, 8000) // ensure video length covers audio
      const timePerSentence = totalDuration / cleanSentences.length

      console.log('Estimated duration:', totalDuration / 1000, 'seconds')

      // Drawing function
      function drawFrame() {
        // Clear canvas
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, width, height)

        // Draw header
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.fillRect(0, 0, width, 100)
        
        // Title
        ctx.fillStyle = textColor
        ctx.font = `bold ${fontSize + 4}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillText(title, width / 2, 60)

        // Progress bar
        const progress = Math.min((currentSentenceIndex + 1) / cleanSentences.length, 1)
        const barWidth = width - 2 * padding
        const barHeight = 6
        const barY = height - 80

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.fillRect(padding, barY, barWidth, barHeight)
        ctx.fillStyle = '#60a5fa'
        ctx.fillRect(padding, barY, barWidth * progress, barHeight)

        // Current sentence display
        if (currentSentenceIndex < cleanSentences.length) {
          const currentText = cleanSentences[currentSentenceIndex]
          
          ctx.fillStyle = textColor
          ctx.font = `${fontSize}px ${fontFamily}`
          ctx.textAlign = 'left'

          // Word wrapping
          const words = currentText.split(' ')
          const lines = []
          let currentLine = ''
          const maxWidth = width - 2 * padding

          for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word
            const metrics = ctx.measureText(testLine)
            
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) {
            lines.push(currentLine)
          }

          // Center text vertically
          const lineHeightPx = fontSize * lineHeight
          const totalTextHeight = lines.length * lineHeightPx
          const startY = (height - totalTextHeight) / 2 + 50

          // Draw lines
          lines.forEach((line, i) => {
            ctx.fillText(line, padding, startY + i * lineHeightPx)
          })
        }

        // Status indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.font = `${fontSize * 0.6}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.fillText(
          `${currentSentenceIndex + 1} / ${cleanSentences.length}`, 
          width / 2, 
          height - 40
        )
      }

      // Animation loop
      function animate() {
        const elapsed = Date.now() - startTime

        // Update current sentence based on time
        const expectedSentence = Math.floor(elapsed / timePerSentence)
        currentSentenceIndex = Math.min(expectedSentence, cleanSentences.length - 1)

        // Draw current frame
        drawFrame()

        // Continue animation
        if (elapsed < totalDuration) {
          requestAnimationFrame(animate)
        } else {
          // Stop recording when done
          setTimeout(() => {
            mediaRecorder.stop()
          }, 1000)
        }
      }

      // Start sequence
      console.log('Starting animation and recording...')
      
      // Draw initial frame
      drawFrame()
      
      // Start recording
      mediaRecorder.start(100)
      
      // Start animation
      startTime = Date.now()
      animate()
      
      // Start playback of the TTS audio (inaudible in browser, captured in video)
      setTimeout(() => {
        console.log('🎤 Starting server-rendered voiceover playback')
        speechAudio.start()
      }, 800) // allow recorder to warm up before audio starts

    } catch (error) {
      console.error('Video generation error:', error)
      reject(error)
    }
  })
}

/**
 * Trigger download of video blob
 * @param {Blob} blob - Video blob to download
 * @param {string} filename - Filename for download
 */
export function downloadVideo(blob, filename = 'summary-video.mp4') {
  console.log('Downloading video:', filename)
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

/**
 * Prepare video for download (compatibility function)
 * @param {Blob} blob - Video blob
 * @returns {Blob} - Same blob
 */
export function prepareVideoForDownload(blob) {
  return blob
}