import type {Metadata} from 'next';
import {LoadingOperation} from '@/features/meta-loading-dashboard/operation';
import {TetrisVehicleWorkspace} from '@/features/meta-loading-dashboard/vehicle-workspace';
export const metadata:Metadata={title:'Tetris · Dashboard de carga | CargoMesh'};
export default async function TetrisPage({searchParams}:{searchParams:Promise<{view?:string;session?:string;truck?:string}>}){
  const params=await searchParams;
  if(params.view==='sessions'||typeof params.session==='string'&&params.session)return <LoadingOperation/>;
  return <TetrisVehicleWorkspace initialTruckId={typeof params.truck==='string'?params.truck:''}/>;
}
