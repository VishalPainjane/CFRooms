export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans p-8 md:p-16 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
      <div className="space-y-6 text-zinc-400">
        <p>Effective Date: April 21, 2026</p>
        
        <h2 className="text-2xl text-white font-semibold pt-4">1. Information We Collect</h2>
        <p>CFRooms operates entirely client-side within your browser and does not collect, store, or transmit your passwords or personal data. The only data processed is the public Codeforces submission data and real-time room communication needed to sync your competition sessions.</p>

        <h2 className="text-2xl text-white font-semibold pt-4">2. How We Use Your Information</h2>
        <p>Your public Codeforces handle and submission statuses are used solely to populate the room scoreboard and live event feed during active sessions.</p>

        <h2 className="text-2xl text-white font-semibold pt-4">3. Data Security</h2>
        <p>CFRooms is open-source. You can inspect the entirety of our codebase to verify that we do not maliciously handle or export your browser or session data.</p>
        
        <div className="pt-8">
          <a href="/" className="text-orange-500 hover:text-orange-400 transition-colors">← Back to CFRooms</a>
        </div>
      </div>
    </div>
  );
}