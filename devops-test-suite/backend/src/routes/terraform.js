// FILE: terraform.js
// PURPOSE: Express route handler for POST /api/scan/terraform — runs tfsec + Checkov on .tf files
// USED BY: backend/src/routes/scan.js

const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const os       = require('os')
const { v4: uuidv4 } = require('uuid')

const { runTfsec }              = require('../scanners/tfsec')
const { runCheckovOnDirectory } = require('../scanners/checkov')
const { buildScoreResult }      = require('../services/scoreEngine')
const { saveToHistory }         = require('../services/historyStore')

const router = express.Router()

// ── Upload config ─────────────────────────────────────────────────────────────
// Accept multiple .tf files under field name "tfFiles"
const upload = multer({
  dest: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
})

/**
 * POST /api/scan/terraform
 * Body (multipart/form-data):
 *   tfFiles — one or more .tf files (required, field name must be "tfFiles")
 *
 * Response: { score, grade, color, summary, findings, fileNames, scannedAt }
 */
router.post('/', upload.array('tfFiles', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No Terraform files uploaded. Use field name "tfFiles".' })
  }

  // We need all .tf files in one directory for tfsec and checkov to scan them together
  // Create a temporary directory and copy the uploaded files there
  const scanDir = path.join(os.tmpdir(), `tf-scan-${uuidv4()}`)
  const uploadedPaths = req.files.map(f => f.path)
  const originalNames = req.files.map(f => f.originalname)

  try {
    // Create temp scan directory
    fs.mkdirSync(scanDir, { recursive: true })

    // Copy all uploaded files into the scan directory with their original names
    for (const file of req.files) {
      const dest = path.join(scanDir, file.originalname || `${uuidv4()}.tf`)
      fs.copyFileSync(file.path, dest)
    }

    // ── Step 1: tfsec security scan ────────────────────────────────────
    const tfsecFindings = await runTfsec(scanDir)

    // ── Step 2: Checkov compliance scan ───────────────────────────────
    const checkovFindings = await runCheckovOnDirectory(scanDir, 'terraform')

    // ── Step 3: Deduplicate findings by code+line to avoid showing the same issue twice
    const allFindings = deduplicateFindings([...tfsecFindings, ...checkovFindings])

    // ── Step 4: Calculate score ────────────────────────────────────────
    const result = buildScoreResult(allFindings)

    // ── Step 5: Save to history ────────────────────────────────────────
    saveToHistory({
      id:        uuidv4(),
      type:      'terraform',
      fileNames: originalNames,
      score:     result.score,
      grade:     result.grade,
      summary:   result.summary,
      timestamp: new Date().toISOString(),
    })

    // ── Step 6: Respond ────────────────────────────────────────────────
    return res.json({
      ...result,
      fileNames: originalNames,
      scannedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('[terraform route] Scan failed:', err)
    return res.status(500).json({ error: 'Scan failed: ' + err.message })
  } finally {
    // Clean up temp scan directory and uploaded files
    try {
      fs.rmSync(scanDir, { recursive: true, force: true })
    } catch { /* ignore cleanup errors */ }

    for (const p of uploadedPaths) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch { /* ignore */ }
    }
  }
})

/**
 * deduplicateFindings — removes exact duplicate findings (same code + same message)
 * tfsec and checkov sometimes report the same issue
 * @param {Array} findings
 * @returns {Array}
 */
function deduplicateFindings(findings) {
  const seen = new Set()
  return findings.filter(f => {
    const key = `${f.code}::${f.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

module.exports = router
