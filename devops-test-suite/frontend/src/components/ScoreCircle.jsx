// FILE: ScoreCircle.jsx
// PURPOSE: Animated SVG donut chart showing a security score with colour based on the value
// USED BY: frontend/src/components/OverallReportCard.jsx

import React, { useEffect, useState } from 'react'

// Map score ranges to accent colours
function getColor(score) {
  if (score >= 80) return '#238636'  // green
  if (score >= 50) return '#d29922'  // yellow
  return '#da3633'                   // red
}

function getGrade(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Needs Work'
  return 'Critical'
}

/**
 * ScoreCircle — SVG donut chart that animates from empty to the target score on mount
 *
 * @param {number} score - 0 to 100
 * @param {string} label - text below the circle, e.g. "Dockerfile"
 * @param {string} [size] - 'lg' (default, 130px) | 'sm' (90px)
 */
function ScoreCircle({ score, label, size = 'lg' }) {
  const [animated, setAnimated] = useState(false)

  // Trigger the CSS transition after the component mounts
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(t)
  }, [score])

  // SVG circle geometry
  const radius      = size === 'lg' ? 46 : 32
  const svgSize     = size === 'lg' ? 120 : 84
  const strokeWidth = size === 'lg' ?  9  :  7
  const center      = svgSize / 2
  const circumference = 2 * Math.PI * radius

  // strokeDashoffset: full circle = full circumference (empty); target fill reduces it
  const targetOffset = circumference - (score / 100) * circumference
  const currentOffset = animated ? targetOffset : circumference

  const color = getColor(score)
  const grade = getGrade(score)

  return (
    <div className="flex flex-col items-center gap-2">
      {/* SVG circle + score number in the middle */}
      <div className="relative inline-flex">
        {/* Rotated -90° so the fill starts at the top (12 o'clock position) */}
        <svg
          width={svgSize}
          height={svgSize}
          className="score-circle"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Grey background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#30363d"
            strokeWidth={strokeWidth}
          />
          {/* Coloured fill ring that animates */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={currentOffset}
            strokeLinecap="round"
            className="ring"
          />
        </svg>

        {/* Score number and grade label centred inside the ring */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: 'none' }}
        >
          <span
            className={`font-bold leading-none ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}
            style={{ color }}
          >
            {score}
          </span>
          <span className="text-[10px] text-text-muted mt-0.5 leading-none">{grade}</span>
        </div>
      </div>

      {/* Label below the circle */}
      <span className="text-xs text-text-muted font-medium text-center">{label}</span>
    </div>
  )
}

export default ScoreCircle
