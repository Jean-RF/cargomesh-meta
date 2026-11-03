import {designAt,tankDimensions,type VehicleDesign} from './vehicle-designs';
import {cabBaseFor,licensedCabDesign,type CabBase} from './cab-bases';
export type TruckSize = 'small' | 'medium' | 'large';
export type BodyForm = 'van' | 'box' | 'reefer' | 'curtain' | 'dropside' | 'rack' | 'tipper' | 'tank' | 'service' | 'flatbed' | 'silo' | 'mixer' | 'lowbed' | 'container' | 'transporter' | 'hopper';
export type CargoKind = 'cartons' | 'produce' | 'bakery' | 'flowers' | 'bottles' | 'fish' | 'meat' | 'medicine' | 'furniture' | 'appliances' | 'textiles' | 'tiles' | 'bricks' | 'cement' | 'drums' | 'ibc' | 'cylinders' | 'lumber' | 'pipes' | 'glass' | 'cable' | 'steel' | 'rebar' | 'logs' | 'coils' | 'paper' | 'gravel' | 'sand' | 'grain' | 'water' | 'milk' | 'fuel' | 'powder' | 'concrete' | 'cars' | 'excavator' | 'tractor' | 'transformer' | 'panels' | 'boat' | 'containers' | 'silage' | 'scrap' | 'tires' | 'machinery' | 'tools' | 'plants';
export type Cargo = { kind: CargoKind; label: string; count: number; unit: string; unitKg: number; unitM: readonly [number, number, number]; color: string; liquidLitres?: number };
export type CollectionTruck = {
  id: string; model: string; type: string; size: TruckSize; form: BodyForm;
  color: string; colorName: string; bodyColor: string; lengthM: number; widthM: number; bodyLengthM: number; bodyHeightM: number;
  axles: number; driveAxles:1|2; cab: 'compact' | 'bonnet' | 'day' | 'sleeper'; payloadKg: number; cargo: Cargo;
  driver: { id: string; name: string; years: number; uniform: string; skin: string; hair: string };
  plate: string; depot: string; year: number; powerKw: number; source: 'SYNTHETIC_DESIGN';
  design:VehicleDesign;
  cabBase:CabBase;
};
type Seed = readonly [string, string, BodyForm, CargoKind, string, number, number, readonly [number, number, number], string];
const small: readonly Seed[] = [
  ['courier-van','Furgón de paquetería','van','cartons','cajas de paquetería',18,12,[.45,.35,.32],'#b98b5b'],
  ['medical-van','Furgón sanitario refrigerado','reefer','medicine','contenedores isotérmicos',8,34,[.6,.4,.4],'#e0e9e6'],
  ['fish-reefer','Frigorífico pesquero compacto','reefer','fish','cajones de pescado',20,22,[.6,.4,.2],'#86b5c1'],
  ['bakery-shutter','Panadero de persianas','box','bakery','bandejas de pan',24,8,[.6,.4,.16],'#c68a42'],
  ['florist-glass','Floricultor acristalado','box','flowers','carros de flores',4,65,[.9,.6,1.2],'#739056'],
  ['urban-curtain','Lona urbana de textiles','curtain','textiles','fardos de tejido',9,48,[.75,.55,.5],'#767b9b'],
  ['orchard-dropside','Hortofrutícola de laterales bajos','dropside','produce','cajones de cítricos',28,18,[.5,.4,.28],'#cf842c'],
  ['beverage-rack','Botellero de reparto lateral','rack','bottles','cestas de bebidas',32,16,[.45,.35,.3],'#4e847a'],
  ['gas-cage','Jaula de cilindros compacta','rack','cylinders','cilindros de muestra',12,32,[.32,.32,.85],'#a75d45'],
  ['returnable-crates','Cajonero de envases retornables','rack','bottles','cajas de envases',25,14,[.5,.4,.32],'#9d704d'],
  ['glass-stand','Cristalero con caballete','rack','glass','paquetes de vidrio',2,210,[2.6,.18,1.4],'#90b8bc'],
  ['plumber-overcab','Tubero con portatubos sobrecabina','rack','pipes','haces de tubos PVC',3,105,[3.0,.32,.32],'#9ba7a6'],
  ['cable-service','Portabobinas de telecomunicaciones','service','cable','bobinas de cable',2,185,[.9,.8,.9],'#9a6943'],
  ['landscape-tipper','Volquete jardinero basculante','tipper','gravel','árido decorativo',1,950,[2.6,1.55,.32],'#938c76'],
  ['nursery-bed','Vivero con bancales','dropside','plants','macetones de vivero',12,36,[.38,.38,.9],'#678a49'],
  ['furniture-luton','Mudancero con alcoba Luton','box','furniture','muebles embalados',5,92,[.85,.55,1.0],'#a08266'],
  ['appliance-lift','Electrodomésticos con elevador','box','appliances','electrodomésticos',6,68,[.65,.6,.95],'#d4dbdc'],
  ['mini-bowser','Cisterna urbana de agua','tank','water','depósito de agua',1,1100,[2.8,1.45,1.3],'#83bcc7'],
  ['mobile-workshop','Taller de cajones y herramientas','service','tools','módulos de herramientas',4,85,[.65,.5,.55],'#b78442'],
  ['parcel-locker','Repartidor con casilleros','box','cartons','paquetes en casilleros',30,9,[.4,.3,.25],'#c6a577'],
];
const medium: readonly Seed[] = [
  ['regional-shutter','Furgón regional con persiana','box','cartons','pallets de cajas',8,360,[1.2,.8,1.25],'#b88c5b'],
  ['meat-rail','Frigorífico cárnico de carriles','reefer','meat','carros cárnicos cerrados',8,410,[1.1,.75,1.5],'#b77875'],
  ['pallet-curtain','Tauliner rígido con tensores','curtain','cement','pallets de sacos',6,680,[1.2,.8,.95],'#c3b69b'],
  ['market-awning','Mercado con toldo elevable','dropside','produce','pallets de hortalizas',6,410,[1.2,.8,1.1],'#79984f'],
  ['tile-knuckle','Plataforma de cerámica con grúa','flatbed','tiles','pallets de baldosas',5,810,[1.2,.8,.75],'#ac8f75'],
  ['brick-cage','Ladrillero con jaula abierta','rack','bricks','pallets de ladrillos',6,740,[1.2,.8,.85],'#ac6042'],
  ['rebar-stake','Estacas para acero corrugado','rack','rebar','paquetes de varillas',4,1020,[5.8,.36,.36],'#777e85'],
  ['timber-sideboard','Maderero de paneles abatibles','dropside','lumber','paquetes de tablones',4,720,[5.2,.5,.5],'#ba8c50'],
  ['pipe-bolster','Tubero de cunas transversales','rack','pipes','haces de tubería industrial',6,590,[5.5,.46,.46],'#7c9197'],
  ['drum-rail','Bidonero con barandas','flatbed','drums','bidones de 200 L',18,196,[.59,.59,.88],'#4b7e97'],
  ['ibc-carrier','Distribuidor de contenedores IBC','dropside','ibc','IBC de agua de muestra',4,1052.3,[1.2,1,1.16],'#d7e1df'],
  ['water-bowser','Cisterna regadora con aspersores','tank','water','depósito de agua',1,5100,[5.4,1.9,1.75],'#74b5c8'],
  ['milk-elliptical','Cisterna láctea elíptica','tank','milk','depósito de leche',1,5230,[5.6,1.95,1.7],'#cbd6d7'],
  ['gravel-halfpipe','Volquete de caja semicircular','tipper','gravel','carga de grava',1,5850,[5.2,2.1,.8],'#8e887c'],
  ['sand-threeway','Volquete trilateral de arena','tipper','sand','carga de arena',1,5680,[5.3,2.1,.75],'#baa27a'],
  ['mini-mixer','Hormigonera de tambor corto','mixer','concrete','hormigón de muestra',1,6100,[4.2,1.8,1.8],'#999e9c'],
  ['skip-loader','Portacontenedor de cadenas','hopper','scrap','contenedor de chatarra',1,3480,[4.5,1.9,1.1],'#6e767c'],
  ['rolloff','Portacaja de gancho','container','tires','neumáticos recuperados',24,42,[.65,.25,.65],'#383f45'],
  ['flat-recovery','Grúa de plataforma deslizante','transporter','cars','automóvil de muestra',1,1540,[4.2,1.75,1.4],'#b7c2c9'],
  ['power-service','Portagenerador de servicio','service','machinery','generadores sobre bancada',2,1820,[2.4,1.4,1.6],'#b7a34f'],
];
const large: readonly Seed[] = [
  ['aero-dryvan','Semirremolque seco aerodinámico','box','cartons','pallets de carga seca',24,650,[1.2,.8,1.5],'#b78c5c'],
  ['pharma-multitemp','Frigorífico multitemperatura','reefer','medicine','pallets farmacéuticos',22,480,[1.2,.8,1.35],'#b9cfda'],
  ['mega-curtain','Mega tauliner de techo elevado','curtain','textiles','pallets de tejido industrial',26,520,[1.2,.8,1.75],'#82728e'],
  ['coil-well','Portabobinas de cuna central','flatbed','coils','bobinas de acero',3,6750,[1.8,1.3,1.8],'#8a939a'],
  ['steel-extendable','Plataforma extensible de perfiles','flatbed','steel','paquetes de perfiles',6,3250,[11.0,.55,.5],'#737e89'],
  ['forest-bolster','Tronquero de cuatro pórticos','rack','logs','troncos de muestra',12,1480,[10.0,.45,.45],'#94704b'],
  ['pipe-wedge','Portatubos de cunas triangulares','rack','pipes','tubos de gran diámetro',9,1920,[10.5,.65,.65],'#748d91'],
  ['excavator-lowbed','Cama baja de excavadora','lowbed','excavator','excavadora de orugas',1,18400,[6.8,2.15,2.5],'#c4a047'],
  ['tractor-stepdeck','Semicama de tractor agrícola','lowbed','tractor','tractor agrícola',1,8350,[4.7,2.15,2.65],'#557b47'],
  ['transformer-modular','Modular de transformador','lowbed','transformer','transformador sobre bancada',1,24900,[5.2,2.1,2.8],'#8f9c92'],
  ['auto-doubledeck','Portaautos de dos niveles','transporter','cars','automóviles de muestra',4,1460,[4.1,1.7,1.35],'#a5b5c6'],
  ['iso-container','Portacontenedor ISO de 40 pies','container','containers','contenedor de 40 pies',1,16280,[12.192,2.438,2.591],'#ac674d'],
  ['swap-body','Caja móvil con patas plegables','box','appliances','pallets de electrodomésticos',22,610,[1.2,.8,1.6],'#d2d8d6'],
  ['fuel-multicell','Cisterna de compartimentos','tank','fuel','cisterna de combustible de muestra',1,21700,[12.0,2.25,2.2],'#afbec6'],
  ['food-stainless','Cisterna alimentaria aislada','tank','milk','cisterna alimentaria de muestra',1,24300,[12.2,2.2,2.1],'#d2dada'],
  ['cement-silo','Silo neumático de tres conos','silo','powder','cemento pulverulento',1,23800,[11.5,2.15,2.1],'#d0c9b8'],
  ['grain-hopper','Tolva cerealera de descarga inferior','hopper','grain','grano de muestra',1,22100,[11.8,2.2,1.4],'#bb9e58'],
  ['walking-floor','Piso móvil de biomasa','box','silage','biomasa de muestra',1,18600,[12.7,2.2,1.8],'#7e8e55'],
  ['panel-a-frame','Panelero con bastidor central','rack','panels','paneles prefabricados',6,2980,[8.6,.18,2.5],'#b1b8b2'],
  ['boat-cradle','Cuna de embarcación','lowbed','boat','embarcación de muestra',1,5280,[8.4,2.05,2.2],'#bbcfd5'],
];
const colors = [
  ['#c65b36','Terracota'],['#356d83','Azul petróleo'],['#2f8276','Verde laguna'],['#ad8130','Ocre'],['#735585','Ciruela'],['#8b475c','Frambuesa'],['#5d7b3c','Oliva'],['#3c709a','Azul acero'],['#a14b33','Cobre'],['#697781','Pizarra'],['#b78663','Arena rosada'],['#41786f','Eucalipto'],['#b29d4f','Mostaza'],['#675e91','Índigo'],['#7d8e4c','Salvia'],['#ae6b45','Caramelo'],['#477e92','Lago'],['#92754e','Bronce'],['#6e574b','Cacao'],['#6b8a85','Jade gris'],
  ['#a52f3c','Granate'],['#355594','Cobalto'],['#367c53','Bosque'],['#c97a27','Ámbar'],['#625194','Amatista'],['#a24e73','Malva'],['#6d7936','Musgo'],['#277b94','Cerúleo'],['#bd644c','Ladrillo'],['#566778','Grafito azul'],['#b38d74','Arcilla'],['#28766b','Teal'],['#bf9b30','Maíz'],['#515e9b','Lavanda azul'],['#708f69','Helecho'],['#b17632','Canela'],['#498b9b','Glaciar'],['#91763d','Latón'],['#815245','Caoba'],['#5a8c78','Menta oscura'],
  ['#8d2737','Cereza'],['#274b7c','Ultramar'],['#276643','Pino'],['#d18c32','Miel'],['#674273','Berenjena'],['#914865','Mora'],['#707e48','Liquen'],['#266b82','Atlántico'],['#a7543b','Óxido'],['#43545f','Basalto'],['#ac9276','Sillar'],['#246c62','Abeto'],['#c0a25d','Dorado mate'],['#464b7f','Noche índigo'],['#617950','Romero'],['#996335','Avellana'],['#3b7887','Mar profundo'],['#8a713c','Pirita'],['#704b40','Tabaco'],['#537a6e','Ciprés'],
] as const;
const drivers = [
  'Mateo Salazar','Valeria Quispe','Diego Huamán','Camila Rojas','Gabriel Flores','Luciana Vargas','Adrián Paredes','Renata Torres','Sebastián Cárdenas','Mariana Peña','Nicolás Mendoza','Daniela Soto','Joaquín Castro','Antonella Rivas','Rodrigo Chávez','Fernanda León','Alonso Medina','Paola Navarro','Bruno Cabrera','Andrea Campos',
  'Hugo Benavides','Isabela Velarde','Santiago Luján','Gabriela Meza','Emilio Valdivia','Claudia Palomino','Álvaro Espinoza','Natalia Cueva','Franco Arce','Jimena Aguilar','Leonardo Tapia','Elena Bustamante','Iván Villanueva','Carolina Gálvez','Marco Solís','Patricia Zegarra','Tomás Acosta','Mónica Vera','Luis Ponce','Silvia Robles',
  'Eduardo Yáñez','Ariana Benites','Rafael Montoya','Teresa Hidalgo','Óscar Núñez','Victoria Alarcón','Javier Dávila','Rocío Portilla','Martín Escalante','Beatriz Fuentes','Felipe Carranza','Pilar Saavedra','Andrés Lozano','Cecilia Valenzuela','Cristóbal Peralta','Lorena Zambrano','Manuel Ordoñez','Verónica Espada','Samuel Reátegui','Inés Cornejo',
];
const depots = ['Lima · Ate','Callao · Gambetta','Arequipa · Río Seco','Trujillo · La Esperanza','Chiclayo · Pimentel','Piura · Castilla','Huancayo · El Tambo','Cusco · San Jerónimo','Ica · Subtanjalla','Tacna · Pocollay'];
export const sizeLabels: Record<TruckSize,string> = { small: 'Pequeños', medium: 'Medianos', large: 'Grandes' };
/** Author-created display fixtures. Never used for fleet registration, routing or load authorization. */
export const collectionTrucks: readonly CollectionTruck[] = ([small,medium,large] as const).flatMap((group, groupIndex) => group.map((row,index) => {
  const n=groupIndex*20+index, size=(['small','medium','large'] as const)[groupIndex];
  const originalDesign=designAt(n);
  const [slug,type,form,kind,label,count,unitKg,unitM,cargoColor]=row;
  const mass=count*unitKg;
  const widthM=groupIndex===0 ? 1.94+(index%3)*.055 : groupIndex===1 ? 2.42+(index%2)*.06 : 2.55;
  const design=licensedCabDesign(n,widthM,originalDesign);
  const axles=groupIndex===0?2:groupIndex===1?(index%3===0?2:3):(index===9?7:slug==='boat-cradle'?5:index===7||originalDesign.hood?6:5);
  const driveAxles=groupIndex===2&&(originalDesign.hood||axles>=6)?2:1;
  // A longer low-bed neck clears the tractor axles without shrinking the useful cargo deck.
  const neckExtension=form==='lowbed'?(driveAxles===2?3.5:2.4)-(slug==='tractor-stepdeck'?2.4:1.4):0;
  const bodyLengthM=(groupIndex===0 ? 3.3+(index%4)*.15 : groupIndex===1 ? 6.1+(index%4)*.18 : 13.1+(index%3)*.2)+neckExtension;
  const bodyHeightM=form==='lowbed'?3.3:groupIndex===0 ? (form==='van'?1.72:1.92) : groupIndex===1 ? 2.28 : 2.72;
  const cargo: Cargo={kind,label,count,unit:'ud',unitKg,unitM,color:cargoColor};
  if (['water','milk','fuel'].includes(kind)){
    cargo.liquidLitres=Math.round(mass/(kind==='milk'?1.03:kind==='fuel'?.84:1));
    const tank=tankDimensions({id:`cm-${slug}`,size,widthM,bodyLengthM});
    cargo.unitM=[tank.length-.05,tank.rx*2-.05,tank.ry*2-.05];
  }
  return {id:`cm-${slug}`,model:`CM ${design.name}`,type,size,form,design,cabBase:cabBaseFor(n),
    color:colors[n][0],colorName:colors[n][1],bodyColor:slug==='gravel-halfpipe'?'#647882':['reefer','van'].includes(form)?'#e5e8e2':form==='tank'?'#b9c3c5':colors[(n+17)%60][0],
    lengthM:bodyLengthM+design.cabLength+(groupIndex===2?.62:.20),widthM,bodyLengthM,bodyHeightM,
    axles,driveAxles,
    cab:design.hood?'bonnet':design.sleeper?'sleeper':groupIndex===0?'compact':'day',
    payloadKg:Math.ceil(Math.max(mass*1.15,[1000,6500,24000][groupIndex]+index*[25,90,120][groupIndex])/50)*50,cargo,
    driver:{id:`DEMO-DR-${String(n+1).padStart(3,'0')}`,name:drivers[n],years:2+(n*7)%24,uniform:colors[(n+13)%60][0],skin:['#ba815e','#d19b76','#966548','#e0b090','#805a45'][n%5],hair:['#352a25','#171a1d','#574439','#6a5141','#473c37'][n%5]},
    plate:`DEMO-${String(n+1).padStart(3,'0')}`,depot:depots[n%depots.length],year:2022+n%5,powerKw:[95,175,360][groupIndex]+index*3,source:'SYNTHETIC_DESIGN' as const};
}));
export const cargoMassKg = (truck: CollectionTruck) => Math.round(truck.cargo.count*truck.cargo.unitKg*10)/10;
export const cargoWidthM = (truck: CollectionTruck) => truck.widthM-(truck.size==='large'?.1:.22);
