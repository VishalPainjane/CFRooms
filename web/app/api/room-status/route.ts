import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { processChecks } from '@/lib/submission-processor';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const handle = searchParams.get('handle');

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  try {
    // 1. Get Room ID efficiently
    const roomRef = await prisma.room.findUnique({
        where: { code: code.toUpperCase() },
        select: { id: true }
    });

    if (!roomRef) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 2. Process any pending submissions (Serverless Worker Pattern)
    // This ensures that polling clients drive the submission checking logic
    await processChecks(roomRef.id);

    // 3. Fetch Full Room Data (Post-Processing)
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { 
          players: {
              include: { user: true }
          }
      }
    });

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 }); // Should not happen

    let solvedProblems: string[] = [];
    let messages: any[] = [];
    
    if (handle) {
        const userParticipant = room.players.find(p => p.user.handle === handle);
        
        if (userParticipant) {
            // Fetch solved problems
            const statuses = await prisma.problemStatus.findMany({
                where: {
                    roomId: room.id,
                    userId: userParticipant.userId,
                    isSolved: true
                },
                select: { problemId: true }
            });
            solvedProblems = statuses.map(s => s.problemId);

            // Fetch messages since they joined
            messages = await prisma.message.findMany({
                where: {
                    roomId: room.id,
                    createdAt: { gte: userParticipant.joinedAt }
                },
                orderBy: { createdAt: 'asc' },
                take: 50,
                include: { user: { select: { handle: true } } }
            });
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
      messages: messages.map(m => ({
          id: m.id,
          handle: m.user?.handle || 'System',
          content: m.content,
          createdAt: m.createdAt
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

        // Notify everyone that room is closed
        try {
            await pusherServer.trigger(`room-${room.code}`, 'room-closed', {
                message: "Room closed by host"
            });
        } catch (e) {
            console.error("Failed to trigger room-closed event:", e);
        }

        // Delete all related data
        await prisma.message.deleteMany({ where: { roomId: room.id } });
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