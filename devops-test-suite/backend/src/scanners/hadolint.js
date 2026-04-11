// FILE: hadolint.js
// PURPOSE: Runs the hadolint CLI on an uploaded Dockerfile and returns structured findings
// USED BY: backend/src/routes/docker.js

const { execSync } = require('child_process')
const { enrichAll } = require('../services/explanations')
const { extractSnippet } = require('../services/codeExtractor')

// Map hadolint severity levels to our standard severity labels
const SEVERITY_MAP = {
  error:   'HIGH',
  warning: 'MEDIUM',
  info:    'LOW',
  style:   'LOW',
}

/**
 * isHadolintInstalled — checks if the hadolint binary is available on PATH
 * @returns {boolean}
 */
function isHadolintInstalled() {
  try {
    execSync('hadolint --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * runHadolint — runs hadolint on a Dockerfile and returns enriched findings
 * @param {string} filePath - absolute path to the Dockerfile on disk
 * @returns {Promise<Array>} array of finding objects
 */
async function runHadolint(filePath) {
  if (!isHadolintInstalled()) {
    // Return a single INFO finding explaining the tool is missing
    return [{
      code:      'TOOL_MISSING',
      severity:  'INFO',
      message:   'hadolint is not installed. Run bash install-tools.sh to install it.',
      line:      null,
      tool:      'hadolint',
      title:     'hadolint not installed',
      why:       'hadolint is required to lint Dockerfiles.',
      fix:       'Run: bash install-tools.sh',
      learnMore: 'https://github.com/hadolint/hadolint',
    }]
  }

  let rawOutput
  try {
    // --format json outputs a JSON array of findings
    // 2>&1 captures stderr too; hadolint exits non-zero when it finds issues
    rawOutput = execSync(`hadolint --format json "${filePath}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      // Allow non-zero exit (hadolint exits 1 when findings exist)
    })
  } catch (err) {
    // execSync throws when exit code != 0 — but the JSON output is in err.stdout
    rawOutput = err.stdout || '[]'
  }

  let parsed
  try {
    parsed = JSON.parse(rawOutput || '[]')
  } catch {
    console.error('[hadolint] Failed to parse JSON output:', rawOutput)
    return []
  }

  // Convert hadolint output format to our standard finding format
  // codeSnippet: extract the actual lines from the file so the user sees exactly
  // what triggered the rule (hadolint always provides a line number)
  const rawFindings = parsed.map(item => ({
    code:        item.code     || 'DL0000',
    severity:    SEVERITY_MAP[(item.level || 'info').toLowerCase()] || 'LOW',
    message:     item.message  || '',
    line:        item.line     || null,
    tool:        'hadolint',
    codeSnippet: item.line ? extractSnippet(filePath, item.line, 2) : null,
  }))

  // Enrich with plain-English explanations from our database
  return enrichAll(rawFindings)
}

module.exports = { runHadolint, isHadolintInstalled }
