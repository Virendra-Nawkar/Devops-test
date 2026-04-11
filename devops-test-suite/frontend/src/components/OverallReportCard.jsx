// FILE: OverallReportCard.jsx
// PURPOSE: Top banner showing all three score circles side-by-side after at least one scan runs
// USED BY: frontend/src/App.jsx

import React from 'react'
import ScoreCircle from './ScoreCircle.jsx'

/**
 * OverallReportCard — shows all three scan type scores at the top of the page
 *
 * @param {Object|null} dockerResult    - result from the docker scan (null if not run)
 * @param {Object|null} k8sResult       - result from the k8s scan
 * @param {Object|null} terraformResult - result from the terraform scan
 */
function OverallReportCard({ dockerResult, k8sResult, terraformResult }) {
  // Calculate the overall average score from whichever scans have run
  const completedScans = [dockerResult, k8sResult, terraformResult].filter(Boolean)
  const overallScore = completedScans.length > 0
    ? Math.round(completedScans.reduce((sum, r) => sum + r.score, 0) / completedScans.length)
    : 0

  const getOverallGrade = (s) => {
    if (s >= 90) return { label: 'Excellent', color: '#238636' }
    if (s >= 70) return { label: 'Good',      color: '#238636' }
    if (s >= 50) return { label: 'Needs Work', color: '#d29922' }
    return            { label: 'Critical',    color: '#da3633' }
  }

  const { label: overallGrade, color: overallColor } = getOverallGrade(overallScore)

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Overall Security Report</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {completedScans.length} of 3 scan type{completedScans.length !== 1 ? 's' : ''} completed
          </p>
        </div>
        {/* Overall score pill */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl border"
          style={{ borderColor: overallColor + '40', backgroundColor: overallColor + '15' }}
        >
          <span className="text-3xl font-bold" style={{ color: overallColor }}>
            {overallScore}
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: overallColor }}>{overallGrade}</p>
            <p className="text-[10px] text-text-muted">avg score</p>
          </div>
        </div>
      </div>

      {/* Three score circles */}
      <div className="grid grid-cols-3 gap-4">

        {/* Docker score */}
        <div className={`flex flex-col items-center p-4 rounded-xl border ${
          dockerResult ? 'border-border bg-black/20' : 'border-border/40 opacity-40'
        }`}>
          {dockerResult ? (
            <ScoreCircle score={dockerResult.score} label="Dockerfile" />
          ) : (
            <PlaceholderCircle label="Dockerfile" icon="🐳" />
          )}
        </div>

        {/* K8s score */}
        <div className={`flex flex-col items-center p-4 rounded-xl border ${
          k8sResult ? 'border-border bg-black/20' : 'border-border/40 opacity-40'
        }`}>
          {k8sResult ? (
            <ScoreCircle score={k8sResult.score} label="Kubernetes" />
          ) : (
            <PlaceholderCircle label="Kubernetes" icon="☸️" />
          )}
        </div>

        {/* Terraform score */}
        <div className={`flex flex-col items-center p-4 rounded-xl border ${
          terraformResult ? 'border-border bg-black/20' : 'border-border/40 opacity-40'
        }`}>
          {terraformResult ? (
            <ScoreCircle score={terraformResult.score} label="Terraform" />
          ) : (
            <PlaceholderCircle label="Terraform" icon="🏗️" />
          )}
        </div>

      </div>

      {/* Summary counts across all completed scans */}
      {completedScans.length > 0 && (
        <SummaryRow results={completedScans} />
      )}
    </div>
  )
}

/**
 * PlaceholderCircle — grey placeholder when a scan type hasn't run yet
 */
function PlaceholderCircle({ label, icon }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="46" fill="none" stroke="#30363d" strokeWidth="9" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{icon}</span>
          <span className="text-[10px] text-text-muted mt-0.5">Not run</span>
        </div>
      </div>
      <span className="text-xs text-text-muted font-medium">{label}</span>
    </div>
  )
}

/**
 * SummaryRow — counts total findings across all scans by severity
 */
function SummaryRow({ results }) {
  const totals = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const r of results) {
    for (const [k, v] of Object.entries(r.summary || {})) {
      if (totals[k] !== undefined) totals[k] += v
    }
  }

  const items = [
    { label: 'Critical', count: totals.CRITICAL, color: '#da3633' },
    { label: 'High',     count: totals.HIGH,     color: '#e3702a' },
    { label: 'Medium',   count: totals.MEDIUM,   color: '#d29922' },
    { label: 'Low',      count: totals.LOW,      color: '#388bfd' },
  ].filter(i => i.count > 0)

  if (items.length === 0) return (
    <p className="text-center text-xs text-accent-green mt-4">✅ No issues found across all scans</p>
  )

  return (
    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border flex-wrap">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-bold" style={{ color: item.color }}>{item.count}</span>
          <span className="text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default OverallReportCard
