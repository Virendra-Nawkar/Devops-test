// FILE: trivy.js
// PURPOSE: Runs Trivy CVE scanner on a Docker image name or filesystem path and returns findings
// USED BY: backend/src/routes/docker.js

const { execSync } = require('child_process')
const { enrich } = require('../services/explanations')

/**
 * isTrivyInstalled — checks if the trivy binary is on PATH
 * @returns {boolean}
 */
function isTrivyInstalled() {
  try {
    execSync('trivy --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * runTrivyOnImage — scans a remote/local Docker image for CVEs
 * @param {string} imageName - e.g. "ubuntu:22.04" or "myapp:1.0"
 * @returns {Promise<Array>} array of finding objects
 */
async function runTrivyOnImage(imageName) {
  if (!isTrivyInstalled()) {
    return [{
      code:      'TOOL_MISSING',
      severity:  'INFO',
      message:   'Trivy is not installed. Run bash install-tools.sh to install it.',
      line:      null,
      tool:      'trivy',
      title:     'Trivy not installed',
      why:       'Trivy scans Docker images for known CVEs.',
      fix:       'Run: bash install-tools.sh',
      learnMore: 'https://github.com/aquasecurity/trivy',
    }]
  }

  let rawOutput
  try {
    // --format json outputs structured JSON
    // --no-progress suppresses the progress bar in CI/server environments
    // --exit-code 0 so we don't throw when vulnerabilities are found
    rawOutput = execSync(
      `trivy image --format json --no-progress --exit-code 0 "${imageName}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }
    )
  } catch (err) {
    rawOutput = err.stdout || '{}'
    console.error('[trivy] Error running trivy image scan:', err.message)
  }

  return parseTrivyOutput(rawOutput)
}

/**
 * runTrivyOnFilesystem — scans a directory/file for vulnerabilities (for uploaded configs)
 * @param {string} dirPath - absolute path to scan
 * @returns {Promise<Array>} array of finding objects
 */
async function runTrivyOnFilesystem(dirPath) {
  if (!isTrivyInstalled()) return []

  let rawOutput
  try {
    rawOutput = execSync(
      `trivy fs --format json --no-progress --exit-code 0 "${dirPath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }
    )
  } catch (err) {
    rawOutput = err.stdout || '{}'
  }

  return parseTrivyOutput(rawOutput)
}

/**
 * parseTrivyOutput — parses the Trivy JSON output into our standard finding format
 * @param {string} rawOutput - JSON string from trivy
 * @returns {Array} finding objects
 */
function parseTrivyOutput(rawOutput) {
  let parsed
  try {
    parsed = JSON.parse(rawOutput || '{}')
  } catch {
    console.error('[trivy] Failed to parse JSON output')
    return []
  }

  const findings = []
  const results = parsed.Results || []

  for (const result of results) {
    const vulns = result.Vulnerabilities || []
    for (const vuln of vulns) {
      const raw = {
        code:     vuln.VulnerabilityID || 'CVE-UNKNOWN',
        severity: (vuln.Severity || 'UNKNOWN').toUpperCase(),
        message:  vuln.Title || vuln.Description || 'CVE vulnerability found',
        line:     null,
        tool:     'trivy',
        title:    vuln.Title || vuln.VulnerabilityID,
        // Trivy provides its own remediation
        why:      `Package: ${vuln.PkgName || 'unknown'} v${vuln.InstalledVersion || '?'} has a known vulnerability.`,
        fix:      vuln.FixedVersion
          ? `Upgrade ${vuln.PkgName} to version ${vuln.FixedVersion}`
          : 'No fix available yet — consider replacing this package.',
        learnMore: (vuln.References || [])[0] || `https://nvd.nist.gov/vuln/detail/${vuln.VulnerabilityID}`,
      }
      findings.push(raw)
    }
  }

  return findings
}

module.exports = { runTrivyOnImage, runTrivyOnFilesystem, isTrivyInstalled }
