/** A datetime-local is a wall clock in the displayed IANA zone, never an implicit UTC instant. */
export function planningInstant(value: string, timeZone: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [y,m,d,h,min]=value.split(/[-T:]/).map(Number), wanted=Date.UTC(y,m-1,d,h,min);
  const normalized=new Date(wanted);
  if(normalized.toISOString().slice(0,16)!==value)return null;
  try {
    const format=new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const wall=(instant:number)=>{const p=Object.fromEntries(format.formatToParts(instant).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;};
    let instant=wanted;
    for(let i=0;i<4;i++){const current=wall(instant),[a,b,c,e,f]=current.split(/[-T:]/).map(Number);const delta=wanted-Date.UTC(a,b-1,c,e,f);instant+=delta;if(!delta)break;}
    if(wall(instant)!==value)return null; // Nonexistent DST clocks are not normalized silently.
    if(wall(instant-3600000)===value||wall(instant+3600000)===value)return null; // Ask for an unambiguous clock.
    return instant;
  } catch {return null;}
}
export function planningClock(instant:number,timeZone:string){
 const p=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(p=>[p.type,p.value]));
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
