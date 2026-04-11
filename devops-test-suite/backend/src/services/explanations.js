// FILE: explanations.js
// PURPOSE: Enriches raw scanner findings with plain-English titles, why, and fix from explanations.json
// USED BY: backend/src/scanners/hadolint.js, trivy.js, tfsec.js, checkov.js, kubeconform.js, polaris.js

const path = require('path')

// Load the explanations database once at startup
const EXPLANATIONS_PATH = path.join(__dirname, '../data/explanations.json')
let db = {}

try {
  db = require(EXPLANATIONS_PATH)
  console.log(`[explanations] Loaded ${Object.keys(db).length} explanation entries`)
} catch (err) {
  console.error('[explanations] Failed to load explanations.json:', err.message)
}

/**
 * enrich — looks up a finding code in the explanations database and merges in the
 *          human-readable fields (title, why, fix, learnMore)
 *
 * @param {Object} rawFinding - the raw finding from a scanner CLI
 *   Expected fields: { code, severity, message, line, tool }
 * @returns {Object} finding with title, why, fix, learnMore merged in
 */
function enrich(rawFinding) {
  const code = rawFinding.code || ''
  const explanation = db[code] || null

  if (!explanation) {
    // No match in our database — return the raw finding with defaults
    return {
      code:      rawFinding.code      || 'UNKNOWN',
      severity:  rawFinding.severity  || 'INFO',
      message:   rawFinding.message   || 'No description available',
      line:      rawFinding.line      || null,
      tool:      rawFinding.tool      || 'unknown',
      title:     rawFinding.title     || rawFinding.message || 'Finding',
      why:       'No explanation available yet for this rule.',
      fix:       'Check the tool documentation for remediation guidance.',
      learnMore: 'Refer to the official tool documentation.',
    }
  }

  return {
    code:      code,
    severity:  explanation.severity  || rawFinding.severity  || 'INFO',
    message:   rawFinding.message    || explanation.title    || '',
    line:      rawFinding.line       || null,
    tool:      explanation.tool      || rawFinding.tool      || 'unknown',
    title:     explanation.title,
    why:       explanation.why,
    fix:       explanation.fix,
    learnMore: explanation.learnMore,
  }
}

/**
 * enrichAll — maps enrich() over an array of raw findings
 * @param {Array} rawFindings
 * @returns {Array} enriched findings
 */
function enrichAll(rawFindings) {
  return rawFindings.map(enrich)
}

/**
 * getExplanation — returns the full explanation object for a code, or null
 * @param {string} code
 * @returns {Object|null}
 */
function getExplanation(code) {
  return db[code] || null
}

module.exports = { enrich, enrichAll, getExplanation }
