import Link from "next/link";
import { Swords, Github, MessageSquare, Unlock, Lock, Check, Chrome } from "lucide-react";

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <Check className="w-5 h-5 text-zinc-300" />
      <span className="text-zinc-300 text-lg">{text}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full relative z-20">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-1.5 rounded-lg shadow-lg shadow-orange-500/20">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">CFRooms</span>
        </div>
        <a href="https://github.com/VishalPainjane/CFRooms" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors">
          <Github className="w-7 h-7" />
        </a>
      </nav>

      <main className="relative z-10 flex flex-col items-center pt-20 pb-32 w-full">
        
        {/* Hero Section */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-10 text-center max-w-4xl px-4">
          Multiplayer rooms for Codeforces
        </h1>
        
        <a
          href="https://github.com/VishalPainjane/CFRooms/releases/latest/download/CFRooms-extension.zip"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg bg-[#21262d] border border-zinc-700 text-white font-medium hover:bg-[#30363d] hover:border-zinc-500 transition-all mb-24 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]"
        >
          Install for <Chrome className="w-5 h-5 text-white" />
        </a>

        {/* Hero Mockup Block */}
        <div className="relative w-full max-w-5xl px-4 mb-40 flex justify-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-orange-500/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="relative z-10 w-full aspect-[16/9] max-w-4xl bg-[#161b22] border border-zinc-800 rounded-xl shadow-2xl flex overflow-hidden">
            {/* Mock IDE/Editor Area */}
            <div className="w-64 border-r border-zinc-800 hidden md:block bg-[#0a0a0a] p-4">
              <div className="h-4 w-32 bg-zinc-800/80 rounded mb-6"></div>
              <div className="h-3 w-48 bg-zinc-800/50 rounded mb-3"></div>
              <div className="h-3 w-40 bg-zinc-800/50 rounded mb-3"></div>
              <div className="h-3 w-44 bg-zinc-800/50 rounded mb-3"></div>
            </div>
            <div className="flex-1 p-4 flex flex-col bg-[#0a0a0a]">
              <div className="h-6 w-1/3 bg-zinc-800/80 rounded mb-8"></div>
              <div className="space-y-4 flex-1">
                <div className="h-4 w-full bg-zinc-800/30 rounded"></div>
                <div className="h-4 w-5/6 bg-zinc-800/30 rounded"></div>
                <div className="h-4 w-4/6 bg-zinc-800/30 rounded"></div>
              </div>
            </div>
            {/* Mock Extension Panel */}
            <div className="w-72 border-l border-zinc-800 bg-[#161b22] p-4 flex flex-col">
              <div className="h-10 w-full bg-zinc-800/80 rounded shadow mb-6"></div>
              <div className="flex-1 border border-zinc-800 bg-[#0a0a0a] rounded mb-4 p-3 space-y-3">
                <div className="h-4 w-24 bg-green-500/20 text-green-500 rounded text-xs leading-none"></div>
                <div className="h-4 w-32 bg-red-500/20 text-red-500 rounded text-xs leading-none"></div>
              </div>
              <div className="h-10 w-full bg-orange-600 rounded shadow-md text-center leading-10 text-white font-medium text-sm">Scoreboard</div>
            </div>
          </div>
        </div>

        {/* Feature: Icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto px-6 mb-40 w-full text-center">
          <div className="flex flex-col items-center group">
            <MessageSquare className="w-10 h-10 text-white mb-6 transition-transform group-hover:scale-110" />
            <h3 className="text-xl font-bold text-white mb-3">Chat</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Use the live chat to collaborate on a shared set of questions.
            </p>
          </div>
          <div className="flex flex-col items-center group">
            <Unlock className="w-10 h-10 text-white mb-6 transition-transform group-hover:scale-110" />
            <h3 className="text-xl font-bold text-white mb-3">Open-source</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              The web extension, the server, and even this website are all open-source!
            </p>
          </div>
          <div className="flex flex-col items-center group">
            <Lock className="w-10 h-10 text-white mb-6 transition-transform group-hover:scale-110" />
            <h3 className="text-xl font-bold text-white mb-3">Privacy</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              CFRooms does not store any passwords or user messages.
            </p>
          </div>
        </div>

        {/* Feature: Scoreboard */}
        <div className="flex flex-col lg:flex-row items-center justify-between max-w-5xl mx-auto px-6 mb-40 w-full gap-16">
          <div className="flex-1 order-2 lg:order-1">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">Keep track with the scoreboard</h2>
            <CheckItem text="Ranked by completion time" />
            <CheckItem text="Hover over accepted submissions to see their time" />
            <CheckItem text="Click on accepted submissions to view their code" />
          </div>
          <div className="flex-1 order-1 lg:order-2 relative w-full flex justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="relative z-10 w-80 bg-[#161b22] border border-zinc-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden p-4">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
                <div>
                  <h4 className="text-white font-semibold flex items-center gap-2">Scoreboard</h4>
                  <p className="text-xs text-zinc-500 mt-1">7 online</p>
                </div>
                <span className="text-zinc-500 hover:text-white cursor-pointer select-none">✕</span>
              </div>
              <div className="space-y-4">
                {[
                  { name: "tourist", scores: ["green", "green", "green"] },
                  { name: "Benq", scores: ["green", "red", "green"] },
                  { name: "jiangly", scores: ["green", "green", "gray"] },
                  { name: "Errichto", scores: ["green", "gray", "gray"] },
                  { name: "Petr", scores: ["red", "gray", "gray"] },
                ].map((user, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-300 w-24 truncate font-medium">{user.name}</span>
                    <div className="flex gap-2">
                      {user.scores.map((color, j) => (
                        <div key={j} className={`w-5 h-5 rounded-full flex items-center justify-center ${color === 'green' ? 'bg-green-500/20 text-green-500' : color === 'red' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800/50 text-zinc-600'}`}>
                          {color === 'green' ? '✓' : color === 'red' ? '✗' : '-'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature: Events */}
        <div className="flex flex-col lg:flex-row items-center justify-between max-w-5xl mx-auto px-6 mb-40 w-full gap-16">
          <div className="flex-1 relative w-full flex justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="relative z-10 w-80 bg-[#161b22] border border-zinc-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-96">
              <div className="flex-1 p-4 space-y-5 overflow-y-hidden text-sm flex flex-col justify-end">
                <div className="text-zinc-300 bg-[#0a0a0a] p-2 rounded border border-zinc-800/50">
                  <span className="text-orange-400 font-semibold mr-2">system:</span> welcome to the room!
                </div>
                <div className="text-zinc-400">
                  <span className="text-blue-400 font-semibold mr-2">tourist</span> joined the room.
                </div>
                <div className="text-zinc-400">
                  <span className="text-blue-400 font-semibold mr-2">tourist</span> submitted <span className="text-green-500 ml-1">Accepted!</span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-purple-400 font-semibold mr-2">Benq:</span> I am just using BFS...
                </div>
                <div className="text-zinc-400">
                  <span className="text-blue-400 font-semibold mr-2">jiangly</span> submitted <span className="text-red-500 ml-1">Wrong Answer</span>
                </div>
              </div>
              <div className="p-3 border-t border-zinc-800 bg-[#0a0a0a]">
                <div className="bg-[#161b22] border border-zinc-800 rounded-md p-2 text-xs text-zinc-500 flex justify-between items-center">
                  <span>Type a message...</span>
                  <span className="text-zinc-400 font-bold">→</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">Experience real-time events</h2>
            <CheckItem text="Question submitted" />
            <CheckItem text="Question accepted" />
            <CheckItem text="Room completed" />
            <CheckItem text="Live messaging and code" />
            <CheckItem text="And more..." />
          </div>
        </div>

        {/* Feature: Settings */}
        <div className="flex flex-col lg:flex-row items-center justify-between max-w-5xl mx-auto px-6 mb-32 w-full gap-16">
          <div className="flex-1 order-2 lg:order-1">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">Customize the room settings</h2>
            <CheckItem text="Select specific topics to practice" />
            <CheckItem text="Filter questions by difficulty rating" />
            <CheckItem text="Set a room timer to simulate contests" />
          </div>
          <div className="flex-1 order-1 lg:order-2 relative w-full flex justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="relative z-10 w-80 bg-[#161b22] border border-zinc-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-4">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-800">
                 <h4 className="text-white font-semibold">Room Settings</h4>
                 <span className="text-zinc-500 hover:text-white cursor-pointer select-none">✕</span>
              </div>
              <div className="flex gap-2 mb-5 bg-[#0a0a0a] p-1 rounded-lg border border-zinc-800">
                <div className="flex-1 text-center py-1.5 bg-[#21262d] rounded-md text-white text-xs font-semibold shadow-sm border border-zinc-700">Topics</div>
                <div className="flex-1 text-center py-1.5 text-zinc-400 text-xs font-semibold hover:text-zinc-300 cursor-pointer">Questions</div>
              </div>
              <div className="space-y-3 mb-6">
                {['Binary Search', 'Dynamic Programming', 'Graph', 'Greedy', 'Math'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${i % 2 === 0 ? 'bg-orange-500 border-orange-500' : 'border-zinc-600 bg-transparent'}`}>
                      {i % 2 === 0 && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-zinc-300">{t}</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block mb-2">Difficulty</span>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-1/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-col items-center mt-20 mb-10 text-center px-4 relative z-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-10">Get started</h2>
          <a
            href="https://github.com/VishalPainjane/CFRooms/releases/latest/download/CFRooms-extension.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg bg-[#21262d] border border-zinc-700 text-white font-medium hover:bg-[#30363d] hover:border-zinc-500 transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]"
          >
            Install for <Chrome className="w-5 h-5 text-white" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 px-6 text-center text-sm text-zinc-500 flex flex-col md:flex-row items-center justify-center gap-6 relative z-20">
         <a href="https://github.com/VishalPainjane/CFRooms" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
         <span className="hidden md:inline text-zinc-700">•</span>
         <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms of service</Link>
         <span className="hidden md:inline text-zinc-700">•</span>
         <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy policy</Link>
         <span className="hidden md:inline text-zinc-700">•</span>
         <Link href="/cookies" className="hover:text-zinc-300 transition-colors">Cookies policy</Link>
      </footer>
    </div>
  );
}
