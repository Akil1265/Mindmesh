import express from 'express'
import { execSync } from 'child_process'

export const diagnosticsRouter = express.Router()

diagnosticsRouter.get('/libre-diagnostics', (req, res) => {
  const info = {
    SOFFICE_PATH: process.env.SOFFICE_PATH || null,
    LIBRE_SKIP_DETECT: process.env.LIBRE_SKIP_DETECT || null,
    LIBREOFFICE_BIN: process.env.LIBREOFFICE_BIN || null,
    LIBRE_OFFICE_PROFILE_DIR: process.env.LIBRE_OFFICE_PROFILE_DIR || null
  }
  try {
    const bin = process.env.SOFFICE_PATH || 'soffice'
    const out = execSync(`${bin} --headless --invisible --nologo --nodefault --norestore --nolockcheck --nofirststartwizard --version`, { stdio: 'pipe', windowsHide: true })
    info.detected = true
    info.version = out.toString().trim()
  } catch (e) {
    info.detected = false
    info.error = e.message
  }
  res.json(info)
})
