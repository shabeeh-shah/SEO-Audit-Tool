import {sampleAudit} from './sample';
import type {Audit,Category,Status} from './types';
export const sampleHistory:Audit[]=[0,1,2,3].map(index=>{
 const audit=structuredClone(sampleAudit);audit.date=`2026-09-${['01','08','15','22'][index]}T12:00:00Z`;audit.scoringVersion='signal-weighted-v1';
 audit.findings=audit.findings.map(f=>{const status:Status=f.id==='alt'?(['critical','improvement','improvement','good'] as const)[index]:f.id==='description'?(['critical','improvement','good','good'] as const)[index]:f.status;return {...f,status,evidence:status===f.status?f.evidence:`Illustrative ${status} result for the history demo.`,title:status==='good'&&f.id==='alt'?'Image alt attributes are present':f.title};});
 for(const cat of Object.keys(audit.scores) as Category[]){const scored=audit.findings.filter(f=>f.category===cat&&f.weight>0);audit.scores[cat]=Math.round(scored.reduce((sum,f)=>sum+f.weight*(f.status==='good'?100:f.status==='improvement'?55:0),0)/scored.reduce((sum,f)=>sum+f.weight,0));}
 audit.score=Math.round(Object.values(audit.scores).reduce((sum,value)=>sum+value,0)/4);return audit;
}).reverse();
