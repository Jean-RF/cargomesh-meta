import JsBarcode from 'jsbarcode';

export function barcodeBars(value:string){
  if(!/^\d{10}$/.test(value))throw Error('El código de carga debe contener diez dígitos.');
  const output:{encodings?:{data:string}[]}={};
  JsBarcode(output,value,{format:'CODE128C',displayValue:false});
  const data=output.encodings![0].data,bars:{x:number;width:number}[]=[];
  for(let i=0;i<data.length;){const start=i;while(i<data.length&&data[i]===data[start])i++;if(data[start]==='1')bars.push({x:start+10,width:i-start});}
  return {value,modules:data.length+20,bars};
}
