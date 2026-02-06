import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { processChecks } from '@/lib/submission-processor';

export async function POST(request: Request) {
  try {
    const { handle, problemId, roomId, userId, sourceCode } = await request.json();

    if (!handle || !problemId || !roomId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Resolve roomId and verify it exists
    let resolvedRoomId = roomId;
    const room = await prisma.room.findUnique({ 
        where: roomId.length <= 8 ? { code: roomId.toUpperCase() } : { id: roomId } 
    });

    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    resolvedRoomId = room.id;

    // Check if match has started
    try {
        const config = JSON.parse(room.config);
        if (!config.startTime || config.startTime === 0) {
            return NextResponse.json({ error: 'Match not started' }, { status: 400 });
        }
    } catch (e) {
        // Ignore config error
    }

    // Add to DB Queue
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
                userId: userId || "", 
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
        console.warn("Failed to post system message:", e);
    }

    // Trigger immediate processing (Serverless Worker Pattern)
    // We await this to ensure it runs before the lambda potentially freezes, 
    // and to give immediate feedback if possible.
    await processChecks(resolvedRoomId);

    return NextResponse.json({ success: true, message: 'Queued for checking' });

  } catch (error) {
    console.error('Error queuing submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}