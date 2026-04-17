// FILE: server.js
// PURPOSE: Main Express server entry point — sets up middleware, routes, and starts listening
// USED BY: run directly with 'node src/server.js' or 'npm start'

// Load environment variables from backend/.env before anything else
require('dotenv').config()

const express = require('express')
const cors    = require('cors')
const path    = require('path')
const fs      = require('fs')

const scanRouter = require('./routes/scan')

// ── App setup ─────────────────────────────────────────────────────────────────
const app  = express()
const PORT = parseInt(process.env.PORT) || 8081
const HOST = process.env.HOST || '0.0.0.0'

// ── CORS configuration ────────────────────────────────────────────────────────
// Allows the React frontend (running on port 80 of the VM) to call this API.
// You can add more origins to the array below (e.g. your home IP).
const allowedOrigins = [
  process.env.CORS_ORIGIN,         // http://20.12.224.28 (from .env)
  'http://localhost:80',           // local dev (frontend port)
  'http://127.0.0.1:80',
].filter(Boolean)  // remove undefined/empty entries

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Also allow any request from the VM IP regardless of port
    const vmIp = process.env.VM_IP || '20.12.224.28'
    if (origin.includes(vmIp)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Ensure uploads directory exists ──────────────────────────────────────────
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
  console.log(`[server] Created uploads directory: ${uploadDir}`)
}

// ── Routes ────────────────────────────────────────────────────────────────────
// All scan endpoints live under /api/scan
app.use('/api/scan', scanRouter)

// Root health check — useful to verify the server is reachable
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'DevOps Test Suite backend is running',
    version: '1.0.0',
    time: new Date().toISOString(),
  })
})

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[server] Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log('')
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║      DevOps Test Suite — Backend API           ║')
  console.log('╠════════════════════════════════════════════════╣')
  console.log(`║  Listening on  http://${HOST}:${PORT}          `)
  console.log(`║  VM access at  http://${process.env.VM_IP || '20.12.224.28'}:${PORT}`)
  console.log('║                                                 ║')
  console.log('║  Endpoints:                                     ║')
  console.log('║   GET  /api/ping                                ║')
  console.log('║   GET  /api/scan/health                         ║')
  console.log('║   GET  /api/scan/history                        ║')
  console.log('║   POST /api/scan/docker                         ║')
  console.log('║   POST /api/scan/k8s                            ║')
  console.log('║   POST /api/scan/terraform                      ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log('')
  console.log('  Tip: visit http://localhost:80 for the dashboard')
  console.log('  Tip: run GET /api/scan/health to see tool status')
  console.log('')
})
