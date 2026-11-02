'use client';
import {useState} from 'react';
import {Button,Toast,Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/design-system';
import {useOutputActions} from '@/hooks/use-output-actions';
import {downloadFile} from '@/lib/download-file';
import {gradeFor} from '@/lib/audit/bulk';
import {categories,type Audit,type Category} from '@/lib/audit/types';
import {compareRuns,earlierRun,HISTORY_LIMIT,pageKey,runKey} from '@/lib/audit/history';
import {sampleHistory} from '@/lib/audit/history-sample';
import './audit-history.css';
const stamp=(date:string)=>new Date(date).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});
const deltaLabel=(n:number)=>`${n>0?'+':''}${n}`;
export default function AuditHistory({history,currentUrl,storageNote,busy,onOpen,onRun,onClear}:{history:Audit[];currentUrl:string;storageNote:string;busy:boolean;onOpen:(audit:Audit)=>void;onRun:(url:string)=>void;onClear:()=>boolean}){
 const output=useOutputActions();
 const [selectedPage,setPage]=useState(''),[baselineId,setBaseline]=useState(''),[resultId,setResult]=useState(''),[metric,setMetric]=useState<Category|'overall'>('overall'),[demo,setDemo]=useState(false),[confirmClear,setConfirmClear]=useState(false),[feedback,setFeedback]=useState('');
 const source=demo?sampleHistory:history;const pages=[...new Set(source.map(item=>pageKey(item.url)))];
 const page=pages.includes(selectedPage)?selectedPage:pages.includes(pageKey(currentUrl))?pageKey(currentUrl):pages[0]||'';
 const runs=source.filter(item=>pageKey(item.url)===page).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const after=runs.find(item=>runKey(item)===resultId)||runs[0];
 const earlier=after?runs.filter(item=>Date.parse(item.date)<Date.parse(after.date)):[];
 const before=earlier.find(item=>runKey(item)===baselineId)||earlier[0];const diff=before&&after?compareRuns(before,after):null;
 const chronological=[...runs].reverse(),score=(a:Audit)=>metric==='overall'?a.score:a.scores[metric];
 const x=(i:number)=>chronological.length===1?300:50+i*500/(chronological.length-1),y=(a:Audit)=>140-score(a)*1.2;
 function exportHistory(){void output.run('history-json',{loading:'Preparing history backup…',success:'History JSON downloaded. Keep it as a backup of these reports.',defer:true,work:()=>{downloadFile(JSON.stringify({format:'signal-audit-history',version:1,exportedAt:new Date().toISOString(),audits:source},null,2),demo?'signal-history-demo.json':'signal-audit-history.json','application/json');setFeedback('History JSON downloaded. Keep it as a backup of these reports.');}});}
 function rerun(url:string){Toast.info('Re-running this page. The new result will be saved in this browser.');onRun(url);}
 function clearHistory(){void output.run('history-clear',{loading:'Clearing history from this browser…',success:'History cleared from this browser',work:()=>{if(!onClear())throw new Error('History could not be cleared because browser storage is unavailable.');setConfirmClear(false);setFeedback('History cleared. Run a public page audit to start a new timeline.');}});}
 return <section className="signal-extras audit-history" id="audit-history" aria-label="Audit history">
  <div className="history-heading"><div><span className="eyebrow light">TRACK YOUR PROGRESS</span><h2>Audit history</h2><p>See what changed, what improved, and what still needs work.</p></div><span className="history-count">{demo?'Illustrative demo':`${history.length} / ${HISTORY_LIMIT} saved runs`}</span></div>
  <p>Saved on this browser and device only, up to 100 runs or 3 MB. Clearing browser data removes history. Shared links are separate; there is no account sync or automatic scheduling.</p>
  {storageNote&&<p className="history-notice" role="status">{storageNote}</p>}
  <div className="signal-tools"><Button variant="outline" onClick={()=>{setDemo(!demo);setPage('');setResult('');setBaseline('');setConfirmClear(false);Toast.info(demo?'Showing your browser history.':'Showing illustrative history. No runs are added to your history.');}}>{demo?'Back to my history':'Explore history demo'}</Button><Button variant="outline" disabled={!source.length} loading={output.isPending('history-json')} onClick={exportHistory}>Export history JSON</Button>{!demo&&history.length>0&&<Button variant="ghost" onClick={()=>setConfirmClear(true)}>Clear saved history</Button>}</div>
  <Dialog open={confirmClear} onOpenChange={setConfirmClear}><DialogContent><DialogHeader><DialogTitle>Clear saved history?</DialogTitle><DialogDescription>Remove all {history.length} runs from this browser? Export a backup first if you need them.</DialogDescription></DialogHeader><Button variant="destructive" loading={output.isPending('history-clear')} onClick={clearHistory}>Remove saved runs</Button><Button variant="outline" onClick={()=>{setConfirmClear(false);Toast.info('Your saved history was kept.');}}>Keep history</Button></DialogContent></Dialog>
  {feedback&&<p role="status">{feedback}</p>}
  {demo&&<p className="history-notice">These fictional runs show how tracking works. They are never added to your saved history.</p>}
  {!runs.length?<div className="history-empty"><h3>Your next audit starts the timeline</h3><p>Run a live audit, make your changes, then audit the same page again. Each successful run is saved automatically with its date, scores, and findings.</p><Button onClick={()=>document.getElementById('persistent-url')?.focus()}>Start an audit</Button></div>:<>
   <div className="history-controls"><label>Tracked page<select value={page} onChange={event=>{setPage(event.target.value);setResult('');setBaseline('');}}>{pages.map(url=><option key={url} value={url}>{url}</option>)}</select></label><label>Chart metric<select value={metric} onChange={event=>setMetric(event.target.value as Category|'overall')}><option value="overall">Overall score</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>{!demo&&<Button disabled={busy} onClick={()=>rerun(page)}>{busy?'Audit in progress…':'Re-audit this page'}</Button>}</div>
   <div className="history-chart"><div className="history-chart-title"><h3>{metric==='overall'?'Overall score':categories[metric]} over time</h3><span>{runs.length} saved {runs.length===1?'run':'runs'} · 0–100</span></div>
    <svg viewBox="0 0 600 180" role="img" aria-label={`${metric==='overall'?'Overall':categories[metric]} scores in chronological order: ${chronological.map(a=>`${stamp(a.date)}: ${score(a)}`).join('; ')}; points are evenly spaced by audit run.`}>
     {[0,50,100].map(value=><g key={value}><line x1="50" x2="550" y1={140-value*1.2} y2={140-value*1.2} stroke="#dce8df"/><text x="35" y={144-value*1.2} textAnchor="end">{value}</text></g>)}
     <polyline points={chronological.map((a,i)=>`${x(i)},${y(a)}`).join(' ')} fill="none" stroke="#28725c" strokeWidth="3"/>
     {chronological.map((a,i)=><circle key={runKey(a)} cx={x(i)} cy={y(a)} r={after&&runKey(a)===runKey(after)?5:3} fill="#28725c"><title>{stamp(a.date)} · {score(a)}/100</title></circle>)}
     <text x="50" y="170">{new Date(chronological[0].date).toLocaleDateString()}</text>{chronological.length>1&&<text x="550" y="170" textAnchor="end">{new Date(chronological[chronological.length-1].date).toLocaleDateString()}</text>}
    </svg><small>Points are evenly spaced by run. Full dates and scores are in the table below. Scores are diagnostic indicators, not traffic or ranking measurements.</small>
   </div>
   {runs.length<2?<p className="history-notice">One run saved. Re-audit this exact page to see changes over time.</p>:<div className="history-compare">
    <h3>Compare two runs</h3><div className="history-controls"><label>Baseline run<select value={before?runKey(before):''} onChange={event=>setBaseline(event.target.value)} disabled={!earlier.length}>{!earlier.length&&<option value="">No earlier run</option>}{earlier.map(a=><option key={runKey(a)} value={runKey(a)}>{stamp(a.date)} · {a.score}/100</option>)}</select></label><label>Result run<select value={runKey(after)} onChange={event=>{setResult(event.target.value);setBaseline('');}}>{runs.map(a=><option key={runKey(a)} value={runKey(a)}>{stamp(a.date)} · {a.score}/100</option>)}</select></label></div>
    {diff&&before?<><div className="history-deltas">{(['overall',...Object.keys(categories)] as ('overall'|Category)[]).map(key=>{const from=key==='overall'?before.score:before.scores[key],to=key==='overall'?after.score:after.scores[key];return <div key={key}><span>{key==='overall'?'Overall':categories[key]}</span><strong className={to>from?'history-up':to<from?'history-down':''}>{deltaLabel(to-from)} <small>points</small></strong><span>{from} → {to}</span></div>;})}</div>
    {!diff.comparable&&<p className="history-notice">The scoring version or scored checks differ, or an older run has no version recorded. Treat score changes cautiously; they may reflect coverage changes rather than improvements.</p>}
    <p>{diff.resolved.length} issues fixed · {diff.newIssues.length} new issues</p><div className="history-findings">{[['Resolved',diff.resolved],['New issues',diff.newIssues],['Improved priority',diff.improved],['Worsened priority',diff.worsened]].map(([label,items])=><article key={label as string}><h4>{label as string} <span>{(items as Audit['findings']).length}</span></h4>{(items as Audit['findings']).length?<ul>{(items as Audit['findings']).map(f=><li key={f.id}>{f.title}<small>{before.findings.find(old=>old.id===f.id)?.status} → {f.status}</small></li>)}</ul>:<p>No changes in this group.</p>}</article>)}</div>
    <p>Only matching checks with known priorities are compared. {diff.uncompared.length} optional, added, or missing checks are excluded from issue-change counts. A missing check is never counted as resolved.</p></>:<p>Select a result with an earlier run to compare.</p>}
   </div>}
   <p id="history-table-hint">Scroll the table horizontally to see every grade and action.</p><div className="signal-table" role="region" aria-label="Saved audit runs" aria-describedby="history-table-hint" tabIndex={0}><table><caption>Saved runs for {page}</caption><thead><tr><th scope="col">URL / audited</th><th scope="col">Overall</th><th scope="col">SEO</th><th scope="col">Content</th><th scope="col">AI / GEO</th><th scope="col">Performance</th><th scope="col">Issues</th><th scope="col">Change vs previous</th><th scope="col">Actions</th></tr></thead><tbody>{runs.map(a=>{
    const previous=earlierRun(source,a);const change=previous?compareRuns(previous,a):null;
    return <tr key={runKey(a)}><th scope="row"><span className="history-row-url">{a.url}</span><time dateTime={a.date}>{stamp(a.date)}</time></th><td><strong>{gradeFor(a.score)} · {a.score}</strong></td>{(Object.keys(categories) as Category[]).map(cat=><td key={cat}>{gradeFor(a.scores[cat])} · {a.scores[cat]}</td>)}<td>{a.findings.filter(f=>f.status==='critical'||f.status==='improvement').length}</td><td>{change?<><strong>{deltaLabel(change.delta)} points</strong><small>{change.resolved.length} issues fixed</small>{!change.comparable&&<small>Scoring coverage changed; compare cautiously.</small>}</>:<small>First saved run</small>}</td><td><div className="history-row-actions"><Button variant="outline" disabled={busy} aria-label={`Open saved report from ${stamp(a.date)}`} onClick={()=>onOpen(a)}>Open report</Button><Button variant="outline" disabled={busy||demo} aria-label={`Re-run ${a.url} from ${stamp(a.date)}`} onClick={()=>rerun(a.url)}>Re-run</Button></div>{demo&&<small>Demo only. Enter a public URL above to run a live audit.</small>}</td></tr>;
   })}</tbody></table></div>

  </>}
 </section>;
}
