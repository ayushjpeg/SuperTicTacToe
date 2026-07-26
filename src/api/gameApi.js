const DEFAULT_BASE_URL = 'https://common-backend.ayux.in/api'
const stripTrailingSlash = (value) => value.replace(/\/$/, '')
const API_BASE_URL = stripTrailingSlash(import.meta.env.VITE_BACKEND_URL || DEFAULT_BASE_URL)

const request = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export const heartbeatPresence = () => request('/ultimate-ttt/presence/heartbeat', { method: 'POST' })
export const fetchActivePlayers = () => request('/ultimate-ttt/players/active')

export const createInvite = (payload) => request('/ultimate-ttt/invites', { method: 'POST', body: payload })
export const fetchIncomingInvites = () => request('/ultimate-ttt/invites/incoming')
export const fetchOutgoingInvites = () => request('/ultimate-ttt/invites/outgoing')
export const fetchInviteByCode = (code) => request(`/ultimate-ttt/invites/${encodeURIComponent(code)}`)
export const acceptInvite = (code) => request(`/ultimate-ttt/invites/${encodeURIComponent(code)}/accept`, { method: 'POST' })
export const cancelInvite = (inviteId) => request(`/ultimate-ttt/invites/${inviteId}/cancel`, { method: 'POST' })

export const createBotGame = (humanSymbol = 'X') => request('/ultimate-ttt/games/bot', {
  method: 'POST',
  body: { human_symbol: humanSymbol },
})

export const fetchBotModels = () => request('/ultimate-ttt/models')

export const createBotGameWithModel = (humanSymbol = 'X', modelVersion = 'v1') => request('/ultimate-ttt/games/bot', {
  method: 'POST',
  body: { human_symbol: humanSymbol, model_version: modelVersion },
})

export const fetchGames = (state = 'active') => request(`/ultimate-ttt/games?state=${encodeURIComponent(state)}`)
export const fetchGame = (gameId) => request(`/ultimate-ttt/games/${gameId}`)
export const submitMove = (gameId, move) => request(`/ultimate-ttt/games/${gameId}/moves`, {
  method: 'POST',
  body: move,
})
