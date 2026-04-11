// FILE: docker.js
// PURPOSE: Express route handler for POST /api/scan/docker — runs Hadolint + Trivy on uploaded Dockerfile
// USED BY: backend/src/routes/scan.js

const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { v4: uuidv4 } = require('uuid')

const { runHadolint }        = require('../scanners/hadolint')
const { runTrivyOnImage }    = require('../scanners/trivy')
const { buildScoreResult }   = require('../services/scoreEngine')
const { saveToHistory }      = require('../services/historyStore')

const router = express.Router()

// ── Upload config ─────────────────────────────────────────────────────────────
// Store uploaded files in the uploads/ directory with a unique name
const upload = multer({
  dest: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
})

/**
 * POST /api/scan/docker
 * Body (multipart/form-data):
 *   dockerfile  — the Dockerfile to lint (required)
 *   imageName   — Docker image to CVE-scan with Trivy (optional, e.g. "ubuntu:22.04")
 *
 * Response: { score, grade, color, summary, findings, fileName, scannedAt }
 */
router.post('/', upload.single('dockerfile'), async (req, res) => {
  // Ensure a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No Dockerfile uploaded. Use field name "dockerfile".' })
  }

  const uploadedPath = req.file.path
  const originalName = req.file.originalname || 'Dockerfile'
  const imageName    = (req.body.imageName || '').trim()

  try {
    // ── Step 1: Run Hadolint on the uploaded file ──────────────────────
    const hadolintFindings = await runHadolint(uploadedPath)

    // ── Step 2: Run Trivy CVE scan on the image name (if provided) ─────
    let trivyFindings = []
    if (imageName) {
      trivyFindings = await runTrivyOnImage(imageName)
    }

    // ── Step 3: Merge all findings ─────────────────────────────────────
    const allFindings = [...hadolintFindings, ...trivyFindings]

    // ── Step 4: Calculate score ────────────────────────────────────────
    const result = buildScoreResult(allFindings)

    // ── Step 5: Save to history ────────────────────────────────────────
    saveToHistory({
      id:        uuidv4(),
      type:      'docker',
      fileName:  originalName,
      imageName: imageName || null,
      score:     result.score,
      grade:     result.grade,
      summary:   result.summary,
      timestamp: new Date().toISOString(),
    })

    // ── Step 6: Respond ────────────────────────────────────────────────
    return res.json({
      ...result,
      fileName:  originalName,
      imageName: imageName || null,
      scannedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('[docker route] Scan failed:', err)
    return res.status(500).json({ error: 'Scan failed: ' + err.message })
  } finally {
    // Clean up the uploaded temp file
    if (fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath)
    }
  }
})

module.exports = router
