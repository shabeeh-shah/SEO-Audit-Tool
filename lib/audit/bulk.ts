import {normalizeUrl} from './fetch';
import {isIssue,prioritize} from './priorities';
import type {Audit} from './types';

export const MAX_BULK_URLS=20;
export const BULK_CONCURRENCY=2;
export type BulkAuditResult={requestedUrl:string;audit?:Audit;error?:string};

function rows(text:string){
 const result:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let index=0;index<text.length;index++){const char=text[index];if(char==='"'){if(quoted&&text[index+1]==='"'){cell+='"';index++;}else quoted=!quoted;}else if(char===','&&!quoted){row.push(cell);cell='';}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[index+1]==='\n')index++;row.push(cell);result.push(row);row=[];cell='';}else cell+=char;}
 row.push(cell);result.push(row);return result;
}

export function parseBulkInput(input:string){
 if(typeof input!=='string'||input.length>50_000)throw new Error('Paste or upload a list smaller than 50 KB.');
 const candidates=rows(input).map(row=>row[0]?.trim()).filter((value):value is string=>Boolean(value)).filter((value,index)=>!(index===0&&/^url$/i.test(value)));
 if(!candidates.length)throw new Error('Add at least one public website URL.');
 if(candidates.length>MAX_BULK_URLS)throw new Error(`Bulk audits accept up to ${MAX_BULK_URLS} URLs at a time.`);
 const unique:string[]=[];const seen=new Set<string>();
 for(const candidate of candidates){const normalized=normalizeUrl(candidate).href;if(!seen.has(normalized)){seen.add(normalized);unique.push(normalized);}}
 if(unique.length>MAX_BULK_URLS)throw new Error(`Bulk audits accept up to ${MAX_BULK_URLS} URLs at a time.`);
 return unique;
}

export const gradeFor=(score:number)=>score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F';
export function topIssue(audit:Audit){return prioritize(audit.findings).find(isIssue)?.title||'No scored issues found';}
const csvCell=(value:unknown)=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return `"${text.replace(/"/g,'""')}"`;};
export function bulkCsv(results:BulkAuditResult[]){
 const header=['URL','Status','Overall grade','Overall score','SEO','Content','AI / GEO','Performance','Top issue'];
 const data=results.map(result=>result.audit?[result.audit.url,'Complete',gradeFor(result.audit.score),result.audit.score,result.audit.scores.seo,result.audit.scores.content,result.audit.scores.geo,result.audit.scores.performance,topIssue(result.audit)]:[result.requestedUrl,'Failed','','','','','','',result.error||'Audit failed']);
 return [header,...data].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
