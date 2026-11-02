'use client';
import {useRef,type ComponentProps,type ReactNode} from 'react';
import {DialogContent as PrimitiveDialogContent} from '@/components/ui/dialog';
import {LoaderCircle} from 'lucide-react';
import {Button as PrimitiveButton} from '@/components/ui/button';
import type {Status} from '@/lib/audit/types';
import {gradeFor} from '@/lib/audit/bulk';
export {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
export {Dialog,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
export {Sheet as Drawer,SheetContent as DrawerContent,SheetHeader as DrawerHeader,SheetTitle as DrawerTitle,SheetDescription as DrawerDescription} from '@/components/ui/sheet';
export {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
export {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from '@/components/ui/tooltip';
export {toast as Toast} from 'sonner';
export function Button({loading,variant,...props}:Omit<ComponentProps<typeof PrimitiveButton>,'variant'>&{loading?:boolean;variant?:ComponentProps<typeof PrimitiveButton>['variant']|'primary'}){return <PrimitiveButton {...props} variant={variant==='primary'?'default':variant} disabled={props.disabled||loading} aria-busy={loading||undefined}>{loading&&<LoaderCircle className="ds-spin" aria-hidden="true"/>}{props.children}</PrimitiveButton>;}
export function IconButton({label,...props}:ComponentProps<typeof Button>&{label:string}){return <Button {...props} size="icon" aria-label={label}/>;}
export function Card({title,children,actions,className=''}:{title?:string;children:ReactNode;actions?:ReactNode;className?:string}){return <section className={`ds-card ${className}`}>{title&&<header><h2>{title}</h2>{actions}</header>}{children}</section>;}
export function StatusChip({status}:{status:Status}){return <span className={`ds-status ${status}`}>{status==='good'?'✓ Good':status==='critical'?'! Critical':status==='optional'?'○ Optional':'↗ Improvement'}</span>;}
export function ScoreRing({score,label,onClick}:{score:number;label:string;onClick?:()=>void}){const value=Math.max(0,Math.min(100,score));const ring=<><span className="ds-ring" style={{background:`conic-gradient(var(--ds-accent) ${value}%,var(--ds-border) 0)`}}><span><b>{gradeFor(value)}</b><small>{value}/100</small></span></span><strong>{label}</strong></>;return onClick?<button className="ds-score" onClick={onClick} aria-label={`${label}: ${gradeFor(value)}, ${value} of 100. Open analysis.`}>{ring}</button>:<div className="ds-score" role="img" aria-label={`${label}: ${gradeFor(value)}, ${value} of 100`}>{ring}</div>;}
export type StepState='waiting'|'active'|'complete'|'unavailable';
export function ProgressSteps({steps,current=0,states}:{steps:string[];current?:number;states?:StepState[]}){return <ol className="ds-steps" aria-label="Audit progress">{steps.map((step,index)=>{const state=states?.[index]||(index<current?'complete':index===current?'active':'waiting');return <li key={step} data-state={state} aria-current={state==='active'?'step':undefined}><span>{state==='complete'?'✓':state==='unavailable'?'—':index+1}</span><b>{step}</b><small>{state==='complete'?'Complete':state==='active'?'In progress':state==='unavailable'?'Unavailable':'Waiting'}</small></li>;})}</ol>;}

export function EmptyState({title,description,action}:{title:string;description:string;action?:ReactNode}){return <div className="ds-empty"><h3>{title}</h3><p>{description}</p>{action}</div>;}
export function Skeleton({label='Loading content'}:{label?:string}){return <div className="ds-skeleton" role="status" aria-label={label}><span/><span/><span/></div>;}
export function PageHeader({title,description,actions}:{title:string;description:string;actions?:ReactNode}){return <header className="ws-page-header"><div><h1 id="workspace-title" tabIndex={-1}>{title}</h1><p>{description}</p></div>{actions}</header>;}

/** Standalone dialog controls also restore focus; a custom destination takes precedence. */
export function DialogContent({onOpenAutoFocus,onCloseAutoFocus,...props}:ComponentProps<typeof PrimitiveDialogContent>){
 const restore=useRef<HTMLElement|null>(null);
 return <PrimitiveDialogContent {...props} onOpenAutoFocus={event=>{restore.current=document.activeElement as HTMLElement;onOpenAutoFocus?.(event);}} onCloseAutoFocus={event=>{onCloseAutoFocus?.(event);if(!event.defaultPrevented&&restore.current?.isConnected){event.preventDefault();restore.current.focus({preventScroll:true});}}}/>;
}
