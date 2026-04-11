// FILE: App.jsx
// PURPOSE: Root application component — manages all scan state and renders the full dashboard
// USED BY: frontend/src/main.jsx

import React, { useState, useEffect } from 'react'
import Header           from './components/Header.jsx'
import EmptyState       from './components/EmptyState.jsx'
import OverallReportCard from './components/OverallReportCard.jsx'
import UploadZone       from './components/UploadZone.jsx'
import ScanProgress     from './components/ScanProgress.jsx'
import FindingsList     from './components/FindingsList.jsx'
import HistoryPanel     from './components/HistoryPanel.jsx'
import { scanDocker, scanK8s, scanTerraform, getHistory, getHealthStatus } from './api/scanApi.js'

// Tab configuration — controls the three scan type tabs
const TABS = [
  { id: 'docker',    label: 'Dockerfile',  icon: '🐳' },
  { id: 'k8s',       label: 'Kubernetes',  icon: '☸️' },
  { id: 'terraform', label: 'Terraform',   icon: '🏗️' },
]

function App() {
  // ── Scan results for each type ───────────────────────────────────────────
  const [results, setResults] = useState({ docker: null, k8s: null, terraform: null })

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('docker')
  const [scanning,     setScanning]     = useState(false)
  const [scanStep,     setScanStep]     = useState('')
  const [scanProgress, setScanProgress] = useState(0)
  const [error,        setError]        = useState(null)
  const [history,      setHistory]      = useState([])
  const [showHistory,  setShowHistory]  = useState(false)
  const [toolStatus,   setToolStatus]   = useState(null)

  // ── Load history and tool health on first render ──────────────────────────
  useEffect(() => {
    loadHistory()
    loadToolStatus()
  }, [])

  async function loadHistory() {
    try {
      const data = await getHistory()
      setHistory(data)
    } catch { /* history is optional — silently ignore */ }
  }

  async function loadToolStatus() {
    try {
      const data = await getHealthStatus()
      setToolStatus(data)
    } catch { /* silently ignore — backend may not be running yet */ }
  }

  // ── Generic scan runner — used by all three scan handlers ─────────────────
  async function runScan(type, scanFn, steps) {
    setScanning(true)
    setError(null)
    setScanProgress(0)

    try {
      // Walk through the progress steps to animate the progress bar
      for (let i = 0; i < steps.length; i++) {
        setScanStep(steps[i].label)
        setScanProgress(steps[i].progress)
        // Small delay so the user can see the step name before the scan completes
        await new Promise(r => setTimeout(r, 300))
      }

      const result = await scanFn()
      setScanProgress(100)
      setScanStep('Scan complete!')

      // Store result under the correct tab
      setResults(prev => ({ ...prev, [type]: result }))

      // Refresh history
      loadHistory()
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Scan failed — is the backend running?'
      )
    } finally {
      setScanning(false)
      setTimeout(() => { setScanProgress(0); setScanStep('') }, 2000)
    }
  }

  // ── Docker scan ───────────────────────────────────────────────────────────
  const handleDockerScan = (file, imageName) => runScan(
    'docker',
    () => scanDocker(file, imageName),
    [
      { label: 'Uploading Dockerfile…',      progress: 15 },
      { label: 'Running Hadolint linter…',   progress: 40 },
      { label: imageName ? 'Running Trivy CVE scan…' : 'Analysing results…', progress: 70 },
      { label: 'Building score…',            progress: 90 },
    ]
  )

  // ── Kubernetes scan ───────────────────────────────────────────────────────
  const handleK8sScan = (file) => runScan(
    'k8s',
    () => scanK8s(file),
    [
      { label: 'Uploading YAML file…',         progress: 15 },
      { label: 'Running Kubeconform schema validation…', progress: 45 },
      { label: 'Running Polaris best-practice audit…',  progress: 75 },
      { label: 'Building score…',              progress: 90 },
    ]
  )

  // ── Terraform scan ────────────────────────────────────────────────────────
  const handleTerraformScan = (files) => runScan(
    'terraform',
    () => scanTerraform(files),
    [
      { label: 'Uploading .tf files…',      progress: 15 },
      { label: 'Running tfsec scan…',       progress: 40 },
      { label: 'Running Checkov audit…',    progress: 70 },
      { label: 'Merging and scoring…',      progress: 90 },
    ]
  )

  const activeResult = results[activeTab]
  const hasAnyResult = Object.values(results).some(Boolean)

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans">
      {/* ── Top navigation bar ──────────────────────────────────────── */}
      <Header
        onHistoryClick={() => setShowHistory(v => !v)}
        toolStatus={toolStatus}
        historyCount={history.length}
      />

      {/* ── Slide-in history panel ──────────────────────────────────── */}
      {showHistory && (
        <HistoryPanel history={history} onClose={() => setShowHistory(false)} />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Overall report card (shown once any scan has run) ──────── */}
        {hasAnyResult && (
          <div className="animate-fade-in mb-8">
            <OverallReportCard
              dockerResult={results.docker}
              k8sResult={results.k8s}
              terraformResult={results.terraform}
            />
          </div>
        )}

        {/* ── Scan progress bar ───────────────────────────────────────── */}
        {scanning && (
          <div className="mb-6 animate-fade-in">
            <ScanProgress step={scanStep} progress={scanProgress} />
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-accent-red rounded-xl text-accent-red animate-fade-in flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Scan Error</p>
              <p className="text-sm mt-0.5">{error}</p>
              <p className="text-xs mt-1 text-text-muted">
                Make sure the backend is running: <code className="font-mono">cd backend && npm start</code>
              </p>
            </div>
          </div>
        )}

        {/* ── Tab navigation ──────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-blue text-text-primary bg-card'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-card/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {results[tab.id] && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-mono ${
                  results[tab.id].score >= 80 ? 'bg-accent-green/20 text-accent-green' :
                  results[tab.id].score >= 50 ? 'bg-accent-yellow/20 text-accent-yellow' :
                                                'bg-accent-red/20 text-accent-red'
                }`}>
                  {results[tab.id].score}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Main content: upload + results side by side ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: upload zone */}
          <div>
            {activeTab === 'docker' && (
              <UploadZone type="docker" onScan={handleDockerScan} disabled={scanning} />
            )}
            {activeTab === 'k8s' && (
              <UploadZone type="k8s" onScan={handleK8sScan} disabled={scanning} />
            )}
            {activeTab === 'terraform' && (
              <UploadZone type="terraform" onScan={handleTerraformScan} disabled={scanning} />
            )}
          </div>

          {/* Right: results panel */}
          <div>
            {activeResult ? (
              <div className="animate-fade-in">
                <FindingsList result={activeResult} type={activeTab} />
              </div>
            ) : (
              !scanning && <EmptyState type={activeTab} />
            )}
          </div>

        </div>
      </main>
    </div>
  )
}

export default App
