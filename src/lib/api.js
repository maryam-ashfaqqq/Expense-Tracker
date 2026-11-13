const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function getToken() {
  try {
    return localStorage.getItem('aurum-token')
  } catch {
    return null
  }
}

export function setToken(token) {
  localStorage.setItem('aurum-token', token)
}

export function clearToken() {
  localStorage.removeItem('aurum-token')
}

export async function api(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error('Cannot reach the Aurum server. Start it on port 5000.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    throw error
  }
  return data
}
