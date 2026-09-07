import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { contentCacheVersion, buildServiceWorker } from './service-worker.mjs'
await mkdir('dist/server', { recursive: true })
await mkdir('dist/client', { recursive: true })
await cp('dist/index.html', 'dist/client/index.html')
await cp('dist/assets', 'dist/client/assets', { recursive: true })
await mkdir('dist/ocr/core', { recursive: true })
await mkdir('dist/ocr/lang', { recursive: true })
await cp('node_modules/tesseract.js/dist/tesseract.min.js', 'dist/ocr/tesseract.min.js')
await cp('node_modules/tesseract.js/dist/worker.min.js', 'dist/ocr/worker.min.js')
for (const file of ['tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm']) {
  await cp(`node_modules/tesseract.js-core/${file}`, `dist/ocr/core/${file}`)
}
await cp('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'dist/ocr/lang/eng.traineddata.gz')
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

const assetNames = (await readdir('dist/assets')).filter((name) => !/^Promo/i.test(name)).sort()
const precache = ['/index.html', '/offline.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', ...assetNames.map((name) => `/assets/${name}`)]
const ocrPaths = ['/ocr/tesseract.min.js', '/ocr/worker.min.js', '/ocr/lang/eng.traineddata.gz', ...['tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm'].map(name => `/ocr/core/${name}`)]
const cacheVersion = contentCacheVersion(await Promise.all([...precache, ...ocrPaths].map(async path => [path, await readFile(`dist${path}`)])))
await writeFile('dist/sw.js', buildServiceWorker(cacheVersion, precache, ocrPaths))

