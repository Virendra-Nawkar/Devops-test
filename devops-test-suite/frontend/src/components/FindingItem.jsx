// FILE: FindingItem.jsx
// PURPOSE: Accordion row for a single finding — click to expand the plain-English why + fix
// USED BY: frontend/src/components/FindingsList.jsx

import React, { useState } from 'react'
import SeverityBadge from './SeverityBadge.jsx'

/**
 * FindingItem — collapsible finding card
 *
 * @param {Object} finding - a finding object from the backend:
 *   { code, severity, title, message, line, tool, why, fix, learnMore }
 * @param {number} index   - index in the findings array (used for staggered animation)
 */
function FindingItem({ finding, index }) {
  const [expanded, setExpanded] = useState(false)

  const {
    code       = 'UNKNOWN',
    severity   = 'INFO',
    title      = finding.message || 'Finding',
    message    = '',
    line       = null,
    tool       = '',
    why        = '',
    fix        = '',
    learnMore  = '',
  } = finding

  return (
    <div
      className="border border-border rounded-lg overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
    >
      {/* ── Collapsed header (always visible) ───────────────────── */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Severity badge */}
        <div className="flex-shrink-0 mt-0.5">
          <SeverityBadge severity={severity} />
        </div>

        {/* Title + code + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary leading-snug truncate">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-text-muted">{code}</span>
            {tool && (
              <span className="text-[10px] text-text-muted bg-border px-1.5 py-0.5 rounded">
                {tool}
              </span>
            )}
            {line && (
              <span className="text-[10px] text-text-muted">
                Line {line}
              </span>
            )}
          </div>
        </div>

        {/* Chevron icon — rotates when expanded */}
        <svg
          width="16" height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 mt-0.5 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z"/>
        </svg>
      </button>

      {/* ── Expanded detail panel ─────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border bg-black/20 px-4 py-4 space-y-4 animate-fade-in">

          {/* Raw scanner message (if different from title) */}
          {message && message !== title && (
            <p className="text-xs font-mono text-text-muted bg-bg px-3 py-2 rounded-lg border border-border">
              {message}
            </p>
          )}

          {/* Why this matters */}
          {why && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-yellow uppercase tracking-wide mb-1.5">
                <span>⚠️</span> Why this matters
              </h4>
              <p className="text-sm text-text-muted leading-relaxed">{why}</p>
            </div>
          )}

          {/* How to fix it */}
          {fix && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-green uppercase tracking-wide mb-1.5">
                <span>🔧</span> How to fix it
              </h4>
              <pre className="text-xs font-mono text-text-primary bg-bg px-3 py-3 rounded-lg border border-border overflow-x-auto whitespace-pre-wrap">
                {fix}
              </pre>
            </div>
          )}

          {/* Learn more */}
          {learnMore && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-blue uppercase tracking-wide mb-1">
                <span>📚</span> Learn more
              </h4>
              <p className="text-xs text-text-muted">{learnMore}</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default FindingItem
