import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
    plugins: [react()],
    build: {
        // The service worker reads this file at install time so every hashed
        // production asset can be cached without a PWA runtime dependency.
        manifest: 'asset-manifest.json',
    },
    server: {
        host: '0.0.0.0',
        allowedHosts: ['noopi.kr', 'www.noopi.kr'],
    },
})
