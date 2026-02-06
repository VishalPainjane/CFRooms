# CFRooms

The multiplayer layer for Codeforces.

## Project Structure

- `web/`: Next.js application (Backend API + Hub).
- `extension/`: Plasmo Chrome Extension.

## Setup Instructions

### 1. Prerequisites
- Node.js & npm
- PostgreSQL Database (e.g., Neon)
- Redis (e.g., Upstash)
- Pusher Account

### 2. Web Configuration
Create `web/.env` based on `web/.env.example` (or just `.env` if generated).
Ensure `DATABASE_URL`, `REDIS_URL`, and `PUSHER_*` keys are set.

### 3. Run Web
```bash
cd web
npx prisma generate
npx prisma db push
npm run dev
```

### 4. Run Worker (Optional for Local Dev)
In a separate terminal:
```bash
cd web
npx tsx workers/submission-worker.ts
```
*Note: Requires `REDIS_URL` in environment.*

### 5. Extension Configuration
Create `extension/.env.development`:
```
PLASMO_PUBLIC_API_URL=http://localhost:3000
PLASMO_PUBLIC_PUSHER_KEY=your_key
PLASMO_PUBLIC_PUSHER_CLUSTER=ap2
```

### 6. Run Extension
```bash
cd extension
npm run dev
```
Load the extension in Chrome (Developer Mode -> Load Unpacked -> `extension/build/chrome-mv3-dev`).

## Deployment
Follow the guide in `ps/t2.txt` for Vercel and GitHub Releases.
