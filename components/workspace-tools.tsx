'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {workspaceNav} from '@/lib/workspace-nav';
import {navigateWorkspace,useClientReady} from '@/hooks/use-workspace-route';
import {blockingDialogSelector,editingTarget,focusWorkspaceContent,nextCommandIndex,workspaceShortcut} from '@/lib/workspace-accessibility';
import {Button,Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './design-system';
type Props={hasReport:boolean;url:string;onSample:()=>void;onTheme:()=>void;onExport:(format:string)=>void};
export default function WorkspaceTools({hasReport,url,onSample,onTheme,onExport}:Props){
 const ready=useClientReady();
 const [open,setOpen]=useState(false),[shortcuts,setShortcuts]=useState(false),[query,setQuery]=useState(''),[tour,setTour]=useState<number|null>(null),[position,setPosition]=useState({top:140,left:24}),[active,setActive]=useState(0);
 const input=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null),tourPanel=useRef<HTMLElement>(null),started=useRef(false),restore=useRef<HTMLElement|null>(null),afterClose=useRef<'url'|'content'|null>(null);
 useEffect(()=>{
  if(!ready||started.current)return;started.current=true;
  const timer=setTimeout(()=>{let complete=false;try{complete=localStorage.getItem('signal-tour-complete')==='1';}catch{}if(!complete){restore.current=document.activeElement as HTMLElement;setTour(0);}},0);
  return()=>clearTimeout(timer);
 },[ready]);
 const dismiss=useCallback(()=>{setTour(null);try{localStorage.setItem('signal-tour-complete','1');}catch{}(restore.current?.isConnected&&restore.current!==document.body?restore.current:document.getElementById('persistent-url'))?.focus({preventScroll:true});},[]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&tour!==null&&!event.defaultPrevented&&!document.querySelector(blockingDialogSelector)){event.preventDefault();dismiss();return;}
   const action=workspaceShortcut({...event,key:event.key,metaKey:event.metaKey,ctrlKey:event.ctrlKey,altKey:event.altKey,isComposing:event.isComposing,repeat:event.repeat,defaultPrevented:event.defaultPrevented,editing:editingTarget(event.target),modal:!!document.querySelector(blockingDialogSelector),paletteOpen:open});
   if(!action)return;event.preventDefault();
   if(action==='palette'){setTour(null);setOpen(value=>!value);setQuery('');setActive(0);}
   if(action==='url')document.getElementById('persistent-url')?.focus();
   if(action==='shortcuts'){setTour(null);setShortcuts(true);}
  };
  document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
 },[open,tour,dismiss]);
 useEffect(()=>{
  if(tour===null)return;
  const target=document.querySelector<HTMLElement>(tour===0?'#persistent-url':tour===1?window.innerWidth<768?'.ws-bottom':'.ws-sidebar':'.ws-top-fixes');
  const update=()=>{const box=target?.getBoundingClientRect();if(box){const height=tourPanel.current?.offsetHeight||250;setPosition({top:Math.max(8,Math.min(window.innerHeight-height-(window.innerWidth<768?220:88),tour===1?window.innerWidth<768?box.top-height-12:box.top+60:box.bottom+12)),left:Math.max(8,Math.min(window.innerWidth-328,tour===1&&window.innerWidth>=768?box.right+12:box.left))});}};
  const described=target?.getAttribute('aria-describedby');target?.setAttribute('data-tour-target','true');target?.setAttribute('aria-describedby',[described,'tour-description'].filter(Boolean).join(' '));
  if(tour===2)target?.scrollIntoView({block:'start',behavior:'instant'});
  const timer=setTimeout(()=>{update();tourPanel.current?.focus({preventScroll:true});},0);update();
  window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
  return()=>{clearTimeout(timer);target?.removeAttribute('data-tour-target');if(described)target?.setAttribute('aria-describedby',described);else target?.removeAttribute('aria-describedby');window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
 },[tour,hasReport]);
 const actions=[...workspaceNav.filter(item=>item.enabled).map(item=>({id:item.id,label:`Go to ${item.label}`,focus:'content' as const,run:()=>navigateWorkspace(item.id,url)})),{id:'new',label:'Run a new audit',focus:'url' as const,run:()=>navigateWorkspace('overview',url)},{id:'theme',label:'Toggle theme',focus:null,run:onTheme},...['pdf','html','json','csv'].map(format=>({id:format,label:`Export ${format.toUpperCase()}`,focus:null,run:()=>onExport(format)})),{id:'github',label:'Open GitHub',focus:null,run:()=>window.open('https://github.com/shabeeh-shah/SEO-Audit-Tool','_blank','noopener,noreferrer')}];
 const matches=actions.filter(item=>item.label.toLowerCase().includes(query.toLowerCase()));
 function choose(index:number){const item=matches[index];if(!item)return;afterClose.current=item.focus;setOpen(false);item.run();}
 function commandKey(event:React.KeyboardEvent){
  if(event.isDefaultPrevented()||event.nativeEvent.isComposing)return;
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   if((event.key==='Home'||event.key==='End')&&event.target===input.current)return;
   event.preventDefault();const start=event.target===input.current?(event.key==='ArrowDown'?-1:0):active;const next=nextCommandIndex(start,event.key,matches.length);setActive(next);list.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }else if(event.key==='Enter'&&event.target===input.current){event.preventDefault();choose(Math.max(0,active));}
 }
 function finishNavigation(event:Event){if(afterClose.current){event.preventDefault();const next=afterClose.current;afterClose.current=null;setTimeout(()=>{if(next==='url'){const field=document.getElementById('persistent-url') as HTMLInputElement|null;field?.focus();field?.select();}else focusWorkspaceContent();},0);}}
 return <>
  <Button variant="ghost" className="ws-command-button" onClick={()=>{setTour(null);setQuery('');setActive(0);setOpen(true);}} aria-label="Open command palette" aria-keyshortcuts="Meta+K Control+K">⌘ / Ctrl K</Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="ws-command" onKeyDown={commandKey} onOpenAutoFocus={event=>{event.preventDefault();input.current?.focus();}} onCloseAutoFocus={finishNavigation}><DialogHeader><DialogTitle>Where would you like to go?</DialogTitle><DialogDescription>Search views and actions. Use ↑ / ↓ or Tab to choose, Enter to run, Escape to close.</DialogDescription></DialogHeader><input ref={input} aria-label="Search commands" placeholder="Search views and actions…" autoComplete="off" value={query} onChange={event=>{setQuery(event.target.value);setActive(0);}}/><p className="sr-only" role="status" aria-live="polite">{matches.length} commands found</p><div ref={list} className="ws-command-list" role="group" aria-label="Matching commands">{matches.map((item,index)=><Button variant="ghost" key={item.id} data-command={item.id} onFocus={()=>setActive(index)} onClick={()=>choose(index)}>{item.label}</Button>)}{!matches.length&&<p className="ws-command-empty">No matching commands. Try a tab name, “export”, or “theme”.</p>}</div></DialogContent></Dialog>
  <Dialog open={shortcuts} onOpenChange={setShortcuts}><DialogContent onCloseAutoFocus={event=>{if(tour!==null)event.preventDefault();}}><DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle><DialogDescription>Move around Signal without reaching for a mouse. Single-key shortcuts stay inactive while you type.</DialogDescription></DialogHeader><dl className="ws-shortcuts"><dt>Cmd / Ctrl + K</dt><dd>Open command palette</dd><dt>/</dt><dd>Focus URL field</dd><dt>?</dt><dd>Show this help</dd><dt>↑ / ↓</dt><dd>Choose a palette command</dd><dt>Tab / Shift + Tab</dt><dd>Move between controls</dd><dt>j / k</dt><dd>Move between recommendation rows</dd><dt>Enter</dt><dd>Run a command or open a focused recommendation</dd><dt>x</dt><dd>Toggle completion on the focused row</dd><dt>Escape</dt><dd>Close a dialog, drawer, or tour</dd></dl><Button variant="outline" onClick={()=>{setShortcuts(false);restore.current=document.activeElement as HTMLElement;setTour(0);}}>Replay welcome tour</Button></DialogContent></Dialog>
  {tour!==null&&createPortal(<aside ref={tourPanel} tabIndex={-1} className="ws-tour" role="dialog" aria-modal="false" aria-label="Welcome to Signal" aria-describedby="tour-description" style={position} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}}}><small aria-live="polite">WELCOME · {tour+1} OF 3</small><h2>{['Start with your public URL','Every feature has a home','Choose one useful fix'][tour]}</h2><p id="tour-description">{['Enter a page here to run your audit. The field stays within reach on every view.','Use the grouped sidebar or mobile tabs to move between analysis, comparisons, and learning.','The overview highlights three fixes with evidence. Open one and make your next change.'][tour]}</p><div><Button variant="ghost" onClick={dismiss}>Dismiss tour</Button><Button onClick={()=>{if(tour===2){dismiss();return;}if(tour===1){if(!hasReport){onSample();}else navigateWorkspace('overview',url);}setTour(tour+1);}}>{tour===2?'Got it':'Next'}</Button></div></aside>,document.body)}
 </>;
}
