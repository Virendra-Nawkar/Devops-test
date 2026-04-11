// FILE: FindingsList.jsx
// PURPOSE: Shows the score header + a scrollable list of collapsible FindingItem rows
// USED BY: frontend/src/App.jsx

import React, { useState } from 'react'
import FindingItem from './FindingItem.jsx'
import { SeverityDot } from './SeverityBadge.jsx'

// Severity display order (most severe first)
const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

/**
 * FindingsList — renders the full results panel for a completed scan
 *
 * @param {Object} result - scan result from the backend:
 *   { score, grade, color, summary, findings, fileName, scannedAt }
 * @param {string} type   - 'docker' | 'k8s' | 'terraform'
 */
function FindingsList({ result, type }) {
  const [filter, setFilter] = useState('ALL')  // active severity filter

  const { score, grade, summary = {}, findings = [], fileName, scannedAt } = result

  // Score colour
  const scoreColor =
    score >= 80 ? '#238636' :
    score >= 50 ? '#d29922' :
                  '#da3633'

  // Apply severity filter
  const filtered = filter === 'ALL'
    ? findings
    : findings.filter(f => (f.severity || 'INFO').toUpperCase() === filter)

  // Sort by severity
  const sorted = [...filtered].sort((a, b) => {
    const ai = SEVERITY_ORDER.indexOf((a.severity || 'INFO').toUpperCase())
    const bi = SEVERITY_ORDER.indexOf((b.severity || 'INFO').toUpperCase())
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const TYPE_LABELS = { docker: 'Dockerfile', k8s: 'Kubernetes', terraform: 'Terraform' }

  return (
    <div className="card space-y-4 animate-fade-in">

      {/* ── Score header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">
            {TYPE_LABELS[type] || type} Scan Results
          </p>
          {fileName && (
            <p className="text-xs font-mono text-text-muted mt-0.5 truncate max-w-[220px]">
              📄 {fileName}
            </p>
          )}
        </div>
        {/* Big score number */}
        <div className="text-right">
          <div
            className="text-4xl font-bold leading-none"
            style={{ color: scoreColor }}
          >
            {score}
          </div>
          <div className="text-xs text-text-muted mt-0.5">{grade}</div>
        </div>
      </div>

      {/* ── Severity summary pills ────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SEVERITY_ORDER.map(sev => {
          const count = summary[sev] || 0
          if (count === 0) return null
          return (
            <button
              key={sev}
              onClick={() => setFilter(f => f === sev ? 'ALL' : sev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === sev
                  ? 'border-accent-blue text-accent-blue bg-blue-500/10'
                  : 'border-border text-text-muted hover:border-text-muted'
              }`}
            >
              <SeverityDot severity={sev} />
              {count} {sev}
            </button>
          )
        })}
        {findings.length > 0 && (
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'ALL'
                ? 'border-accent-blue text-accent-blue bg-blue-500/10'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            ALL ({findings.length})
          </button>
        )}
      </div>

      {/* ── Findings accordion list ───────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="text-center py-10">
          {findings.length === 0 ? (
            <>
              <div className="text-4xl mb-2">✅</div>
              <p className="text-text-primary font-semibold">No findings — score: 100</p>
              <p className="text-sm text-text-muted mt-1">All checks passed for this file.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">No {filter} findings in this scan.</p>
              <button onClick={() => setFilter('ALL')} className="text-xs text-accent-blue mt-1 hover:underline">
                Show all findings
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {sorted.map((finding, i) => (
            <FindingItem key={`${finding.code}-${i}`} finding={finding} index={i} />
          ))}
        </div>
      )}

      {/* ── Footer: scan timestamp ────────────────────────────────── */}
      {scannedAt && (
        <p className="text-[10px] text-text-muted text-right">
          Scanned at {new Date(scannedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default FindingsList
