# Super-Basic-Brick-Bounce-Game

## Run

Install dependencies and start the web and lobby server:

```sh
npm install
npm start
```

Open port 3000 in your browser. Other devices can join the same lobby by opening the server's reachable address and entering its room code. The host can start once at least one other player is ready. The host runs the shared game simulation; teammates control separate paddles and share the score, lives, bricks, and level progression. If the host leaves, the co-op run ends for everyone.

Run the lobby integration test with `npm test`.

## GitHub Pages

GitHub Pages hosts the browser game, but it cannot run the Node lobby server. Deploy it to Render using the repository's `render.yaml` blueprint:

1. In Render, choose **New > Blueprint** and connect this GitHub repository.
2. Create the `untitled-breaker-lobby` web service.
3. Copy the generated HTTPS service URL, without a trailing slash.
4. Set that URL in `lobby-config.js`:

```js
window.LOBBY_SERVER_URL = "https://your-service.onrender.com";
```

Then commit and push the change so GitHub Pages receives it. Render's free service may sleep after inactivity; allow a few seconds on the first lobby connection while it starts.

Alternatively, deploy `npm start` to another Node hosting service and set its URL in `lobby-config.js`:

```js
window.LOBBY_SERVER_URL = "https://your-lobby-server.example.com";
```

You can also override it through the Pages URL:

```text
https://lsneedmsasd-eng.github.io/Untitled-Breaker/?lobby=https://your-lobby-server.example.com
```