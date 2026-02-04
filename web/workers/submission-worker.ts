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
          console.log(`[Worker] Checking ${check.handle} for ${check.problemId} in Room ${check.roomId}...`);
          const submissions = await fetchUserStatus(check.handle);
          console.log(`[Worker] Fetched ${submissions.length} submissions for ${check.handle}`);
          
          // Match problem ID
          const match = submissions.find(s => {
              const sId = `${s.problem.contestId}${s.problem.index}`; 
              return sId === check.problemId || sId.toLowerCase() === check.problemId.toLowerCase();
          });

          if (!match) {
            console.log(`[Worker] Submission ${check.problemId} not found in last 10. (Latest: ${submissions[0]?.problem.contestId}${submissions[0]?.problem.index})`);
            continue; 
          }

          // Fetch Room & Config
          let room = await prisma.room.findUnique({
              where: { id: check.roomId }
          });

          if (!room) {
              // Fallback: Try looking up by code
              room = await prisma.room.findUnique({
                  where: { code: check.roomId }
              });
              
              if (!room) {
                  console.log(`[Worker] Room ${check.roomId} not found (checked ID and Code) for check ${check.id}.`);
                  await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
                  continue;
              }
              // Optional: Update the check to use the correct ID for future reference?
              // Not strictly necessary as we have the room object now.
          }
          
          let startTime = 0;
          let duration = 2700; // Default 45m
          let baseScore = 500; // Default
          
          try {
              const config = JSON.parse(room.config);
              startTime = config.startTime || 0;
              duration = config.duration || 2700;
              // Look up base score from config problems
              const probConfig = config.problems?.find((p:any) => p.id === check.problemId);
              if (probConfig && probConfig.score) baseScore = probConfig.score;
              else if (check.problemId === '4A') baseScore = 500;
              else if (check.problemId === '71A') baseScore = 800;
              else if (check.problemId === '231A') baseScore = 1000;
          } catch (e) {
              console.error(`[Worker] Failed to parse config for room ${room.id}:`, e);
          }
          
          const submissionTimeMs = match.creationTimeSeconds * 1000;
          const endTime = startTime + (duration * 1000);

          console.log(`[Worker Debug] Room: ${room.code} (${room.id}), Start: ${startTime}, End: ${endTime}, Sub: ${submissionTimeMs}`);
          console.log(`[Worker Debug] Duration: ${duration}, Current Time: ${Date.now()}`);

          if (startTime === 0) {
               console.log(`[Worker] Match not started yet for room ${room.code}.`);
               continue; 
          }

          if (submissionTimeMs < startTime) {
               console.log(`[Worker] Submission too old.`);
               await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
               continue;
          }

          if (submissionTimeMs > endTime) {
               console.log(`[Worker] Submission too late. Match ended.`);
               await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
               continue;
          }
          
          // Get/Create ProblemStatus
          const participant = await prisma.matchParticipant.findFirst({
              where: { roomId: room.id, userId: check.userId }
          });
          
          if (!participant) continue;
          
          let status = await prisma.problemStatus.findUnique({
              where: { roomId_userId_problemId: { roomId: room.id, userId: check.userId, problemId: check.problemId } }
          });

          if (!status) {
              status = await prisma.problemStatus.create({
                  data: {
                      roomId: room.id,
                      userId: check.userId,
                      problemId: check.problemId,
                      participantId: participant.id
                  }
              });
          }

          if (status.isSolved) {
              // Already solved, ignore
              await prisma.submissionCheck.update({ where: { id: check.id }, data: { status: 'PROCESSED' } });
              continue;
          }

          console.log(`[Worker] Verdict for ${check.handle}/${check.problemId}: ${match.verdict}`);

          if (match.verdict === 'TESTING') {
              console.log(`[Worker] Submission is still TESTING. Retrying in next tick...`);
              continue;
          }

          if (match.verdict === 'OK') {
              // Calculate Score
              const minutesElapsed = Math.floor((Date.now() - startTime) / 60000);
              const decay = 2; // pts per minute
              const penalty = status.attempts * 50;
              
              let finalScore = baseScore - (minutesElapsed * decay) - penalty;
              const minScore = baseScore * 0.3;
              if (finalScore < minScore) finalScore = minScore;
              finalScore = Math.floor(finalScore);

              // Update Status
              await prisma.problemStatus.update({
                  where: { id: status.id },
                  data: {
                      isSolved: true,
                      solvedAt: new Date(),
                      points: finalScore
                  }
              });

              // Update Total Score
              await prisma.matchParticipant.update({
                  where: { id: participant.id },
                  data: { score: { increment: finalScore } }
              });

              console.log(`[Worker] SOLVED! Score: ${finalScore} (Time: ${minutesElapsed}m, Pen: ${penalty})`);

          } else {
              // Wrong Answer / Error -> Increment Attempts
              await prisma.problemStatus.update({
                  where: { id: status.id },
                  data: {
                      attempts: { increment: 1 }
                  }
              });
              console.log(`[Worker] Failed attempt. Count: ${status.attempts + 1}`);
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