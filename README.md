# Number Tic Tac Toe

Production-grade frontend for multiplayer Number Tic Tac Toe on a 3x3 grid-of-grids, backed by `common-backend`.

## Features

- Google-authenticated sessions via common backend
- Active player lobby with heartbeat presence
- Direct invites to active players + shareable invite links
- Multiplayer game state with turn/value validation
- Bot mode (random legal move POC)
- High-fidelity board visuals and responsive UI

## Rules implemented

- Each mini-grid is a 3x3 Number Tic Tac Toe board.
- On each turn, a player picks an empty cell and a number from 1-9.
- A number cannot repeat inside the same mini-grid.
- A mini-grid is won when any row, column, or diagonal sums to 15.
- Cell position forces the opponent's next mini-grid (unless target mini-grid is already closed).

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
