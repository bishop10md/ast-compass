import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const externalRequire = createRequire(import.meta.url);

// Local audit harness only: real modules run in memory, never rewritten on disk.
export function createAuditLoader(repo = process.cwd()) {
  const modules = new Map();
  return function load(relative, extra = '') {
    const file = path.resolve(repo, relative);
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    const source = fs.readFileSync(file, 'utf8') + '\n' + extra;
    const code = ts.transpileModule(source, { fileName: file.replace(/\.mjs$/, '.ts'), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const require = id => {
      if (!id.startsWith('.')) return externalRequire(id);
      const base = path.resolve(path.dirname(file), id);
      const dep = [base, base + '.ts', base + '.tsx', base + '.mjs', path.join(base, 'index.ts')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (!dep) throw Error('Unresolved audit import ' + id);
      return load(dep);
    };
    new Function('require', 'module', 'exports', code)(require, module, module.exports);
    return module.exports;
  };
}
