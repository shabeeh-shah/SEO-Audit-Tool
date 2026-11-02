'use client';
import type {ReactNode} from 'react';
import {useWorkspaceRoute} from '@/hooks/use-workspace-route';
import type {WorkspaceView} from '@/lib/workspace-nav';
/** Keep active workflows mounted when moving between report views. */
export default function WorkspaceView({views,children,show=true}:{views:WorkspaceView[];children:ReactNode;show?:boolean}){const current=useWorkspaceRoute();return <div hidden={!show||!views.includes(current)} data-view={views.join(' ')}>{children}</div>;}
