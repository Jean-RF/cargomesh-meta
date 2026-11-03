import type { Metadata } from 'next';
import { TruckCollectionGallery } from '@/features/truck-collection/gallery';
export const metadata:Metadata={title:'Colección de 60 camiones | CargoMesh'};
export default function TruckLabPage(){return <TruckCollectionGallery/>;}
