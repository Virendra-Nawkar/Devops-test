// FILE: Header.jsx
// PURPOSE: Top navigation bar — shows the app title, tool health status, and history button
// USED BY: frontend/src/App.jsx

import React, { useState } from 'react'

/**
 * Header — renders the top navigation bar
 * @param {Function} onHistoryClick  - called when the user clicks the History button
 * @param {Object}   toolStatus      - health check result from GET /api/scan/health
 * @param {number}   historyCount    - number of items in history (shown on button)
 */
function Header({ onHistoryClick, toolStatus, historyCount }) {
  const [showToolTip, setShowToolTip] = useState(false)

  // Count installed tools for the status indicator
  const totalTools     = toolStatus ? Object.keys(toolStatus.tools || {}).length : 6
  const installedTools = toolStatus
    ? Object.values(toolStatus.tools || {}).filter(t => t.installed).length
    : 0
  const allReady = installedTools === totalTools && totalTools > 0

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Brand / title ─────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Shield icon SVG */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2L4 7v9c0 7 5.5 13.5 12 15 6.5-1.5 12-8 12-15V7L16 2z"
                fill="#238636"
                opacity="0.2"
              />
              <path
                d="M16 2L4 7v9c0 7 5.5 13.5 12 15 6.5-1.5 12-8 12-15V7L16 2z"
                stroke="#238636"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M11 16l3 3 7-7"
                stroke="#238636"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <h1 className="text-lg font-bold text-text-primary leading-none">
                DevOps Test Suite
              </h1>
              <p className="text-xs text-text-muted leading-none mt-0.5">
                Infrastructure Security Dashboard
              </p>
            </div>
          </div>

          {/* ── Right side actions ──────────────────────────────── */}
          <div className="flex items-center gap-3">

            {/* Tool health indicator */}
            {toolStatus && (
              <div className="relative">
                <button
                  onClick={() => setShowToolTip(v => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    allReady
                      ? 'border-accent-green/40 text-accent-green bg-accent-green/10 hover:bg-accent-green/20'
                      : 'border-accent-yellow/40 text-accent-yellow bg-accent-yellow/10 hover:bg-accent-yellow/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${allReady ? 'bg-accent-green' : 'bg-accent-yellow'} animate-pulse`} />
                  {installedTools}/{totalTools} tools ready
                </button>

                {/* Dropdown tooltip showing each tool's status */}
                {showToolTip && (
                  <div className="absolute right-0 top-10 w-64 bg-card border border-border rounded-xl shadow-xl p-3 z-50">
                    <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">
                      Scanner Tools
                    </p>
                    {Object.entries(toolStatus.tools || {}).map(([key, tool]) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-sm text-text-primary">{tool.name}</span>
                        {tool.installed ? (
                          <span className="text-xs text-accent-green font-mono">✓ ready</span>
                        ) : (
                          <span className="text-xs text-accent-red font-mono">✗ missing</span>
                        )}
                      </div>
                    ))}
                    {!allReady && (
                      <p className="text-xs text-text-muted mt-2 pt-2 border-t border-border">
                        Run <code className="font-mono text-accent-blue">bash install-tools.sh</code>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* History button */}
            <button
              onClick={onHistoryClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm.75 3.25v3.75l3.25 1.625-.625 1.25-3.875-1.938V4.75h1.25z"/>
              </svg>
              History
              {historyCount > 0 && (
                <span className="bg-border text-text-muted px-1.5 py-0.5 rounded-full text-xs">
                  {historyCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
