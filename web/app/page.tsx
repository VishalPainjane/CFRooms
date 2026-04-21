import Link from "next/link";
import { Swords, Github, MessageSquare, Zap, Chrome, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070707] text-white font-sans selection:bg-[#FF6A34]/30 overflow-x-hidden flex flex-col">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-8 max-w-7xl mx-auto w-full relative z-20">
        <div className="flex items-center gap-4">
          <div className="bg-[#FF6A34] p-2 rounded-xl shadow-lg shadow-[#FF6A34]/20 mb-0">
            <Swords className="w-5 h-5 text-[#070707]" />
          </div>
          <span className="text-2xl font-bold tracking-tighter">CFRooms</span>
        </div>
        
        <div className="flex items-center gap-8 text-sm font-medium">
          <Link href="#features" className="hover:text-[#FF6A34] transition-colors">Features</Link>
          <a href="https://github.com/VishalPainjane/CFRooms" target="_blank" rel="noreferrer" className="text-[#FF6A34] hover:text-white transition-colors">
            <Github className="w-6 h-6" />
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center pt-24 pb-32 w-full flex-1">
        
        {/* Ambient Blur Background */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-gradient-to-b from-[#FF6A34] to-transparent blur-[150px] rounded-full opacity-20 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl px-4 mt-8">
          <h1 className="text-6xl md:text-8xl font-extrabold text-white mb-8 tracking-tighter leading-[1.1] drop-shadow-2xl">
            Multiplayer rooms for<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A34] to-[#ff9e79]">Codeforces.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400 mb-16 max-w-2xl mx-auto font-medium leading-relaxed">
            Connect with friends, race against the clock, and track live global submissions without ever leaving the problem page.
          </p>

          <a
            href="/CFRooms-extension.zip"
            download
            className="inline-flex justify-center items-center gap-3 px-8 py-5 rounded-2xl bg-[#FF6A34] text-[#070707] font-bold text-lg hover:bg-[#ff8a5c] transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,106,52,0.3)] mb-24"
          >
            Install Extension <Chrome className="w-6 h-6 text-[#070707]" />
          </a>
        </div>

        {/* Minimal Features Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6 w-full">
          <div className="bg-[#0a0a0a] border border-zinc-800/50 p-8 rounded-3xl hover:border-[#FF6A34]/30 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6A34]/10 flex items-center justify-center mb-6 group-hover:bg-[#FF6A34]/20 transition-colors">
              <Users className="w-7 h-7 text-[#FF6A34]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Live Scoreboard</h3>
            <p className="text-zinc-400 leading-relaxed">
              Watch submissions, verdicts, and times update instantly as your friends solve problems in real-time.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-zinc-800/50 p-8 rounded-3xl hover:border-[#FF6A34]/30 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6A34]/10 flex items-center justify-center mb-6 group-hover:bg-[#FF6A34]/20 transition-colors">
              <MessageSquare className="w-7 h-7 text-[#FF6A34]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Room Chat</h3>
            <p className="text-zinc-400 leading-relaxed">
              Discuss approaches, share hints, and communicate strategy directly via the integrated extension sidebar.
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-zinc-800/50 p-8 rounded-3xl hover:border-[#FF6A34]/30 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6A34]/10 flex items-center justify-center mb-6 group-hover:bg-[#FF6A34]/20 transition-colors">
              <Zap className="w-7 h-7 text-[#FF6A34]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Seamless Integration</h3>
            <p className="text-zinc-400 leading-relaxed">
              Built as a lightweight Chrome extension that works automatically on standard Codeforces problem URLs.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] py-10 border-t border-zinc-900 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-zinc-500">
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
          <div className="flex items-center gap-2">
            <span>Built open-source.</span>
            <a href="https://github.com/VishalPainjane/CFRooms" target="_blank" rel="noreferrer" className="text-[#FF6A34] hover:text-white transition-colors">
              View on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
