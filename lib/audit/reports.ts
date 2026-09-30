import {getD1} from '@/db';
import type {Audit} from './types';

const REPORT_ID=/^[a-f0-9]{24}$/;
const MAX_REPORT_BYTES=150_000;

function isSharedAudit(value:unknown):value is Audit{
 if(!value||typeof value!=='object')return false;
 const audit=value as Partial<Audit>;
 return typeof audit.url==='string'&&audit.url.length<=2048&&typeof audit.title==='string'&&typeof audit.description==='string'&&typeof audit.date==='string'&&typeof audit.score==='number'&&Number.isFinite(audit.score)&&!!audit.scores&&typeof audit.scores==='object'&&Array.isArray(audit.findings)&&audit.findings.length<=80&&!!audit.metrics&&typeof audit.metrics==='object'&&Array.isArray(audit.headings)&&Array.isArray(audit.keywords)&&Array.isArray(audit.linkResults)&&Array.isArray(audit.limitations)&&!!audit.preview&&typeof audit.preview==='object'&&!!audit.aiReadiness&&typeof audit.aiReadiness==='object';
}

export async function saveSharedReport(audit:Audit){
 if(!isSharedAudit(audit))throw new Error('This audit cannot be shared. Run it again and try once more.');
 const auditJson=JSON.stringify(audit);if(auditJson.length>MAX_REPORT_BYTES)throw new Error('This report is too large to share. Export it instead.');
 const id=crypto.randomUUID().replace(/-/g,'').slice(0,24);
 await getD1().prepare('INSERT INTO shared_reports (id, audit_json, created_at) VALUES (?, ?, ?)').bind(id,auditJson,Date.now()).run();
 return id;
}

export async function getSharedReport(id:string){
 if(!REPORT_ID.test(id))return null;
 const row=await getD1().prepare('SELECT audit_json, created_at FROM shared_reports WHERE id = ? LIMIT 1').bind(id).first<{audit_json:string;created_at:number}>();
 if(!row)return null;
 try{const audit=JSON.parse(row.audit_json) as unknown;return isSharedAudit(audit)?{audit,createdAt:row.created_at}:null;}catch{return null;}
}
