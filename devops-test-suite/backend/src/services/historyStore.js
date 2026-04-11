// FILE: historyStore.js
// PURPOSE: Reads and writes the last 10 scan results to a local JSON file — no database needed
// USED BY: backend/src/routes/docker.js, k8s.js, terraform.js, scan.js

const fs   = require('fs')
const path = require('path')

// Where to store the history file — controlled by .env, defaults to backend root
const HISTORY_PATH = path.resolve(
  process.cwd(),
  process.env.HISTORY_FILE || './scan-history.json'
)

// Maximum number of history entries to keep
const MAX_HISTORY = 10

/**
 * readHistory — reads all stored scan results from disk
 * Returns an empty array if the file does not exist yet
 * @returns {Array} array of scan result objects
 */
function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return []
    const raw = fs.readFileSync(HISTORY_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    // If the file is corrupt, start fresh rather than crashing
    console.error('[historyStore] Failed to read history file:', err.message)
    return []
  }
}

/**
 * saveToHistory — prepends a new scan result and keeps only the last MAX_HISTORY entries
 * @param {Object} entry - the scan result to save
 *   Required fields: { type, fileName, score, grade, summary, timestamp }
 */
function saveToHistory(entry) {
  try {
    const history = readHistory()

    // Add timestamp if not already set
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString()
    }

    // Prepend the new entry and trim to max size
    const updated = [entry, ...history].slice(0, MAX_HISTORY)

    // Ensure the directory exists before writing
    const dir = path.dirname(HISTORY_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(HISTORY_PATH, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (err) {
    // Don't crash the API if we can't write history
    console.error('[historyStore] Failed to save history:', err.message)
  }
}

/**
 * clearHistory — wipes the history file (useful for testing)
 */
function clearHistory() {
  try {
    fs.writeFileSync(HISTORY_PATH, '[]', 'utf-8')
  } catch (err) {
    console.error('[historyStore] Failed to clear history:', err.message)
  }
}

module.exports = { readHistory, saveToHistory, clearHistory }
