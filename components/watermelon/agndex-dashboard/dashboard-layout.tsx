'use client';

import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {ArrowUpRight, ChartNoAxesColumnIncreasing, CircleHelp, FileText, Gauge, GitBranch, LayoutDashboard, ListChecks, PlayCircle, Plus, Sparkles} from 'lucide-react';
import {Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar} from '@/components/ui/sidebar';
import './signal-dashboard.css';

type DashboardLayoutProps = {children:ReactNode; onSample?:()=>void; onHelp?:()=>void; sample?:boolean; loading?:boolean; advanced?:boolean};
const sections = [
  {label:'Audit overview', selector:'#audit-overview', icon:LayoutDashboard},
  {label:'Performance & mobile', selector:'.performance-section', icon:Gauge, advanced:true},
  {label:'AI search readiness', selector:'.ai-readiness-section', icon:Sparkles, advanced:true},
  {label:'Recommendations', selector:'.findings-panel', icon:ListChecks},
  {label:'Page details', selector:'.snapshot-panel', icon:FileText},
];

function DashboardFrame({children,onSample,onHelp,sample=true,loading=false,advanced=false}:DashboardLayoutProps){
  const {setOpenMobile}=useSidebar();
  const [active,setActive]=useState('Audit overview');
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if(visible){const section=sections.find(item=>visible.target.matches(item.selector));if(section)setActive(section.label);}
    },{rootMargin:'-80px 0px -55% 0px',threshold:0});
    sections.forEach(section=>{const element=document.querySelector(section.selector);if(element)observer.observe(element);});
    return ()=>observer.disconnect();
  },[advanced]);
  function visit(selector:string,label:string){setActive(label);setOpenMobile(false);document.querySelector(selector)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  function newAudit(){visit('.audit-starter','Audit overview');window.setTimeout(()=>document.getElementById('website-url')?.focus({preventScroll:true}),250);}
  return <>
    <a className="signal-skip" href="#signal-content">Skip to audit</a>
    <Sidebar className="signal-sidebar" collapsible="offcanvas">
      <SidebarHeader className="signal-sidebar-header"><button className="signal-dashboard-brand" onClick={newAudit} aria-label="Signal home"><span><ChartNoAxesColumnIncreasing size={23}/></span>signal<span className="signal-brand-dot">.</span></button><p>Website intelligence</p></SidebarHeader>
      <SidebarContent>
        <div className="signal-new-audit-wrap"><button className="signal-new-audit" onClick={newAudit}><Plus size={17}/>New audit</button></div>
        <SidebarGroup><SidebarGroupLabel>Your workspace</SidebarGroupLabel><SidebarMenu>{sections.filter(section=>!section.advanced||advanced).map(section=><SidebarMenuItem key={section.label}><SidebarMenuButton className="signal-nav-item" isActive={active===section.label} onClick={()=>visit(section.selector,section.label)} aria-current={active===section.label?'location':undefined}><section.icon/><span>{section.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroup>
        <div className="signal-sidebar-note"><span className="signal-note-icon"><Sparkles size={19}/></span><strong>Clarity is your advantage.</strong><p>Find what matters. Understand the evidence. Take the next step.</p>{onSample&&<button disabled={loading} onClick={()=>{onSample();visit('#audit-overview','Audit overview');}}><PlayCircle size={15}/>Explore a sample<ArrowUpRight size={14}/></button>}</div>
      </SidebarContent>
      <SidebarFooter className="signal-sidebar-footer">{onHelp&&<SidebarMenuButton onClick={()=>{setOpenMobile(false);onHelp();}}><CircleHelp/><span>How scoring works</span></SidebarMenuButton>}<SidebarMenuButton asChild><a href="https://github.com/shabeeh-shah/SEO-Audit-Tool" target="_blank" rel="noreferrer"><GitBranch/><span>View on GitHub</span><ArrowUpRight size={14}/></a></SidebarMenuButton><span className="signal-sidebar-caption">SEO · Content · AI readiness</span></SidebarFooter>
    </Sidebar>
    <div className="signal-dashboard-main"><header className="signal-dashboard-topbar"><div className="signal-breadcrumb"><SidebarTrigger/><span className="signal-breadcrumb-parent">Workspace</span><span aria-hidden="true">/</span><strong>{active}</strong></div><div className="signal-topbar-actions"><span className={'signal-report-mode '+(loading?'is-loading':'')}><i/>{loading?'Audit in progress':sample?'Sample report':'Live audit'}</span>{onHelp&&<button className="signal-topbar-help" onClick={onHelp} aria-label="How Signal works"><CircleHelp size={18}/></button>}</div></header><div id="signal-content" tabIndex={-1}>{children}</div></div>
  </>;
}

/** Agndex's sidebar-and-canvas layout, adapted to Signal's real audit workflow. */
export default function DashboardLayout(props:DashboardLayoutProps){return <SidebarProvider defaultOpen className="agndex-dashboard signal-dashboard" style={{'--sidebar-width':'15rem'} as CSSProperties}><DashboardFrame {...props}/></SidebarProvider>;}
