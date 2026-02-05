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
      where: { code: code.toUpperCase() },
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

    // Check if join message exists (to fix missing message issue)
    const existingJoinMessage = await prisma.message.findFirst({
        where: {
            roomId: room.id,
            userId: user.id,
            content: { contains: 'joined the room' }
        }
    });

    let joinedAt = existingParticipant?.joinedAt || new Date();

    // If not in room OR message missing (partial state), try to fix
    if (!existingParticipant || !existingJoinMessage) {
        try {
            // 1. Ensure Participant
            if (!existingParticipant) {
                const p = await prisma.matchParticipant.create({
                    data: {
                        roomId: room.id,
                        userId: user.id,
                        isReady: false
                    }
                });
                joinedAt = p.joinedAt;
                
                // Notify player joined (only if they were actually new)
                await pusherServer.trigger(`room-${room.code}`, 'player-joined', {
                    handle: user.handle,
                    userId: user.id
                });
            }

            // 2. Ensure Join Message
            if (!existingJoinMessage) {
                            const systemMsg = await prisma.message.create({
                                data: {
                                    roomId: room.id,
                                    userId: user.id,
                                    content: `joined the room`
                                }
                            });
                await pusherServer.trigger(`room-${room.code}`, 'new-message', {
                    id: systemMsg.id,
                    handle: user.handle,
                    content: systemMsg.content,
                    createdAt: systemMsg.createdAt
                });
            }
        } catch (error) {
            console.error("Join process partial failure:", error);
            // Ignore P2002 or notification failures, allow user to proceed
        }
    }

    // Fetch messages ONLY from after they joined
    let messages = [];
    try {
        messages = await prisma.message.findMany({
            where: { 
                roomId: room.id,
                createdAt: { gte: joinedAt } // Only history since join
            },
            include: { user: { select: { handle: true } } },
            orderBy: { createdAt: 'asc' },
            take: 100
        });
    } catch (e) {
        console.error("Error fetching messages:", e);
    }

    // Parse Config (Safe)
    let roomConfig = {};
    try {
        roomConfig = JSON.parse(room.config);
    } catch (e) {
        console.error("Error parsing config:", e);
    }

    return NextResponse.json({ 
        success: true,
        roomId: room.id,
        userId: user.id,
        roomConfig: roomConfig,
        messages: messages.map(m => ({
            id: m.id,
            handle: m.user?.handle || 'System',
            content: m.content,
            createdAt: m.createdAt
        }))
    });

  } catch (error) {
    console.error('Error joining room (Critical):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}