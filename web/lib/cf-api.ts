export interface CFSubmission {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
    type: string;
    rating?: number;
    tags: string[];
  };
  author: {
    contestId: number;
    members: { handle: string }[];
    participantType: string;
    ghost: boolean;
    startTimeSeconds: number;
  };
  programmingLanguage: string;
  verdict: string; // "OK", "WRONG_ANSWER", etc.
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

export const CF_API_BASE = 'https://codeforces.com/api';

// Simple in-memory cache
let problemsCache: any[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function fetchUserStatus(handle: string, from = 1, count = 50): Promise<CFSubmission[]> {
  try {
    const response = await fetch(`${CF_API_BASE}/user.status?handle=${handle}&from=${from}&count=${count}`);
    const data = await response.json();
    if (data.status === 'OK') {
      return data.result;
    }
    throw new Error(data.comment || 'Failed to fetch user status');
  } catch (error) {
    console.error('CF API Error:', error);
    return [];
  }
}

export async function fetchUserInfo(handle: string) {
    try {
        const response = await fetch(`${CF_API_BASE}/user.info?handles=${handle}`);
        const data = await response.json();
        if (data.status === 'OK') {
            return data.result[0];
        }
        return null;
    } catch (error) {
        console.error("CF API Error:", error);
        return null;
    }
}

export async function fetchProblems(tags: string[], minRating: number, maxRating: number, count: number) {
    try {
        const now = Date.now();
        let allProblems: any[] = [];

        if (problemsCache && (now - lastFetchTime < CACHE_DURATION)) {
            allProblems = problemsCache;
        } else {
            console.log("Fetching fresh problems from CF API...");
            // Fetching all problems once to cache them
            const response = await fetch(`${CF_API_BASE}/problemset.problems`);
            const data = await response.json();

            if (data.status === 'OK') {
                allProblems = data.result.problems;
                problemsCache = allProblems;
                lastFetchTime = now;
            } else {
                return [];
            }
        }

        // Filter by rating and contest validity once
        const validProblems = allProblems.filter((p: any) => {
            if (!p.rating || !p.contestId) return false;
            if (p.rating < minRating || p.rating > maxRating) return false;
            return true;
        });

        if (validProblems.length === 0) return [];

        // --- BALANCED SELECTION ALGORITHM ---
        const selected: any[] = [];
        const usedIds = new Set<string>();
        
        // Non-linear difficulty curve (S-curve / Plateau)
        // We use a cubic mapping to make the middle problems closer in difficulty
        for (let i = 0; i < count; i++) {
            // Normalized index from 0 to 1
            const x = count > 1 ? i / (count - 1) : 0.5;
            
            // Cubic S-curve: f(x) = 4(x-0.5)^3 + 0.5
            // This has a slope of 0 at x=0.5. 
            // We blend it with linear (x) to get a "slight increase" instead of a flat plateau.
            const k = 0.6; // Blending factor (0.6 means 60% S-curve, 40% linear)
            const curveX = (1 - k) * x + k * (4 * Math.pow(x - 0.5, 3) + 0.5);
            
            const targetRating = Math.round(minRating + (curveX * (maxRating - minRating)));
            const bucketTolerance = 100; // Look for problems within +/- 100 of target
            
            // Find candidates in this rating range
            let candidates = validProblems.filter(p => 
                Math.abs(p.rating - targetRating) <= bucketTolerance && 
                !usedIds.has(`${p.contestId}${p.index}`)
            );

            if (candidates.length === 0) {
                // If no problems in bucket, expand search to any rating but prioritize closest
                candidates = validProblems.filter(p => !usedIds.has(`${p.contestId}${p.index}`));
                candidates.sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating));
            }

            // SCORING CANDIDATES based on Tag Match
            // We want problems that match the most requested tags
            const scoredCandidates = candidates.map(p => {
                let matchCount = 0;
                if (tags.length > 0) {
                    matchCount = tags.filter(t => p.tags.includes(t)).length;
                }
                return { problem: p, score: matchCount };
            });

            // Sort by tag match (primary) and then randomize among best matches
            scoredCandidates.sort((a, b) => b.score - a.score);
            
            // Take ALL problems with the highest match score and pick one randomly
            // This drastically increases variety compared to limiting to the top 10 (which are usually just the newest ones)
            const maxScore = scoredCandidates[0]?.score || 0;
            const bestMatches = scoredCandidates.filter(c => c.score === maxScore);
            const picked = bestMatches[Math.floor(Math.random() * bestMatches.length)].problem;

            selected.push({
                id: `${picked.contestId}${picked.index}`,
                name: picked.name,
                url: `https://codeforces.com/problemset/problem/${picked.contestId}/${picked.index}`,
                rating: picked.rating,
                tags: picked.tags,
                score: picked.rating
            });
            usedIds.add(`${picked.contestId}${picked.index}`);
        }

        // Final sort to ensure strictly increasing difficulty in the UI
        selected.sort((a, b) => a.rating - b.rating);

        return selected;
    } catch (error) {
        console.error("CF API Error:", error);
        return [];
    }
}