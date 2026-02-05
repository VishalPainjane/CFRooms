import cssText from "data-text:../style.css"
import type { PlasmoCSConfig, PlasmoGetStyle, PlasmoGetInlineAnchor } from "plasmo"
import { useState, useEffect, useRef } from "react"
import Pusher from "pusher-js"
import { Copy, CheckCircle } from "lucide-react"

// Initialize Pusher client
const pusher = new Pusher(process.env.PLASMO_PUBLIC_PUSHER_KEY || "fake_key", {
  cluster: process.env.PLASMO_PUBLIC_PUSHER_CLUSTER || "mt1",
});

export const config: PlasmoCSConfig = {
  matches: ["https://codeforces.com/*"],
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

// INLINE MODE: This forces the widget to be part of the DOM flow
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  const sidebar = document.querySelector("#sidebar");
  if (!sidebar) return null;
  return sidebar.firstElementChild; // Anchor to the first item
}

// Insert widget before the first item in the sidebar
export const getShadowHostId = () => "cfr-sidebar-widget"

const CFRooms = () => {
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [internalRoomId, setInternalRoomId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [handle, setHandle] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState("")
  const [players, setPlayers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [matchConfig, setMatchConfig] = useState<any>(null)
  const [solvedProblems, setSolvedProblems] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect logged-in user
  useEffect(() => {
      const header = document.querySelector("#header");
      if (header) {
          const profileLink = header.querySelector('a[href^="/profile/"]');
          if (profileLink) {
              const detectedHandle = profileLink.textContent?.trim();
              if (detectedHandle) {
                  setHandle(detectedHandle);
                  chrome.storage.local.set({ cfr_handle: detectedHandle });
              }
          }
      }
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['cfr_room_code', 'cfr_room_id', 'cfr_user_id'], (result) => {
        if (result.cfr_room_code) setRoomCode(result.cfr_room_code);
        if (result.cfr_room_id) setInternalRoomId(result.cfr_room_id);
        if (result.cfr_user_id) setUserId(result.cfr_user_id);
    });

    const messageListener = (message: any) => {
      if (message.action === "SUBMISSION_STARTED") {
        console.log("[Content] Submission detected by background, watching status...");
        // Optionally trigger a local UI "Searching..." indicator
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [internalRoomId, handle, userId]);

  // LIVE VERDICT DETECTION ON PAGE
  useEffect(() => {
      if (!roomCode || !handle) return;

      const reportSolve = async (problemId: string) => {
          console.log(`[Content] DETECTED SOLVE ON PAGE: ${problemId}`);
          await chrome.runtime.sendMessage({
              action: "API_REQUEST",
              url: `${process.env.PLASMO_PUBLIC_API_URL}/api/check-submission`,
              method: "POST",
              body: { handle, problemId, roomId: internalRoomId || roomCode, userId }
          });
      };

      const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
              if (mutation.type === "childList" || mutation.type === "characterData") {
                  const target = mutation.target as HTMLElement;
                  const cell = target.closest?.("td.status-verdict") || (target.classList?.contains("status-verdict") ? target : null);
                  
                  if (cell && (cell.textContent?.includes("Accepted") || cell.classList.contains("verdict-accepted"))) {
                      // Found an accepted submission, identify the problem
                      const row = cell.closest("tr");
                      if (row) {
                          const problemCell = row.querySelector("td[data-problemid]");
                          const problemId = problemCell?.getAttribute("data-problemid") || 
                                           row.querySelector('a[href*="/problemset/problem/"]')?.textContent?.trim().split(" ")[0] ||
                                           row.querySelector('a[href*="/contest/"]')?.textContent?.trim().split(" ")[0];
                          
                          if (problemId) {
                              reportSolve(problemId);
                          }
                      }
                  }
              }
          }
      });

      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
  }, [roomCode, handle, internalRoomId, userId]);

  // Polling Function
  const poll = async () => {
    if (!roomCode) return;
    try {
        const url = `${process.env.PLASMO_PUBLIC_API_URL}/api/room-status?code=${roomCode}${handle ? `&handle=${handle}` : ''}`;
        const response = await chrome.runtime.sendMessage({
            action: "API_REQUEST",
            url: url,
            method: "GET"
        });
        if (response.success) {
            setPlayers(response.data.players || []);
            setSolvedProblems(response.data.solvedProblems || []);
            
            setMessages(prev => {
                const incoming = response.data.messages || [];
                const combined = [...prev];
                incoming.forEach((msg: any) => {
                    if (!combined.find(m => m.id === msg.id)) {
                        combined.push(msg);
                    }
                });
                return combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-100);
            });

            if (response.data.hostId && userId) {
                setIsHost(response.data.hostId === userId);
            }
            if (response.data.id && response.data.id !== internalRoomId) {
                setInternalRoomId(response.data.id);
                chrome.storage.local.set({ cfr_room_id: response.data.id });
            }
            if (JSON.stringify(response.data.config) !== JSON.stringify(matchConfig)) {
                setMatchConfig(response.data.config || {});
            }
        } else if (response.error?.includes("404") || response.data?.error === "Room not found") {
            setRoomCode(null);
            setInternalRoomId(null);
            setMatchConfig(null);
            setTimeLeft("");
            setSolvedProblems([]);
            setMessages([]);
            setIsHost(false);
            chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
        }
    } catch (e) {}
  };

  // Real-time Updates with Pusher
  useEffect(() => {
    if (!roomCode) return;

    const channel = pusher.subscribe(`room-${roomCode}`);
    
    channel.bind("new-message", (data: any) => {
        setMessages(prev => {
            if (prev.find(m => m.id === data.id)) return prev;
            return [...prev, data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-100);
        });
    });

    channel.bind("room-updated", (data: any) => {
        if (data.handle && data.score !== undefined) {
             setPlayers(prev => prev.map(p => p.handle === data.handle ? { ...p, score: data.score } : p));
        }
        if (data.problemId && data.verdict === 'OK') {
            setSolvedProblems(prev => {
                if (prev.includes(data.problemId)) return prev;
                return [...prev, data.problemId];
            });
        }
        poll();
    });

    channel.bind("match-started", () => {
        poll();
    });

    channel.bind("player-joined", (data: any) => {
        setPlayers(prev => {
            if (prev.find(p => p.handle === data.handle)) return prev;
            return [...prev, { handle: data.handle, userId: data.userId, score: 0 }];
        });
    });

    channel.bind("player-left", (data: any) => {
        setPlayers(prev => prev.filter(p => p.handle !== data.handle));
    });

    channel.bind("room-closed", () => {
        setRoomCode(null);
        setInternalRoomId(null);
        setMatchConfig(null);
        setTimeLeft("");
        setSolvedProblems([]);
        setMessages([]);
        setIsHost(false);
        chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
        alert("The room was closed by the host.");
    });

    return () => {
        pusher.unsubscribe(`room-${roomCode}`);
    };
  }, [roomCode]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Timer Logic
  useEffect(() => {
    if (!matchConfig?.startTime || !matchConfig?.duration) return;
    
    const interval = setInterval(() => {
        const now = Date.now();
        const end = matchConfig.startTime + (matchConfig.duration * 1000);
        const diff = end - now;

        if (diff <= 0) {
            setTimeLeft("FINISHED");
            clearInterval(interval);
        } else {
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [matchConfig]);

  const copyToClipboard = () => {
      if (roomCode) {
          navigator.clipboard.writeText(roomCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  }

  const handleCreateRoom = async () => {
    if (!handle) return;
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
          action: "API_REQUEST",
          url: `${process.env.PLASMO_PUBLIC_API_URL}/api/create-room`,
          method: "POST",
          body: { handle }
      });
      if (response.data?.roomCode) {
        setRoomCode(response.data.roomCode);
        setInternalRoomId(response.data.roomId);
        setUserId(response.data.userId);
        chrome.storage.local.set({ 
            cfr_room_code: response.data.roomCode, 
            cfr_room_id: response.data.roomId,
            cfr_user_id: response.data.userId 
        });
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleJoinRoom = async () => {
      if (!handle || !joinCode) return;
      setLoading(true);
      try {
          const response = await chrome.runtime.sendMessage({
              action: "API_REQUEST",
              url: `${process.env.PLASMO_PUBLIC_API_URL}/api/join-room`,
              method: "POST",
              body: { handle, code: joinCode }
          });
          if (response.data?.success) {
              setRoomCode(joinCode.toUpperCase());
              setInternalRoomId(response.data.roomId);
              setUserId(response.data.userId);
              
              if (response.data.messages) {
                  setMessages(response.data.messages);
              }
              
              chrome.storage.local.set({ 
                  cfr_room_code: joinCode.toUpperCase(), 
                  cfr_room_id: response.data.roomId,
                  cfr_user_id: response.data.userId 
              });
          } else {
              alert(response.data?.error || "Failed");
          }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !roomCode || !handle) return;
      
      const content = newMessage.trim();
      const tempId = `temp-${Date.now()}`;
      
      const optimisticMsg = {
          id: tempId,
          handle: handle,
          content: content,
          createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setNewMessage("");

      try {
          const response = await chrome.runtime.sendMessage({
              action: "API_REQUEST",
              url: `${process.env.PLASMO_PUBLIC_API_URL}/api/room/messages`,
              method: "POST",
              body: { roomCode, handle, content }
          });
          
          if (response.data?.success && response.data.message) {
              setMessages(prev => prev.map(m => m.id === tempId ? { ...response.data.message, handle } : m));
          }
      } catch (err) { 
          console.error(err);
          setMessages(prev => prev.filter(m => m.id !== tempId));
      }
  }

  // Fallback Polling
  useEffect(() => {
    if (!roomCode) return;
    const interval = setInterval(poll, 15000); 
    poll();
    return () => clearInterval(interval);
  }, [roomCode, internalRoomId, handle]);

  const handleStartMatch = async () => {
      setLoading(true);
      try {
        await chrome.runtime.sendMessage({
            action: "API_REQUEST",
            url: `${process.env.PLASMO_PUBLIC_API_URL}/api/start-match`,
            method: "POST",
            body: { roomCode, handle }
        });
      } catch (e) {}
      finally { setLoading(false); }
  };

  const handleCloseRoom = async () => {
    if (!roomCode || !handle) return;
    if (!confirm("Are you sure you want to close the room? This will delete all data.")) return;
    
    setLoading(true);
    try {
        const response = await chrome.runtime.sendMessage({
            action: "API_REQUEST",
            url: `${process.env.PLASMO_PUBLIC_API_URL}/api/room-status?code=${roomCode}&handle=${handle}`,
            method: "DELETE"
        });
        if (response.success) {
            setRoomCode(null);
            setInternalRoomId(null);
            setMatchConfig(null);
            setTimeLeft("");
            setSolvedProblems([]);
            setMessages([]);
            setIsHost(false);
            chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
        }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-0 mb-[1.5em] text-[#222] bg-white border border-[#b9b9b9] rounded-[5px] w-full shadow-sm" style={{ fontFamily: "verdana, arial, sans-serif" }}>
      <div className="px-3 py-2 border-b border-[#b9b9b9] rounded-t-[5px] bg-white flex justify-between items-center">
        <div className="flex flex-col">
            <span className="font-bold text-[#3b5998] text-[13px]">CFRooms</span>
            {matchConfig && <span className="text-[10px] text-gray-500 uppercase font-medium">Ongoing Match</span>}
        </div>
        {timeLeft && (
            <span className={`text-[20px] font-black tracking-tighter ${timeLeft === "FINISHED" ? "text-red-600" : "text-[#333]"}`}>
                {timeLeft}
            </span>
        )}
      </div>

      <div className="p-3 max-h-[750px] overflow-y-auto text-[13px] flex flex-col gap-3">
        {!handle ? (
             <div className="text-center py-2">
                 <p className="text-[12px] mb-2 text-[#555]">Please log in to Codeforces to use CFRooms.</p>
                 <a href="/enter" className="text-[#3b5998] font-bold underline text-[12px]">Login / Register</a>
             </div>
        ) : !roomCode ? (
            <div className="flex flex-col gap-3">
                <div className="text-[11px] text-[#555]">
                    Logged in as: <span className="font-bold text-[#3b5998]">{handle}</span>
                </div>
                
                <button 
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="w-full bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-[#b9b9b9] rounded-[3px] py-1 text-[12px] text-[#333] font-normal cursor-pointer transition-colors"
                >
                    {loading ? "..." : "Create Room"}
                </button>
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Code" 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-2/3 border border-[#b9b9b9] rounded-[3px] px-2 py-1 text-[12px] uppercase focus:outline-none focus:border-[#3b5998]"
                    />
                    <button 
                        onClick={handleJoinRoom}
                        disabled={loading}
                        className="w-1/3 bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-[#b9b9b9] rounded-[3px] py-1 text-[12px] text-[#333] font-normal cursor-pointer transition-colors"
                    >
                        Join
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-center pb-1 border-b border-[#eee]">
                    <div 
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 cursor-pointer group"
                        title="Click to copy room code"
                    >
                        <span className="font-bold text-[#3b5998] text-[24px] tracking-widest transition-opacity group-hover:opacity-80">{roomCode}</span>
                        {copied ? (
                            <CheckCircle size={16} className="text-green-500 animate-in zoom-in" />
                        ) : (
                            <Copy size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        {copied && <span className="text-[10px] text-green-600 font-bold animate-pulse">Copied!</span>}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={async () => {
                                if (roomCode && handle) {
                                    try {
                                        await chrome.runtime.sendMessage({
                                            action: "API_REQUEST",
                                            url: `${process.env.PLASMO_PUBLIC_API_URL}/api/leave-room`,
                                            method: "POST",
                                            body: { roomCode, handle }
                                        });
                                    } catch (e) { console.error("Leave error:", e); }
                                }
                                
                                setRoomCode(null);
                                setInternalRoomId(null);
                                setMatchConfig(null);
                                setTimeLeft("");
                                setSolvedProblems([]);
                                setMessages([]);
                                setIsHost(false);
                                chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
                            }}
                            className="text-[11px] text-[#555] hover:underline cursor-pointer"
                        >
                            Leave
                        </button>
                        {isHost && (
                            <button 
                                onClick={handleCloseRoom}
                                className="text-[11px] text-red-600 hover:underline cursor-pointer"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {/* Scoreboard */}
                    <div>
                        <h4 className="text-[10px] font-bold text-[#888] uppercase mb-1">Scoreboard</h4>
                        <div className="max-h-[80px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                {players.map(p => (
                                    <tr key={p.handle} className="border-b border-[#f0f0f0] last:border-0">
                                        <td className={`py-0.5 text-[11px] ${p.handle === handle ? "font-bold" : ""}`}>
                                            <span className={p.handle === handle ? "text-[#000]" : "text-[#00a]"}>{p.handle}</span>
                                        </td>
                                        <td className="text-right font-bold text-[#0d0] py-0.5 text-[11px]">{p.score}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Problems - Compressed */}
                    {matchConfig?.problems ? (
                        <div>
                            <h4 className="text-[10px] font-bold text-[#888] uppercase mb-1">Problems</h4>
                            <div className="max-h-[95px] overflow-y-auto border border-[#f0f0f0] rounded bg-[#fafafa] p-1 shadow-inner">
                                <div className="space-y-1">
                                    {matchConfig.problems.map((prob: any) => {
                                        const isSolved = solvedProblems.includes(prob.id);
                                        return (
                                            <div key={prob.id} className={`flex items-center justify-between px-1.5 py-1 rounded transition-all ${isSolved ? "bg-green-100/50 shadow-sm" : "bg-white border border-[#eee] hover:border-[#3b5998]"}`}>
                                                <a href={prob.url} className={`${isSolved ? "text-green-700 font-bold" : "text-[#00a]"} hover:underline text-[10px] font-bold truncate flex-1`}>
                                                    {prob.id}. {prob.name}
                                                </a>
                                                <div className="flex items-center gap-1.5 ml-2">
                                                    {isSolved ? (
                                                        <span className="text-green-600 font-black text-[9px]">OK</span>
                                                    ) : (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                const targetRoom = internalRoomId || roomCode;
                                                                if (!targetRoom) return;
                                                                await chrome.runtime.sendMessage({
                                                                    action: "API_REQUEST",
                                                                    url: `${process.env.PLASMO_PUBLIC_API_URL}/api/check-submission`,
                                                                    method: "POST",
                                                                    body: { handle, problemId: prob.id, roomId: targetRoom, userId } 
                                                                });
                                                            }}
                                                            className="text-[9px] bg-white border border-[#3b5998] text-[#3b5998] px-1.5 py-0.5 rounded hover:bg-[#3b5998] hover:text-white transition-colors font-medium shadow-xs"
                                                        >
                                                            Check
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        isHost ? (
                            <button 
                                onClick={handleStartMatch}
                                disabled={loading}
                                className="w-full mt-1 bg-[#3b5998] hover:bg-[#2d4373] text-white rounded-[3px] py-2 text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
                            >
                                {loading ? "..." : "START MATCH"}
                            </button>
                        ) : (
                            <div className="text-center text-[11px] text-[#666] italic py-2 bg-gray-50 rounded border border-[#eee]">
                                Waiting for host to start...
                            </div>
                        )
                    )}
                </div>

                {/* Chat Section - Large and Dominant */}
                <div className="mt-1 border-t-2 border-[#eee] pt-2 flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-1.5">
                        <h4 className="text-[10px] font-bold text-[#3b5998] uppercase tracking-tighter">Activity & Chat</h4>
                        <span className="text-[9px] font-medium bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">{messages.length}</span>
                    </div>
                    <div 
                        ref={scrollRef}
                        className="h-80 overflow-y-auto mb-2 bg-[#f9f9fb] border border-[#e5e7eb] p-2.5 rounded-lg flex flex-col gap-2.5 shadow-inner"
                    >
                        {messages.length === 0 && <div className="text-[11px] text-[#999] italic text-center mt-20">Waiting for activity...</div>}
                        {messages.map((m) => {
                            const isSubmission = m.content.includes("Submitted problem");
                            const isSolved = m.content.includes("Solved problem");
                            const isSystem = isSubmission || isSolved;
                            const hasCode = m.content.includes("```");
                            let displayContent = m.content;
                            let codeSnippet = null;

                            if (hasCode) {
                                const parts = m.content.split("```");
                                displayContent = parts[0];
                                if (parts.length > 1) {
                                    codeSnippet = parts[1];
                                }
                            }
                            
                            return (
                                <div key={m.id || Math.random()} className={`text-[11px] leading-snug flex flex-col ${isSystem ? (isSolved ? "bg-green-50 border-l-4 border-green-500 shadow-sm" : "bg-blue-50 border-l-4 border-blue-500 shadow-sm") + " py-2 px-2.5 rounded-r" : "px-1"}`}>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`font-bold shrink-0 ${isSystem ? "text-gray-900" : (m.handle === handle ? "text-gray-900" : "text-[#3b5998]")}`}>
                                            {m.handle}:
                                        </span>
                                        <span className={`${isSystem ? "text-gray-700 font-semibold" : "text-gray-600"} break-words`}>
                                            {displayContent}
                                        </span>
                                    </div>
                                    {codeSnippet && (
                                        <pre className="mt-1.5 bg-gray-800 text-gray-100 p-2 rounded text-[10px] overflow-x-auto font-mono max-h-32 border border-gray-700 custom-scrollbar">
                                            <code>{codeSnippet.trim()}</code>
                                        </pre>
                                    )}
                                    <div className="text-[8px] text-gray-400 text-right mt-1 font-medium">
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-1.5">
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message the room..."
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#3b5998] focus:border-[#3b5998] transition-all"
                        />
                        <button 
                            type="submit"
                            className="bg-[#3b5998] text-white px-4 rounded-md text-[11px] font-bold hover:bg-[#2d4373] transition-colors shadow-sm"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </>
        )}
      </div>
    </div>
  )
}

export default CFRooms
