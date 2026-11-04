import type {Metadata} from 'next';
import {PackingPlanner} from '@/features/meta-loading-dashboard/packing-planner';
export const metadata:Metadata={title:'Tetris · Acomodo físico | CargoMesh'};
export default function Page(){return <PackingPlanner/>;}
