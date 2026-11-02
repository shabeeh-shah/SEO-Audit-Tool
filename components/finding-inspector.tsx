'use client';
import {useEffect,useRef} from 'react';
import {useWorkspaceLocation,useWorkspaceRoute,navigateWorkspace} from '@/hooks/use-workspace-route';
import {findingForView} from '@/lib/workspace-experience';
import type {Audit,Finding} from '@/lib/audit/types';
import {Button,Card,StatusChip,Toast} from './design-system';

export default function FindingInspector({audit,detail}:{audit:Audit;detail:(finding:Finding)=>{why:string;change:string;example:string}}){
 const location=useWorkspaceLocation(),view=useWorkspaceRoute();
 const id=new URLSearchParams(location.split('?')[1]||'').get('finding');
 const finding=findingForView(audit,view,id);const panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(finding){panel.current?.scrollIntoView({block:'start'});panel.current?.focus({preventScroll:true});}},[finding,view]);
 if(!finding)return null;
 const text=detail(finding);
 return <section ref={panel} tabIndex={-1} id={`finding-${finding.id}`} className="ws-inspector" aria-label={`Finding: ${finding.title}`}><Card title={finding.title} actions={<StatusChip status={finding.status}/>}><div className="ws-fix-detail"><h3>Evidence</h3><p>{finding.evidence}</p><h3>Why it matters</h3><p>{text.why}</p><h3>What specifically needs to change</h3><p>{text.change}</p><h3>What an improved version could look like</h3><pre>{text.example}</pre><div className="ws-inspector-actions"><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(text.example).then(()=>Toast.success('Fix example copied')).catch(()=>Toast.error('Copy failed. Select and copy the example manually.'))}>Copy fix</Button><Button variant="outline" onClick={()=>navigateWorkspace('recommendations',audit.url,finding.id)}>Track this fix</Button><Button variant="ghost" onClick={()=>navigateWorkspace(view,audit.url)}>Close finding</Button></div><p>{finding.weight===0?'Advisory or optional · excluded from the score':`Score weight: ${finding.weight}`}. Re-run the page after making a change to verify the result.</p></div></Card></section>;
}
