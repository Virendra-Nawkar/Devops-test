// FILE: checkov.js
// PURPOSE: Runs Checkov on Terraform or Kubernetes files and returns compliance findings
// USED BY: backend/src/routes/terraform.js, k8s.js

const { execSync } = require('child_process')
const { enrichAll } = require('../services/explanations')
const { extractRange } = require('../services/codeExtractor')

/**
 * isCheckovInstalled — checks if the checkov binary/command is available
 * @returns {boolean}
 */
function isCheckovInstalled() {
  try {
    execSync('checkov --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * runCheckovOnDirectory — runs Checkov against a directory and returns findings
 * @param {string} dirPath - absolute path to a directory containing .tf or .yaml files
 * @param {string} [framework] - 'terraform' | 'kubernetes' | 'dockerfile' (optional)
 * @returns {Promise<Array>} array of finding objects
 */
async function runCheckovOnDirectory(dirPath, framework) {
  if (!isCheckovInstalled()) {
    return [{
      code:      'TOOL_MISSING',
      severity:  'INFO',
      message:   'Checkov is not installed. Run bash install-tools.sh to install it.',
      line:      null,
      tool:      'checkov',
      title:     'Checkov not installed',
      why:       'Checkov scans Terraform and Kubernetes files for misconfigurations.',
      fix:       'Run: bash install-tools.sh  (installs via pip3)',
      learnMore: 'https://www.checkov.io/',
    }]
  }

  // Build the command — add --framework flag if provided
  const frameworkFlag = framework ? `--framework ${framework}` : ''
  const cmd = `checkov -d "${dirPath}" ${frameworkFlag} --output json --quiet --compact`

  let rawOutput
  try {
    rawOutput = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    })
  } catch (err) {
    // Checkov exits 1 when checks fail — stdout still has JSON
    rawOutput = err.stdout || '{}'
  }

  return parseCheckovOutput(rawOutput)
}

/**
 * runCheckovOnFile — runs Checkov on a single file
 * @param {string} filePath - absolute path to the file
 * @returns {Promise<Array>} array of finding objects
 */
async function runCheckovOnFile(filePath) {
  if (!isCheckovInstalled()) return []

  const cmd = `checkov -f "${filePath}" --output json --quiet --compact`
  let rawOutput
  try {
    rawOutput = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    })
  } catch (err) {
    rawOutput = err.stdout || '{}'
  }

  return parseCheckovOutput(rawOutput)
}

/**
 * parseCheckovOutput — converts Checkov JSON output into our standard finding format
 * @param {string} rawOutput
 * @returns {Array}
 */
function parseCheckovOutput(rawOutput) {
  let parsed
  try {
    // Checkov sometimes outputs multiple JSON objects (one per framework) — take the first valid one
    // Try parsing directly first
    parsed = JSON.parse(rawOutput || '{}')
  } catch {
    // Try to extract first JSON block if there's extra output
    const match = rawOutput.match(/\{[\s\S]*\}/)
    if (match) {
      try { parsed = JSON.parse(match[0]) } catch { return [] }
    } else {
      return []
    }
  }

  // Checkov nests results under "results.failed_checks"
  // Handle both single-framework and multi-framework responses
  let failedChecks = []

  if (Array.isArray(parsed)) {
    // Multi-framework: array of result objects
    for (const item of parsed) {
      failedChecks = failedChecks.concat(item?.results?.failed_checks || [])
    }
  } else if (parsed.results) {
    failedChecks = parsed.results.failed_checks || []
  }

  const rawFindings = failedChecks.map(check => {
    const filePath  = check.repo_file_path || check.file_path || null
    const startLine = check.file_line_range?.[0] || null
    const endLine   = check.file_line_range?.[1] || null

    return {
      code:     check.check_id || 'UNKNOWN',
      severity: mapCheckovSeverity(check.check_id),
      message:  check.check_result?.result === 'failed'
        ? `${check.check_id}: ${check.resource || ''} failed`
        : check.check_id,
      line:        startLine,
      tool:        'checkov',
      resource:    check.resource  || '',
      guideline:   check.guideline || '',
      // Extract the actual code block that failed the check
      codeSnippet: filePath && startLine
        ? extractRange(filePath, startLine, endLine, 1)
        : null,
    }
  })

  return enrichAll(rawFindings)
}

/**
 * mapCheckovSeverity — guesses severity from the check ID prefix
 * Checkov doesn't always include severity in its JSON output
 * @param {string} checkId - e.g. "CKV_K8S_16"
 * @returns {string} severity level
 */
function mapCheckovSeverity(checkId) {
  if (!checkId) return 'MEDIUM'
  const id = checkId.toUpperCase()

  // Known critical checks
  if (['CKV_K8S_16', 'CKV_DOCKER_3', 'CKV_K8S_28'].includes(id)) return 'HIGH'
  if (id.startsWith('CKV_DOCKER')) return 'HIGH'
  if (id.startsWith('CKV_K8S'))   return 'MEDIUM'
  if (id.startsWith('CKV_AZURE')) return 'HIGH'
  if (id.startsWith('CKV_AWS'))   return 'HIGH'
  if (id.startsWith('CKV_GCP'))   return 'MEDIUM'
  if (id.startsWith('CKV_TF'))    return 'MEDIUM'
  return 'MEDIUM'
}

module.exports = { runCheckovOnDirectory, runCheckovOnFile, isCheckovInstalled }
