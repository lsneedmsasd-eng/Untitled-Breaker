# Super-Basic-Brick-Bounce-Game

## Run

Install dependencies and start the web and lobby server:

```sh
npm install
npm start
```

Open port 3000 in your browser. Other devices can join the same lobby by opening the server's reachable address and entering its room code. The host can start once at least one other player is ready. The host runs the shared game simulation; teammates control separate paddles and share the score, lives, bricks, and level progression. If the host leaves, the co-op run ends for everyone.

Run the lobby integration test with `npm test`.