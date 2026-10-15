#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export function options(args){
 const result={url:'',sample:false,json:false,output:'',baseline:'',minScore:0,maxDrop:100,failOn:''};
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(arg==='--sample')result.sample=true;else if(arg==='--json')result.json=true;else if(arg==='--help')result.help=true;
  else if(['--output','--baseline','--min-score','--max-drop','--fail-on'].includes(arg)){const value=args[++i];if(!value||value.startsWith('--'))throw new Error(`Missing value for ${arg}`);const key={'--output':'output','--baseline':'baseline','--min-score':'minScore','--max-drop':'maxDrop','--fail-on':'failOn'}[arg];result[key]=['minScore','maxDrop'].includes(key)?Number(value):value;}
  else if(arg.startsWith('-')||result.url)throw new Error(`Unexpected argument: ${arg}`);else result.url=arg;
 }
 for(const key of ['minScore','maxDrop'])if(!Number.isFinite(result[key])||result[key]<0||result[key]>100)throw new Error(`${key} must be between 0 and 100`);
 if(result.failOn&&!['critical','improvement'].includes(result.failOn))throw new Error('--fail-on accepts critical or improvement');
 return result;
}
export async function run(args=process.argv.slice(2)){
 const config=options(args);if(config.help){console.log('signal-audit <url> [--json] [--output report.json] [--baseline previous.json] [--min-score 70] [--max-drop 5] [--fail-on critical]\nsignal-audit --sample\nLive audits send the supplied public URL to the Signal service. No browser lab metrics are run.');return 0;}
 let audit;
 if(config.sample)audit=JSON.parse(await readFile(new URL('../sample.json',import.meta.url),'utf8'));
 else{if(!config.url)throw new Error('Provide a public page URL, or use --sample.');const base=process.env.SIGNAL_BASE_URL||'https://signal-audit-lab.shabeehshah42.chatgpt.site';const endpoint=new URL('/api/audit',base);if(endpoint.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(endpoint.hostname))throw new Error('SIGNAL_BASE_URL must use HTTPS except for local development.');
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'SignalAuditCLI/0.1.0'},body:JSON.stringify({url:config.url}),signal:AbortSignal.timeout(45000)});audit=await response.json();if(!response.ok)throw new Error(audit.error||`Audit HTTP ${response.status}`);
 }
 if(!Number.isFinite(audit.score)||!Array.isArray(audit.findings))throw new Error('Invalid audit response');
 let delta=null;if(config.baseline){const previous=JSON.parse(await readFile(config.baseline,'utf8'));if(previous.url!==audit.url||!Number.isFinite(previous.score))throw new Error('Baseline must be an audit of the same final URL');delta=audit.score-previous.score;}
 const failed=audit.score<config.minScore||delta!==null&&delta< -config.maxDrop||config.failOn&&audit.findings.some(f=>config.failOn==='critical'?f.status==='critical':['critical','improvement'].includes(f.status));
 if(config.output)await writeFile(config.output,JSON.stringify(audit,null,2)+'\n');
 if(config.json)console.log(JSON.stringify(audit,null,2));else{console.log(`${audit.sample?'SAMPLE · ':''}${audit.url}\nOverall: ${audit.score}/100${delta===null?'':` · change: ${delta>=0?'+':''}${delta}`}\n${audit.findings.filter(f=>['critical','improvement'].includes(f.status)).slice(0,5).map(f=>`${f.status.toUpperCase()}: ${f.title}\n  Evidence: ${f.evidence}\n  Fix: ${f.recommendation}`).join('\n')}\n${failed?'Threshold failed.':'Thresholds passed.'}`);}
 return failed?1:0;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])run().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=2;});
