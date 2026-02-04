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
        if (room.hostId !== user.id) {
             return NextResponse.json({ success: false, error: "Only host can start match" });
        }

        // Select Problems (Mocking Lockout Set)
        const problems = [
             { id: "4A", name: "Watermelon", url: "https://codeforces.com/problemset/problem/4/A" },
             { id: "71A", name: "Way Too Long Words", url: "https://codeforces.com/problemset/problem/71/A" },
             { id: "231A", name: "Team", url: "https://codeforces.com/problemset/problem/231/A" }
        ];

        // Update Config
        const currentConfig = room.config as any || {};
        const newConfig = {
            ...currentConfig,
            startTime: Date.now(),
            duration: currentConfig.duration || 2700, // Default 45 mins
            problems
        };

        // Update Room
        await prisma.room.update({
            where: { id: room.id },
            data: {
                status: "ONGOING",
                config: newConfig
            }
        });

    return NextResponse.json({ success: true, problems });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}