import type {Finding} from './audit/types';
export function parseDone(raw:string|null,findings:Finding[]){try{if(!raw||raw.length>20_000)return [];const data=JSON.parse(raw);if(!Array.isArray(data))return [];const valid=new Set(findings.map(f=>f.id));return [...new Set(data.filter((id:unknown):id is string=>typeof id==='string'&&valid.has(id)))].slice(0,200);}catch{return [];}}
export function sortActionFindings(findings:Finding[]){const impact=(f:Finding)=>f.status==='critical'?3:f.status==='improvement'?2:0;return [...findings].sort((a,b)=>impact(b)-impact(a)||b.weight-a.weight);}
