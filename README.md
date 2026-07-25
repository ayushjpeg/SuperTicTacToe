# Ultimate Tic Tac Toe

Production-grade frontend for multiplayer Ultimate Tic Tac Toe (3x3 grid of tic-tac-toe boards) backed by `common-backend`.

## Features

- Google-authenticated sessions via common backend
- Active player lobby with heartbeat presence
- Direct invites to active players + shareable invite links
- Multiplayer game state with turn validation
- Bot mode (random legal move POC)
- High-fidelity board visuals and responsive UI

## Local run

```bash
npm ci
npm run dev
```

Set backend URL if needed:

```bash
VITE_BACKEND_URL=https://common-backend.ayux.in/api
```

## Docker

```bash
docker build --build-arg BACKEND_URL=https://common-backend.ayux.in/api -t superttt .
docker run -d -p 8013:8013 --name superttt superttt
```
