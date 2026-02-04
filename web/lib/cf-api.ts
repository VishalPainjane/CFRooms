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