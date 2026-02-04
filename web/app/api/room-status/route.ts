import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const handle = searchParams.get('handle');

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { 
          players: {
              include: { user: true }
          }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    let solvedProblems: string[] = [];
    if (handle) {
        const user = room.players.find(p => p.user.handle === handle);
        if (user) {
            const statuses = await prisma.problemStatus.findMany({
                where: {
                    roomId: room.id,
                    userId: user.userId,
                    isSolved: true
                },
                select: { problemId: true }
            });
            solvedProblems = statuses.map(s => s.problemId);
        }
    }

    // Parse config safely
    let config = {};
    try {
        config = JSON.parse(room.config);
    } catch (e) {}

    return NextResponse.json({
      id: room.id,
      status: room.status,
      hostId: room.hostId,
      players: room.players.map(p => ({
          handle: p.user.handle,
          userId: p.userId,
          isHost: p.userId === room.hostId,
          score: p.score
      })),
      config,
      solvedProblems
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const handle = searchParams.get('handle');

        if (!code || !handle) {
            return NextResponse.json({ error: 'Code and handle required' }, { status: 400 });
        }

        const room = await prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            include: { host: true }
        });

        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

        // Verify Host
        if (room.host.handle !== handle) {
            return NextResponse.json({ error: 'Only host can close room' }, { status: 403 });
        }

        // Delete all related data
        await prisma.problemStatus.deleteMany({ where: { roomId: room.id } });
        await prisma.matchParticipant.deleteMany({ where: { roomId: room.id } });
        await prisma.submissionCheck.deleteMany({ where: { roomId: room.id } });
        await prisma.room.delete({ where: { id: room.id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error closing room:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}