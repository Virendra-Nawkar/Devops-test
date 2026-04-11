// FILE: EmptyState.jsx
// PURPOSE: SVG illustration + hint text shown in the results panel when no scan has been run yet
// USED BY: frontend/src/App.jsx

import React from 'react'

// Config per scan type — different icons and hints
const CONFIG = {
  docker: {
    icon: '🐳',
    title: 'No Dockerfile scanned yet',
    hint: 'Upload a Dockerfile on the left to get a security score.\nTry the sample-files/bad.Dockerfile to see findings.',
    color: '#388bfd',
  },
  k8s: {
    icon: '☸️',
    title: 'No Kubernetes YAML scanned yet',
    hint: 'Upload a deployment.yaml or any Kubernetes manifest.\nTry the sample-files/bad-deployment.yaml.',
    color: '#238636',
  },
  terraform: {
    icon: '🏗️',
    title: 'No Terraform files scanned yet',
    hint: 'Upload one or more .tf files to check for security issues.\nTry the sample-files/bad-main.tf.',
    color: '#d29922',
  },
}

/**
 * EmptyState — renders a friendly empty state illustration
 * @param {string} type - 'docker' | 'k8s' | 'terraform'
 */
function EmptyState({ type }) {
  const cfg = CONFIG[type] || CONFIG.docker

  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center animate-fade-in">

      {/* Decorative SVG background rings */}
      <div className="relative mb-6">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="55" fill={cfg.color} opacity="0.05" />
          <circle cx="60" cy="60" r="40" fill={cfg.color} opacity="0.07" />
          <circle cx="60" cy="60" r="25" fill={cfg.color} opacity="0.10" />
        </svg>
        {/* Icon overlaid on the rings */}
        <div className="absolute inset-0 flex items-center justify-center text-5xl">
          {cfg.icon}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">{cfg.title}</h3>

      {/* Render multi-line hint */}
      <div className="text-sm text-text-muted max-w-xs leading-relaxed">
        {cfg.hint.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
        ))}
      </div>

      {/* Step guide */}
      <div className="mt-6 flex items-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-border flex items-center justify-center text-text-primary font-bold">1</span>
          Upload file
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#30363d">
          <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
        </svg>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-border flex items-center justify-center text-text-primary font-bold">2</span>
          Click Scan
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#30363d">
          <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
        </svg>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-border flex items-center justify-center text-text-primary font-bold">3</span>
          See results
        </div>
      </div>

    </div>
  )
}

export default EmptyState
