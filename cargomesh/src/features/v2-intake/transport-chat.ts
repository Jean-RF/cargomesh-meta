/** Only explicit transport decisions are local. Ordinary conversation goes to the provider. */
export function transportChatDecision(value: string): 'ROAD' | 'UNAVAILABLE' | 'DISCUSS' {
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const road = /\b(road|terrestre|carretera|camion|truck)\b/.test(text);
  const other = /\b(air|sea|fly|flying|flight|aereo|avion|maritimo|barco|vuelo|volar)\b/.test(text);
  const denied = /\b(no|not|dont|don't|sin)\b.{0,24}\b(road|terrestre|carretera|camion|truck)\b/.test(text);
  const question = /[?¿]|\b(what|why|how|when|where|que|como|cual|explain|explica)\b|^(?:is|are|can|could|should|would)\b/.test(text);
  const affirmative = /^(si|yes|yeah|sure|ok|okay|dale|continuar|continue|adelante|vamos)(\s+(por favor|please|adelante|let's do (?:it|that)))?[.!]*$/.test(text);
  if ((road || affirmative) && !other && !denied && !question) return 'ROAD';
  if (other && !question) return 'UNAVAILABLE';
  return 'DISCUSS';
}

/** Starting the form is navigation, not persistence or booking authorization. */
export function roadIntakeNavigation(pathname:string){
  return {step:1 as const,openForm:!pathname.endsWith('/freight-request/new')};
}
