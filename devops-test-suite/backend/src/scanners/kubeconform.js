// FILE: kubeconform.js
// PURPOSE: Runs kubeconform on a Kubernetes YAML file to validate its schema
// USED BY: backend/src/routes/k8s.js

const { execSync } = require('child_process')
const { enrich } = require('../services/explanations')

/**
 * isKubeconformInstalled — checks if kubeconform binary is on PATH
 * @returns {boolean}
 */
function isKubeconformInstalled() {
  try {
    execSync('kubeconform -v', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * runKubeconform — validates a Kubernetes YAML file against the official API schema
 * @param {string} filePath - absolute path to a Kubernetes YAML file
 * @returns {Promise<Array>} array of finding objects (empty = all valid)
 */
async function runKubeconform(filePath) {
  if (!isKubeconformInstalled()) {
    return [{
      code:      'TOOL_MISSING',
      severity:  'INFO',
      message:   'kubeconform is not installed. Run bash install-tools.sh to install it.',
      line:      null,
      tool:      'kubeconform',
      title:     'kubeconform not installed',
      why:       'kubeconform validates that your Kubernetes YAML matches the official API schema.',
      fix:       'Run: bash install-tools.sh',
      learnMore: 'https://github.com/yannh/kubeconform',
    }]
  }

  let rawOutput
  try {
    // -output json  → JSON output per resource
    // -summary      → include a summary section
    // -strict       → fail on unknown fields
    rawOutput = execSync(
      `kubeconform -output json -summary -strict "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 }
    )
  } catch (err) {
    // kubeconform exits non-zero when validation fails
    rawOutput = err.stdout || ''
  }

  return parseKubeconformOutput(rawOutput)
}

/**
 * parseKubeconformOutput — parses kubeconform JSON output into our finding format
 * kubeconform outputs one JSON object per line (JSONL format)
 * @param {string} rawOutput
 * @returns {Array} finding objects
 */
function parseKubeconformOutput(rawOutput) {
  const findings = []
  const lines = (rawOutput || '').split('\n').filter(l => l.trim())

  for (const line of lines) {
    let item
    try {
      item = JSON.parse(line)
    } catch {
      continue
    }

    // Each line is a validation result for one resource
    // Status can be: valid, invalid, error, skipped
    if (item.status === 'invalid' || item.status === 'error') {
      const resourceName = item.resource?.name || item.filename || 'unknown'
      const kind         = item.resource?.kind || 'Resource'
      const msg          = item.msg || item.validationErrors?.[0]?.path || 'Schema validation failed'

      findings.push(enrich({
        code:     'K8S_SCHEMA_INVALID',
        severity: 'HIGH',
        message:  `${kind}/${resourceName}: ${msg}`,
        line:     null,
        tool:     'kubeconform',
        title:    'Kubernetes YAML schema validation failed',
        why:      'Your YAML does not match the official Kubernetes API schema. This will cause kubectl apply to fail or behave unexpectedly.',
        fix:      'Check the Kubernetes API reference for the correct field names and types for this resource kind.',
        learnMore: 'Study: Kubernetes API reference, apiVersion/kind, field validation',
      }))
    }
  }

  return findings
}

module.exports = { runKubeconform, isKubeconformInstalled }
