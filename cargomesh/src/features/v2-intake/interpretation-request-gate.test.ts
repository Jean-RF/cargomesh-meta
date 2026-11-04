import assert from 'node:assert/strict';
import test from 'node:test';
import {InterpretationRequestGate} from './interpretation-request-gate';

test('superseded requests abort and an old completion cannot clear the new request',()=>{
  const gate=new InterpretationRequestGate(),first=gate.start('draft A r1');
  const next=gate.start('draft A r1');assert(first.signal.aborted);assert(!next.signal.aborted);
  first.finish();gate.invalidate('draft A r2');assert(next.signal.aborted);
});
test('unchanged drafts preserve the request; close/unmount aborts and completed work is released',()=>{
  const gate=new InterpretationRequestGate(),first=gate.start('scope A');
  gate.invalidate('scope A');assert(!first.signal.aborted);
  first.finish();gate.cancel();assert(!first.signal.aborted);
  const pending=gate.start('scope B');gate.cancel();assert(pending.signal.aborted);
});
