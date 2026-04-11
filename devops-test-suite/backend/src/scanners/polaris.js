// FILE: polaris.js
// PURPOSE: Runs the Polaris CLI to audit a Kubernetes YAML file for best practice violations
// USED BY: backend/src/routes/k8s.js

const { execSync } = require('child_process')
const { enrichAll } = require('../services/explanations')

/**
 * isPolarisInstalled — checks if polaris binary is on PATH
 * @returns {boolean}
 */
function isPolarisInstalled() {
  try {
    execSync('polaris version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * runPolaris — runs 'polaris audit' on a Kubernetes YAML file
 * @param {string} filePath - absolute path to the YAML file
 * @returns {Promise<Array>} array of finding objects
 */
async function runPolaris(filePath) {
  if (!isPolarisInstalled()) {
    return [{
      code:      'TOOL_MISSING',
      severity:  'INFO',
      message:   'Polaris is not installed. Run bash install-tools.sh to install it.',
      line:      null,
      tool:      'polaris',
      title:     'Polaris not installed',
      why:       'Polaris checks Kubernetes workloads against Fairwinds best practices.',
      fix:       'Run: bash install-tools.sh',
      learnMore: 'https://github.com/FairwindsOps/polaris',
    }]
  }

  let rawOutput
  try {
    // --audit-path  → file or directory to audit
    // --format json → JSON output
    rawOutput = execSync(
      `polaris audit --audit-path "${filePath}" --format json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }
    )
  } catch (err) {
    rawOutput = err.stdout || '{}'
  }

  return parsePolarisOutput(rawOutput)
}

/**
 * parsePolarisOutput — extracts failures from the Polaris JSON audit report
 * @param {string} rawOutput
 * @returns {Array} finding objects
 */
function parsePolarisOutput(rawOutput) {
  let parsed
  try {
    parsed = JSON.parse(rawOutput || '{}')
  } catch {
    console.error('[polaris] Failed to parse JSON output')
    return []
  }

  const findings = []

  // Polaris nests results under Results → [workload] → PodResult → ContainerResults
  const results = parsed.Results || []

  for (const workloadResult of results) {
    const podResult = workloadResult.PodResult || {}
    const workloadName = workloadResult.Name || 'unknown'
    const workloadKind = workloadResult.Kind || 'Workload'

    // Pod-level checks
    processChecks(
      podResult.Results || {},
      workloadName,
      workloadKind,
      findings
    )

    // Container-level checks
    const containers = podResult.ContainerResults || []
    for (const container of containers) {
      processChecks(
        container.Results || {},
        `${workloadName}/${container.Name || 'container'}`,
        workloadKind,
        findings
      )
    }
  }

  return enrichAll(findings)
}

/**
 * processChecks — iterates over a Polaris Results map and extracts failures
 * @param {Object} checksMap - { checkName: { Success: bool, Severity: string, Message: string } }
 * @param {string} resourceName
 * @param {string} kind
 * @param {Array}  findings - mutated in place
 */
function processChecks(checksMap, resourceName, kind, findings) {
  for (const [checkName, result] of Object.entries(checksMap)) {
    // Only report failures (not successes or warnings that passed)
    if (result.Success === false) {
      findings.push({
        code:     checkName,                          // e.g. "runAsNonRoot"
        severity: mapPolarisSeverity(result.Severity),
        message:  `${kind}/${resourceName}: ${result.Message || checkName}`,
        line:     null,
        tool:     'polaris',
      })
    }
  }
}

/**
 * mapPolarisSeverity — converts Polaris severity strings to our standard labels
 * @param {string} sev - 'danger' | 'warning' | 'ignore'
 * @returns {string}
 */
function mapPolarisSeverity(sev) {
  const s = (sev || '').toLowerCase()
  if (s === 'danger')   return 'HIGH'
  if (s === 'warning')  return 'MEDIUM'
  if (s === 'error')    return 'HIGH'
  if (s === 'critical') return 'CRITICAL'
  return 'LOW'
}

module.exports = { runPolaris, isPolarisInstalled }
