const crypto = require("node:crypto");
const http = require("node:http");
const express = require("express");
const { Server } = require("socket.io");
const { validateUsername } = require("./username-filter.js");

const ROOM_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PLAYERS = 8;

function createGameServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: true } });
  const rooms = new Map();

  app.get("/health", (_request, response) => response.json({ ok: true }));
  app.use(express.static(__dirname));

  function createRoomCode() {
    let code;
    do {
      code = Array.from(crypto.randomBytes(6), (byte) =>
        ROOM_CODE_CHARACTERS[byte % ROOM_CODE_CHARACTERS.length]
      ).join("");
    } while (rooms.has(code));
    return code;
  }

  function getRoomState(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    const players = [...room.players.values()];
    const allGuestsReady = players.length > 1 &&
      players.every((player) => player.id === room.hostId || player.ready);
    return {
      code: roomCode,
      hostId: room.hostId,
      players,
      canStart: allGuestsReady && !room.started
    };
  }

  function broadcastRoom(roomCode) {
    const state = getRoomState(roomCode);
    if (state) io.to(roomCode).emit("lobby:state", state);
  }

  function leaveRoom(socket) {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    socket.leave(roomCode);
    delete socket.data.roomCode;
    if (!room) return;
    if (room.started && room.hostId === socket.id) {
      io.to(roomCode).emit("game:host-left");
    }
    room.players.delete(socket.id);
    if (room.players.size === 0) {
      rooms.delete(roomCode);
      return;
    }
    if (room.hostId === socket.id && !room.started) {
      const nextHost = room.players.values().next().value;
      room.hostId = nextHost.id;
      nextHost.ready = true;
    }
    broadcastRoom(roomCode);
  }

  function replyError(acknowledge, message) {
    if (typeof acknowledge === "function") acknowledge({ ok: false, message });
  }

  io.on("connection", (socket) => {
    socket.on("lobby:create", (payload = {}, acknowledge) => {
      const result = validateUsername(payload.username);
      if (!result.valid) return replyError(acknowledge, result.message);
      leaveRoom(socket);
      const code = createRoomCode();
      const host = { id: socket.id, username: result.value, ready: true };
      rooms.set(code, { hostId: socket.id, players: new Map([[socket.id, host]]), started: false });
      socket.data.roomCode = code;
      socket.join(code);
      broadcastRoom(code);
      if (typeof acknowledge === "function") acknowledge({ ok: true, code });
    });

    socket.on("lobby:join", (payload = {}, acknowledge) => {
      const result = validateUsername(payload.username);
      if (!result.valid) return replyError(acknowledge, result.message);
      const code = String(payload.code || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return replyError(acknowledge, "Room not found. Check the code and try again.");
      if (room.started) return replyError(acknowledge, "That game has already started.");
      if (room.players.size >= MAX_PLAYERS) return replyError(acknowledge, "That lobby is full.");
      leaveRoom(socket);
      room.players.set(socket.id, { id: socket.id, username: result.value, ready: false });
      socket.data.roomCode = code;
      socket.join(code);
      broadcastRoom(code);
      if (typeof acknowledge === "function") acknowledge({ ok: true, code });
    });

    socket.on("lobby:ready", (payload = {}, acknowledge) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      const player = room?.players.get(socket.id);
      if (!player || room.started || player.id === room.hostId) {
        return replyError(acknowledge, "You cannot change readiness right now.");
      }
      player.ready = Boolean(payload.ready);
      broadcastRoom(roomCode);
      if (typeof acknowledge === "function") acknowledge({ ok: true });
    });

    socket.on("lobby:start", (payload = {}, acknowledge) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      const state = getRoomState(roomCode);
      if (!room || room.hostId !== socket.id) {
        return replyError(acknowledge, "Only the host can start the game.");
      }
      if (!state.canStart) {
        return replyError(acknowledge, "Wait for at least one other player to be ready.");
      }
      const mode = payload.mode === "endless" ? "endless" : "campaign";
      room.started = true;
      io.to(roomCode).emit("lobby:started", {
        code: roomCode,
        mode,
        hostId: room.hostId,
        players: [...room.players.values()]
      });
      if (typeof acknowledge === "function") acknowledge({ ok: true });
    });

    socket.on("game:input", (payload = {}) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      const player = room?.players.get(socket.id);
      const now = Date.now();
      if (!room?.started || !player || player.id === room.hostId ||
        !Number.isFinite(payload.x) || now - (socket.data.lastGameInputAt || 0) < 20) {
        return;
      }
      socket.data.lastGameInputAt = now;
      io.to(room.hostId).emit("game:input", {
        playerId: socket.id,
        x: Math.max(0, Math.min(960, payload.x))
      });
    });

    socket.on("game:state", (payload) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      const now = Date.now();
      if (!room?.started || room.hostId !== socket.id || !payload ||
        typeof payload !== "object" || now - (socket.data.lastGameStateAt || 0) < 20) {
        return;
      }
      socket.data.lastGameStateAt = now;
      socket.to(roomCode).emit("game:state", payload);
    });

    socket.on("game:launch", () => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      if (room?.started && room.players.has(socket.id)) {
        io.to(room.hostId).emit("game:launch");
      }
    });

    socket.on("game:restart", (payload = {}) => {
      const roomCode = socket.data.roomCode;
      const room = rooms.get(roomCode);
      if (room?.started && room.players.has(socket.id)) {
        io.to(room.hostId).emit("game:restart", {
          mode: payload.mode === "endless" ? "endless" : "campaign"
        });
      }
    });

    socket.on("lobby:leave", () => leaveRoom(socket));
    socket.on("disconnect", () => leaveRoom(socket));
  });

  return { httpServer, io };
}

if (require.main === module) {
  const { httpServer } = createGameServer();
  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Block Breaker server listening on port ${port}`);
  });
}

module.exports = { createGameServer };