export function profileOptionLabel(value: string, t: (es:string,en:string)=>string) {
  const labels:Record<string,[string,string]>={
    PALLET:['Pallet','Pallet'],BOX:['Caja','Box'],CRATE:['Cajón','Crate'],DRUM:['Tambor','Drum'],BULK:['Granel','Bulk'],
    BOX_TRUCK:['Furgón','Box truck'],REEFER_TRUCK:['Refrigerado','Refrigerated'],FLATBED:['Plataforma','Flatbed'],TANKER_TRUCK:['Cisterna','Tanker'],TRACTOR_TRAILER:['Tractocamión con remolque','Tractor-trailer'],
    TEMP_CONTROLLED:['Temperatura controlada','Temp controlled'],TEMPERATURE_CONTROLLED:['Temperatura controlada','Temp controlled'],SECURITY_SEAL:['Precinto de seguridad','Security seal'],FRAGILE:['Frágil','Fragile'],HAZARDOUS:['Peligrosa','Hazardous'],KEEP_DRY:['Mantener seco','Keep dry'],FOOD_GRADE:['Grado alimentario','Food grade'],HIGH_VALUE:['Alto valor','High value'],OVERSIZED:['Sobredimensionada','Oversized'],TANK_COMPATIBILITY:['Compatibilidad con tanque','Tank compatibility'],
  };return labels[value]?t(...labels[value]):value.replaceAll('_',' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase());
}
