export {}

// Store pending submissions
let pendingSubmissions: Record<string, { problemId: string }> = {};

// Handle messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "API_REQUEST") {
    const { endpoint, method, body } = message;
    
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: { "Content-Type": "application/json" }
    };

    if (method !== "GET" && body) {
        fetchOptions.body = JSON.stringify(body);
    }

    fetch(message.url, fetchOptions)
    .then(res => res.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(err => {
        console.error("API Fetch Error:", err);
        sendResponse({ success: false, error: err.toString() });
    });
    
    return true; 
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === "POST" && details.url.includes("/data/submitSource")) {
        if (details.requestBody && details.requestBody.formData) {
            const contestId = details.requestBody.formData.contestId?.[0];
            const problemIndex = details.requestBody.formData.submittedProblemIndex?.[0];
            
            if (contestId && problemIndex) {
                console.log(`[CFRooms] Detected submission for ${contestId}${problemIndex}`);
                pendingSubmissions[details.requestId] = {
                    problemId: `${contestId}${problemIndex}`
                };
            }
        }
    }
  },
  { urls: ["https://codeforces.com/data/submitSource*"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (pendingSubmissions[details.requestId]) {
        const data = pendingSubmissions[details.requestId];
        delete pendingSubmissions[details.requestId];
        
        console.log(`[Background] Submission detected for: ${data.problemId}`);

        try {
            // Get context from storage (Async in MV3)
            const storage = await chrome.storage.local.get(['cfr_handle', 'cfr_room_id', 'cfr_user_id']);
            const { cfr_handle, cfr_room_id, cfr_user_id } = storage;

            if (cfr_handle && cfr_room_id) {
                 const apiUrl = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3000"; 
                 
                 console.log(`[Background] Reporting to: ${apiUrl}/api/check-submission`);
                 
                 await fetch(`${apiUrl}/api/check-submission`, {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                         handle: cfr_handle,
                         problemId: data.problemId,
                         roomId: cfr_room_id,
                         userId: cfr_user_id
                     })
                 });
                 console.log("[Background] Reported submission successfully.");
            } else {
                console.log("[Background] No active room found in storage, ignoring submission.");
            }
        } catch (e) {
             console.error("[Background] Failed to report submission:", e);
        }

        // Notify Content Script (Optional, for UI feedback if still alive)
        if (details.tabId !== -1) {
             chrome.tabs.sendMessage(details.tabId, {
                action: "SUBMISSION_DETECTED",
                problemId: data.problemId
            }).catch(() => {}); // Ignore error if tab is reloading
        }
    }
  },
  { urls: ["https://codeforces.com/data/submitSource*"] }
);
