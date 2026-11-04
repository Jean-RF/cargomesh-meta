import assert from 'node:assert/strict';
import test from 'node:test';
import {transportChatDecision,roadIntakeNavigation} from './transport-chat';

test('greetings and general questions reach the provider instead of a fixed transport reply', () => {
  for (const value of ['hola', 'cuanto es 1 +2', 'hello', '¿Qué puedes hacer?', '¿Qué es transporte terrestre?', 'no quiero terrestre'])
    assert.equal(transportChatDecision(value), 'DISCUSS', value);
});

test('ambiguous/negative speech is clarification, never transport consent',()=>{
  for(const value of ["yeah we're not","no I would like to go with hello shipment",'is road available','I do not want road'])
    assert.equal(transportChatDecision(value),'DISCUSS',value);
  assert.equal(transportChatDecision('I would like to go with road shipment'),'ROAD');
  assert.equal(transportChatDecision('yeah'),'ROAD');
  assert.equal(transportChatDecision('I need to fly 1,000 bottles of medicine'),'UNAVAILABLE');
});

test('Road acceptance opens the existing form from dashboard and selects its first step',()=>{
  assert.deepEqual(roadIntakeNavigation('/clients'),{step:1,openForm:true});
  assert.deepEqual(roadIntakeNavigation('/clients/requests'),{step:1,openForm:true});
  assert.deepEqual(roadIntakeNavigation('/clients/freight-request/new'),{step:1,openForm:false});
});

test('explicit Road consent stays local; unavailable modes never select Road', () => {
  for (const value of ['terrestre', 'road', 'sí', 'continuar por carretera', 'yes please'])
    assert.equal(transportChatDecision(value), 'ROAD', value);
  for (const value of ['avión', 'marítimo', 'air', 'road or sea'])
    assert.equal(transportChatDecision(value), 'UNAVAILABLE', value);
});
