import test from "node:test";
import assert from "node:assert/strict";
import { calculateScore, selectChallenge, summarizeSession, updateStreak } from "../src/features/ast-detective-game-core.mjs";
const questions = Array.from({length:12},(_,index)=>({id:`Q${index}`,topic:index<6?"ESBL":"BCID",difficulty:index%2?"Intermediate":"Foundation"}));
test("challenge mode never repeats questions",()=>{const selected=selectChallenge(questions,{size:10,random:()=>0.4});assert.equal(selected.length,10);assert.equal(new Set(selected.map(q=>q.id)).size,10);});
test("topic and difficulty filters work",()=>{const selected=selectChallenge(questions,{topic:"BCID",difficulty:"Foundation",size:20,random:()=>0.2});assert.ok(selected.length>0);assert.ok(selected.every(q=>q.topic==="BCID"&&q.difficulty==="Foundation"));});
test("score calculation works",()=>assert.deepEqual(calculateScore([{correct:true},{correct:false},{correct:true}]),{correct:2,total:3,percent:67}));
test("streak resets while retaining best streak",()=>{let streak={current:0,best:0};streak=updateStreak(streak,true);streak=updateStreak(streak,true);streak=updateStreak(streak,false);assert.deepEqual(streak,{current:0,best:2});});
test("session summary identifies strong and review topics",()=>{const summary=summarizeSession([{question:{topic:"ESBL"},correct:true},{question:{topic:"ESBL"},correct:true},{question:{topic:"BCID"},correct:false}]);assert.deepEqual(summary.strengths,["ESBL"]);assert.deepEqual(summary.review,["BCID"]);});
