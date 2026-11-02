import {Search,FileText,Sparkles,Gauge,GitCompare,Files,History,CircleHelp,LayoutDashboard,ListChecks} from 'lucide-react';
import type {WorkspaceNavItem} from '@/lib/workspace-nav';

const icons={overview:LayoutDashboard,fixes:ListChecks,pages:Files,seo:Search,ai:Sparkles,performance:Gauge,compare:GitCompare,bulk:FileText,history:History,help:CircleHelp};
type Props={item:WorkspaceNavItem;active:boolean;count:number;url:string;onVisit:()=>void};
export default function WorkspaceNavLink({item,active,count,url,onVisit}:Props){
 const Icon=icons[item.icon];
 if(!item.enabled)return <span className="ws-nav-disabled" aria-disabled="true"><Icon size={18}/><span>{item.label}</span><b>Soon</b></span>;
 const params=new URLSearchParams();if(url)params.set('url',url);
 return <a aria-label={item.label} href={`${item.route}${params.size?'?'+params:''}`} aria-current={active?'page':undefined} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();onVisit();}}><Icon size={18}/><span>{item.label}</span>{item.badge&&count>0&&<b aria-label={`${count} issues`}>{count}</b>}</a>;
}
