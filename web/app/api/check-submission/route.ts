import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { handle, problemId, roomId, userId, sourceCode } = await request.json();
    console.log(`[API check-submission] Received: ${handle}, Prob: ${problemId}, Room: ${roomId}, User: ${userId}`);

    if (!handle || !problemId || !roomId) {
      console.log(`[API check-submission] Error: Missing fields`);
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Resolve roomId and verify it exists
    let resolvedRoomId = roomId;
    let room = await prisma.room.findUnique({ 
        where: roomId.length <= 8 ? { code: roomId.toUpperCase() } : { id: roomId } 
    });

    if (!room) {
        console.log(`[API check-submission] Error: Room ${roomId} not found`);
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    resolvedRoomId = room.id;

    // Check if match has started
    try {
        const config = JSON.parse(room.config);
        if (!config.startTime || config.startTime === 0) {
            console.log(`[API check-submission] Error: Match not started in room ${room.code}`);
            return NextResponse.json({ error: 'Match not started' }, { status: 400 });
        }
    } catch (e) {
        console.error(`[API check-submission] Config parse error for room ${room.id}`);
    }

    // Add to DB Queue for Worker to poll
    const check = await prisma.submissionCheck.create({
        data: {
            handle,
            problemId,
            roomId: resolvedRoomId,
            userId: userId || ""
        }
    });

    // Notify chat about the submission
    try {
        const messageContent = `Submitted problem ${problemId}...`;
        
        const systemMsg = await prisma.message.create({
            data: {
                roomId: resolvedRoomId,
                userId: userId || "", // Ensure userId is provided, fallback handling might be needed if userId is empty
                content: messageContent
            }
        });

        await pusherServer.trigger(`room-${room.code}`, 'new-message', {
            id: systemMsg.id,
            handle: handle,
            content: systemMsg.content,
            createdAt: systemMsg.createdAt
        });
    } catch (e) {
        console.warn("[API check-submission] Failed to post system message:", e);
    }

    console.log(`[API check-submission] Created check: ${check.id}`);

    return NextResponse.json({ success: true, message: 'Queued for checking' });

  } catch (error) {
    console.error('Error queuing submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}