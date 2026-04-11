// FILE: FindingItem.jsx
// PURPOSE: Accordion row for a single finding — click to expand code snippet + why + fix
// USED BY: frontend/src/components/FindingsList.jsx

import React, { useState } from 'react'
import SeverityBadge from './SeverityBadge.jsx'

/**
 * FindingItem — collapsible finding card
 *
 * @param {Object} finding - enriched finding object:
 *   { code, severity, title, message, line, tool, why, fix, learnMore, codeSnippet }
 * @param {number} index   - position in the list (used for staggered fade-in)
 */
function FindingItem({ finding, index }) {
  const [expanded, setExpanded] = useState(false)

  const {
    code        = 'UNKNOWN',
    severity    = 'INFO',
    title       = finding.message || 'Finding',
    message     = '',
    line        = null,
    tool        = '',
    why         = '',
    fix         = '',
    learnMore   = '',
    codeSnippet = null,
  } = finding

  return (
    <div
      className="border border-border rounded-lg overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
    >
      {/* ── Collapsed header (always visible) ──────────────────────── */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-shrink-0 mt-0.5">
          <SeverityBadge severity={severity} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary leading-snug truncate">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-mono text-text-muted">{code}</span>
            {tool && (
              <span className="text-[10px] text-text-muted bg-border px-1.5 py-0.5 rounded">
                {tool}
              </span>
            )}
            {line && (
              <span className="text-[10px] text-accent-blue font-mono">
                Line {line}
              </span>
            )}
          </div>
        </div>

        {/* Chevron — rotates when expanded */}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 mt-0.5 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z"/>
        </svg>
      </button>

      {/* ── Expanded detail panel ────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-border bg-black/20 divide-y divide-border/50">

          {/* 1. CODE SNIPPET — the actual lines from the uploaded file */}
          {codeSnippet && codeSnippet.length > 0 && (
            <div className="px-4 py-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-blue uppercase tracking-wide mb-2">
                <span>📍</span>
                Problematic code
                {line && <span className="normal-case font-mono font-normal text-text-muted ml-1">— line {line}</span>}
              </h4>

              {/* Line-numbered code block */}
              <div className="rounded-lg border border-border overflow-hidden text-xs font-mono">
                {/* File header bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-border/40 border-b border-border">
                  <span className="text-text-muted">📄</span>
                  <span className="text-text-muted">your file</span>
                </div>

                {/* Lines */}
                {codeSnippet.map(({ lineNum, content, isError }) => (
                  <div
                    key={lineNum}
                    className={`flex items-stretch ${
                      isError
                        ? 'bg-red-950/60 border-l-2 border-accent-red'
                        : 'bg-bg/80'
                    }`}
                  >
                    {/* Line number gutter */}
                    <span
                      className={`select-none px-3 py-1 text-right min-w-[3rem] border-r border-border/50 ${
                        isError ? 'text-accent-red/80' : 'text-text-muted/50'
                      }`}
                    >
                      {lineNum}
                    </span>

                    {/* Error arrow indicator */}
                    <span className={`px-1 py-1 ${isError ? 'text-accent-red' : 'text-transparent'}`}>
                      ▶
                    </span>

                    {/* Code content */}
                    <span
                      className={`flex-1 px-2 py-1 whitespace-pre overflow-x-auto ${
                        isError ? 'text-red-300' : 'text-text-primary'
                      }`}
                    >
                      {content || ' '}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. WHY THIS MATTERS */}
          {why && (
            <div className="px-4 py-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-yellow uppercase tracking-wide mb-1.5">
                <span>⚠️</span> Why this matters
              </h4>
              <p className="text-sm text-text-muted leading-relaxed">{why}</p>
            </div>
          )}

          {/* 3. HOW TO FIX — sample corrected code */}
          {fix && (
            <div className="px-4 py-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-green uppercase tracking-wide mb-2">
                <span>🔧</span> How to fix it
              </h4>

              {/* If the fix contains a newline it's a code block; otherwise inline prose */}
              {fix.includes('\n') ? (
                <div className="rounded-lg border border-border overflow-hidden text-xs font-mono">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/10 border-b border-border">
                    <span className="text-accent-green">✓</span>
                    <span className="text-accent-green text-[10px] font-semibold uppercase tracking-wide">Fixed version</span>
                  </div>
                  <pre className="bg-bg/80 px-4 py-3 overflow-x-auto whitespace-pre text-text-primary leading-relaxed">
                    {fix}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-text-muted leading-relaxed">{fix}</p>
              )}
            </div>
          )}

          {/* 4. LEARN MORE */}
          {learnMore && (
            <div className="px-4 py-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-blue uppercase tracking-wide mb-1">
                <span>📚</span> Learn more
              </h4>
              {learnMore.startsWith('http') ? (
                <a
                  href={learnMore}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-blue hover:underline break-all"
                >
                  {learnMore}
                </a>
              ) : (
                <p className="text-xs text-text-muted">{learnMore}</p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default FindingItem
