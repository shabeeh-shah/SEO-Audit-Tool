import type {Finding} from './audit/types';
import {priorityFor,isIssue} from './audit/priorities';
export function parseDone(raw:string|null,findings:Finding[]){try{if(!raw||raw.length>20_000)return [];const data=JSON.parse(raw);if(!Array.isArray(data))return [];const valid=new Set(findings.map(f=>f.id));return [...new Set(data.filter((id:unknown):id is string=>typeof id==='string'&&valid.has(id)))].slice(0,200);}catch{return [];}}
export function sortActionFindings(findings:Finding[],sort:'impact'|'effort'='impact'){
 const statuses={critical:0,improvement:1,good:2,optional:3};
 return [...findings].sort((a,b)=>{
  const left=priorityFor(a),right=priorityFor(b);
  const impact=right.impact-left.impact,effort=left.effort-right.effort;
  return Number(isIssue(b))-Number(isIssue(a))||(sort==='impact'?impact||effort:effort||impact)||statuses[a.status]-statuses[b.status]||a.id.localeCompare(b.id);
 });
}
