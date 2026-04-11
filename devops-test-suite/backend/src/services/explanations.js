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
    // No match in our database — use data the scanner itself already provides.
    // tfsec always includes:  impact (why) + resolution (fix) + links[0] (learnMore)
    // checkov includes:       guideline URL
    // hadolint includes:      message (the rule text itself)
    // Anything is better than "check the docs".

    const why = rawFinding.impact
      ? rawFinding.impact
      : rawFinding.message
      ? `Rule ${code}: ${rawFinding.message}`
      : `No explanation found for rule ${code}.`

    const fix = rawFinding.resolution
      ? rawFinding.resolution
      : rawFinding.guideline
      ? `See the full remediation guide at:\n${rawFinding.guideline}`
      : `Search for "${code}" in the ${rawFinding.tool || 'scanner'} documentation.`

    const learnMore = rawFinding.guideline
      ? rawFinding.guideline
      : rawFinding.links
      ? rawFinding.links
      : `Search: "${code} ${rawFinding.tool || ''} fix" for detailed guidance.`

    return {
      code:        rawFinding.code      || 'UNKNOWN',
      severity:    rawFinding.severity  || 'INFO',
      message:     rawFinding.message   || 'No description available',
      line:        rawFinding.line      || null,
      tool:        rawFinding.tool      || 'unknown',
      title:       rawFinding.title     || rawFinding.message || code,
      why,
      fix,
      learnMore,
      codeSnippet: rawFinding.codeSnippet || null,
    }
  }

  return {
    code:        code,
    severity:    explanation.severity  || rawFinding.severity  || 'INFO',
    message:     rawFinding.message    || explanation.title    || '',
    line:        rawFinding.line       || null,
    tool:        explanation.tool      || rawFinding.tool      || 'unknown',
    title:       explanation.title,
    why:         explanation.why,
    fix:         explanation.fix,
    learnMore:   explanation.learnMore,
    codeSnippet: rawFinding.codeSnippet || null,
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
