import type {Finding} from './types';
// Editorial estimates, not measured traffic or implementation time.
const quick=new Set(['title','description','h1','outline','lang','viewport','indexing','snippets','canonical','social-cards']);
export const isIssue=(finding:Finding)=>finding.status==='critical'||finding.status==='improvement';
export function priorityFor(finding:Finding){
 const effort=quick.has(finding.id)?1:['copy','schema','performance-bottlenecks','page-speed'].includes(finding.id)?3:2;
 const impact=finding.status==='critical'?3:finding.weight>=2?2:1;
 return {impact,effort,rank:isIssue(finding)?impact/effort:0,impactLabel:['','Low','Medium','High'][impact],effortLabel:['','Small','Medium','Larger'][effort]};
}
export function prioritize(findings:Finding[]){return [...findings].sort((a,b)=>priorityFor(b).rank-priorityFor(a).rank||(a.status==='critical'?-1:0)-(b.status==='critical'?-1:0)||b.weight-a.weight);}
export function auditCsv(findings:Finding[]){
 const cell=(value:unknown)=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 return [['Check','Category','Status','Score weight','Impact estimate','Effort estimate','Evidence','Fix'],...findings.map(f=>[f.title,f.category,f.status,f.weight,priorityFor(f).impactLabel,priorityFor(f).effortLabel,f.evidence,f.recommendation])].map(row=>row.map(cell).join(',')).join('\r\n');
}
