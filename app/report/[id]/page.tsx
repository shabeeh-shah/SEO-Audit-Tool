import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getSharedReport} from '@/lib/audit/reports';
import {categories,type Category} from '@/lib/audit/types';

type Props={params:Promise<{id:string}>};
const gradeFor=(score:number)=>score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F';
const host='https://signal-audit-lab.shabeehshah42.chatgpt.site';

async function reportFor(params:Props['params']){const {id}=await params;return {id,report:await getSharedReport(id)};}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id,report}=await reportFor(params);if(!report)return {title:'Report not found · Signal'};
 const site=new URL(report.audit.url).hostname;const title=`${site} website audit · Signal`;const description=`${gradeFor(report.audit.score)} grade · ${report.audit.score}/100 overall website audit score.`;
 return {title,description,alternates:{canonical:`/report/${id}`},openGraph:{title,description,type:'website',images:[{url:`${host}/report/${id}/og`,width:1200,height:630,alt:`Signal audit score: ${gradeFor(report.audit.score)} (${report.audit.score}/100)`}]},twitter:{card:'summary_large_image',title,description,images:[`${host}/report/${id}/og`]}};
}

export default async function SharedReportPage({params}:Props){
 const {report}=await reportFor(params);if(!report)notFound();const {audit,createdAt}=report;const grade=gradeFor(audit.score);const scores=(Object.keys(categories) as Category[]).map(key=>({key,label:categories[key],score:audit.scores[key]}));
 return <main className="shared-report"><header className="shared-top"><Link href="/" className="shared-brand">signal<span>.</span></Link><Link href="/" className="shared-home">Run your own audit</Link></header><section className="shared-hero"><p>SHARED WEBSITE AUDIT</p><h1>{new URL(audit.url).hostname}</h1><span>{new Date(createdAt).toLocaleString(undefined,{month:'long',day:'numeric',year:'numeric'})}</span></section><section className="shared-score"><div className="shared-grade"><span>Overall grade</span><strong>{grade}</strong><b>{audit.score} / 100</b></div><div><h2>{grade==='A'?'Excellent foundation':grade==='B'?'Strong foundation':grade==='C'?'Clear opportunities ahead':'Start with the essentials'}</h2><p>This is a focused review of one public page. Scores are heuristic indicators, not search rankings or citation predictions.</p><div className="shared-score-grid">{scores.map(item=><div key={item.key}><span>{item.label}</span><b>{gradeFor(item.score)} · {item.score}</b><i><em style={{width:`${item.score}%`}}/></i></div>)}</div></div></section><section className="shared-section"><div className="shared-section-heading"><div><p>PRIORITIZED FINDINGS</p><h2>Full report</h2></div><a href={audit.url} target="_blank" rel="noreferrer">Visit website ↗</a></div><div className="shared-findings">{audit.findings.map(f=><article key={f.id}><span className={f.status}>{f.status==='critical'?'Critical':f.status==='improvement'?'Improvement':'Good'}</span><h3>{f.title}</h3><p><b>What we found:</b> {f.evidence}</p><p><b>Next step:</b> {f.recommendation}</p></article>)}</div></section><footer className="shared-footer"><p>Shared from Signal · SEO, content, and AI readiness audits</p><Link href="/">Audit another website</Link></footer></main>;
}
