// FILE: scanApi.js
// PURPOSE: All API calls from React to the backend — wraps Axios for each scan type
// USED BY: frontend/src/App.jsx

import axios from 'axios'

// All calls go to /api/... — Vite proxies this to http://localhost:81 automatically.
// You never need to hardcode the backend port or IP in React code.
const BASE = '/api'

/**
 * scanDocker — uploads a Dockerfile (and optional image name) for scanning
 * @param {File}   file      - the Dockerfile File object from the browser
 * @param {string} imageName - optional Docker image name like "ubuntu:22.04"
 * @returns {Promise<Object>} scan result: { score, grade, color, summary, findings, ... }
 */
export async function scanDocker(file, imageName = '') {
  const form = new FormData()
  form.append('dockerfile', file)          // field name must match backend multer config
  if (imageName) form.append('imageName', imageName)

  const response = await axios.post(`${BASE}/scan/docker`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 minutes — Trivy image pulls can take time
  })
  return response.data
}

/**
 * scanK8s — uploads a Kubernetes YAML file for validation and best-practice audit
 * @param {File} file - the .yaml file
 * @returns {Promise<Object>} scan result
 */
export async function scanK8s(file) {
  const form = new FormData()
  form.append('yamlFile', file)            // field name must match backend multer config

  const response = await axios.post(`${BASE}/scan/k8s`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return response.data
}

/**
 * scanTerraform — uploads one or more .tf files for security and compliance scanning
 * @param {File|FileList|Array} files - one file or array of File objects
 * @returns {Promise<Object>} scan result
 */
export async function scanTerraform(files) {
  const form = new FormData()
  const fileArray = Array.isArray(files) ? files : Array.from(files)
  for (const file of fileArray) {
    form.append('tfFiles', file)           // field name must match backend multer config
  }

  const response = await axios.post(`${BASE}/scan/terraform`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return response.data
}

/**
 * getHistory — fetches the last 10 scan results from the backend
 * @returns {Promise<Array>} array of history entries
 */
export async function getHistory() {
  const response = await axios.get(`${BASE}/scan/history`, { timeout: 10000 })
  return response.data
}

/**
 * getHealthStatus — checks which scanner tools are installed on the server
 * @returns {Promise<Object>} { status, tools: { hadolint: {...}, trivy: {...}, ... } }
 */
export async function getHealthStatus() {
  const response = await axios.get(`${BASE}/scan/health`, { timeout: 10000 })
  return response.data
}
