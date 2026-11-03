import Link from 'next/link';
import ReferenceViewer from '@/features/truck-collection/reference-viewer';
import s from '@/features/truck-collection/gallery.module.css';
export default function ReferencePage(){return <main className={s.page}>
  <header className={s.header}><Link className={s.brand} href="/truck-lab">CargoMesh</Link><Link href="/truck-lab">Volver a la colección</Link></header>
  <div className={s.intro}><div><h1>Camión rígido · Prototipo</h1><p>Compara la forma de la cabina, el chasis y los acabados de cerca. Esta prueba todavía no incorpora conductor ni carga.</p></div></div>
  <ReferenceViewer/>
  <footer className={s.footer}><p>CARLA Simulator (<a href="https://carla.org/">carla.org</a>), <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Conversión de Valdrada por M. K. Turkcan; adaptación para CargoMesh. <a href="/truck-reference/LICENSE.md">Procedencia y cambios</a>.</p></footer>
</main>;}
