'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Audit} from '@/lib/audit/types';
import {addRun,HISTORY_KEY,parseHistory,runKey} from '@/lib/audit/history';
export function useAuditHistory(){
 const [history,setHistory]=useState<Audit[]>([]),[storageNote,setNote]=useState('');const current=useRef<Audit[]>([]);
 useEffect(()=>{
  const load=()=>{try{const parsed=parseHistory(localStorage.getItem(HISTORY_KEY));current.current=parsed.audits;setHistory(parsed.audits);if(parsed.skipped)setNote('Some older records could not be read. Valid records are still available.');}catch{setNote('Browser storage is unavailable. New runs will remain here only until this tab closes.');}};
  load();const onStorage=(event:StorageEvent)=>{if(event.key===HISTORY_KEY||event.key===null)load();};window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);
 },[]);
 const record=useCallback((audit:Audit,updateOnly=false)=>{
  if(audit.sample)return;
  let existing=current.current;try{existing=[...current.current,...parseHistory(localStorage.getItem(HISTORY_KEY)).audits];}catch{}
  if(updateOnly&&!existing.some(item=>runKey(item)===runKey(audit)))return;
  const next=addRun(existing,audit);current.current=next.audits;setHistory(next.audits);
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next.audits));setNote(next.removed?'The oldest records were removed to stay within this browser’s 100-run / 3 MB history limit.':'');}catch{setNote('This run could not be saved to browser storage. Export your history before leaving this tab.');}
 },[]);
 const clear=useCallback(()=>{try{localStorage.removeItem(HISTORY_KEY);current.current=[];setHistory([]);setNote('Audit history cleared from this browser. Shared report links are unchanged.');return true;}catch{setNote('History could not be cleared because browser storage is unavailable.');return false;}},[]);
 return {history,record,clear,storageNote};
}
