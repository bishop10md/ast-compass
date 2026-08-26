import { cp, mkdir, writeFile } from 'node:fs/promises'
await mkdir('dist/server', { recursive: true })
await mkdir('dist/client', { recursive: true })
await cp('dist/index.html', 'dist/client/index.html')
await cp('dist/assets', 'dist/client/assets', { recursive: true })
await writeFile('dist/server/index.js', `export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return new Response('Static asset binding unavailable', { status: 503 })
    const url = new URL(request.url)
    const assetPath = url.pathname === '/' ? '/index.html' : url.pathname
    let response = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), request))
    if (response.status === 404 && request.headers.get('accept')?.includes('text/html')) response = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request))
    return response
  }
}\n`)

