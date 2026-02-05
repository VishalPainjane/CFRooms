import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { roomCode, handle } = await request.json();

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { host: true }
    });

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Verify Host
    if (room.host.handle !== handle) {
        return NextResponse.json({ error: "Only host can start match" }, { status: 403 });
    }

    // Problems (Ideally these should be fetched from CF, but using these for now as per project context)
    const problems = [
            { id: "4A", name: "Watermelon", url: "https://codeforces.com/problemset/problem/4/A", score: 500 },
            { id: "71A", name: "Way Too Long Words", url: "https://codeforces.com/problemset/problem/71/A", score: 800 },
            { id: "231A", name: "Team", url: "https://codeforces.com/problemset/problem/231/A", score: 1000 },
            { id: "158A", name: "Next Round", url: "https://codeforces.com/problemset/problem/158/A", score: 1200 },
            { id: "50A", name: "Domino piling", url: "https://codeforces.com/problemset/problem/50/A", score: 1500 }
    ];

    // Update Room
    const startTime = Date.now();
    await prisma.room.update({
        where: { id: room.id },
        data: {
            status: "ONGOING",
            config: JSON.stringify({
                startTime,
                duration: 2700,
                problems
            })
        }
    });

    // Notify via Pusher
    try {
        await pusherServer.trigger(`room-${roomCode.toUpperCase()}`, 'match-started', {
            startTime,
            problems
        });
    } catch (e) {
        console.error("Pusher error:", e);
    }

    return NextResponse.json({ success: true, problems, startTime });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}