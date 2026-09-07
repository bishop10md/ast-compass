// Short-lived localhost-only audit certificate. Never trust/install or deploy it.
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const out=path.resolve('work/infra-acceptance');await fs.mkdir(out,{recursive:true});
const key=path.join(out,'local-key.pem'),cert=path.join(out,'local-cert.pem');
for(const file of [key,cert])try{await fs.access(file);throw Error('Existing TLS artifact; inspect before replacing: '+file);}catch(e){if(e.code!=='ENOENT')throw e;}
const openssl=process.env.AST_AUDIT_OPENSSL||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
const r=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{encoding:'utf8'});
if(r.error||r.status!==0)throw Error('Local certificate generation failed: '+(r.error||r.stderr));
console.log('Created one-day localhost audit TLS material under ignored work/. No certificate installed or trusted.');
