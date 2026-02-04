import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { handle } = await request.json();

    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Find or Create User
    const user = await prisma.user.upsert({
      where: { handle },
      update: {},
      create: { handle },
    });

    // Generate Unique Room Code
    let code = generateRoomCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        const existing = await prisma.room.findUnique({ where: { code } });
        if (!existing) {
            isUnique = true;
        } else {
            code = generateRoomCode();
            attempts++;
        }
    }

    if (!isUnique) {
        return NextResponse.json({ error: 'Failed to generate unique room code' }, { status: 500 });
    }

    // Create Room
    const defaultConfig = {
      mode: 'LOCKOUT',
      duration: 2700, // 45 mins
      minRating: 800,
      maxRating: 3500,
      problemCount: 5,
      tags: [],
      excludeTags: [],
      preventTried: false,
      includeGym: false,
      allowUnrated: false,
      blindMode: false,
      penalty: 10
    };

    const room = await prisma.room.create({
      data: {
        code,
        hostId: user.id,
        status: "LOBBY",
        config: JSON.stringify(defaultConfig),
      },
    });

    // Add Host to Room Participants
    await prisma.matchParticipant.create({
        data: {
            roomId: room.id,
            userId: user.id,
            isReady: true, 
        }
    });

    return NextResponse.json({ 
        roomCode: code, 
        roomId: room.id,
        userId: user.id 
    });

  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}