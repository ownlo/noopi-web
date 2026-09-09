const KEY = 'noopi.clientId'
let currentClientId: string | null = null

export function getClientId() {
  if (currentClientId) return currentClientId
  let value = localStorage.getItem(KEY)
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(KEY, value) }
  currentClientId = value
  return currentClientId
}
