'use client';
import {useState,useRef,useEffect} from 'react';
import {Download,FileUp,PlayCircle} from 'lucide-react';
import {Button,Toast,Card} from '@/components/design-system';
import {useOutputActions} from '@/hooks/use-output-actions';
import {downloadFile} from '@/lib/download-file';
import {bulkCsv,gradeFor,parseBulkInput,topIssue,type BulkAuditResult} from '@/lib/audit/bulk';
import type {Audit} from '@/lib/audit/types';

export default function BulkAudit({onOpen,onComplete}:{onOpen:(audit:Audit)=>void;onComplete:(audits:Audit[])=>void}){
 const output=useOutputActions();const [submitted,setSubmitted]=useState<string[]>([]);const controller=useRef<AbortController|null>(null);useEffect(()=>()=>controller.current?.abort(),[]);
 const [input,setInput]=useState(''),[results,setResults]=useState<BulkAuditResult[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stopped,setStopped]=useState(false);
 async function upload(file:File|undefined){if(!file)return;await output.run('bulk-upload',{loading:'Reading URL file…',success:'URL file loaded. Review the list, then run the bulk audit.',work:async()=>{
  if(file.size>50_000)throw new Error('Choose a text or CSV file smaller than 50 KB.');
  if(!/\.(txt|csv)$/i.test(file.name))throw new Error('Choose a TXT or CSV file.');
  try{setInput(await file.text());setError('');}catch{throw new Error('We could not read that file.');}
 }});}
 async function run(){
  if(controller.current)return;
  setError('');let urls:string[];
  try{urls=parseBulkInput(input);}catch(problem){const message=problem instanceof Error?problem.message:'Check the URL list.';setError(message);Toast.error(message);return;}
  const active=new AbortController();controller.current=active;
  await output.run('bulk-run',{loading:`Auditing ${urls.length} public pages…`,success:'Bulk results ready. Open a report or download the comparison CSV.',work:async()=>{
   setBusy(true);setStopped(false);setSubmitted(urls);setResults([]);
   const timer=setTimeout(()=>active.abort('timeout'),155_000);
   try{
    const response=await fetch('/api/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urls}),signal:active.signal});
    const data=await response.json() as {results?:BulkAuditResult[];error?:string};
    if(active.signal.aborted)throw new Error('Batch stopped.');
    if(!response.ok||!data.results)throw new Error(data.error||'The bulk audit could not be completed.');
    setResults(data.results);onComplete(data.results.flatMap(result=>result.audit?[result.audit]:[]));
   }catch(problem){
    const message=active.signal.aborted?(active.signal.reason==='timeout'?'The bulk audit timed out. Try fewer URLs.':'Bulk audit canceled. You can edit the list and run it again.'):problem instanceof Error?problem.message:'The bulk audit could not be completed.';
    setStopped(true);setError(message);throw new Error(message);
   }finally{clearTimeout(timer);controller.current=null;setBusy(false);}
  }});
 }
 function download(){void output.run('bulk-csv',{loading:'Preparing comparison CSV…',success:'Comparison CSV downloaded.',defer:true,work:()=>downloadFile(bulkCsv(results),'signal-bulk-audit.csv','text/csv;charset=utf-8')});}
 return <section className="signal-extras bulk-audit" aria-labelledby="bulk-title">
  <div className="bulk-heading"><div><span className="eyebrow light">PROFESSIONAL WORKFLOW</span><h2 id="bulk-title">Compare up to 20 websites</h2><p>Paste one public URL per line or upload a CSV whose first column contains URLs. Signal checks two sites at a time and keeps the same safety limits used by a single audit.</p></div>{results.length>0&&<Button variant="outline" loading={output.isPending('bulk-csv')} onClick={download}><Download size={16}/> Download comparison CSV</Button>}</div>
  <div className="bulk-input-grid" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(!busy&&!output.isPending('bulk-upload'))void upload(event.dataTransfer.files[0]);}}>
   <label><span>Website URLs</span><textarea aria-label="Website URLs" value={input} onChange={event=>setInput(event.target.value)} rows={7} maxLength={50_000} placeholder={'https://example.com\nhttps://example.org'} disabled={busy||output.isPending('bulk-upload')}/></label>
   <div className="bulk-controls"><label className="bulk-file"><FileUp size={18}/><span>{output.isPending('bulk-upload')?'Reading file…':'Upload or drop TXT / CSV'}</span><input type="file" aria-label="Upload URL file" accept=".txt,.csv,text/plain,text/csv" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}} disabled={busy||output.isPending('bulk-upload')}/></label>
    <Button onClick={()=>void run()} loading={output.isPending('bulk-run')} disabled={output.isPending('bulk-upload')}>{!busy&&<PlayCircle/>}{busy?'Auditing websites…':'Run bulk audit'}</Button>
    {busy&&<Button variant="outline" onClick={()=>{controller.current?.abort('user');Toast.info('Stopping the batch…');}}>Cancel bulk audit</Button>}
    <small>Maximum 20 URLs · two concurrent audits · no server-side storage</small>
   </div>
  </div>
  {submitted.length>0&&<div className="ws-bulk-progress" role="status" aria-live="polite"><h3>{busy?'Audit batch in progress':stopped?'Batch stopped':'Batch finished'}</h3><p>Two sites run at a time. Individual results appear when this batch returns.</p><ul>{submitted.map(url=>{const result=results.find(item=>item.requestedUrl===url);return <li key={url}>{url} <b>{result?result.audit?'✓ Complete':'! Could not audit':busy?'Submitted · awaiting result':stopped?'Stopped · no result saved':'No result returned'}</b></li>;})}</ul></div>}
  {error&&<div className="bulk-error" role="alert"><p>{error}</p><Button variant="outline" onClick={()=>void run()} disabled={busy}>Try bulk audit again</Button></div>}
  {results.length>0&&<><p id="bulk-table-hint">Scroll the table horizontally to see every score and action.</p><div className="bulk-table-wrap" role="region" aria-label="Bulk results" aria-describedby="bulk-table-hint" tabIndex={0}><table><caption>Bulk audit comparison</caption><thead><tr><th>Website</th><th>Grade</th><th>SEO</th><th>Content</th><th>AI / GEO</th><th>Performance</th><th>Top issue</th><th>Next action</th></tr></thead><tbody>{results.map((result,index)=><tr key={result.requestedUrl+index}><td><a href={result.requestedUrl} target="_blank" rel="noreferrer">{new URL(result.requestedUrl).hostname}</a></td>{result.audit?<><td><strong>{gradeFor(result.audit.score)}</strong> · {result.audit.score}</td><td>{result.audit.scores.seo}</td><td>{result.audit.scores.content}</td><td>{result.audit.scores.geo}</td><td>{result.audit.scores.performance}</td><td>{topIssue(result.audit)}</td><td><Button variant="outline" onClick={()=>onOpen(result.audit!)} aria-label={`Open report for ${result.requestedUrl}`}>Open report</Button></td></>:<><td colSpan={6}><span className="bulk-failed">Could not audit:</span> {result.error}</td><td><Button variant="outline" onClick={()=>{setInput(result.requestedUrl);document.querySelector<HTMLTextAreaElement>('.bulk-audit textarea')?.focus();Toast.info('URL selected. Review it, then run the bulk audit again.');}}>Retry this URL</Button></td></>}</tr>)}</tbody></table></div><Card title="Choose your next step"><p>Open a successful report to review its evidence, export the comparison, or edit the list for another batch. Successful audits are saved in this browser’s History only.</p><Button variant="outline" onClick={()=>{document.querySelector<HTMLTextAreaElement>('.bulk-audit textarea')?.focus();Toast.info('Edit your URL list above, then run another batch.');}}>Edit URLs for another batch</Button></Card></>}
 </section>;
}
