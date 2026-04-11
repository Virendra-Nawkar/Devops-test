// FILE: codeExtractor.js
// PURPOSE: Reads a source file from disk and extracts a code snippet around a target line number
// USED BY: backend/src/scanners/hadolint.js, tfsec.js, checkov.js

const fs = require('fs')

/**
 * extractSnippet — returns a few lines around a single error line
 *
 * Example output for lineNumber=5, context=2:
 *   [ { lineNum: 3, content: 'FROM ubuntu', isError: false },
 *     { lineNum: 4, content: 'RUN apt-get update', isError: false },
 *     { lineNum: 5, content: 'USER root', isError: true },   ← highlighted red
 *     { lineNum: 6, content: 'CMD python3 app.py', isError: false } ]
 *
 * @param {string} filePath   - absolute path to the file on disk
 * @param {number} lineNumber - 1-based line number of the error
 * @param {number} [context]  - lines above and below to include (default 2)
 * @returns {Array|null}
 */
function extractSnippet(filePath, lineNumber, context = 2) {
  if (!filePath || !lineNumber) return null

  try {
    if (!fs.existsSync(filePath)) return null

    const allLines = fs.readFileSync(filePath, 'utf-8').split('\n')

    // Convert to 0-indexed and clamp to file bounds
    const startIdx = Math.max(0, lineNumber - 1 - context)
    const endIdx   = Math.min(allLines.length - 1, lineNumber - 1 + context)

    return allLines.slice(startIdx, endIdx + 1).map((content, i) => ({
      lineNum: startIdx + i + 1,       // back to 1-based
      content: content.trimEnd(),       // strip trailing whitespace
      isError: (startIdx + i + 1) === lineNumber,
    }))
  } catch (err) {
    console.error('[codeExtractor] Failed to read snippet:', err.message)
    return null
  }
}

/**
 * extractRange — returns the lines covering a start–end block (e.g. a Terraform resource)
 * Used by tfsec and checkov which report a start + end line for a whole block.
 *
 * @param {string} filePath
 * @param {number} startLine - first line of the problematic block (1-based)
 * @param {number} [endLine] - last line of the block (1-based, defaults to startLine)
 * @param {number} [context] - extra lines before/after the block
 * @returns {Array|null}
 */
function extractRange(filePath, startLine, endLine, context = 1) {
  if (!filePath || !startLine) return null

  try {
    if (!fs.existsSync(filePath)) return null

    const allLines = fs.readFileSync(filePath, 'utf-8').split('\n')
    const last     = endLine || startLine

    const startIdx = Math.max(0, startLine - 1 - context)
    const endIdx   = Math.min(allLines.length - 1, last - 1 + context)

    return allLines.slice(startIdx, endIdx + 1).map((content, i) => ({
      lineNum: startIdx + i + 1,
      content: content.trimEnd(),
      // Mark every line inside the reported block as the error region
      isError: (startIdx + i + 1) >= startLine && (startIdx + i + 1) <= last,
    }))
  } catch (err) {
    console.error('[codeExtractor] Failed to read range:', err.message)
    return null
  }
}

module.exports = { extractSnippet, extractRange }
