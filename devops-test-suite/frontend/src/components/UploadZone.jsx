// FILE: UploadZone.jsx
// PURPOSE: Drag-and-drop file upload zone — handles Docker, K8s, and Terraform upload types
// USED BY: frontend/src/App.jsx

import React, { useState, useRef } from 'react'

// Config per scan type: accepted extensions, field hints, max files
const TYPE_CONFIG = {
  docker: {
    label:      'Dockerfile',
    icon:       '🐳',
    accept:     '',                       // Dockerfiles have no extension
    hint:       'Drop a Dockerfile here, or click to browse',
    subHint:    'Any file named Dockerfile, Dockerfile.prod, etc.',
    multiple:   false,
    hasImageInput: true,                  // Trivy image name field
  },
  k8s: {
    label:      'Kubernetes YAML',
    icon:       '☸️',
    accept:     '.yaml,.yml',
    hint:       'Drop a Kubernetes YAML file here, or click to browse',
    subHint:    'Deployment, Service, StatefulSet, etc.',
    multiple:   false,
    hasImageInput: false,
  },
  terraform: {
    label:      'Terraform Files',
    icon:       '🏗️',
    accept:     '.tf',
    hint:       'Drop one or more .tf files here, or click to browse',
    subHint:    'main.tf, variables.tf, outputs.tf — all accepted',
    multiple:   true,
    hasImageInput: false,
  },
}

/**
 * UploadZone — drag-and-drop or click-to-upload zone
 *
 * @param {string}   type      - 'docker' | 'k8s' | 'terraform'
 * @param {Function} onScan    - called with (file, imageName) for docker, (file) for k8s, ([files]) for tf
 * @param {boolean}  disabled  - disables the zone while a scan is in progress
 */
function UploadZone({ type, onScan, disabled }) {
  const cfg       = TYPE_CONFIG[type]
  const inputRef  = useRef(null)

  const [files,       setFiles]      = useState([])   // selected File objects
  const [imageName,   setImageName]  = useState('')   // Docker only
  const [dragging,    setDragging]   = useState(false)

  // ── Drag events ────────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragging(true)  }
  const onDragLeave = ()  => setDragging(false)
  const onDrop      = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files)
    handleFiles(dropped)
  }

  // ── File input change ──────────────────────────────────────────────────
  const onInputChange = (e) => handleFiles(Array.from(e.target.files))

  function handleFiles(incoming) {
    setFiles(cfg.multiple ? incoming : [incoming[0]].filter(Boolean))
  }

  // ── Trigger file dialog ────────────────────────────────────────────────
  const openDialog = () => { if (!disabled) inputRef.current?.click() }

  // ── Submit scan ────────────────────────────────────────────────────────
  const handleScan = () => {
    if (files.length === 0 || disabled) return
    if (type === 'docker')    onScan(files[0], imageName.trim())
    else if (type === 'k8s')  onScan(files[0])
    else                      onScan(files)
  }

  const hasFiles = files.length > 0

  return (
    <div className="card space-y-4">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{cfg.icon}</span>
        <h2 className="text-base font-semibold text-text-primary">{cfg.label} Scanner</h2>
      </div>

      {/* Drop zone */}
      <div
        className={`upload-zone p-8 ${dragging ? 'dragging' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openDialog}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={cfg.accept}
          multiple={cfg.multiple}
          onChange={onInputChange}
          className="hidden"
        />

        {hasFiles ? (
          // ── Files selected: show list ──────────────────────────
          <div className="text-center">
            <div className="text-3xl mb-2">📄</div>
            {files.map((f, i) => (
              <p key={i} className="text-sm font-mono text-accent-blue truncate max-w-[240px]">
                {f.name}
              </p>
            ))}
            {files.length > 1 && (
              <p className="text-xs text-text-muted mt-1">{files.length} files selected</p>
            )}
            <p className="text-xs text-text-muted mt-2">Click to change file(s)</p>
          </div>
        ) : (
          // ── Empty: show upload icon ────────────────────────────
          <div className="text-center pointer-events-none">
            <svg className="mx-auto mb-3 text-text-muted" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 8v16M12 16l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 28h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <path d="M8 32h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
            </svg>
            <p className="text-sm text-text-muted">{cfg.hint}</p>
            <p className="text-xs text-text-muted mt-1 opacity-60">{cfg.subHint}</p>
          </div>
        )}
      </div>

      {/* Docker only: optional image name for Trivy CVE scanning */}
      {cfg.hasImageInput && (
        <div>
          <label className="block text-xs text-text-muted mb-1">
            Docker image name <span className="opacity-60">(optional — for CVE scanning with Trivy)</span>
          </label>
          <input
            type="text"
            value={imageName}
            onChange={e => setImageName(e.target.value)}
            placeholder="e.g. ubuntu:22.04"
            disabled={disabled}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent-blue disabled:opacity-50"
          />
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={!hasFiles || disabled}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
          hasFiles && !disabled
            ? 'bg-accent-green hover:bg-green-600 text-white shadow-lg shadow-green-900/30 active:scale-[0.98]'
            : 'bg-border text-text-muted cursor-not-allowed'
        }`}
      >
        {disabled ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="20" strokeDashoffset="8"/>
            </svg>
            Scanning…
          </span>
        ) : (
          `Scan ${cfg.label}`
        )}
      </button>

      {/* Quick start hint */}
      <p className="text-xs text-text-muted text-center">
        New here? Use a file from the <code className="font-mono text-accent-blue">sample-files/</code> folder to try it out.
      </p>
    </div>
  )
}

export default UploadZone
