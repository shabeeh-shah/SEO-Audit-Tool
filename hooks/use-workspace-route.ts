'use client';
import {useSyncExternalStore} from 'react';
import {viewFromPath,viewHref,type WorkspaceView} from '@/lib/workspace-nav';
const subscribe=(callback:()=>void)=>{window.addEventListener('popstate',callback);window.addEventListener('signal-route',callback);return ()=>{window.removeEventListener('popstate',callback);window.removeEventListener('signal-route',callback);};};
export function navigateWorkspace(view:WorkspaceView,url='',finding=''){window.history.pushState(null,'',viewHref(view,url,finding));window.dispatchEvent(new Event('signal-route'));window.scrollTo({top:0,behavior:'instant'});}
export function useWorkspaceRoute(){const path=useSyncExternalStore(subscribe,()=>window.location.pathname,()=>'/');return viewFromPath(path);}
