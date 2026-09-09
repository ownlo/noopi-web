const KEY = 'noopi.clientId'
export function getClientId() {
  let value = localStorage.getItem(KEY)
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(KEY, value) }
  return value
}
