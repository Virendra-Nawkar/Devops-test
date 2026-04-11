// FILE: HistoryPanel.jsx
// PURPOSE: Slide-in side panel showing the last 10 scan results from the backend history store
// USED BY: frontend/src/App.jsx

import React from 'react'

// Map scan type to display icon and label
const TYPE_META = {
  docker:    { icon: '🐳', label: 'Dockerfile' },
  k8s:       { icon: '☸️', label: 'Kubernetes' },
  terraform: { icon: '🏗️', label: 'Terraform'  },
}

/**
 * HistoryPanel — fixed overlay panel that slides in from the right
 *
 * @param {Array}    history  - array of history entry objects
 * @param {Function} onClose  - called when the user clicks the close button or backdrop
 */
function HistoryPanel({ history, onClose }) {
  return (
    <>
      {/* Semi-transparent backdrop — click to close */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 flex flex-col animate-slide-in-right shadow-2xl">

        {/* Panel header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Scan History</h2>
            <p className="text-xs text-text-muted mt-0.5">Last {Math.min(history.length, 10)} scans</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-border transition-colors text-text-muted hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L7 5.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L8.06 7l3.72 3.72a.75.75 0 1 1-1.06 1.06L7 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L5.94 7 2.22 3.28a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-text-muted">No scans yet.</p>
              <p className="text-xs text-text-muted mt-1">Upload a file to get started.</p>
            </div>
          ) : (
            history.map((entry, i) => (
              <HistoryEntry key={entry.id || i} entry={entry} />
            ))
          )}
        </div>

        {/* Panel footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-text-muted text-center">
            History stored locally in <code className="font-mono">scan-history.json</code>
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * HistoryEntry — a single row in the history panel
 */
function HistoryEntry({ entry }) {
  const { type, score, grade, summary = {}, fileName, fileNames, timestamp } = entry
  const meta = TYPE_META[type] || { icon: '📄', label: type }

  // Pick score colour
  const scoreColor =
    score >= 80 ? '#238636' :
    score >= 50 ? '#d29922' :
                  '#da3633'

  // Format the timestamp nicely
  const timeStr = timestamp
    ? new Date(timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  // File display name
  const displayName = fileName || (fileNames ? fileNames[0] : '') || ''

  return (
    <div className="bg-bg border border-border rounded-lg p-3 hover:border-text-muted/40 transition-colors">
      {/* Row 1: icon + type + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span className="text-sm font-medium text-text-primary">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold" style={{ color: scoreColor }}>{score}</span>
          <span className="text-xs text-text-muted">{grade}</span>
        </div>
      </div>

      {/* Row 2: file name */}
      {displayName && (
        <p className="text-xs font-mono text-text-muted mt-1 truncate">{displayName}</p>
      )}

      {/* Row 3: summary pills */}
      <div className="flex flex-wrap gap-1 mt-2">
        {summary.CRITICAL > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
            {summary.CRITICAL}C
          </span>
        )}
        {summary.HIGH > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400">
            {summary.HIGH}H
          </span>
        )}
        {summary.MEDIUM > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400">
            {summary.MEDIUM}M
          </span>
        )}
        {summary.LOW > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">
            {summary.LOW}L
          </span>
        )}
      </div>

      {/* Row 4: timestamp */}
      {timeStr && (
        <p className="text-[10px] text-text-muted mt-1.5">{timeStr}</p>
      )}
    </div>
  )
}

export default HistoryPanel
