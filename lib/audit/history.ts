import {z} from 'zod';
import type {Audit,Finding} from './types';
export const HISTORY_KEY='signal-audit-history';
export const HISTORY_LIMIT=100;
export const HISTORY_BYTES=3_000_000;
const text=z.string().max(150_000),n=z.number().finite().nonnegative(),nullable=n.nullable();
const webUrl=z.string().max(2048).refine(value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}});
const resource=z.object({url:webUrl,status:nullable,redirects:n});
const image=z.object({url:webUrl,status:nullable,bytes:nullable,state:z.enum(['ok','large','unknown'])});
const finding=z.object({id:text,category:z.enum(['seo','content','geo','performance']),status:z.enum(['critical','improvement','good','optional']),title:text,evidence:text,recommendation:text,weight:n});
const lab=z.object({renderedWords:n,fcpMs:nullable,lcpMs:nullable,cls:nullable,loadMs:nullable,ttfbMs:nullable,longTasks:n,transferKb:nullable,mobileOverflow:z.boolean(),smallTapTargets:n,oversizedImages:z.array(z.object({url:text,width:n,height:n,displayWidth:n,displayHeight:n})).max(100),accessibility:z.object({violations:z.array(z.object({id:text,impact:text.nullable(),help:text,url:webUrl,count:n})).max(100),incomplete:n}).nullable().optional()});
const auditSchema=z.object({url:webUrl,requestedUrl:webUrl,title:text,description:text,date:z.string().refine(value=>Number.isFinite(Date.parse(value))),sample:z.boolean().optional(),scoringVersion:z.string().max(80).optional(),score:n.max(100),scores:z.object({seo:n.max(100),content:n.max(100),geo:n.max(100),performance:n.max(100)}),findings:z.array(finding).max(100),metrics:z.object({words:n,rawHtmlWords:n,scriptCount:n,readingEase:nullable,headings:n,h1:n,h2:n,images:n,missingAlt:n,links:n,checkedLinks:n,responseMs:n,htmlKb:n,schemaTypes:z.array(text).max(100),redirects:n,robotsTxt:resource,sitemapXml:resource}),keywords:z.array(z.object({word:text,count:n,density:n})).max(100),headings:z.array(z.object({level:n.min(1).max(6),text})).max(200),linkResults:z.array(z.object({url:webUrl,status:nullable,state:z.enum(['ok','broken','unknown']),redirects:n})).max(100),limitations:z.array(text).max(100),preview:z.object({image:webUrl.nullable().catch(null),favicon:webUrl.nullable().catch(null),headline:text}),performance:z.object({checkedImages:z.array(image).max(100),largeImages:z.array(image).max(100),renderBlockingScripts:n,stylesheets:n,lazyImages:n,fixedWidthRisks:n,lab:lab.nullable()}),aiReadiness:z.object({bots:z.array(z.object({bot:text,state:z.enum(['allowed','blocked','unknown']),source:text,rule:text})).max(100),llmsTxt:resource,questionHeadings:n,conciseAnswers:n,authorSignals:z.array(text).max(100),dateSignals:z.array(text).max(100),jsonLdBlocks:n,invalidJsonLd:n,relevantSchemaTypes:z.array(text).max(100)})});
export function pageKey(url:string){const u=new URL(url);u.hash='';return u.href;}
export function runKey(audit:Audit){return `${pageKey(audit.url)}|${new Date(audit.date).toISOString()}`;}
export function parseHistory(raw:string|null):{audits:Audit[];skipped:number}{
 if(!raw)return {audits:[],skipped:0};
 try{const value:unknown=JSON.parse(raw);if(!Array.isArray(value))return {audits:[],skipped:1};let skipped=0;const audits:Audit[]=[];for(const item of value){const parsed=auditSchema.safeParse(item);if(!parsed.success||parsed.data.sample){skipped++;continue;}audits.push(parsed.data as Audit);}return {audits:boundHistory(audits).audits,skipped};}catch{return {audits:[],skipped:1};}
}
export function boundHistory(items:Audit[]){
 const unique=new Map<string,Audit>();for(const item of items){if(!item.sample&&!unique.has(runKey(item)))unique.set(runKey(item),item);}
 const all=[...unique.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));const audits=all.slice(0,HISTORY_LIMIT);
 while(audits.length&&new TextEncoder().encode(JSON.stringify(audits)).length>HISTORY_BYTES)audits.pop();
 return {audits,removed:all.length-audits.length};
}
export function addRun(items:Audit[],audit:Audit){return boundHistory(audit.sample?items:[audit,...items]);}
export function earlierRun(items:Audit[],audit:Audit){return items.filter(item=>pageKey(item.url)===pageKey(audit.url)&&Date.parse(item.date)<Date.parse(audit.date)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0]||null;}
const severity={good:0,improvement:1,critical:2};
export function compareRuns(before:Audit,after:Audit){
 if(pageKey(before.url)!==pageKey(after.url)||Date.parse(before.date)>=Date.parse(after.date))return null;
 const old=new Map(before.findings.map(f=>[f.id,f]));const now=new Map(after.findings.map(f=>[f.id,f]));
 const resolved:Finding[]=[],newIssues:Finding[]=[],improved:Finding[]=[],worsened:Finding[]=[],uncompared:Finding[]=[];
 for(const f of after.findings){const prior=old.get(f.id);if(!prior||prior.status==='optional'||f.status==='optional'){uncompared.push(f);continue;}const from=severity[prior.status],to=severity[f.status];if(from>0&&to===0)resolved.push(f);else if(from===0&&to>0)newIssues.push(f);else if(to<from)improved.push(f);else if(to>from)worsened.push(f);}
 for(const f of before.findings)if(!now.has(f.id))uncompared.push(f);
 const signature=(a:Audit)=>JSON.stringify(a.findings.filter(f=>f.weight>0).map(f=>`${f.id}:${f.category}:${f.weight}`).sort());
 return {resolved,newIssues,improved,worsened,uncompared,delta:after.score-before.score,comparable:!!before.scoringVersion&&before.scoringVersion===after.scoringVersion&&signature(before)===signature(after)};
}
