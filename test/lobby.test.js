const assert = require("node:assert/strict");
const { test } = require("node:test");
const { io: connect } = require("socket.io-client");
const { createGameServer } = require("../server.js");

function waitFor(socket, eventName) {
  return new Promise((resolve) => socket.once(eventName, resolve));
}

test("players join a lobby and the host starts after guests are ready", async () => {
  const { httpServer, io } = createGameServer();
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  const host = connect(`http://127.0.0.1:${address.port}`);
  const guest = connect(`http://127.0.0.1:${address.port}`);
  await Promise.all([waitFor(host, "connect"), waitFor(guest, "connect")]);

  const hostState = waitFor(host, "lobby:state");
  const created = await host.emitWithAck("lobby:create", { username: "Host" });
  assert.equal(created.ok, true);
  await hostState;

  const guestHostState = waitFor(host, "lobby:state");
  const guestState = waitFor(guest, "lobby:state");
  const joined = await guest.emitWithAck("lobby:join", { code: created.code, username: "Guest" });
  assert.equal(joined.ok, true);
  assert.equal((await guestHostState).players.length, 2);
  await guestState;

  const blockedStart = await host.emitWithAck("lobby:start", { mode: "campaign" });
  assert.equal(blockedStart.ok, false);

  const readyState = waitFor(host, "lobby:state");
  const ready = await guest.emitWithAck("lobby:ready", { ready: true });
  assert.equal(ready.ok, true);
  assert.equal((await readyState).canStart, true);

  const hostStarted = waitFor(host, "lobby:started");
  const guestStarted = waitFor(guest, "lobby:started");
  const started = await host.emitWithAck("lobby:start", { mode: "campaign" });
  assert.equal(started.ok, true);
  const [hostStartState, guestStartState] = await Promise.all([hostStarted, guestStarted]);
  assert.deepEqual(hostStartState, guestStartState);
  assert.equal(hostStartState.mode, "campaign");
  assert.equal(hostStartState.hostId, host.id);
  assert.equal(hostStartState.players.length, 2);

  const receivedState = waitFor(guest, "game:state");
  host.emit("game:state", { gameState: "playing", score: 20 });
  assert.deepEqual(await receivedState, { gameState: "playing", score: 20 });

  const receivedInput = waitFor(host, "game:input");
  guest.emit("game:input", { x: 321 });
  assert.deepEqual(await receivedInput, { playerId: guest.id, x: 321 });

  const receivedLaunch = waitFor(host, "game:launch");
  guest.emit("game:launch");
  await receivedLaunch;

  const receivedRestart = waitFor(host, "game:restart");
  guest.emit("game:restart", { mode: "endless" });
  assert.deepEqual(await receivedRestart, { mode: "endless" });

  const hostLeft = waitFor(guest, "game:host-left");
  host.disconnect();
  await hostLeft;
  const latePlayer = connect(`http://127.0.0.1:${address.port}`);
  await waitFor(latePlayer, "connect");
  const lateJoin = await latePlayer.emitWithAck("lobby:join", { code: created.code, username: "Late" });
  assert.equal(lateJoin.ok, false);
  assert.equal(lateJoin.message, "That game has already started.");
  latePlayer.disconnect();
  guest.disconnect();
  await new Promise((resolve) => io.close(resolve));
});