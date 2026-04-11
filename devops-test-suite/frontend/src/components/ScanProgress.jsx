// FILE: ScanProgress.jsx
// PURPOSE: Animated progress bar shown while a scan is running — displays the current scanner step
// USED BY: frontend/src/App.jsx

import React from 'react'

/**
 * ScanProgress — shows a labelled progress bar while scanning
 *
 * @param {string} step     - human-readable label of the current step, e.g. "Running Hadolint…"
 * @param {number} progress - 0 to 100
 */
function ScanProgress({ step, progress }) {
  // Pick colour based on progress
  const barColor =
    progress >= 100 ? '#238636' :    // green when done
    progress >= 60  ? '#388bfd' :    // blue mid-scan
                      '#d29922'      // yellow at start

  return (
    <div className="card space-y-3">
      {/* Header row: spinner + step name + percentage */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Spinning indicator */}
          {progress < 100 ? (
            <svg
              className="animate-spin flex-shrink-0"
              width="16" height="16"
              viewBox="0 0 16 16" fill="none"
            >
              <circle
                cx="8" cy="8" r="6"
                stroke="#388bfd"
                strokeWidth="2.5"
                strokeDasharray="28"
                strokeDashoffset="10"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#238636" opacity="0.2"/>
              <path d="M5 8l2 2 4-4" stroke="#238636" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <span className="text-sm font-medium text-text-primary">{step || 'Scanning…'}</span>
        </div>
        <span className="text-sm font-mono text-text-muted flex-shrink-0">{progress}%</span>
      </div>

      {/* Progress bar track */}
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-bar-fill"
          style={{
            width:           `${progress}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Scanner steps indicator (dots) */}
      <div className="flex items-center justify-between px-0.5">
        {['Upload', 'Scanner 1', 'Scanner 2', 'Score'].map((label, i) => {
          const stepProgress = (i + 1) * 25
          const active = progress >= stepProgress - 5
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  active ? 'bg-accent-blue' : 'bg-border'
                }`}
              />
              <span className={`text-[10px] ${active ? 'text-text-muted' : 'text-border'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ScanProgress
