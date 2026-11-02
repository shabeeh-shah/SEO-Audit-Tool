import type {ReactNode} from 'react';
import type {Audit,LabPerformance} from '@/lib/audit/types';
import type {WorkspaceView} from '@/lib/workspace-nav';
export function SummaryStrip({label,items,note}:{label:string;items:{label:string;value:ReactNode}[];note?:ReactNode}){
 return <section className="ws-analysis-summary" aria-label={label}><dl>{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>{note&&<p>{note}</p>}</section>;
}
export default function AnalysisSummary({audit,view,lab,rendering}:{audit:Audit;view:WorkspaceView;lab:LabPerformance|null;rendering:boolean}){
 const page={label:'Page',value:audit.url};
 if(view==='seo-content')return <SummaryStrip label="SEO and content summary" items={[page,{label:'SEO score',value:`${audit.scores.seo}/100`},{label:'Content score',value:`${audit.scores.content}/100`},{label:'Extracted words',value:audit.metrics.words}]} note="Server-delivered HTML and a bounded link sample. Frequency is descriptive, not evidence of keyword demand or an ideal density."/>;
 if(view==='ai-readiness')return <SummaryStrip label="AI search readiness summary" items={[page,{label:'AI/GEO score',value:`${audit.scores.geo}/100`},{label:'Crawler rules evaluated',value:audit.aiReadiness.bots.length},{label:'JSON-LD blocks',value:audit.aiReadiness.jsonLdBlocks}]} note="These checks show the signals a crawler can see. They do not predict or guarantee AI citations."/>;
 if(view==='performance')return <SummaryStrip label="Performance and mobile summary" items={[page,{label:'Audit score',value:`${audit.scores.performance}/100`},{label:'Browser lab',value:audit.sample?'Illustrative sample':rendering?'Measuring…':lab?'Available':'Unavailable'},{label:'Viewport',value:'390 px lab'}]} note="The browser measurements are lab diagnostics from one isolated run. Real-user field data is requested separately from CrUX when configured, and INP is not simulated because it requires real interaction."/>;
 return null;
}
