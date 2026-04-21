export default function CookiesPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans p-8 md:p-16 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8">Cookies Policy</h1>
      <div className="space-y-6 text-zinc-400">
        <p>Effective Date: April 21, 2026</p>
        
        <h2 className="text-2xl text-white font-semibold pt-4">1. What are Cookies?</h2>
        <p>Cookies are simple text files that are stored on your computer or mobile device by a website's server. They are completely safe and do not hold sensitive data.</p>

        <h2 className="text-2xl text-white font-semibold pt-4">2. Do we use Cookies?</h2>
        <p>CFRooms operates in a stateless multiplayer manner. We do not use persistent tracking cookies, ad-trackers, or any third-party behavioral profiling. Any session or local storage used by the extension is strictly required to maintain room connection state or locally save your room configuration preferences.</p>

        <h2 className="text-2xl text-white font-semibold pt-4">3. Managing your preferences</h2>
        <p>If you wish to remove local extension data, you can clear the CFRooms extension local storage or uninstall the extension directly via your browser's extension settings.</p>
        
        <div className="pt-8">
          <a href="/" className="text-orange-500 hover:text-orange-400 transition-colors">← Back to CFRooms</a>
        </div>
      </div>
    </div>
  );
}