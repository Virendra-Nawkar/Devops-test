// FILE: SeverityBadge.jsx
// PURPOSE: Coloured pill badge showing a finding's severity level
// USED BY: frontend/src/components/FindingItem.jsx, FindingsList.jsx

import React from 'react'

// Map severity → Tailwind colour classes (background + text)
const STYLES = {
  CRITICAL: 'bg-red-900/40    text-red-400    border-red-800/60',
  HIGH:     'bg-orange-900/40 text-orange-400 border-orange-800/60',
  MEDIUM:   'bg-yellow-900/40 text-yellow-400 border-yellow-800/60',
  LOW:      'bg-blue-900/40   text-blue-400   border-blue-800/60',
  INFO:     'bg-gray-800/60   text-gray-400   border-gray-700/60',
  UNKNOWN:  'bg-gray-800/60   text-gray-400   border-gray-700/60',
}

// Dot colour per severity (used in the count pills on FindingsList)
const DOT_COLORS = {
  CRITICAL: '#da3633',
  HIGH:     '#e3702a',
  MEDIUM:   '#d29922',
  LOW:      '#388bfd',
  INFO:     '#8b949e',
  UNKNOWN:  '#8b949e',
}

/**
 * SeverityBadge — renders a small coloured pill
 * @param {string} severity - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
 * @param {string} [size]   - 'sm' (default) | 'xs'
 */
function SeverityBadge({ severity, size = 'sm' }) {
  const sev   = (severity || 'INFO').toUpperCase()
  const style = STYLES[sev] || STYLES.UNKNOWN

  return (
    <span
      className={`badge border ${style} ${size === 'xs' ? 'text-[10px] px-1.5 py-0' : ''}`}
    >
      {sev}
    </span>
  )
}

/**
 * SeverityDot — tiny coloured dot (used inline in summary counts)
 * @param {string} severity
 */
function SeverityDot({ severity }) {
  const sev   = (severity || 'INFO').toUpperCase()
  const color = DOT_COLORS[sev] || DOT_COLORS.UNKNOWN
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  )
}

export { SeverityDot }
export default SeverityBadge
