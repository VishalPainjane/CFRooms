import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
    try {
        const { roomCode, handle, content } = await request.json();

        if (!roomCode || !handle || !content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const room = await prisma.room.findUnique({
            where: { code: roomCode.toUpperCase() },
            include: { players: { include: { user: true } } }
        });

        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

        const player = room.players.find(p => p.user.handle === handle);
        if (!player) return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });

        const message = await prisma.message.create({
            data: {
                roomId: room.id,
                userId: player.userId,
                content: content
            },
            include: { user: { select: { handle: true } } }
        });

        // Notify via Pusher
        try {
            await pusherServer.trigger(`room-${room.code}`, 'new-message', {
                id: message.id,
                handle: handle,
                content: content,
                createdAt: message.createdAt
            });
        } catch (e) {
            console.warn("Pusher failed in message API:", e);
        }

        return NextResponse.json({ success: true, message });

    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
