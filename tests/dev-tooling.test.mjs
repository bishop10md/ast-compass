import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require=createRequire(import.meta.url);
test('Vite excludes generated Windows browser profiles from source watching', () => {
  assert.match(readFileSync(new URL('../vite.config.mjs',import.meta.url),'utf8'), /ignored: \["\*\*\/work\/\*\*"\]/);
});
test('Babel lru-cache resolves its own compatible Yallist constructor, not the Capacitor major', async () => {
  const pluginRequire=createRequire(require.resolve('@vitejs/plugin-react'));
  const babelRequire=createRequire(pluginRequire.resolve('@babel/core'));
  const helperRequire=createRequire(babelRequire.resolve('@babel/helper-compilation-targets'));
  const lruRequire=createRequire(helperRequire.resolve('lru-cache'));
  const packageRequire=createRequire(lruRequire.resolve('yallist/package.json'));
  const version=JSON.parse(readFileSync(packageRequire.resolve('./package.json'),'utf8')).version;
  assert.match(version,/^3\./); assert.equal(typeof lruRequire('yallist'),'function');
  assert.doesNotThrow(()=>new (lruRequire('yallist'))());
  const result=await pluginRequire('@babel/core').transformAsync('const view = <main>AST Compass</main>;', {configFile:false,babelrc:false,parserOpts:{plugins:['jsx']}});
  assert.match(result.code,/AST Compass/);
});
