import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { fetchProblems } from '@/lib/cf-api';

export async function POST(request: Request) {
  try {
    const { roomCode, handle, config } = await request.json();

    if (!roomCode || !handle) {
      return NextResponse.json({ error: 'Room code and handle are required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { host: true }
    });

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Verify Host
    if (room.host.handle !== handle) {
        return NextResponse.json({ error: "Only host can start match" }, { status: 403 });
    }

    // Configuration Defaults
    const duration = config?.duration || 2700; // 45 mins
    const tags = config?.tags || [];
    const minRating = config?.minRating || 800;
    const maxRating = config?.maxRating || 3500;
    const problemCount = config?.problemCount || 5;
    const sortByRating = config?.sortByRating ?? true;
    const showRatings = config?.showRatings ?? true;

    // Fetch Problems from CF
    let problems = await fetchProblems(tags, minRating, maxRating, problemCount);

    // Fallback if API fails or not enough problems
    if (problems.length < problemCount) {
        console.warn("Not enough problems found via API, using fallback.");
        problems = [
            { id: "4A", name: "Watermelon", url: "https://codeforces.com/problemset/problem/4/A", rating: 800, score: 800 },
            { id: "71A", name: "Way Too Long Words", url: "https://codeforces.com/problemset/problem/71/A", rating: 800, score: 800 },
            { id: "231A", name: "Team", url: "https://codeforces.com/problemset/problem/231/A", rating: 800, score: 800 },
            { id: "158A", name: "Next Round", url: "https://codeforces.com/problemset/problem/158/A", rating: 800, score: 800 },
            { id: "50A", name: "Domino piling", url: "https://codeforces.com/problemset/problem/50/A", rating: 800, score: 800 }
        ].slice(0, problemCount);
    }

    // Sort by rating if requested
    if (sortByRating) {
        problems.sort((a: any, b: any) => (a.rating || 0) - (b.rating || 0));
    }

    // Update Room
    const startTime = Date.now();
    await prisma.room.update({
        where: { id: room.id },
        data: {
            status: "ONGOING",
            config: JSON.stringify({
                startTime,
                duration,
                problems,
                sortByRating,
                showRatings
            })
        }
    });

    // Notify via Pusher
    try {
        await pusherServer.trigger(`room-${roomCode.toUpperCase()}`, 'match-started', {
            startTime,
            duration,
            problems,
            sortByRating,
            showRatings
        });
    } catch (e) {
        console.error("Pusher error:", e);
    }

    return NextResponse.json({ success: true, problems, startTime });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}