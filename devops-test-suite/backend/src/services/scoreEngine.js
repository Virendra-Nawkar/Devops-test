// FILE: scoreEngine.js
// PURPOSE: Calculates a security score (0-100) from a list of findings and assigns a letter grade
// USED BY: backend/src/routes/docker.js, k8s.js, terraform.js

// ── Point deductions per severity ────────────────────────────────────────────
// CRITICAL = -20 points, HIGH = -10, MEDIUM = -5, LOW = -2, INFO = 0
const DEDUCTIONS = {
  CRITICAL: 20,
  HIGH:     10,
  MEDIUM:    5,
  LOW:       2,
  INFO:      0,
  UNKNOWN:   2, // treat unknown severity as LOW
}

/**
 * calculateScore — turns an array of findings into a numeric score 0-100
 * @param {Array} findings - array of finding objects with a .severity property
 * @returns {number} score between 0 and 100
 */
function calculateScore(findings) {
  // Start with a perfect score
  let score = 100

  // Deduct points for each finding based on severity
  for (const finding of findings) {
    const severity = (finding.severity || 'INFO').toUpperCase()
    const deduction = DEDUCTIONS[severity] ?? 2
    score -= deduction
  }

  // Score can never go below 0
  return Math.max(0, score)
}

/**
 * getGrade — converts a numeric score to a human-readable grade
 * @param {number} score - 0 to 100
 * @returns {string} grade label
 */
function getGrade(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Needs Work'
  return 'Critical Issues'
}

/**
 * getScoreColor — returns the theme color key for a given score
 * Used by the frontend to pick the right color for badges and charts
 * @param {number} score
 * @returns {string} 'green' | 'yellow' | 'red'
 */
function getScoreColor(score) {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

/**
 * buildScoreResult — combines score, grade, color, and findings into one response object
 * @param {Array} findings - enriched finding objects
 * @returns {{ score, grade, color, summary, findings }}
 */
function buildScoreResult(findings) {
  const score = calculateScore(findings)
  const grade = getGrade(score)
  const color = getScoreColor(score)

  // Count findings by severity for the summary
  const summary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 }
  for (const f of findings) {
    const sev = (f.severity || 'INFO').toUpperCase()
    if (summary[sev] !== undefined) summary[sev]++
    else summary.INFO++
  }

  return { score, grade, color, summary, findings }
}

module.exports = { calculateScore, getGrade, getScoreColor, buildScoreResult }
