export type CabArchitecture='city'|'panel'|'pickup'|'crew'|'step'|'compact'|'wedge'|'round'|'wide'|'low-entry'|'utility'|'conventional'|'retro'|'sleeper'|'high-roof'|'aero'|'long-hood'|'aero-hood'|'expedition';
export type FrontDesign='mesh'|'split'|'bars'|'vertical'|'shield'|'horizontal'|'oval'|'inset';
export type LampDesign='swept'|'round'|'twin'|'vertical'|'blade'|'angled';
export type VehicleDesign={
  name:string;architecture:CabArchitecture;cabLength:number;roof:number;nose:number;rake:number;width:number;
  front:FrontDesign;lamps:LampDesign;roofFeature:'plain'|'pod'|'visor'|'scoop'|'fairing'|'rack';
  bodyProfile:'crown'|'wedge'|'square'|'bevel'|'smooth'|'step'|'taper'|'ribbed';
  bodyDetail:number;frontAxle:number;crew:boolean;sleeper:boolean;hood:boolean;
};
type Row=readonly[string,CabArchitecture,number,number,number,number,number,FrontDesign,LampDesign,VehicleDesign['roofFeature'],VehicleDesign['bodyProfile']];
// Each row is an authored vehicle, not an index-driven recolor. Metres describe original designs.
const small:readonly Row[]=[
 ['Arco U35','panel',2.62,2.34,.62,.58,.94,'mesh','swept','plain','crown'],
 ['Nexo Care','city',2.45,2.34,.62,.56,.91,'split','blade','pod','bevel'],
 ['Faro Coast','compact',1.92,2.52,0,.15,.96,'bars','vertical','plain','ribbed'],
 ['Bulevar Baker','step',2.24,2.91,0,.08,.98,'horizontal','round','visor','square'],
 ['Prisma Flora','pickup',2.84,2.18,1.19,.31,.90,'oval','angled','plain','wedge'],
 ['Curva City','wedge',2.11,2.65,.15,.51,.97,'shield','blade','fairing','smooth'],
 ['Huerto Scout','crew',3.40,2.27,1.12,.36,.93,'split','twin','rack','step'],
 ['Giro Beverage','low-entry',2.38,2.58,0,.36,.99,'inset','swept','pod','bevel'],
 ['Forja Gas','utility',2.05,2.76,.16,.10,.95,'vertical','round','rack','square'],
 ['Ronda Return','round',2.18,2.48,.10,.24,.92,'oval','round','visor','crown'],
 ['Vértice Glass','panel',2.91,2.72,.93,.63,.98,'horizontal','blade','rack','taper'],
 ['Cauce Trades','crew',3.68,2.45,1.34,.45,.95,'mesh','swept','plain','ribbed'],
 ['Pulso Cable','compact',2.16,2.31,0,.32,.88,'split','twin','pod','bevel'],
 ['Roca Mini','pickup',2.66,2.12,.98,.21,.96,'bars','round','scoop','taper'],
 ['Brota Crew','city',2.81,2.60,.64,.39,.93,'shield','vertical','fairing','step'],
 ['Nube Luton','step',2.57,2.75,.10,.18,.95,'inset','angled','fairing','crown'],
 ['Elevia Lift','wedge',2.36,2.47,.28,.68,.90,'split','swept','plain','bevel'],
 ['Gota Compact','round',2.44,2.64,.24,.37,.98,'horizontal','twin','visor','smooth'],
 ['Taller Terra','conventional',3.13,2.51,1.35,.25,.92,'vertical','twin','scoop','ribbed'],
 ['Trama Access','low-entry',2.63,2.84,0,.18,.96,'mesh','blade','plain','step'],
];
const medium:readonly Row[]=[
 ['Vía Rigid','wide',2.32,3.05,0,.20,.99,'horizontal','angled','visor','bevel'],
 ['Aurora Cold','wedge',2.56,3.29,.12,.52,.98,'shield','blade','fairing','crown'],
 ['Tensa Road','aero',2.89,3.43,.28,.63,.96,'split','swept','fairing','smooth'],
 ['Plaza Market','low-entry',2.64,2.94,0,.40,.95,'oval','round','plain','step'],
 ['Pórtico Crane','conventional',3.73,2.92,1.48,.32,.91,'bars','twin','rack','ribbed'],
 ['Bastión Brick','utility',2.51,3.38,.15,.14,.98,'vertical','vertical','scoop','square'],
 ['Vector Steel','retro',2.39,3.02,0,.12,.93,'bars','round','visor','taper'],
 ['Roble Timber','crew',3.87,2.98,1.27,.43,.96,'split','angled','rack','bevel'],
 ['Acueducto Pipe','wide',2.70,3.23,.09,.31,.97,'inset','vertical','pod','ribbed'],
 ['Delta Drum','round',2.62,2.86,.20,.38,.94,'oval','twin','plain','smooth'],
 ['Enlace IBC','city',2.86,3.12,.64,.49,.95,'mesh','swept','fairing','step'],
 ['Lluvia Works','expedition',3.31,3.33,.98,.26,.98,'shield','round','rack','bevel'],
 ['Alba Dairy','aero',3.11,3.58,.33,.78,.99,'horizontal','blade','fairing','crown'],
 ['Cantera Half','utility',2.76,3.15,.25,.21,.94,'bars','twin','visor','taper'],
 ['Duna Three','conventional',3.48,3.10,1.22,.43,.97,'mesh','angled','scoop','wedge'],
 ['Órbita Mix','compact',2.21,3.31,0,.34,.97,'split','vertical','pod','smooth'],
 ['Isla Skip','low-entry',2.93,3.06,0,.21,.99,'inset','swept','plain','bevel'],
 ['Gancho Roll','retro',2.66,3.42,.08,.17,.96,'vertical','round','visor','ribbed'],
 ['Rescate Pro','aero-hood',3.92,3.02,1.62,.60,.93,'shield','swept','fairing','wedge'],
 ['Volt Service','wedge',3.05,3.47,.22,.74,.99,'horizontal','blade','pod','step'],
];
const large:readonly Row[]=[
 ['Horizonte Aero','aero',3.23,3.96,.28,.76,.99,'split','swept','fairing','crown'],
 ['Boreal Cold','high-roof',3.54,4.06,.07,.27,.98,'horizontal','vertical','pod','bevel'],
 ['Cumbre Mega','sleeper',3.16,3.67,0,.19,.96,'shield','angled','visor','smooth'],
 ['Titán Coil','long-hood',4.82,3.30,2.08,.25,.92,'vertical','round','scoop','taper'],
 ['Flecha Steel','aero-hood',4.46,3.75,1.70,.68,.96,'mesh','blade','fairing','wedge'],
 ['Monte Forest','conventional',4.12,3.32,1.56,.32,.95,'bars','twin','rack','ribbed'],
 ['Cordillera Pipe','retro',3.02,3.65,.06,.11,.98,'horizontal','round','visor','bevel'],
 ['Mamut Low','expedition',3.64,3.48,1.00,.25,.99,'shield','twin','rack','square'],
 ['Surco Step','long-hood',4.49,3.13,1.86,.42,.94,'bars','angled','scoop','step'],
 ['Atlas Module','wide',3.21,3.80,.14,.22,.99,'inset','vertical','pod','ribbed'],
 ['Escala Auto','aero-hood',4.08,3.31,1.38,.75,.92,'split','swept','fairing','taper'],
 ['Intero ISO','sleeper',3.43,3.94,.03,.44,.97,'mesh','blade','visor','square'],
 ['Trasbordo Flex','high-roof',3.02,3.76,.18,.36,.95,'vertical','twin','pod','step'],
 ['Ruta Fuel','conventional',4.61,3.53,1.91,.39,.97,'horizontal','round','scoop','smooth'],
 ['Polar Milk','aero',3.67,4.12,.40,.86,.99,'shield','blade','fairing','crown'],
 ['Caliza Silo','retro',3.38,3.58,.12,.15,.93,'bars','twin','visor','bevel'],
 ['Trigal Hopper','long-hood',5.03,3.78,2.21,.48,.96,'vertical','angled','rack','wedge'],
 ['Bioflux Floor','high-roof',3.78,4.19,.20,.54,.98,'split','vertical','fairing','ribbed'],
 ['Cristal Span','expedition',3.91,3.61,1.16,.40,.95,'inset','round','rack','taper'],
 ['Marina Hull','aero-hood',4.78,3.93,1.93,.86,.99,'mesh','swept','fairing','smooth'],
];
const rows=[...small,...medium,...large];
export const vehicleDesigns:readonly VehicleDesign[]=rows.map((r,index)=>{
  const [name,architecture,cabLength,roof,nose,rake,width,front,lamps,roofFeature,bodyProfile]=r;
  const hood=nose>=.60,crew=architecture==='crew'||name==='Brota Crew';
  return {name,architecture,cabLength:index>=40&&!hood?Math.min(2.85,Math.max(2.32,cabLength*.80)):cabLength,roof,nose,rake,width,front,lamps,roofFeature,bodyProfile,bodyDetail:index,
    hood,crew,sleeper:index>=40&&['aero','sleeper','high-roof','aero-hood','long-hood','conventional'].includes(architecture),
    frontAxle:hood?Math.min(nose*.55+.64,cabLength*.48):architecture==='low-entry'||architecture==='step'?1.38:index<20?1.08:1.38};
});
export const designAt=(index:number)=>vehicleDesigns[index];

export function tankDimensions(t:{id:string;size:'small'|'medium'|'large';widthM:number;bodyLengthM:number}){
  const ry=t.id==='cm-fuel-multicell'?.89:t.id==='cm-food-stainless'?1.06:t.id==='cm-water-bowser'?.74:t.id==='cm-milk-elliptical'?.92:t.size==='small'?.67:t.size==='medium'?.86:1.1;
  return {rx:(t.widthM-.3)/2,ry,length:t.bodyLengthM-.6};
}
