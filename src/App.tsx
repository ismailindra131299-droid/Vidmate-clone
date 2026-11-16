import { getAllUserMedia } from "./deviceMedia";
void getAllUserMedia;
import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://434bb5f5eb843a.lhr.life";

export default function App() {
  const [tab, setTab] = useState("rumah");
  const [cat, setCat] = useState("Semua");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVid, setActiveVid] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [dlTask, setDlTask] = useState<{
    active: boolean;
    title: string;
    thumb: string;
    progress: number;
    loadedMB: string;
    totalMB: string;
    status: "downloading" | "done" | "error";
    ext: string;
  } | null>(null);

  const startModernDownload = async () => {
    if (!dlUrl) return;
    const ext = selIdx.startsWith("audio") ? "M4A" : "MP4";
    const cleanName = ((typeof dlName !== "undefined" && dlName) || activeVid?.title || "media")
      .replace(/[\/*?:"<>|]/g, "")
      .trim() + "." + ext.toLowerCase();
    const fullUrl = `${API_URL}/api/download/${encodeURIComponent(cleanName)}?url=${encodeURIComponent(dlUrl)}`;

    setShowModal(false);
    setDlTask({
      active: true,
      title: cleanName,
      thumb: activeVid?.thumbnail || "",
      progress: 0,
      loadedMB: "0.0",
      totalMB: "...",
      status: "downloading",
      ext,
    });

    try {
      const response = await fetch(fullUrl);
      if (!response.ok || !response.body) throw new Error("Gagal mengunduh");
      const contentLength = Number(response.headers.get("Content-Length") || 0);
      const totalMB = contentLength > 0 ? (contentLength / (1024 * 1024)).toFixed(1) : "?";
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const loadedMB = (received / (1024 * 1024)).toFixed(1);
          const pct = contentLength > 0 ? Math.min(99, Math.round((received / contentLength) * 100)) : 50;
          setDlTask((prev) => prev ? { ...prev, progress: pct, loadedMB, totalMB } : null);
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: ext === "M4A" ? "audio/mp4" : "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      setDlTask((prev) =>
        prev ? { ...prev, progress: 100, loadedMB: (received / (1024 * 1024)).toFixed(1), totalMB: (received / (1024 * 1024)).toFixed(1), status: "done" } : null
      );
    } catch (e) {
      setDlTask((prev) => (prev ? { ...prev, status: "error" } : null));
    }
  };
  const [loadingFmt, setLoadingFmt] = useState(false);
  const [formats, setFormats] = useState<any[]>([]);
  const [dlUrl, setDlUrl] = useState("");
  const [selIdx, setSelIdx] = useState("audio-0");
  const [localFiles, setLocalFiles] = useState<any[]>([]);
  const [playingLocal, setPlayingLocal] = useState<any>(null);
  const [fileFilter, setFileFilter] = useState("semua");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [curTime, setCurTime] = useState(0);
  const [durTime, setDurTime] = useState(0);
  const [playMode, setPlayMode] = useState<"normal" | "one" | "shuffle">("normal");
  const [modeToast, setModeToast] = useState("");
  const [userName, setUserName] = useState(() => localStorage.getItem("vidmate_user") || "");
  const [watchHistory, setWatchHistory] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem("vidmate_history") || "[]"); } catch { return []; } });
  const [sayaSubPage, setSayaSubPage] = useState("");
  const [sayaToast, setSayaToast] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("vidmate_theme") !== "light");
  const toggleTheme = (dark: boolean) => {
    setDarkMode(dark);
    localStorage.setItem("vidmate_theme", dark ? "dark" : "light");
  };
  const showSayaInfo = (m: string) => { setSayaToast(m); setTimeout(() => setSayaToast(""), 2000); };

  const fmtTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const skipTrack = (dir: number) => {
    const audioList = localFiles.filter((x) => x.type === "audio");
    if (audioList.length === 0 || !playingLocal) return;
    const idx = audioList.findIndex((x) => x.name === playingLocal.name);
    let nextIdx = (idx + dir + audioList.length) % audioList.length;
    if (playMode === "shuffle" && audioList.length > 1) {
      while (nextIdx === idx) {
        nextIdx = Math.floor(Math.random() * audioList.length);
      }
    }
    setPlayingLocal(audioList[nextIdx]);
    setIsPlaying(true);
  };

  const togglePlayMode = () => {
    const nextMode = playMode === "normal" ? "one" : playMode === "one" ? "shuffle" : "normal";
    setPlayMode(nextMode);
    const label = nextMode === "one" ? "Ulangi 1 Lagu" : nextMode === "shuffle" ? "Putar Acak" : "Putar Berurutan";
    setModeToast(label);
    setTimeout(() => setModeToast(""), 1800);
  };
  const [dlName, setDlName] = useState("");
  const [editName, setEditName] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDist, setPullDist] = useState(0);
  const [streamUrl, setStreamUrl] = useState("");
  const [loadingStream, setLoadingStream] = useState(false);

  const cats = ["Semua", "Mix", "Musik", "Podcast", "Berita", "Game"];

  const loadVideos = async (q = "") => {
    setLoading(true);
    setErr("");
    try {
      const api = q
        ? `${API_URL}/api/search?q=${encodeURIComponent(q)}`
        : API_URL + "/api/trending";
      const res = await fetch(api);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      setErr("Gagal terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "rumah") loadVideos();
    if (tab === "files") fetch(API_URL + "/api/local-files").then(r=>r.json()).then(d=>setLocalFiles(d.files||[]));
  }, [tab]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setActiveVid(null);
    const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    if (/^https?:\/\//i.test(url.trim()) && m) {
      openVideo({
        id: m,
        title: "Video YouTube",
        channel: "YouTube",
        thumbnail: `https://ytimg.com{m}/mqdefault.jpg`,
        videoUrl: `https://youtube.com{m}`,
      });
      return;
    }
    loadVideos(url.trim());
  };

  const openVideo = async (v: any) => {
    setActiveVid(v);
    setWatchHistory((p) => { const u = [v, ...p.filter((x) => x.id !== v.id)].slice(0, 20); localStorage.setItem("vidmate_history", JSON.stringify(u)); return u; });
    setFormats([]);
    setShowModal(false);
    setStreamUrl("");
    setLoadingStream(true);
    window.scrollTo(0, 0);
    try {
      const res = await fetch(`${API_URL}/api/stream?id=${v.id}`);
      const data = await res.json();
      if (data.stream_url) setStreamUrl(data.stream_url);
      else setErr("Gagal memuat aliran video.");
    } catch {
      setErr("Gagal mengambil video dari server.");
    } finally {
      setLoadingStream(false);
    }
  };

  const openDownload = async () => {
    if (!activeVid) return;
    setShowModal(true);
    setSelIdx("audio-0");
    setEditName(false);
    setDlName(activeVid.title || "video");
    if (formats.length > 0) return;
    setLoadingFmt(true);
    try {
      const res = await fetch(
        `${API_URL}/api/info?url=${encodeURIComponent(activeVid.videoUrl)}`
      );
      const data = await res.json();
      if (data.formats && data.formats.length > 0) {
        setFormats(data.formats);
        setDlUrl(data.formats[0].download_url);
        if (data.title && activeVid.title === "Video YouTube") {
          setActiveVid({
            ...activeVid,
            title: data.title,
            channel: data.channel || "YouTube",
          });
        }
      }
    } catch {
      setErr("Gagal mengambil pilihan kualitas.");
    } finally {
      setLoadingFmt(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0 && window.scrollY === 0) {
      const dist = e.touches[0].clientY - startY;
      if (dist > 0) setPullDist(Math.min(dist, 90));
    }
  };

  const handleTouchEnd = () => {
    if (pullDist > 65 && !loading) {
      loadVideos(cat === "Semua" ? "" : `${cat} indonesia`);
    }
    setStartY(0);
    setPullDist(0);
  };
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`min-h-screen overscroll-none flex flex-col pb-16 transition-colors ${darkMode ? "bg-[#121212] text-zinc-100" : "bg-slate-50 text-zinc-900"}`}
    >
      <div className={`sticky top-0 p-3 z-40 flex items-center gap-2 shadow transition-colors ${darkMode ? "bg-[#1a1a1a]" : "bg-white border-b border-zinc-200"}`}>
        {activeVid && (
          <button
            onClick={() => setActiveVid(null)}
            className="px-3 py-2 bg-[#282828] rounded-lg text-xs font-bold"
          >
            Kembali
          </button>
        )}
        <form onSubmit={onSearch} className="flex-1 relative flex items-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cari video atau tempel URL..."
            className={`w-full pl-3 pr-16 py-2 rounded-lg text-sm outline-none ${darkMode ? "bg-[#282828] text-zinc-100" : "bg-zinc-100 text-zinc-900"}`}
          />
          <button
            type="submit"
            className="absolute right-1 bg-orange-500 text-white px-3 py-1 rounded text-xs font-bold"
          >
            {loading ? "..." : "Cari"}
          </button>
        </form>
      </div>

      {pullDist > 15 && (
        <div className="text-center text-xs text-orange-400 py-2 bg-[#1a1a1a] border-b border-zinc-800">
          {pullDist > 65
            ? "↻ Lepas untuk memuat video baru..."
            : "↓ Tarik ke bawah untuk refresh..."}
        </div>
      )}

      {err && (
        <div className="m-3 bg-rose-950/60 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 flex justify-between">
          <span>{err}</span>
          <button onClick={() => setErr("")} className="font-bold">
            X
          </button>
        </div>
      )}

      {activeVid ? (
        <div className="flex-1 flex flex-col">
          <div className="w-full aspect-video bg-black sticky top-[56px] z-30">
            {loadingStream ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                Memuat pemutar video...
              </div>
            ) : streamUrl ? (
              <video
                src={streamUrl}
                poster={activeVid.thumbnail}
                controls
                autoPlay
                playsInline
                className="w-full h-full bg-black"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-rose-400">
                Video tidak dapat diputar
              </div>
            )}
          </div>
          <div className="p-4 bg-[#1a1a1a] border-b border-zinc-800 flex justify-between items-start gap-3">
            <div className="flex-1">
              <h1 className="text-base font-bold">{activeVid.title}</h1>
              <p className="text-xs text-zinc-400 mt-1">{activeVid.channel}</p>
            </div>
            <button
              onClick={openDownload}
              className="flex flex-col items-center shrink-0"
            >
              <div className="w-11 h-11 rounded-full bg-orange-600 flex items-center justify-center font-bold text-sm">
                DL
              </div>
              <span className="text-[11px] text-zinc-300 mt-1">Unduh</span>
            </button>
          </div>
          <div className="p-3 space-y-3">
            <h2 className="text-xs font-bold uppercase text-zinc-400">
              Video Terkait
            </h2>
            {videos
              .filter((v) => v.id !== activeVid.id)
              .map((v) => (
                <div
                  key={v.id}
                  onClick={() => openVideo(v)}
                  className="flex gap-3 bg-[#1a1a1a] p-2 rounded-xl cursor-pointer"
                >
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-36 aspect-video object-cover rounded-lg bg-[#202020]"
                  />
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold line-clamp-2">
                      {v.title}
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {v.channel}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : tab === "rumah" ? (
        <div className="flex-1 flex flex-col">
          <div className="flex gap-2 overflow-x-auto p-3">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCat(c);
                  loadVideos(c === "Semua" ? "" : `${c} indonesia`);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  cat === c
                    ? "bg-zinc-100 text-zinc-900 font-bold"
                    : "bg-[#282828] text-zinc-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex-1 p-3 space-y-4">
            {videos.length > 0 ? (
              videos.map((v) => (
                <div
                  key={v.id}
                  onClick={() => openVideo(v)}
                  className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow cursor-pointer"
                >
                  <div className="relative aspect-video bg-[#202020]">
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {v.duration || "00:00"}
                    </span>
                  </div>
                  <div className="p-3">
                    <h2 className="text-sm font-semibold line-clamp-2">
                      {v.title}
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {v.channel}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-center text-xs py-10">
                {loading ? "Memuat video..." : "Tidak ada video."}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-10 text-zinc-400 text-xs">
          {tab === "files" ? (
            <div
              style={{ backgroundColor: darkMode ? "#121212" : "#ffffff", colorScheme: darkMode ? "dark" : "light" }}
              className={`w-full min-h-screen flex flex-col pb-20 ${darkMode ? "bg-[#121212] text-zinc-100" : "bg-white text-zinc-900"}`}
            >
              {/* Header File Saya (Gambar 4) */}
              <div className="px-4 pt-4 pb-2 bg-white sticky top-0 z-20 border-b border-zinc-100">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-lg font-extrabold text-white">File Saya</h1>
                  <button
                    onClick={() => fetch(API_URL + "/api/local-files").then(r=>r.json()).then(d=>setLocalFiles(d.files||[]))}
                    className="text-xs font-semibold text-rose-500"
                  >
                    ↻ Segarkan
                  </button>
                </div>
                <div className="flex gap-6 text-sm font-bold">
                  {[
                    { id: "semua", label: "Unduh" },
                    { id: "video", label: "Video" },
                    { id: "audio", label: "Musik" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFileFilter(t.id)}
                      className={`pb-2 relative ${
                        fileFilter === t.id ? "text-white" : "text-zinc-400 font-medium"
                      }`}
                    >
                      {t.label}
                      {fileFilter === t.id && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-rose-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-header Sudah Diunduh */}
              <div className="px-4 py-2.5 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/70">
                <span>
                  Sudah Diunduh{" "}
                  <strong className="text-white ml-1">
                    {localFiles.filter((x) => fileFilter === "semua" || x.type === fileFilter).length}
                  </strong>
                </span>
                <span className="text-zinc-700 font-medium">Semua File ⌄</span>
              </div>

              {/* Daftar File Media */}
              <div className="divide-y divide-zinc-100 px-4">
                {localFiles
                  .filter((x) => fileFilter === "semua" || x.type === fileFilter)
                  .map((item, i) => (
                    <div
                      key={i}
                      onClick={() => setPlayingLocal(item)}
                      className="py-3 flex items-center gap-3 cursor-pointer active:bg-zinc-50"
                    >
                      {/* Thumbnail + Ikon Piringan CD (Gambar 4) */}
                      <div className="relative w-20 h-14 flex items-center shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-white font-bold text-lg z-10 shadow">
                          {item.type === "audio" ? "♪" : "▶"}
                        </div>
                        {item.type === "audio" && (
                          <div className="w-12 h-12 rounded-full bg-zinc-900 border-4 border-zinc-700 -ml-6 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 z-20 bg-black/75 text-white text-[9px] px-1 rounded">
                          {item.type === "audio" ? "128K" : "HD"}
                        </span>
                      </div>

                      {/* Info Judul, Format, Ukuran & Tanggal */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                          <span className="px-1 rounded bg-rose-50 text-rose-500 font-bold">
                            {item.ext || (item.type === "audio" ? "M4A" : "MP4")}
                          </span>
                          <span>{item.size}</span>
                          <span>|</span>
                          <span>{item.date || "Baru saja"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Pemutar Layar Penuh Bergaya Gambar 6 saat lagu/video diketuk */}
              {playingLocal && (
                <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-black text-white flex flex-col justify-between p-5">
                  {/* Bar Atas */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPlayingLocal(null)}
                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold"
                    >
                      ‹
                    </button>
                    <p className="text-sm font-bold truncate flex-1">
                      {playingLocal.name}
                    </p>
                  </div>

                  {/* Bagian Tengah: Piringan CD Berputar (Audio) atau Pemutar Video */}
                  <div className="flex-1 flex flex-col items-center justify-center my-4">
                    {playingLocal.type === "audio" ? (
                      <div className={`relative w-56 h-56 rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-700 border-8 border-white/10 shadow-2xl flex items-center justify-center ${isPlaying ? "animate-[spin_12s_linear_infinite]" : ""}`}>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-inner">
                          <div className="w-6 h-6 rounded-full bg-[#0f172a]" />
                        </div>
                      </div>
                    ) : (
                      <video
                        src={playingLocal.url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full aspect-video rounded-2xl bg-black shadow-2xl"
                      />
                    )}
                  </div>

                  {/* Kontrol Pemutar di Bawah (Gambar 6) */}
                  <div className="space-y-5 pb-4">
                    <div className="flex justify-around text-[11px] text-zinc-400">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-base">🎛️</span>
                        <span>Equalizer</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-base">⏱️</span>
                        <span>Pengatur waktu</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-base">🤍</span>
                        <span>Suka</span>
                      </div>
                    </div>

                    {playingLocal.type === "audio" && (
                      <div className="space-y-4">
                        <audio
                          ref={audioRef}
                          src={playingLocal.url}
                          autoPlay
                          loop={playMode === "one"}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
                          onLoadedMetadata={(e) => setDurTime(e.currentTarget.duration)}
                          onEnded={() => { if (playMode !== "one") skipTrack(1); }}
                        />

                        {/* Bilah Progres & Durasi Waktu */}
                        <div className="flex items-center gap-3 text-[11px] text-zinc-300 font-mono">
                          <span className="w-9 text-right">{fmtTime(curTime)}</span>
                          <input
                            type="range"
                            min={0}
                            max={durTime || 0}
                            value={curTime}
                            onChange={(e) => {
                              const t = Number(e.target.value);
                              setCurTime(t);
                              if (audioRef.current) audioRef.current.currentTime = t;
                            }}
                            className="flex-1 accent-white h-1 bg-white/20 rounded-lg cursor-pointer"
                          />
                          <span className="w-9">{fmtTime(durTime)}</span>
                        </div>

                        {/* 5 Tombol Kontrol Utama (Repeat, Prev, Play/Pause, Next, List) */}
                        <div className="flex items-center justify-between px-3 pt-1">
                          <button
                            onClick={togglePlayMode}
                            className={`relative text-xl active:scale-90 transition ${
                              playMode === "normal" ? "text-zinc-400" : "text-rose-400"
                            }`}
                          >
                            {playMode === "one" ? "🔂" : playMode === "shuffle" ? "🔀" : "🔁"}
                            {modeToast && (
                              <span className="absolute -top-9 left-0 whitespace-nowrap bg-black/85 text-white text-[10px] px-2.5 py-1 rounded-full border border-white/10">
                                {modeToast}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => skipTrack(-1)}
                            className="text-2xl text-white active:scale-90 transition"
                          >
                            ⏮
                          </button>

                          <button
                            onClick={() => {
                              if (!audioRef.current) return;
                              if (isPlaying) audioRef.current.pause();
                              else audioRef.current.play();
                            }}
                            className="w-16 h-16 rounded-full bg-white text-zinc-900 flex items-center justify-center text-2xl font-bold shadow-xl active:scale-95 transition"
                          >
                            {isPlaying ? "❚❚" : "▶"}
                          </button>

                          <button
                            onClick={() => skipTrack(1)}
                            className="text-2xl text-white active:scale-90 transition"
                          >
                            ⏭
                          </button>

                          <button
                            onClick={() => setPlayingLocal(null)}
                            className="text-lg text-zinc-300"
                          >
                            ≡
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            tab === "saya" ? (
  <div style={{ backgroundColor: darkMode ? "#121212" : "#f8fafc", colorScheme: darkMode ? "dark" : "light" }} className={`w-full min-h-screen flex flex-col pb-24 ${darkMode ? "bg-[#121212] text-zinc-100" : "bg-slate-50 text-white"}`}>
    {sayaToast && <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs px-4 py-2 rounded-full">{sayaToast}</div>}
    {sayaSubPage ? (
      <div className="p-4 space-y-3 bg-white min-h-screen">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
          <button onClick={() => setSayaSubPage("")} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold">‹</button>
          <h2 className="text-base font-extrabold">{sayaSubPage}</h2>
        </div>
        {sayaSubPage === "Riwayat" && watchHistory.length > 0 ? watchHistory.map((v, i) => (
          <div key={i} onClick={() => { setTab("rumah"); openVideo(v); }} className="flex gap-3 items-center py-2 border-b border-zinc-100">
            <img src={v.thumbnail} alt={v.title} className="w-28 aspect-video object-cover rounded-lg" />
            <div className="flex-1 min-w-0"><p className="text-xs font-bold line-clamp-2">{v.title}</p></div>
          </div>
        )) : <p className="text-center text-xs text-zinc-400 py-12">Belum ada data di {sayaSubPage}.</p>}
      </div>
    ) : (
      <>
        <div className={`px-4 pt-5 pb-4 shadow-sm ${darkMode ? "bg-[#1a1a1a]" : "bg-white"}`}>
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { const n = prompt("Nama profil:", userName || "Pengguna"); if (n !== null) { setUserName(n.trim()); localStorage.setItem("vidmate_user", n.trim()); } }} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${darkMode ? "border-zinc-700 bg-zinc-800 text-white" : "border-zinc-200 bg-white text-zinc-900"}`}>
              <span className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs">👤</span>
              <span className="text-sm font-bold">{userName || "Masuk"}</span>
            </button>
            <div className={`flex items-center gap-1 p-1 rounded-full border ${darkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"}`}>
              <button onClick={() => toggleTheme(false)} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${!darkMode ? "bg-amber-400 text-white shadow" : "text-zinc-400"}`}>☀</button>
              <button onClick={() => toggleTheme(true)} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${darkMode ? "bg-indigo-500 text-white shadow" : "text-zinc-400"}`}>☾</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <button onClick={() => setTab("files")} className="flex flex-col items-center gap-1.5"><div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-lg">⬇</div><span className="text-xs">File Saya</span></button>
            <button onClick={() => setSayaSubPage("Riwayat")} className="flex flex-col items-center gap-1.5"><div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center text-lg">🕒</div><span className="text-xs">Riwayat</span></button>
            <button onClick={() => setSayaSubPage("Langganan")} className="flex flex-col items-center gap-1.5"><div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-lg">▶</div><span className="text-xs">Langganan</span></button>
            <button onClick={() => setSayaSubPage("Playlist")} className="flex flex-col items-center gap-1.5"><div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-lg">☰</div><span className="text-xs">Playlist</span></button>
          </div>
        </div>
        <div className={`mx-3 mt-3 rounded-2xl p-4 shadow-sm ${darkMode ? "bg-[#1a1a1a]" : "bg-white"}`}>
          <div className="grid grid-cols-4 gap-y-5 gap-x-2 text-center">
            {[
              { icon: "↗", label: "Bagikan", msg: "Tautan disalin!" },
              { icon: "👍", label: "Like kami", msg: "Terima kasih!" },
              { icon: "⬆", label: "Memperbarui", msg: "Versi terbaru" },
              { icon: "💬", label: "Saran", msg: "Kirim masukan" },
              { icon: "❓", label: "Bantuan", msg: "Bantuan aktif" },
              { icon: "⚙", label: "Pengaturan", msg: "Folder: Download" },
              { icon: "🗑", label: "Junk Clean", msg: "Cache bersih!" },
              { icon: "🚀", label: "Boost", msg: "Dioptimalkan!" },
            ].map((m, idx) => (
              <button key={idx} onClick={() => showSayaInfo(m.msg)} className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-sm">{m.icon}</div>
                <span className="text-[11px] text-zinc-600">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-3 mt-4">
          <h2 className="text-sm font-extrabold mb-3">Video Populer</h2>
          <div className="grid grid-cols-2 gap-3">
            {videos.slice(0, 6).map((v) => (
              <div key={v.id} onClick={() => { setTab("rumah"); openVideo(v); }} className={`rounded-xl overflow-hidden shadow-sm ${darkMode ? "bg-[#1a1a1a]" : "bg-white"}`}>
                <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" />
                <p className="p-2 text-[11px] font-bold line-clamp-2">{v.title}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
) : (`Halaman ${tab.toUpperCase()}`)
          ) }
        </div>
      )}

      {showModal && activeVid && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end">
          <div style={{ backgroundColor: "#ffffff", colorScheme: "light" }} className="bg-white text-zinc-900 rounded-t-3xl p-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-start gap-3 pb-3">
              <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-zinc-200 shrink-0">
                <img
                  src={activeVid.thumbnail}
                  alt={activeVid.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] px-1 rounded">
                  {activeVid.duration || "HD"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {editName ? (
                  <input
                    type="text"
                    value={dlName}
                    onChange={(e) => setDlName(e.target.value)}
                    className="w-full border border-sky-500 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-xs font-bold line-clamp-2 leading-snug text-white">
                    {dlName || activeVid.title}
                  </h3>
                )}
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => setEditName(!editName)}
                    className="text-xs font-semibold text-sky-500"
                  >
                    {editName ? "Selesai" : "Beri Nama Baru"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 text-sm font-bold px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between py-2.5 border-y border-zinc-100 text-[11px] text-zinc-500">
              <div className="flex items-center gap-2 truncate">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px] shrink-0">
                  ↓
                </span>
                <div className="truncate">
                  <p className="text-zinc-700 font-medium truncate">
                    Jalur:/storage/emulate...0/VidMate/download/
                  </p>
                  <p className="text-[10px] text-zinc-400">44,5GB GRATIS/107,9GB</p>
                </div>
              </div>
              <span className="text-sky-500 font-semibold shrink-0 ml-2">Ubah</span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {loadingFmt ? (
                <p className="py-10 text-center text-xs text-zinc-500">
                  Mengambil pilihan kualitas...
                </p>
              ) : formats.length > 0 ? (
                <>
                  {formats.filter((x) => x.type === "audio").length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                          ♪
                        </span>
                        <span className="text-sm font-bold text-white">Musik</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {formats
                          .filter((x) => x.type === "audio")
                          .map((f, i) => {
                            const active = selIdx === `audio-${i}`;
                            return (
                              <div
                                key={i}
                                onClick={() => { setDlUrl(f.download_url); setSelIdx(`audio-${i}`); }}
                                className="flex items-start gap-2.5 cursor-pointer"
                              >
                                <div
                                  className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    active ? "border-rose-500" : "border-zinc-300"
                                  }`}
                                >
                                  {active && (
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                  )}
                                </div>
                                <div>
                                  <p
                                    className={`text-xs font-bold ${
                                      active ? "text-rose-500" : "text-white"
                                    }`}
                                  >
                                    {f.resolution}
                                  </p>
                                  <p className="text-[11px] text-zinc-400">{f.size}</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {formats.filter((x) => x.type === "video").length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="w-4 h-4 rounded bg-rose-500 text-white flex items-center justify-center text-[9px]">
                          ▶
                        </span>
                        <span className="text-sm font-bold text-white">Video</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {formats
                          .filter((x) => x.type === "video")
                          .map((f, i) => {
                            const active = selIdx === `video-${i}`;
                            return (
                              <div
                                key={i}
                                onClick={() => { setDlUrl(f.download_url); setSelIdx(`video-${i}`); }}
                                className="flex items-start gap-2.5 cursor-pointer"
                              >
                                <div
                                  className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    active ? "border-rose-500" : "border-zinc-300"
                                  }`}
                                >
                                  {active && (
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                  )}
                                </div>
                                <div>
                                  <p
                                    className={`text-xs font-bold ${
                                      active ? "text-rose-500" : "text-white"
                                    }`}
                                  >
                                    {f.resolution}
                                  </p>
                                  <p className="text-[11px] text-zinc-400">{f.size}</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-10 text-center text-xs text-zinc-500">
                  Format tidak tersedia.
                </p>
              )}
            </div>

            {dlUrl && (
              <button
                type="button"
                onClick={startModernDownload}
                className="mt-2 w-full py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 hover:opacity-95 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              >
                <span>↓</span>
                <span>UNDUH SEKARANG</span>
              </button>
            )}
          </div>
        </div>
      )}

      {dlTask && (
        <div className="fixed bottom-20 left-3 right-3 z-50 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 p-3.5 shadow-2xl text-white transition-all">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
              {dlTask.thumb ? (
                <img src={dlTask.thumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-400 font-bold text-xs">{dlTask.ext}</div>
              )}
              <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-bold text-orange-400">
                {dlTask.ext}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold truncate text-zinc-100">{dlTask.title}</p>
                <button
                  onClick={() => setDlTask(null)}
                  className="text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded-full bg-zinc-800"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                <span>
                  {dlTask.status === "downloading" && `Mengunduh... ${dlTask.loadedMB} MB / ${dlTask.totalMB} MB`}
                  {dlTask.status === "done" && `Selesai • ${dlTask.loadedMB} MB tersimpan`}
                  {dlTask.status === "error" && "Gagal mengunduh file"}
                </span>
                <span className="font-bold text-orange-400">{dlTask.progress}%</span>
              </div>
              <div className="mt-1.5 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    dlTask.status === "done"
                      ? "bg-emerald-500"
                      : dlTask.status === "error"
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-orange-500 to-rose-500"
                  }`}
                  style={{ width: `${dlTask.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 border-t p-3 flex justify-around z-40 transition-colors ${darkMode ? "bg-[#1a1a1a] border-zinc-800" : "bg-white border-zinc-200"}`}>
        {["rumah", "musik", "files", "saya"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setActiveVid(null);
            }}
            className={`text-[10px] uppercase ${
              tab === t ? "text-orange-500 font-bold" : "text-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
