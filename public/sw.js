const CACHE_VERSION = 'noopi-shell-v2'
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/noopi-180.png',
  '/icons/noopi-192.png',
  '/icons/noopi-512.png',
  '/icons/noopi-maskable-512.png',
]

async function loadBuildAssets() {
  try {
    const response = await fetch('/asset-manifest.json', { cache: 'no-store' })
    if (!response.ok) return []

    const manifest = await response.json()
    const assets = new Set()
    for (const entry of Object.values(manifest)) {
      if (!entry.isEntry) continue
      if (entry.file) assets.add(`/${entry.file}`)
      for (const file of entry.css ?? []) assets.add(`/${file}`)
    }
    return [...assets]
  } catch {
    return []
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION)
    await cache.addAll(CORE_ASSETS)
    const buildAssets = await loadBuildAssets()
    if (buildAssets.length > 0) await cache.addAll(buildAssets)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.filter(name => name.startsWith('noopi-') && name !== CACHE_VERSION).map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request)
      } catch {
        return (await caches.match('/')) ?? Response.error()
      }
    })())
    return
  }

  if (!['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) return

  event.respondWith((async () => {
    const cached = await caches.match(request)
    const network = fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_VERSION)
        await cache.put(request, response.clone())
      }
      return response
    })
    if (!cached) return network
    event.waitUntil(network.catch(() => undefined))
    return cached
  })())
})
