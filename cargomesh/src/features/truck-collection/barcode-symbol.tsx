'use client';
import {useMemo} from 'react';
import {barcodeBars} from './barcode';
import s from './barcode-symbol.module.css';

export function BarcodeSymbol({value}:{value:string}){
  const {modules,bars}=useMemo(()=>barcodeBars(value),[value]);
  return <div className={s.symbol} data-barcode={value}><svg role="img" aria-label={`Código de barras ${value}`} viewBox={`0 0 ${modules} 38`} width={220} height={76} shapeRendering="crispEdges"><rect width={modules} height={38} fill="#fff"/>{bars.map(bar=><rect key={bar.x} x={bar.x} y={3} width={bar.width} height={32} fill="#111"/>)}</svg><code aria-hidden="true">{value}</code></div>;
}
