import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../src/services/feedbackService.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(responses=[], unavailable=false) {
 const exports={}, calls=[]; let fire,cleared=false;
 const client = {
   from(table) {
     assert.equal(table, 'feedback');
     return {
       insert(row) {
         calls.push(row);
         return {
           abortSignal(signal) {
             calls.at(-1).signal = signal;
             const value = responses.shift();
             return value === undefined ? new Promise(() => {}) : Promise.resolve(value);
           },
         };
       },
     };
   },
 };
 new Function('exports','require','setTimeout','clearTimeout',compiled)(exports,path=>path.includes('supabase')?{getSupabase:async()=>unavailable?null:client}:{APP_VERSION:'test'},(fn,ms)=>{assert.equal(ms,20000);fire=fn;return 1;},()=>{cleared=true;});
 return {...exports,calls,expire:()=>fire(),cleared:()=>cleared};
}
const payload={category:'General feedback',userId:null,accountStatus:'Guest',displayName:'',email:'',role:'',rating:null,useful:'',improvement:'',requestedFeature:'',comments:'synthetic',testimonialPermission:false,pageSource:'/feedback',contentId:null};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('silent feedback blackhole returns unconfirmed, aborts and never retries',async()=>{
 const h=harness();const pending=h.submitFeedback(payload);await flush();assert.equal(h.calls.length,1);
 h.expire();await assert.rejects(pending,h.FeedbackTimeoutError);assert.equal(h.calls[0].signal.aborted,true);assert.equal(h.calls.length,1);assert.ok(h.cleared());
});
test('feedback success clears deadline and keeps governed fields',async()=>{
 const h=harness([{error:null}]);await h.submitFeedback(payload);assert.equal(h.calls.length,1);assert.equal(h.calls[0].category,'General feedback');assert.ok(h.cleared());
});
test('schema-only compatibility fallback remains bounded; network errors never retry',async()=>{
 const h=harness([{error:{code:'PGRST204',message:'category absent'}},{error:null}]);await h.submitFeedback(payload);assert.equal(h.calls.length,2);assert.equal(h.calls[1].category,undefined);assert.equal(h.calls[0].signal,h.calls[1].signal);
 const network=harness([{error:{code:'FETCH',message:'network unavailable'}}]);await assert.rejects(network.submitFeedback(payload));assert.equal(network.calls.length,1);
});
test('unconfigured feedback fails gracefully and timeout UI preserves delivery uncertainty',async()=>{
 const h=harness([],true);await assert.rejects(h.submitFeedback(payload),/unavailable/);assert.ok(h.cleared());assert.equal(h.calls.length,0);
 const ui=readFileSync(new URL('../src/features/Feedback.tsx',import.meta.url),'utf8');assert.match(ui,/error instanceof FeedbackTimeoutError \? "unconfirmed"/);assert.match(ui,/It may have reached the server; no automatic retry was made/);
});
