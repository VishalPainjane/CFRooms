# Developer Setup Guide

This guide will help you install and run CFRooms locally for development.

## Prerequisites
- **Node.js** (v18+)
- **npm** or **pnpm**
- **Redis instance** (Optional but recommended for full testing)
- **Pusher account** (for websocket interactions)

## 1. Web Server Setup
Navigate into the `web/` directory:

```bash
cd web/
npm install
```

Copy the example environment file and fill in your keys (Pusher and Upstash Redis).
```bash
cp .env.example .env
```

Start the Next.js development server:
```bash
npm run dev
```

## 2. Extension Setup
Navigate into the `extension/` directory:

```bash
cd ../extension
npm install
```

Start the Plasmo dev server:
```bash
npm run dev
```

This will output a development extension package inside `extension/build/chrome-mv3-dev`.

### Load into Chrome
1. Head to `chrome://extensions/`.
2. Enable "Developer Mode".
3. Select "Load Unpacked" and point to `CFRooms/extension/build/chrome-mv3-dev`.
4. Pin the extension and refresh any open Codeforces pages!