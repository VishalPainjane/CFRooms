import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateProblemAnalysis } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { roomCode, handle, editorials } = await request.json();

    if (!roomCode || !handle || !editorials) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { host: true }
    });

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Verify Host
    if (room.host.handle !== handle) {
        return NextResponse.json({ error: "Only host can trigger preparation" }, { status: 403 });
    }

    // Parse Config
    let config: any = {};
    try {
        config = JSON.parse(room.config);
    } catch (e) {}

    // Check if AI enabled
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || "AIzaSyCaL7ffUzs7PAeAC6JOVkubFeucvpPgJAs";

    if (config.enableAiHints && apiKey && config.problems) {
        console.log(`[Prepare-Analysis] Starting background generation for Room ${roomCode}...`);
        
        // Use a self-executing async function for background processing
        (async () => {
            const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

            for (const prob of config.problems) {
                try {
                    // 1. Check if already exists in THIS room
                    const existing = await prisma.problemAnalysis.findUnique({
                        where: { roomId_problemId: { roomId: room.id, problemId: prob.id } }
                    });

                    if (existing) continue;

                    // 2. Check Global Cache (Any room)
                    const globalCache = await prisma.problemAnalysis.findFirst({
                        where: { problemId: prob.id }
                    });

                    if (globalCache) {
                        console.log(`[Cache Hit] Reusing analysis for ${prob.id}`);
                        await prisma.problemAnalysis.create({
                            data: {
                                roomId: room.id,
                                problemId: prob.id,
                                hint: globalCache.hint,
                                description: globalCache.description,
                                tags: globalCache.tags
                            }
                        });
                        continue;
                    }

                    // 3. Generate Fresh
                    const editorialContent = editorials[prob.id];
                    
                    if (editorialContent) {
                        console.log(`[AI] Generating for ${prob.id}...`);
                        const result = await generateProblemAnalysis(apiKey, prob.id, prob.name, editorialContent);
                        
                        let stopProcessing = false;
                        if (result) {
                            // Handle Error Response
                            if (result.error) {
                                if (result.error === "Quota Exceeded") stopProcessing = true;

                                await prisma.problemAnalysis.create({
                                    data: {
                                        roomId: room.id,
                                        problemId: prob.id,
                                        hint: result.error === "Quota Exceeded" ? "API Quota Exceeded" : "Analysis Failed",
                                        description: result.error === "Quota Exceeded" 
                                            ? "The AI provider has reached its usage limit. Please try again later or use a different API key." 
                                            : (result.error || "An error occurred while generating the analysis."),
                                        tags: "Error"
                                    }
                                });
                            } else {
                                // Success
                                await prisma.problemAnalysis.create({
                                    data: {
                                        roomId: room.id,
                                        problemId: prob.id,
                                        hint: result.hint || "No hint available",
                                        description: result.description || "No description available",
                                        tags: result.tags || "N/A"
                                    }
                                });
                            }
                        }
                        
                        if (stopProcessing) {
                            console.log(`[AI] Quota exceeded. Stopping generation for Room ${roomCode}`);
                            break; 
                        }

                        // Wait 3 seconds between requests to respect quota
                        await sleep(3000);
                    }
                } catch (err) {
                    console.error(`Error generating ${prob.id}:`, err);
                }
            }
            console.log(`[Prepare-Analysis] Completed for Room ${roomCode}`);
        })();

        return NextResponse.json({ success: true, message: "Preparation started" });

    } else {
        return NextResponse.json({ skipped: true, reason: "AI not enabled or key missing" });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
