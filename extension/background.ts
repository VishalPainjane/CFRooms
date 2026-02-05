export {}

// Track reported requests to avoid duplicates
const reportedRequests = new Set<string>();

// Handle messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "API_REQUEST") {
    const fetchOptions: RequestInit = {
      method: message.method || "GET",
      headers: { "Content-Type": "application/json" }
    };

    if (message.method !== "GET" && message.body) {
        fetchOptions.body = JSON.stringify(message.body);
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

// INSTANT SUBMISSION DETECTION
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.method === "POST") {
        let contestId, problemIndex, sourceCode;

        if (details.requestBody && details.requestBody.formData) {
            const fd = details.requestBody.formData;
            
            // Try different field names
            contestId = fd.contestId?.[0];
            problemIndex = fd.submittedProblemIndex?.[0] || fd.problemIndex?.[0];
            sourceCode = fd.source?.[0] || fd.sourceCode?.[0];

            // If contestId is missing in body, try to extract from URL
            // e.g. https://codeforces.com/contest/1234/submit
            if (!contestId) {
                const match = details.url.match(/\/contest\/(\d+)\/submit/);
                if (match) contestId = match[1];
            }
            
            if (contestId && problemIndex && !reportedRequests.has(details.requestId)) {
                reportedRequests.add(details.requestId);
                const problemId = `${contestId}${problemIndex}`;
                console.log(`[Background] Instant Detection: ${problemId}`);

                try {
                    const storage = await chrome.storage.local.get(['cfr_handle', 'cfr_room_id', 'cfr_user_id']);
                    const { cfr_handle, cfr_room_id, cfr_user_id } = storage;

                    if (cfr_handle && cfr_room_id) {
                         const apiUrl = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3000"; 
                         fetch(`${apiUrl}/api/check-submission`, {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({
                                 handle: cfr_handle,
                                 problemId: problemId,
                                 roomId: cfr_room_id,
                                 userId: cfr_user_id,
                                 sourceCode: sourceCode
                             })
                         }).then(res => {
                             if (!res.ok) {
                                 res.json().then(data => {
                                     if (res.status === 404 || (res.status === 400 && data.error === "Match not started")) {
                                         chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
                                     }
                                 });
                             }
                         }).catch(console.error);
                    }
                } catch (e) {
                     console.error("[Background] Failed to report instant submission:", e);
                }
                
                // Cleanup after a while
                setTimeout(() => reportedRequests.delete(details.requestId), 60000);
            }
        }
    }
  },
  { urls: ["https://codeforces.com/*/submit*", "https://codeforces.com/data/submitSource*"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if ((details.url.includes("/submit") || details.url.includes("/submitSource")) && details.method === "POST" && details.tabId !== -1) {
         // Notify content script that submission started
         chrome.tabs.sendMessage(details.tabId, {
            action: "SUBMISSION_STARTED"
        }).catch(() => {});
    }
  },
  { urls: ["https://codeforces.com/*/submit*", "https://codeforces.com/data/submitSource*"] }
);