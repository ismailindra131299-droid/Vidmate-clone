import React, { useState, useEffect } from 'react';

interface VideoInfo {
  status: string;
  message: string;
  title: string;
  thumbnail: string;
  duration: string;
  download_url: string;
  target_url: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('rumah');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [url, setUrl] = useState('');
  const [quality] = useState('best');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);

  const categories = ['Semua', 'Mix', 'Musik', 'Podcast', 'Berita', 'Game'];

  // Mengambil data tren otomatis dari API Python saat aplikasi dimuat
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('http://10.6.241 port:8000');
        const data = await response.json();
        if (data.status === 'success' || data.status === 'fallback') {
          setTrendingVideos(data.videos);
        }
      } catch (err) {
        console.error("Gagal terhubung ke backend server:", err);
      }
    };
    if (activeTab === 'rumah') {
      fetchTrending();
    }
  }, [activeTab]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, quality: quality })
      });
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setResult(data);
      } else {
        setError(data.detail || 'Gagal mengekstrak video.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col font-sans pb-16 antialiased select-none">
      
      {/* 1. TOP SEARCH BAR */}
      <div className="sticky top-0 bg-[#1a1a1a] p-3 shadow-lg z-50 flex items-center space-x-3 border-b border-zinc-800/60">
        <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cari Atau Masukkan URL Video..."
            className="w-full bg-[#282828] text-zinc-100 pl-4 pr-12 py-2 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 border border-transparent transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-600 text-white px-4 py-1.5 rounded-full text-xs transition"
          >
            {loading ? '...' : 'Unduh'}
          </button>
        </form>
      </div>

      {/* RENDER HALAMAN HOME */}
      {activeTab === 'rumah' && (
        <div className="flex-1 flex flex-col">
          
          {/* 2. CATEGORY SELECTOR */}
          <div className="flex space-x-2 overflow-x-auto p-3 bg-[#121212] border-b border-zinc-900/80 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  activeCategory === cat
                    ? 'bg-zinc-100 text-zinc-900 font-bold shadow'
                    : 'bg-[#282828] text-zinc-300 hover:bg-[#333333]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Panel Hasil Ekstraksi Sukses */}
          {result && (
            <div className="m-4 bg-emerald-950/40 border border-emerald-500/40 p-4 space-y-3 rounded-xl shadow-md">
              <h3 className="text-sm font-bold text-emerald-400 leading-snug">{result.title}</h3>
              <a
                href={result.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center py-2.5 rounded-xl text-xs font-extrabold shadow shadow-orange-500/20 active:scale-[0.99] transition"
              >
                🚀 KLIK DI SINI UNTUK UNDUH VIDEO (.MP4)
              </a>
            </div>
          )}

          {/* Panel Error */}
          {error && (
            <div className="m-4 bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300">
              ⚠️ {error}
            </div>
          )}

          {/* 3. VIDEO FEED OTOMATIS */}
          <div className="flex-1 p-3 space-y-5">
            {trendingVideos.length > 0 ? (
              trendingVideos.map((vid) => (
                <div key={vid.id} className="flex flex-col bg-[#1c1c1c] rounded-xl overflow-hidden shadow-lg border border-zinc-800/50">
                  <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                    <img src={vid.thumbnail} alt="Video Thumbnail" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2.5 right-2.5 bg-black/75 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-zinc-100">{vid.duration}</span>
                  </div>
                  <div className="p-3.5 flex justify-between items-start space-x-3">
                    <div className="flex-1 space-y-1">
                      <h2 className="text-sm font-bold text-zinc-100 leading-snug line-clamp-2">{vid.title}</h2>
                      <p className="text-[11px] text-zinc-400 font-semibold">{vid.channel} • {vid.views}</p>
                    </div>
                    <button
                      onClick={() => { setUrl(vid.videoUrl); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="p-2 bg-[#2a2a2a] hover:bg-orange-500/20 text-zinc-400 hover:text-orange-500 rounded-xl transition shadow-inner"
                      title="Unduh video ini"
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-center text-xs py-10">Menghubungkan ke server Termux...</p>
            )}
          </div>
        </div>
      )}

      {/* RENDER HALAMAN LAIN (STATIS PANDUAN) */}
      {activeTab !== 'rumah' && (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs py-20">
          <span>🎵 Halaman {activeTab.toUpperCase()} Siap Dikonfigurasi</span>
        </div>
      )}

      {/* 4. BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-zinc-800/80 h-14 flex items-center justify-around z-50 px-2">
        <button onClick={() => setActiveTab('rumah')} className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'rumah' ? 'text-orange-500 font-bold scale-105' : 'text-zinc-500'}`}>
          <span className="text-xs">🏠 RUMAH</span>
        </button>
        <button onClick={() => setActiveTab('musik')} className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'musik' ? 'text-orange-500 font-bold scale-105' : 'text-zinc-500'}`}>
          <span className="text-xs">🎵 MUSIK</span>
        </button>
        <button onClick={() => setActiveTab('files')} className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'files' ? 'text-orange-500 font-bold scale-105' : 'text-zinc-500'}`}>
          <span className="text-xs">📂 FILES</span>
        </button>
        <button onClick={() => setActiveTab('saya')} className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'saya' ? 'text-orange-500 font-bold scale-105' : 'text-zinc-500'}`}>
          <span className="text-xs">👤 SAYA</span>
        </button>
      </div>

    </div>
  );
}
