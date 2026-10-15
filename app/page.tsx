import type {Metadata} from 'next';
import SignalApp from '@/components/signal-app';
import {siteUrl} from '@/lib/site';
export const metadata:Metadata={alternates:{canonical:siteUrl}};
export default function Home(){return <SignalApp/>;}
