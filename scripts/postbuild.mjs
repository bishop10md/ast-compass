import { cp, mkdir, writeFile } from 'node:fs/promises'
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

