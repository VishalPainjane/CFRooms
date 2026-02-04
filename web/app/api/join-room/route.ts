import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { code, handle } = await request.json();

    if (!code || !handle) {
      return NextResponse.json({ error: 'Room code and handle are required' }, { status: 400 });
    }

    // Find Room
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() }, // Case insensitive code
      include: { players: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Find or Create User
    const user = await prisma.user.upsert({
      where: { handle },
      update: {},
      create: { handle },
    });

    // Check if user is already in the room
    const existingParticipant = await prisma.matchParticipant.findUnique({
        where: {
            roomId_userId: {
                roomId: room.id,
                userId: user.id
            }
        }
    });

    if (!existingParticipant) {
        // Add User to Room
        await prisma.matchParticipant.create({
            data: {
                roomId: room.id,
                userId: user.id,
                isReady: false
            }
        });

        // Notify other players
        await pusherServer.trigger(`room-${room.code}`, 'player-joined', {
            handle: user.handle,
            userId: user.id
        });
    }

    return NextResponse.json({ 
        success: true,
        roomId: room.id,
        userId: user.id,
        roomConfig: JSON.parse(room.config)
    });

  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}