import test from 'node:test';
import assert from 'node:assert/strict';
import {localCarrierPreviewAllowed} from './local-carrier-preview';

test('carrier frontend preview requires explicit opt-in on development localhost3000',()=>{
 const config={enabled:true,nodeEnv:'development',host:'localhost:3000'};
 assert.equal(localCarrierPreviewAllowed(config),true);
 assert.equal(localCarrierPreviewAllowed({...config,host:'127.0.0.1:3000'}),true);
 assert.equal(localCarrierPreviewAllowed({...config,enabled:false}),false);
 for(const nodeEnv of ['production','test',undefined])assert.equal(localCarrierPreviewAllowed({...config,nodeEnv}),false);
 for(const host of [null,'example.com:3000','localhost:3000.evil.test','localhost:8080','127.0.0.1:8090'])assert.equal(localCarrierPreviewAllowed({...config,host}),false);
});
