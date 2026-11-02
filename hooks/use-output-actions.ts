'use client';
import {useCallback,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {Toast} from '@/components/design-system';

type OutputAction={loading:string;success:string;work:()=>unknown|Promise<unknown>;defer?:boolean};
/** Commit feedback before starting work; keep popup/clipboard work in the click gesture. */
export function useOutputActions(){
 const active=useRef(new Set<string>());const [pending,setPending]=useState<string[]>([]);
 const run=useCallback(async(key:string,{loading,success,work,defer=false}:OutputAction)=>{
  if(active.current.has(key))return false;
  active.current.add(key);let toast:string|number='';
  flushSync(()=>{setPending([...active.current]);toast=Toast.loading(loading);});
  try{
   if(defer)await new Promise<void>(resolve=>setTimeout(resolve,16));
   await work();Toast.success(success,{id:toast});return true;
  }catch(error){Toast.error(error instanceof Error?error.message:'This action could not be completed. Please try again.',{id:toast});return false;}
  finally{active.current.delete(key);setPending([...active.current]);}
 },[]);
 return {run,pending,isPending:(key:string)=>pending.includes(key)};
}
