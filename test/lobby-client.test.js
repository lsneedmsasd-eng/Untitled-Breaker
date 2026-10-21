const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

test("the multiplayer button opens the lobby when the Socket.IO client is unavailable", () => {
  const elements = new Map();
  function getElement(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        addEventListener(eventName, handler) {
          this.handlers ??= {};
          this.handlers[eventName] = handler;
        },
        dataset: {},
      });
    }
    return elements.get(id);
  }

  const joinButton = getElement("lobby-join-submit");
  getElement("lobby-join-form").querySelector = () => joinButton;
  const visibleScreens = [];
  const context = {
    document: { getElementById: getElement },
    showScreen: (screen) => visibleScreens.push(screen),
  };

  const script = fs.readFileSync(path.join(__dirname, "../lobby-client.js"), "utf8");
  vm.runInNewContext(script, context);
  getElement("multiplayer-button").handlers.click();

  assert.deepEqual(visibleScreens, ["lobby"]);
  assert.match(getElement("lobby-status").textContent, /Lobby server unavailable/);
  assert.equal(getElement("lobby-status").dataset.error, "true");
  assert.equal(getElement("lobby-create").disabled, true);
  assert.equal(joinButton.disabled, true);
});
