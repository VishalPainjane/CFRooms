import cssText from "data-text:../style.css"
import type { PlasmoCSConfig, PlasmoGetStyle, PlasmoGetInlineAnchor } from "plasmo"
import { useState, useEffect } from "react"

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
  const [matchConfig, setMatchConfig] = useState<any>(null)
  const [solvedProblems, setSolvedProblems] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isHost, setIsHost] = useState(false);

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
      if (message.action === "SUBMISSION_DETECTED") {
        if (internalRoomId && handle) {
            chrome.runtime.sendMessage({
                action: "API_REQUEST",
                url: `${process.env.PLASMO_PUBLIC_API_URL}/api/check-submission`,
                method: "POST",
                body: { handle, problemId: message.problemId, roomId: internalRoomId, userId }
            }).catch(console.error);
        }
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [internalRoomId, handle, userId]);

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

  // Polling
  useEffect(() => {
    if (!roomCode) return;
    const poll = async () => {
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
                if (response.data.hostId && userId) {
                    setIsHost(response.data.hostId === userId);
                }
                if (response.data.id && response.data.id !== internalRoomId) {
                    setInternalRoomId(response.data.id);
                    chrome.storage.local.set({ cfr_room_id: response.data.id });
                }
                // Only update config if different to prevent timer reset
                if (JSON.stringify(response.data.config) !== JSON.stringify(matchConfig)) {
                    setMatchConfig(response.data.config || {});
                }
            } else if (response.error?.includes("404") || response.data?.error === "Room not found") {
                // Room likely closed by host
                setRoomCode(null);
                setInternalRoomId(null);
                setMatchConfig(null);
                setTimeLeft("");
                setSolvedProblems([]);
                setIsHost(false);
                chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
            }
        } catch (e) {}
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, [roomCode, matchConfig, internalRoomId, handle]);

  const handleStartMatch = async () => {
      setLoading(true);
      chrome.runtime.sendMessage({
          action: "API_REQUEST",
          url: `${process.env.PLASMO_PUBLIC_API_URL}/api/start-match`,
          method: "POST",
          body: { roomCode, handle }
      }).then(() => setLoading(false));
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
            setIsHost(false);
            chrome.storage.local.remove(['cfr_room_code', 'cfr_room_id']);
        }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div className="mb-[1.5em] text-[#222] bg-white border border-[#b9b9b9] rounded-[5px] w-full" style={{ fontFamily: "verdana, arial, sans-serif" }}>
      <div className="px-3 py-2 border-b border-[#b9b9b9] rounded-t-[5px] bg-white flex justify-between items-center">
        <span className="font-bold text-[#3b5998] text-[13px]">CFRooms</span>
        {timeLeft && (
            <span className={`text-[13px] font-bold ${timeLeft === "FINISHED" ? "text-red-600" : "text-[#444]"}`}>
                {timeLeft}
            </span>
        )}
      </div>

      <div className="p-3 max-h-[400px] overflow-y-auto text-[13px]">
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
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#eee]">
                    <span className="font-bold text-[#3b5998] text-[14px]">{roomCode}</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setRoomCode(null);
                                setInternalRoomId(null);
                                setMatchConfig(null);
                                setTimeLeft("");
                                setSolvedProblems([]);
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

                <div>
                    <h4 className="text-[11px] font-bold text-[#555] mb-1">Players</h4>
                    <table className="w-full text-left border-collapse">
                        <tbody>
                        {players.map(p => (
                            <tr key={p.handle} className="border-b border-[#f0f0f0] last:border-0">
                                <td className={`py-1 ${p.handle === handle ? "font-bold" : ""}`}>
                                    <span className={p.handle === handle ? "text-[#000]" : "text-[#00a]"}>{p.handle}</span>
                                </td>
                                <td className="text-right font-bold text-[#0d0] py-1">{p.score}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {matchConfig?.problems ? (
                    <div>
                        <h4 className="text-[11px] font-bold text-[#555] mb-1 mt-2">Problems</h4>
                        <div className="space-y-1">
                            {matchConfig.problems.map((prob: any) => {
                                const isSolved = solvedProblems.includes(prob.id);
                                return (
                                    <div key={prob.id} className={`flex items-center justify-between group py-1 border-b border-[#f0f0f0] last:border-0 ${isSolved ? "bg-green-50" : ""}`}>
                                        <a href={prob.url} className={`${isSolved ? "text-green-600 font-bold" : "text-[#00a]"} hover:underline text-[12px] font-bold w-3/4 truncate`}>
                                            {prob.id}. {prob.name} {isSolved && <span className="text-green-600 font-bold ml-1">[Solved]</span>}
                                        </a>
                                        {!isSolved && (
                                            <button
                                                title="Check submission"
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
                                                className="text-[10px] text-[#aaa] hover:text-[#3b5998] cursor-pointer"
                                            >
                                                [Check]
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={handleStartMatch}
                        disabled={loading}
                        className="w-full mt-2 bg-[#e1e1e1] hover:bg-[#d0d0d0] border border-[#b9b9b9] rounded-[3px] py-1 text-[12px] text-[#333] font-bold cursor-pointer transition-colors"
                    >
                        {loading ? "..." : "START MATCH"}
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  )
}

export default CFRooms