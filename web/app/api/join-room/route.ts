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
    let participant = await prisma.matchParticipant.findUnique({
        where: {
            roomId_userId: {
                roomId: room.id,
                userId: user.id
            }
        }
    });

    let isFreshJoin = false;
    let joinedAt = participant?.joinedAt || new Date();
    
    // Array to hold background promises (Pusher) so we can await them in parallel
    const backgroundTasks: Promise<any>[] = [];

    try {
        // 1. Ensure Participant Exists
        if (!participant) {
            participant = await prisma.matchParticipant.create({
                data: {
                    roomId: room.id,
                    userId: user.id,
                    isReady: false
                }
            });
            joinedAt = participant.joinedAt;
            isFreshJoin = true;
            
            // Notify player joined (Non-blocking)
            backgroundTasks.push(
                pusherServer.trigger(`room-${room.code}`, 'player-joined', {
                    handle: user.handle,
                    userId: user.id
                }).catch(e => console.error("Pusher error (player-joined):", e))
            );
        }

        // 2. Ensure Join Message
        let shouldSendMessage = false;

        if (isFreshJoin) {
            shouldSendMessage = true;
        } else {
            const sessionMessage = await prisma.message.findFirst({
                where: {
                    roomId: room.id,
                    userId: user.id,
                    content: { contains: 'joined the room' },
                    createdAt: { gte: joinedAt } 
                }
            });
            if (!sessionMessage) {
                shouldSendMessage = true;
            }
        }

        if (shouldSendMessage) {
            const systemMsg = await prisma.message.create({
                data: {
                    roomId: room.id,
                    userId: user.id,
                    content: `joined the room`
                }
            });
            
            // Notify new message (Non-blocking)
            backgroundTasks.push(
                pusherServer.trigger(`room-${room.code}`, 'new-message', {
                    id: systemMsg.id,
                    handle: user.handle,
                    content: systemMsg.content,
                    createdAt: systemMsg.createdAt
                }).catch(e => console.error("Pusher error (new-message):", e))
            );
        }

    } catch (error) {
        console.error("Join process partial failure:", error);
    }

    // Fetch messages ONLY from after they joined
    // This DB call runs concurrently with the Pusher calls started above
    let messages = [];
    try {
        // Add a small buffer (2s) to ensure we capture the "joined" message created at the same instant
        const fetchFrom = new Date(joinedAt.getTime() - 2000);
        
        messages = await prisma.message.findMany({
            where: { 
                roomId: room.id,
                createdAt: { gte: fetchFrom } // Only history since join (with buffer)
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

    // Ensure all background tasks complete before returning response
    await Promise.all(backgroundTasks);

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