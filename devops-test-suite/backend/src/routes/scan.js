// FILE: scan.js
// PURPOSE: Main scan router — mounts sub-routers and handles /history and /health endpoints
// USED BY: backend/src/server.js

const express = require('express')
const { execSync } = require('child_process')

const dockerRouter    = require('./docker')
const k8sRouter       = require('./k8s')
const terraformRouter = require('./terraform')
const { readHistory } = require('../services/historyStore')

const router = express.Router()

// ── Sub-routers for each scan type ────────────────────────────────────────────
router.use('/docker',    dockerRouter)
router.use('/k8s',       k8sRouter)
router.use('/terraform', terraformRouter)

/**
 * GET /api/scan/history
 * Returns the last 10 scan results from the local history file
 */
router.get('/history', (req, res) => {
  try {
    const history = readHistory()
    return res.json(history)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read history: ' + err.message })
  }
})

/**
 * GET /api/health
 * Checks which scanner tools are installed and returns their status + version
 * Useful for the dashboard to show which tools are available
 */
router.get('/health', (req, res) => {
  // Helper: tries to run a version command and returns the version string or false
  function checkTool(cmd, name) {
    try {
      const version = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
        .trim()
        .split('\n')[0] // take only the first line
      return { installed: true, version: version || 'unknown', name }
    } catch {
      return { installed: false, version: null, name }
    }
  }

  const tools = {
    hadolint:     checkTool('hadolint --version',  'Hadolint'),
    trivy:        checkTool('trivy --version',     'Trivy'),
    tfsec:        checkTool('tfsec --version',     'tfsec'),
    checkov:      checkTool('checkov --version',   'Checkov'),
    kubeconform:  checkTool('kubeconform -v',      'Kubeconform'),
    polaris:      checkTool('polaris version',     'Polaris'),
  }

  const allInstalled = Object.values(tools).every(t => t.installed)
  const installedCount = Object.values(tools).filter(t => t.installed).length

  return res.json({
    status: allInstalled ? 'all_ready' : 'partial',
    message: `${installedCount}/${Object.keys(tools).length} scanner tools installed`,
    tools,
    tip: allInstalled
      ? 'All tools ready! Upload a file to start scanning.'
      : 'Run bash install-tools.sh from the project root to install missing tools.',
  })
})

module.exports = router
