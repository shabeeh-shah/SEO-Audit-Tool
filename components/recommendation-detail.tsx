'use client';
import type {Finding} from '@/lib/audit/types';
import {Button,Toast} from './design-system';

export type RecommendationText={why:string;change:string;example:string};
export default function RecommendationDetail({finding,text}:{finding:Finding;text:RecommendationText}){
 return <div className="ws-fix-detail"><h3>Why it matters</h3><p>{text.why}</p><h3>Evidence</h3><p>{finding.evidence}</p><h3>What to change</h3><p>{text.change}</p>{text.example.trim()&&<><h3>What an improved version could look like</h3><pre>{text.example}</pre><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(text.example).then(()=>Toast.success('Fix example copied')).catch(()=>Toast.error('Copy failed. Select the example and copy it manually.'))}>Copy fix</Button></>}<p><a href={finding.category==='performance'?'https://web.dev/articles/vitals':'https://developers.google.com/search/docs/fundamentals/seo-starter-guide'} target="_blank" rel="noreferrer">Read trusted guidance ↗</a></p><p>{finding.weight===0?'Advisory or optional · excluded from the score':`Score weight: ${finding.weight}`}. Marking done tracks your work; re-run the audit to verify a fix.</p></div>;
}
