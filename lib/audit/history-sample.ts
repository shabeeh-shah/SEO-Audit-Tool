import {sampleAudit} from './sample';
import {calculateScores} from './scoring';
import type {Audit,Status} from './types';
export const sampleHistory:Audit[]=[0,1,2,3].map(index=>{
 const audit=structuredClone(sampleAudit);audit.date=`2026-09-${['01','08','15','22'][index]}T12:00:00Z`;
 audit.findings=audit.findings.map(f=>{const status:Status=f.id==='alt'?(['critical','improvement','improvement','good'] as const)[index]:f.id==='description'?(['critical','improvement','good','good'] as const)[index]:f.status;return {...f,status,evidence:status===f.status?f.evidence:`Illustrative ${status} result for the history demo.`,title:status==='good'&&f.id==='alt'?'Image alt attributes are present':f.title};});
 const calculated=calculateScores(audit.findings);audit.scores=calculated.scores;audit.score=calculated.score;return audit;
}).reverse();
