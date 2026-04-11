// FILE: tfsec.js
// PURPOSE: Runs tfsec on a directory of Terraform files and returns structured security findings
// USED BY: backend/src/routes/terraform.js

const { execSync } = require('child_process')
const { enrichAll } = require('../services/explanations')

// Map tfsec severity levels to our standard labels
const SEVERITY_MAP = {
  CRITICAL: 'CRITICAL',
  HIGH:     'HIGH',
  MEDIUM:   'MEDIUM',
  LOW:      'LOW',
  INFO:     'INFO',
}

/**
 * isTfsecInstalled — checks if tfsec binary is available
 * @returns {boolean}
 */
function isTfsecInstalled() {
  try {
    execSync('tfsec --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * runTfsec — runs tfsec on the given directory and returns enriched findings
 * @param {string} dirPath - absolute path to a directory containing .tf files
 * @returns {Promise<Array>} array of finding objects
 */
async function runTfsec(dirPath) {
  if (!isTfsecInstalled()) {
    return [{
      code:      'TOOL_MISSING',
      severity:  'INFO',
      message:   'tfsec is not installed. Run bash install-tools.sh to install it.',
      line:      null,
      tool:      'tfsec',
      title:     'tfsec not installed',
      why:       'tfsec scans Terraform files for security misconfigurations.',
      fix:       'Run: bash install-tools.sh',
      learnMore: 'https://github.com/aquasecurity/tfsec',
    }]
  }

  let rawOutput
  try {
    // --format json outputs structured JSON
    // --no-color prevents ANSI escape codes in the JSON
    // Exit code 1 means findings found — we catch the error and use stdout
    rawOutput = execSync(
      `tfsec "${dirPath}" --format json --no-color`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }
    )
  } catch (err) {
    // tfsec exits non-zero when it finds issues — stdout still has the JSON
    rawOutput = err.stdout || '{}'
  }

  let parsed
  try {
    parsed = JSON.parse(rawOutput || '{}')
  } catch {
    console.error('[tfsec] Failed to parse JSON output:', rawOutput?.substring(0, 200))
    return []
  }

  const results = parsed.results || []

  // Convert tfsec finding format to our standard format
  const rawFindings = results.map(item => ({
    // tfsec uses rule_id like "AVD-AZU-0002"
    code:     item.rule_id || item.long_id || 'UNKNOWN',
    severity: SEVERITY_MAP[(item.severity || 'LOW').toUpperCase()] || 'LOW',
    message:  item.description || item.rule_description || '',
    // tfsec provides location info
    line:     item.location?.start_line || null,
    tool:     'tfsec',
    // Extra fields tfsec provides
    impact:      item.impact      || '',
    resolution:  item.resolution  || '',
  }))

  return enrichAll(rawFindings)
}

module.exports = { runTfsec, isTfsecInstalled }
