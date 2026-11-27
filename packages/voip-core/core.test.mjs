import test from 'node:test';
import assert from 'node:assert/strict';
import { BoundedPcmQueue, CallSession } from './src/index.mjs';

test('incoming call follows the basic lifecycle', () => {
  const call = new CallSession({ id: 'in-1', direction: 'incoming' });
  const states = [];
  call.on('state', event => states.push(event.state));
  call.ring().connect().connected().think().speak().listen().end();
  assert.equal(call.state, 'ended');
  assert.deepEqual(states, ['ringing', 'connecting', 'listening', 'thinking', 'speaking', 'listening', 'ended']);
});

test('outgoing call can share the same lifecycle model', () => {
  const call = new CallSession({ id: 'out-1', direction: 'outgoing' });
  call.connect().connected();
  assert.equal(call.direction, 'outgoing');
  assert.equal(call.state, 'listening');
});

test('invalid transitions are rejected', () => {
  const call = new CallSession({ id: 'bad-1', direction: 'incoming' });
  assert.throws(() => call.speak(), /Invalid call transition/);
});

test('PCM queue enforces a byte limit and can be drained', () => {
  const queue = new BoundedPcmQueue({ maxBytes: 4 });
  queue.push(Buffer.from([1, 2]));
  queue.push(Buffer.from([3, 4]));
  assert.equal(queue.bytes, 4);
  assert.throws(() => queue.push(Buffer.from([5])), /limit exceeded/);
  assert.deepEqual([...queue.shift()], [1, 2]);
  assert.deepEqual([...queue.shift()], [3, 4]);
  assert.equal(queue.bytes, 0);
});
