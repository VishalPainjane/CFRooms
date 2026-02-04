import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { handle, problemId, roomId, userId } = await request.json();
    console.log(`[API check-submission] Received: ${handle}, Prob: ${problemId}, Room: ${roomId}, User: ${userId}`);

    if (!handle || !problemId || !roomId) {
      console.log(`[API check-submission] Error: Missing fields`);
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Resolve roomId if it's a code
    let resolvedRoomId = roomId;
    if (roomId.length <= 8) { // Likely a room code
        const room = await prisma.room.findUnique({ where: { code: roomId.toUpperCase() } });
        if (room) {
            resolvedRoomId = room.id;
            console.log(`[API check-submission] Resolved code ${roomId} to UUID ${resolvedRoomId}`);
        }
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
    console.log(`[API check-submission] Created check: ${check.id}`);

    return NextResponse.json({ success: true, message: 'Queued for checking' });

  } catch (error) {
    console.error('Error queuing submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}