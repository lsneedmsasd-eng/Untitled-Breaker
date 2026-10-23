const http = require("node:http");
const express = require("express");

function createGameServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.get("/health", (_request, response) => response.json({ ok: true }));
  app.use(express.static(__dirname));

  return { httpServer };
}

if (require.main === module) {
  const { httpServer } = createGameServer();
  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Block Breaker server listening on port ${port}`);
  });
}

module.exports = { createGameServer };