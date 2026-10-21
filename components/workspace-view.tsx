'use client';
import type {ReactNode} from 'react';
import {useWorkspaceRoute} from '@/hooks/use-workspace-route';
import type {WorkspaceView} from '@/lib/workspace-nav';
/** Keep active workflows mounted when moving between report views. */
export default function WorkspaceView({views,children}:{views:WorkspaceView[];children:ReactNode}){const current=useWorkspaceRoute();return <div hidden={!views.includes(current)} data-view={views.join(' ')}>{children}</div>;}
