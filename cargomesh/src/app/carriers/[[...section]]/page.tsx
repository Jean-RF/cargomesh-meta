import { notFound } from 'next/navigation';
import {redirect} from 'next/navigation';
import {localCarrierPreviewEnabled} from '@/server/auth/local-carrier-preview';
export default async function CarrierSection({ params }: { params: Promise<{ section?: string[] }> }) {
  const section = (await params).section ?? [];
  if(!section.length&&await localCarrierPreviewEnabled())redirect('/carriers/tetris');
  if (section.length && !['fleet', 'requests', 'offers', 'sites', 'orders', 'pipeline', 'help', 'control-tower', 'route-lab', 'tetris'].includes(section[0])) notFound();
  return null;
}
