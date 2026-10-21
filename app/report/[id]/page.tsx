import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {decodeShareSummary,gradeForScore} from '@/lib/audit/share';
import {categories,type Category} from '@/lib/audit/types';
import {siteUrl} from '@/lib/site';

type Props={params:Promise<{id:string}>};
async function summaryFor(params:Props['params']){const {id}=await params;return {id,summary:decodeShareSummary(id)};}

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id,summary}=await summaryFor(params);if(!summary)return {title:'Report not found · Signal',robots:{index:false,follow:false}};
 const hostname=new URL(summary.url).hostname;const grade=gradeForScore(summary.score);const title=`${hostname} website audit · Signal`;const description=`${grade} grade · ${summary.score}/100 overall, with SEO, content, AI/GEO, and performance scores.`;const permalink=`${siteUrl}/report/${id}`;const image=`${permalink}/og`;
 return {title,description,alternates:{canonical:permalink},openGraph:{title,description,url:permalink,type:'website',images:[{url:image,width:1200,height:630,alt:`Signal audit score: ${grade} (${summary.score}/100)`}]},twitter:{card:'summary_large_image',title,description,images:[image]}};
}

export default async function SharedReportPage({params}:Props){
 const {summary}=await summaryFor(params);if(!summary)notFound();const grade=gradeForScore(summary.score);const scores=(Object.keys(categories) as Category[]).map(key=>({key,label:categories[key],score:summary.scores[key]}));
 return <main className="shared-report"><header className="shared-top"><Link href="/" className="shared-brand">signal<span>.</span></Link><Link href="/" className="shared-home">Run your own audit</Link></header><section className="shared-hero"><p>SHARED WEBSITE AUDIT</p><h1>{new URL(summary.url).hostname}</h1><span>Read-only summary · The report data is encoded in this URL and is not stored by Signal.</span></section><section className="shared-score"><div className="shared-grade"><span>Overall grade</span><strong>{grade}</strong><b>{summary.score} / 100</b></div><div><h2>{grade==='A'?'Excellent foundation':grade==='B'?'Strong foundation':grade==='C'?'Clear opportunities ahead':'Start with the essentials'}</h2><p>This is a focused summary of one public page. Scores are heuristic indicators, not search rankings or citation predictions.</p><div className="shared-score-grid">{scores.map(item=><div key={item.key}><span>{item.label}</span><b>{gradeForScore(item.score)} · {item.score}</b><i><em style={{width:`${item.score}%`}}/></i></div>)}</div></div></section><section className="shared-section"><div className="shared-section-heading"><div><p>TOP PRIORITIES</p><h2>Three fixes to review first</h2></div><a href={summary.url} target="_blank" rel="noreferrer">Visit public page ↗</a></div><div className="shared-findings">{summary.fixes.map((fix,index)=><article key={fix}><span className="improvement">Priority {index+1}</span><h3>{fix}</h3></article>)}{summary.fixes.length===0&&<article><span className="good">No open fixes</span><h3>Keep monitoring this page as it changes.</h3></article>}</div></section><section className="shared-privacy"><b>What this link contains</b><p>The public page URL, overall score, four category scores, and the fix titles shown above. It contains no full audit evidence, page copy, history, account data, or server-stored report record.</p></section><footer className="shared-footer"><p>Shared from Signal · SEO, content, AI readiness, and performance audits</p><Link href="/">Audit another website</Link></footer></main>;
}
