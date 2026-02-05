import "dotenv/config";
import { prisma } from '../lib/prisma';
import { fetchUserStatus } from '../lib/cf-api';
import { pusherServer } from '../lib/pusher';

async function processQueue() {
  try {
      const checks = await prisma.submissionCheck.findMany({
        where: { status: 'PENDING' },
        take: 5
      });

      if (checks.length > 0) {
        console.log(`[Worker] Found ${checks.length} PENDING items. Processing...`);
      }

      for (const check of checks) {
        try {
          console.log(`[Worker] Processing check ${check.id} for ${check.handle} (Room: ${check.roomId})`);

          // 1. Fetch Room & Config FIRST
          const room = await prisma.room.findUnique({
              where: { id: check.roomId }
          });

          if (!room) {
              console.log(`[Worker] Room ${check.roomId} not found. Marking check ${check.id} as PROCESSED.`);
              await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
              continue;
          }

          let startTime = 0;
          let duration = 2700;
          let baseScore = 500;
          
          try {
              const config = JSON.parse(room.config);
              startTime = config.startTime || 0;
              duration = config.duration || 2700;
              const probConfig = config.problems?.find((p:any) => p.id === check.problemId);
              if (probConfig && probConfig.score) baseScore = probConfig.score;
          } catch (e) {
              console.error(`[Worker] Failed to parse config for room ${room.id}`);
          }

          if (startTime === 0) {
              console.log(`[Worker] Match not started for room ${room.code}. Marking check as PROCESSED.`);
              await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
              continue; 
          }

          // 2. Increment attempts and check limit
          const updatedCheck = await prisma.submissionCheck.update({
              where: { id: check.id },
              data: { attempts: { increment: 1 } }
          });

          if (updatedCheck.attempts > 60) {
              console.log(`[Worker] Max attempts reached for check ${check.id}. Marking as PROCESSED.`);
              await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
              continue;
          }

          // 3. NOW fetch CF Status
          const submissions = await fetchUserStatus(check.handle);
          
          const match = submissions.find(s => {
              const sId = `${s.problem.contestId}${s.problem.index}`; 
              return sId.toLowerCase() === check.problemId.toLowerCase();
          });

          if (!match) {
            console.log(`[Worker] Submission ${check.problemId} not found in last 50 for ${check.handle}.`);
            continue; // Keep PENDING until max attempts
          }

          const submissionTimeMs = match.creationTimeSeconds * 1000;
          const endTime = startTime + (duration * 1000);

          if (submissionTimeMs < startTime || submissionTimeMs > endTime) {
               console.log(`[Worker] Submission time invalid (Time: ${submissionTimeMs}, Start: ${startTime}, End: ${endTime}).`);
               await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
               continue;
          }
          
          // 4. Process Verdict
          if (match.verdict === 'TESTING') {
              console.log(`[Worker] ${check.handle}/${check.problemId} is still TESTING...`);
              continue; // Keep PENDING
          }

          // Get/Create Participant & Status
          const participant = await prisma.matchParticipant.findFirst({
              where: { roomId: room.id, user: { handle: check.handle } }
          });
          
          if (!participant) {
              console.log(`[Worker] Participant ${check.handle} not found in room ${room.id}.`);
              await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
              continue;
          }
          
          let status = await prisma.problemStatus.findUnique({
              where: { roomId_userId_problemId: { roomId: room.id, userId: participant.userId, problemId: check.problemId } }
          });

          if (!status) {
              status = await prisma.problemStatus.create({
                  data: {
                      roomId: room.id,
                      userId: participant.userId,
                      problemId: check.problemId,
                      participantId: participant.id
                  }
              });
          }

          if (status.isSolved) {
              await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
              continue;
          }

          if (match.verdict === 'OK') {
              const minutesElapsed = Math.floor((submissionTimeMs - startTime) / 60000);
              const decay = 2; 
              const penalty = status.attempts * 50;
              
              let finalScore = baseScore - (minutesElapsed * decay) - penalty;
              const minScore = baseScore * 0.3;
              if (finalScore < minScore) finalScore = minScore;
              finalScore = Math.floor(finalScore);

              await prisma.problemStatus.update({
                  where: { id: status.id },
                  data: { isSolved: true, solvedAt: new Date(submissionTimeMs), points: finalScore }
              });

              const updatedParticipant = await prisma.matchParticipant.update({
                  where: { id: participant.id },
                  data: { score: { increment: finalScore } }
              });

              console.log(`[Worker] ${check.handle} SOLVED ${check.problemId}! Score: ${finalScore}`);

              try {
                  await pusherServer.trigger(`room-${room.code}`, 'room-updated', {
                      handle: check.handle,
                      problemId: check.problemId,
                      verdict: match.verdict,
                      score: updatedParticipant.score
                  });
              } catch (e) { console.error("Pusher error:", e); }

          } else {
              await prisma.problemStatus.update({
                  where: { id: status.id },
                  data: { attempts: { increment: 1 } }
              });
              console.log(`[Worker] ${check.handle} FAILED ${check.problemId} (Verdict: ${match.verdict})`);

              try {
                  await pusherServer.trigger(`room-${room.code}`, 'room-updated', {
                      handle: check.handle,
                      problemId: check.problemId,
                      verdict: match.verdict
                  });
              } catch (e) { console.error("Pusher error:", e); }
          }

          // Add a system message to chat if solved
          if (match.verdict === 'OK') {
              try {
                  const systemMsg = await prisma.message.create({
                      data: {
                          roomId: room.id,
                          userId: participant.userId,
                          content: `Solved problem ${check.problemId}!`
                      }
                  });
                  await pusherServer.trigger(`room-${room.code}`, 'new-message', {
                      id: systemMsg.id,
                      handle: check.handle,
                      content: systemMsg.content,
                      createdAt: systemMsg.createdAt
                  });
              } catch (e) {
                  console.error(`[Worker] Failed to post system message for ${room.code}:`, e);
              }
          }
          
          await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });

        } catch (err) {
          console.error(`Error processing check ${check.id}:`, err);
        }
      }
  } catch (err) {
      console.error("Worker Loop Error:", err);
  }
}

console.log("Worker started (DB Polling Mode)...");
setInterval(processQueue, 3000);