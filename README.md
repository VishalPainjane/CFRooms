# CFRooms

<div align="center">
  <img src="https://raw.githubusercontent.com/VishalPainjane/CFRooms/main/web/public/icon.svg" width="128" />
  <h3>The multiplayer layer for Codeforces.</h3>
  <p><code>Practice together</code> &bull; <code>Compete in real-time</code> &bull; <code>Level up</code></p>
</div>

---

## <code>[ Features ]</code>

- **Real-Time Collaboration**: Complete Codeforces problems together with your friends.
- **Live Scoreboard**: Track everyone's progress, time, and submissions live.
- **In-Room Chat**: Discuss approaches and solutions directly synced to the room.
- **Customizable Sessions**: Filter problems by rating, tags, and topics.
- **Privacy First**: No passwords required. We don't store your code or chat logs long-term.

## <code>[ Architecture ]</code>

CFRooms contains two main components:
1. **Web App (Next.js)**: Holds the backend API, Pusher WebSocket auth, and the central Redis/BullMQ task queues.
2. **Browser Extension (Plasmo)**: A lightweight MV3 Chrome extension that injects directly into Codeforces.com pages for seamless integration.

> For a deeper dive into the system design, check out our [Architecture Documentation](./docs/ARCHITECTURE.md).

## <code>[ Quick Setup ]</code>

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Redis
- Pusher Channels Account

### 2. Install & Run Web
```bash
git clone https://github.com/VishalPainjane/CFRooms.git
cd CFRooms/web

# Install dependencies
npm install

# Setup Prisma
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

### 3. Run the Extension
```bash
cd ../extension

# Install dependencies
npm install

# Start development build
npm run dev
```

> **Note:** Load the extension in Chrome via `chrome://extensions` &rarr; Developer Mode &rarr; Load Unpacked &rarr; select `extension/build/chrome-mv3-dev`.

## <code>[ Contributing ]</code>

We love contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started on how to propose bug fixes, submit PRs, and help out.

## <code>[ License ]</code>

This project is licensed under the [MIT License](LICENSE).


