# Architecture Overview

CFRooms operates as a distributed system primarily comprising a Chrome Extension (the competitive client) and a Next.js web server.

## Components 

### 1. `extension/` (Browser Client)
Built using the [Plasmo](https://docs.plasmo.com/) framework, rendering via React and TailwindCSS.
- **Background Runner**: Tracks Codeforces submissions via specific HTTP routes and communicates with the websocket channel.
- **Popup UI**: Built with React, where users initiate and join rooms, configures contest parameters.

### 2. `web/` (Server & Landing Page)
A Next.js 14+ application that handles the central multiplayer logic.
- **State Management**: Uses Upstash Redis and BullMQ for session memory and processing incoming webhooks/polling requests from Codeforces.
- **Websockets**: Uses Pusher for real-time bidirectional events (chat, scoreboard bumps, joining events).
- **Database**: Prisma acts as the ORM logging room histories or persistent features if necessary.

## High-Level Flow
1. User A creates a room. Extension talks to `web/` API. Returns room code.
2. User B joins via the extension.
3. Both clients subscribe to the unique Pusher channel created for the room.
4. During the contest, users write code on Codeforces.
5. The extension observes the `/submit` POST request and polls for the verdict.
6. Once the verdict is received, it broadcasts via the Pusher Websocket to the room.
7. Scoreboard updates instantaneously.