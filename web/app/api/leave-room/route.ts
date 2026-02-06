import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { roomCode, handle } = await request.json();

    if (!roomCode || !handle) {
      return NextResponse.json({ error: 'Room code and handle are required' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { handle }
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove from participants
    try {
        const participant = await prisma.matchParticipant.findUnique({
            where: {
                roomId_userId: {
                    roomId: room.id,
                    userId: user.id
                }
            }
        });

        if (participant) {
            
            // Manually delete dependencies to ensure success even if Cascade Schema update didn't apply to runtime
            await prisma.problemStatus.deleteMany({
                where: { participantId: participant.id }
            });

            await prisma.matchParticipant.delete({
                where: { id: participant.id }
            });
        }
    } catch (e) {
        console.error("Error removing participant:", e);
        return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
    }

    // Broadcast leave message
    try {
        const systemMsg = await prisma.message.create({
            data: {
                roomId: room.id,
                userId: user.id,
                content: `left the room`
            }
        });

        // Parallelize Pusher notifications
        await Promise.all([
            pusherServer.trigger(`room-${room.code}`, 'new-message', {
                id: systemMsg.id,
                handle: user.handle,
                content: systemMsg.content,
                createdAt: systemMsg.createdAt
            }),
            pusherServer.trigger(`room-${room.code}`, 'player-left', {
                handle: user.handle,
                userId: user.id
            })
        ]);

    } catch (e) {
        console.error("Error broadcasting leave:", e);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}