// FILE: k8s.js
// PURPOSE: Express route handler for POST /api/scan/k8s — validates K8s YAML with kubeconform + Polaris
// USED BY: backend/src/routes/scan.js

const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { v4: uuidv4 } = require('uuid')

const { runKubeconform }   = require('../scanners/kubeconform')
const { runPolaris }       = require('../scanners/polaris')
const { buildScoreResult } = require('../services/scoreEngine')
const { saveToHistory }    = require('../services/historyStore')

const router = express.Router()

// ── Upload config ─────────────────────────────────────────────────────────────
const upload = multer({
  dest: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
})

/**
 * POST /api/scan/k8s
 * Body (multipart/form-data):
 *   yamlFile — the Kubernetes YAML file to scan (required)
 *
 * Response: { score, grade, color, summary, findings, fileName, scannedAt }
 */
router.post('/', upload.single('yamlFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No YAML file uploaded. Use field name "yamlFile".' })
  }

  const uploadedPath = req.file.path
  const originalName = req.file.originalname || 'deployment.yaml'

  try {
    // ── Step 1: Schema validation with kubeconform ─────────────────────
    const kubeconformFindings = await runKubeconform(uploadedPath)

    // ── Step 2: Best practices audit with Polaris ──────────────────────
    const polarisFindings = await runPolaris(uploadedPath)

    // ── Step 3: Merge findings ─────────────────────────────────────────
    const allFindings = [...kubeconformFindings, ...polarisFindings]

    // ── Step 4: Calculate score ────────────────────────────────────────
    const result = buildScoreResult(allFindings)

    // ── Step 5: Save to history ────────────────────────────────────────
    saveToHistory({
      id:        uuidv4(),
      type:      'k8s',
      fileName:  originalName,
      score:     result.score,
      grade:     result.grade,
      summary:   result.summary,
      timestamp: new Date().toISOString(),
    })

    // ── Step 6: Respond ────────────────────────────────────────────────
    return res.json({
      ...result,
      fileName:  originalName,
      scannedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('[k8s route] Scan failed:', err)
    return res.status(500).json({ error: 'Scan failed: ' + err.message })
  } finally {
    if (fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath)
    }
  }
})

module.exports = router
