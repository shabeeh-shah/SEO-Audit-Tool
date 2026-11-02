'use client';
import {useSyncExternalStore} from 'react';
import {viewFromPath,viewHref,type WorkspaceView} from '@/lib/workspace-nav';
const subscribe=(callback:()=>void)=>{window.addEventListener('popstate',callback);window.addEventListener('signal-route',callback);return ()=>{window.removeEventListener('popstate',callback);window.removeEventListener('signal-route',callback);};};
const readySubscribe=()=>()=>{};
export function useClientReady(){return useSyncExternalStore(readySubscribe,()=>true,()=>false);}
export function navigateWorkspace(view:WorkspaceView,url='',finding=''){const next=viewHref(view,url,finding);if(window.location.pathname+window.location.search!==next)window.history.pushState(null,'',next);window.dispatchEvent(new Event('signal-route'));window.scrollTo({top:0,behavior:'instant'});}
export function useWorkspaceLocation(){return useSyncExternalStore(subscribe,()=>window.location.pathname+window.location.search,()=>'/');}
export function useWorkspaceRoute(){return viewFromPath(useWorkspaceLocation().split('?')[0]);}
