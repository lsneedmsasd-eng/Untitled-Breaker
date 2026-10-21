const socket = typeof io === "function" ? io() : null;
const lobbyStatus = document.getElementById("lobby-status");
const lobbyJoinControls = document.getElementById("lobby-join-controls");
const lobbyRoom = document.getElementById("lobby-room");
const lobbyPlayers = document.getElementById("lobby-players");
const createLobbyButton = document.getElementById("lobby-create");
const joinForm = document.getElementById("lobby-join-form");
const joinButton = joinForm.querySelector('button[type="submit"]');
const readyButton = document.getElementById("lobby-ready");
const startButton = document.getElementById("lobby-start");
let activeRoom = null;

function setLobbyStatus(message, isError = false) {
  lobbyStatus.textContent = message;
  lobbyStatus.dataset.error = String(isError);
}

function renderLobby(room) {
  activeRoom = room;
  lobbyJoinControls.hidden = false;
  lobbyRoom.hidden = true;
  if (!room) return;

  lobbyJoinControls.hidden = true;
  lobbyRoom.hidden = false;
  document.getElementById("lobby-room-code").textContent = room.code;
  document.getElementById("lobby-player-count").textContent = `${room.players.length}/8`;
  lobbyPlayers.replaceChildren();
  for (const player of room.players) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const status = document.createElement("span");
    name.textContent = `${player.username}${player.id === room.hostId ? " (Host)" : ""}`;
    status.textContent = player.id === room.hostId ? "HOST" : player.ready ? "READY" : "WAITING";
    item.append(name, status);
    lobbyPlayers.append(item);
  }

  const isHost = socket?.id === room.hostId;
  const self = room.players.find((player) => player.id === socket?.id);
  readyButton.hidden = isHost;
  readyButton.textContent = self?.ready ? "Cancel ready" : "Ready";
  startButton.hidden = !isHost;
  startButton.disabled = !room.canStart;
  setLobbyStatus(isHost
    ? room.canStart ? "Everyone is ready. Start when you are." : "Share the room code and wait for players."
    : self?.ready ? "Ready. Waiting for the host to start." : "Mark yourself ready when you are set.");
}

function showLobbyError(message) {
  setLobbyStatus(message, true);
}

function sendLobbyRequest(eventName, payload) {
  if (!socket) {
    showLobbyError("Lobby server unavailable. Start the game server and try again.");
    return;
  }
  socket.emit(eventName, payload, (result) => {
    if (!result?.ok) showLobbyError(result?.message || "Unable to connect to that lobby.");
  });
}

function sendCoOpInput(x) {
  socket?.emit("game:input", { x });
}

function sendCoOpState(state) {
  socket?.emit("game:state", state);
}

function requestCoOpLaunch() {
  socket?.emit("game:launch");
}

function requestCoOpRestart(mode) {
  socket?.emit("game:restart", { mode });
}

function leaveCoOpSession() {
  socket?.emit("lobby:leave");
  activeRoom = null;
  renderLobby(null);
}

document.getElementById("multiplayer-button").addEventListener("click", () => {
  if (!socket) {
    setLobbyStatus("Lobby server unavailable. Start the game server and try again.", true);
  } else {
    setLobbyStatus(socket.connected ? "Create a lobby or join with a room code." : "Connecting to the lobby server...");
  }
  showScreen("lobby");
});

createLobbyButton.addEventListener("click", () => {
  sendLobbyRequest("lobby:create", { username: gamestate.username });
});

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = document.getElementById("lobby-code-input").value;
  sendLobbyRequest("lobby:join", { code, username: gamestate.username });
});

readyButton.addEventListener("click", () => {
  const self = activeRoom?.players.find((player) => player.id === socket.id);
  sendLobbyRequest("lobby:ready", { ready: !self?.ready });
});

startButton.addEventListener("click", () => {
  sendLobbyRequest("lobby:start", { mode: "campaign" });
});

document.getElementById("lobby-leave").addEventListener("click", () => {
  socket?.emit("lobby:leave");
  activeRoom = null;
  renderLobby(null);
  setLobbyStatus("You left the lobby.");
});

document.getElementById("lobby-back").addEventListener("click", () => {
  if (activeRoom) socket?.emit("lobby:leave");
  activeRoom = null;
  renderLobby(null);
  showScreen("menu");
});

if (socket) {
  socket.on("connect", () => {
    createLobbyButton.disabled = false;
    joinButton.disabled = false;
    setLobbyStatus("Create a lobby or join with a room code.");
  });

  socket.on("connect_error", () => {
    createLobbyButton.disabled = true;
    joinButton.disabled = true;
    setLobbyStatus("Lobby server unavailable. Try again when connected.", true);
  });

  socket.on("disconnect", () => {
    activeRoom = null;
    renderLobby(null);
    setLobbyStatus("Connection lost. Reopen the lobby to reconnect.", true);
    if (coOpGame.active) showGamePopup("CONNECTION LOST", "warning");
  });

  socket.on("lobby:state", (room) => {
    renderLobby(room);
    syncCoOpPlayers(room.players);
  });

  socket.on("lobby:started", ({ code, mode, hostId, players }) => {
    activeRoom = { code, hostId, players };
    startGame(mode);
    enableCoOpGame({ localId: socket.id, hostId, players });
  });

  socket.on("game:input", ({ playerId, x }) => updateCoOpPlayerInput(playerId, x));
  socket.on("game:state", applyCoOpSnapshot);
  socket.on("game:launch", () => {
    if (coOpGame.active && coOpGame.isHost) launchBall();
  });
  socket.on("game:restart", ({ mode }) => {
    if (coOpGame.active && coOpGame.isHost) startGame(mode);
  });
  socket.on("game:host-left", () => {
    if (!coOpGame.active) return;
    showGamePopup("HOST LEFT THE GAME", "warning");
    endCoOpGame();
    showScreen("menu");
  });
} else {
  createLobbyButton.disabled = true;
  joinButton.disabled = true;
}
