export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans p-8 md:p-16 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
      <div className="space-y-6 text-zinc-400">
        <p>Effective Date: April 21, 2026</p>
        
        <h2 className="text-2xl text-white font-semibold pt-4">1. Agreement to Terms</h2>
        <p>By utilizing the CFRooms Open-Source competitive extension, you agree to these Terms of Service. If you do not agree, do not use the extension.</p>

        <h2 className="text-2xl text-white font-semibold pt-4">2. Codeforces Services</h2>
        <p>CFRooms interacts with public and session data available on Codeforces. CFRooms is an independent extension, not officially endorsed, affiliated with, or maintained by Codeforces. Avoid abusing or circumventing the rate limits imposed by Codeforces servers during contests or practice sessions.</p>

        <h2 className="text-2xl text-white font-semibold pt-4">3. Prohibited Conduct</h2>
        <p>As a community-driven multiplayer tool, you agree not to use chat or room settings to distribute malware, inappropriate links, or harass other users.</p>
        
        <h2 className="text-2xl text-white font-semibold pt-4">4. Liability</h2>
        <p>CFRooms and its developers (VishalPainjane, Nikhil) provide this software "as is", without warranty of any kind. They will not be liable for any claims, damages, or unintended actions arising from the usage of the extension.</p>

        <div className="pt-8">
          <a href="/" className="text-orange-500 hover:text-orange-400 transition-colors">← Back to CFRooms</a>
        </div>
      </div>
    </div>
  );
}