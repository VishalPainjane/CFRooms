# CFRooms 🚀

<div align="center">
  <img src="https://raw.githubusercontent.com/VishalPainjane/CFRooms/main/web/public/icon.svg" width="128" />
  <h3>The multiplayer layer for Codeforces.</h3>
  <p>Practice together, compete in real-time, and level up your competitive programming journey.</p>
</div>

---

## 🌟 Features

- **Real-Time Collaboration**: Complete Codeforces problems together with your friends.
- **Live Scoreboard**: Track everyone's progress, time, and submissions live.
- **In-Room Chat**: Discuss approaches and solutions directly synced to the room.
- **Customizable Sessions**: Filter problems by rating, tags, and topics.
- **Privacy First**: No passwords required. We don't store your code or chat logs long-term.

## 🏗️ Architecture Architecture

CFRooms contains two main components:
1. **Web App (Next.js)**: Holds the backend API, Pusher WebSocket auth, and the central Redis/BullMQ task queues.
2. **Browser Extension (Plasmo)**: A lightweight MV3 Chrome extension that injects directly into Codeforces.com pages for seamless integration.

For a deeper dive into the system design, check out our [Architecture Documentation](./docs/ARCHITECTURE.md).

## 🚀 Quick Setup

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
Then load the extension in Chrome via `chrome://extensions` → Developer Mode -> Load Unpacked -> select `extension/build/chrome-mv3-dev`.

## 🤝 Contributing

We love contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started on how to propose bug fixes, submit PRs, and help out!

## 📄 License

This project is licensed under the [MIT License](LICENSE).

