'use client';
import {useEffect,useState,useRef} from 'react';
import {Button,Card,StatusChip,EmptyState,Drawer,DrawerContent,DrawerHeader,DrawerTitle,DrawerDescription,Toast} from './design-system';
import RecommendationDetail,{type RecommendationText} from './recommendation-detail';
import {categories,type Audit,type Finding} from '@/lib/audit/types';
import {priorityFor} from '@/lib/audit/priorities';
import {parseDone,sortActionFindings} from '@/lib/finding-tasks';
import {pageKey} from '@/lib/audit/history';
import {navigateWorkspace,useWorkspaceLocation,useWorkspaceRoute} from '@/hooks/use-workspace-route';

const statuses=['all','critical','improvement','good','optional','done'] as const;
const categoryFilters=[['all','All categories'],['seo','SEO'],['content','Content'],['geo','AI/GEO'],['performance','Performance']] as const;
export default function Recommendations({audit,detail,onRun}:{audit:Audit;detail:(finding:Finding)=>RecommendationText;onRun:()=>void}){
 const location=useWorkspaceLocation();const activeView=useWorkspaceRoute()==='recommendations';
 const target=activeView?new URLSearchParams(location.split('?')[1]||'').get('finding'):null;
 const [filter,setFilter]=useState('all'),[category,setCategory]=useState('all'),[sort,setSort]=useState<'impact'|'effort'>('impact');
 const [done,setDone]=useState<string[]>([]),[opened,setOpened]=useState<string|null>(null),[mobile,setMobile]=useState(false),[note,setNote]=useState('');
 const rows=useRef<(HTMLDivElement|null)[]>([]);const memory=useRef(new Map<string,string[]>());const key='signal-completed:'+pageKey(audit.url);
 useEffect(()=>{
  const load=()=>{try{const next=parseDone(localStorage.getItem(key),audit.findings);memory.current.set(key,next);setDone(next);setNote('');}catch{setDone(parseDone(JSON.stringify(memory.current.get(key)||[]),audit.findings));setNote('Browser storage is unavailable. Completion marks last only for this visit.');}};
  load();const onStorage=(event:StorageEvent)=>{if(event.key===key||event.key===null)load();};
  window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);
 },[key,audit.findings]);
 useEffect(()=>{const media=window.matchMedia('(max-width:767px)');const change=()=>setMobile(media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{
  const timer=setTimeout(()=>{const finding=audit.findings.find(item=>item.id===target);setOpened(finding?.id||null);if(finding){setCategory('all');setFilter('all');}},0);
  return()=>clearTimeout(timer);
 },[target,audit.findings]);
 useEffect(()=>{if(activeView&&opened&&!mobile)document.getElementById('task-'+opened)?.scrollIntoView({block:'nearest'});},[activeView,opened,mobile]);
 const completed=audit.findings.filter(f=>done.includes(f.id)).length;
 const findings=sortActionFindings(audit.findings,sort).filter(f=>(filter==='all'||(filter==='done'?done.includes(f.id):f.status===filter))&&(category==='all'||f.category===category));
 const selected=findings.find(f=>f.id===opened);
 function toggle(finding:Finding){
  const next=done.includes(finding.id)?done.filter(id=>id!==finding.id):[...done,finding.id];memory.current.set(key,next);setDone(next);
  try{localStorage.setItem(key,JSON.stringify(next));}catch{setNote('This completion mark could not be saved. It remains available in this tab.');}
  Toast.success(next.includes(finding.id)?'Marked done in this browser':'Marked not done');
 }
 function close(){setOpened(null);if(target)navigateWorkspace('recommendations',audit.url);}
 function open(finding:Finding){if(opened===finding.id){close();return;}setOpened(finding.id);navigateWorkspace('recommendations',audit.url,finding.id);}
 function reset(){setFilter('all');setCategory('all');}
 return <Card title="Your action list" className="ws-recommendations">
  <div className="ws-task-progress" role="status"><div><strong>{completed} of {audit.findings.length} done</strong><small>Saved only in this browser · checklist marks do not change scores</small></div><progress aria-label="Recommendation completion" value={completed} max={Math.max(1,audit.findings.length)}/><Button onClick={onRun}>Re-run to verify</Button></div>
  {note&&<p role="status">{note}</p>}
  {completed===audit.findings.length&&completed>0&&<EmptyState title="Your checklist is complete" description="Every item is marked done. Re-run to verify your changes; completion marks alone do not confirm a fix." action={<Button variant="outline" onClick={onRun}>Verify with a new audit</Button>}/>}
  <div className="ws-action-toolbar"><div className="ws-task-filters" role="group" aria-label="Priority filters">{statuses.map(value=>{const label=value[0].toUpperCase()+value.slice(1);const count=value==='all'?audit.findings.length:value==='done'?completed:audit.findings.filter(f=>f.status===value).length;return <Button key={value} variant={filter===value?'secondary':'ghost'} aria-label={label} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}<span className="ws-filter-count" aria-hidden="true">{count}</span></Button>;})}</div>
  <div className="ws-task-filters" role="group" aria-label="Category filters">{categoryFilters.map(([value,label])=><Button key={value} aria-pressed={category===value} variant={category===value?'secondary':'ghost'} onClick={()=>setCategory(value)}>{label}</Button>)}</div>
  <div className="ws-action-sort"><label>Sort by<select aria-label="Sort by" value={sort} onChange={event=>setSort(event.target.value as 'impact'|'effort')}><option value="impact">Impact, then effort</option><option value="effort">Effort, then impact</option></select></label><p>{findings.length} of {audit.findings.length} items shown · Open fixes first. Impact and effort are editorial estimates.</p><span>j / k move · Enter open · x mark done</span></div></div>
  <div role="list" aria-label="Audit findings">{findings.map((finding,index)=>{const priority=priorityFor(finding),expanded=opened===finding.id;return <div className={'ws-task '+(done.includes(finding.id)?'is-done':'')} role="listitem" key={finding.id} id={'task-'+finding.id} data-category={finding.category} data-status={finding.status} data-impact={priority.impact} data-effort={priority.effort} ref={node=>{rows.current[index]=node;}} tabIndex={0} onKeyDown={event=>{
   if(event.target!==event.currentTarget||event.altKey||event.ctrlKey||event.metaKey)return;
   const key=event.key.toLowerCase();if(!['j','k','enter','x'].includes(key))return;event.preventDefault();
   if(key==='j'||key==='k')rows.current[(index+(key==='j'?1:-1)+findings.length)%findings.length]?.focus();
   if(key==='enter')open(finding);if(key==='x')toggle(finding);
  }}><div className="ws-task-row"><label className="ws-complete-target"><input type="checkbox" checked={done.includes(finding.id)} onChange={()=>toggle(finding)} aria-label={`Mark ${finding.title} ${done.includes(finding.id)?'not done':'done'}`}/></label><StatusChip status={finding.status}/><div className="ws-task-copy"><h3>{finding.title}</h3><small>{categories[finding.category]}</small><div className="ws-priority-tags"><span>{priority.impactLabel} impact</span><span>{priority.effortLabel} effort</span></div></div><Button variant="outline" onClick={()=>open(finding)} aria-label={`Open ${finding.title}`} aria-expanded={expanded} aria-haspopup={mobile?'dialog':undefined} aria-controls={expanded?'detail-'+finding.id:undefined}>Open</Button></div>{!mobile&&expanded&&<div id={'detail-'+finding.id}><RecommendationDetail finding={finding} text={detail(finding)}/></div>}</div>;})}</div>
  {!findings.length&&<EmptyState title={audit.findings.length?'No findings match these filters':'No findings to review'} description={audit.findings.length?'Try another status or category, or reset the filters.':'Run an audit to create a checklist with evidence and practical fixes.'} action={audit.findings.length?<Button variant="outline" onClick={reset}>Reset filters</Button>:<Button variant="outline" onClick={onRun}>Run audit</Button>}/>}
  <Drawer open={activeView&&mobile&&!!selected} onOpenChange={value=>{if(!value)close();}}><DrawerContent className="ws-fix-drawer"><DrawerHeader><DrawerTitle>{selected?.title}</DrawerTitle><DrawerDescription>Evidence and practical next steps from this audit.</DrawerDescription></DrawerHeader>{selected&&<div id={'detail-'+selected.id}><RecommendationDetail finding={selected} text={detail(selected)}/></div>}</DrawerContent></Drawer>
 </Card>;
}
