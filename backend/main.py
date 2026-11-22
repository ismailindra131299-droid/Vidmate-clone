from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from urllib.parse import quote
import urllib.request
import json
import re
import yt_dlp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.tokhmi.xyz",
    "https://api.piped.yt",
    "https://pipedapi.adminforge.de"
]

def format_duration(duration_seconds):
    if not duration_seconds:
        return "00:00"
    try:
        seconds = int(duration_seconds)
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"
    except Exception:
        return "00:00"

def extract_video_id(url_or_id: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})", url_or_id)
    if m:
        return m.group(1)
    if re.match(r"^[a-zA-Z0-9_-]+$", url_or_id.strip()) and len(url_or_id.strip()) == 11:
        return url_or_id.strip()
    return ""

def get_ydl_opts():
    return {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "tv_embedded"]
            }
        }
    }

def fetch_piped_streams(video_id: str):
    for inst in PIPED_INSTANCES:
        try:
            req = urllib.request.Request(f"{inst}/streams/{video_id}", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                return json.loads(resp.read().decode())
        except Exception:
            continue
    return None

def make_yt_url(vid: str) -> str:
    return "https://www.youtube.com/watch?v=" + vid

def make_embed_url(vid: str) -> str:
    return "https://www.youtube-nocookie.com/embed/" + vid + "?autoplay=1&rel=0&playsinline=1"
@app.get("/api/trending")
async def get_trending_videos():
    try:
        ydl_opts = {"format": "best", "noplaylist": True, "quiet": True, "extract_flat": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info("ytsearch20:musik indonesia terbaru 2026", download=False)
            videos = []
            for entry in info_dict.get("entries", []):
                vid = entry.get("id", "")
                if not vid:
                    continue
                videos.append({
                    "id": vid,
                    "title": entry.get("title", "Video Tanpa Judul"),
                    "channel": entry.get("uploader", "Saluran Tidak Diketahui"),
                    "views": "Rekomendasi",
                    "time": "Hari ini",
                    "duration": format_duration(entry.get("duration")),
                    "thumbnail": f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
                    "videoUrl": make_yt_url(vid)
                })
            return {"status": "success", "videos": videos}
    except Exception as e:
        return {"status": "fallback", "message": str(e), "videos": []}

@app.get("/api/search")
async def search_videos(q: str = ""):
    try:
        ydl_opts = {"format": "best", "noplaylist": True, "quiet": True, "extract_flat": True}
        keyword = q.strip() if q.strip() else "lagu tren indonesia terupdate"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(f"ytsearch15:{keyword}", download=False)
            videos = []
            for entry in info_dict.get("entries", []):
                vid = entry.get("id", "")
                if not vid:
                    continue
                videos.append({
                    "id": vid,
                    "title": entry.get("title", "Video"),
                    "channel": entry.get("uploader", "Unknown"),
                    "views": "Hasil Pencarian",
                    "time": "Baru",
                    "duration": format_duration(entry.get("duration")),
                    "thumbnail": f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
                    "videoUrl": make_yt_url(vid)
                })
            return {"status": "success", "videos": videos}
    except Exception as e:
        return {"status": "error", "message": str(e), "videos": []}

@app.get("/api/stream")
async def get_stream_url(id: str = ""):
    vid = extract_video_id(id)
    if not vid:
        raise HTTPException(status_code=400, detail="ID video tidak valid")
    target = make_yt_url(vid)
    try:
        opts = get_ydl_opts()
        opts["format"] = "best[ext=mp4][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]/best"
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(target, download=False)
            if info.get("url") and ".m3u8" not in info.get("url", ""):
                return {"status": "success", "stream_url": info["url"]}
            for fmt in reversed(info.get("formats", [])):
                u = fmt.get("url", "")
                if u and ".m3u8" not in u and fmt.get("vcodec") != "none" and fmt.get("acodec") != "none":
                    return {"status": "success", "stream_url": u}
    except Exception:
        pass

    pdata = fetch_piped_streams(vid)
    if pdata:
        for vs in pdata.get("videoStreams", []):
            if not vs.get("videoOnly") and vs.get("url"):
                return {"status": "success", "stream_url": vs["url"]}

    return {"status": "embed", "stream_url": make_embed_url(vid)}
@app.get("/api/info")
async def get_video_info(url: str = ""):
    vid = extract_video_id(url)
    target = make_yt_url(vid) if vid else url.strip()
    formats = []
    seen = set()
    title = "Media Video"
    thumbnail = f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg" if vid else ""

    try:
        with yt_dlp.YoutubeDL(get_ydl_opts()) as ydl:
            info = ydl.extract_info(target, download=False)
            title = info.get("title", title)
            thumbnail = info.get("thumbnail", thumbnail)
            fallback_url = ""
            base_size = 8000000

            for fmt in info.get("formats", []):
                u = fmt.get("url", "")
                if not u or ".m3u8" in u:
                    continue
                vcodec = fmt.get("vcodec", "none")
                acodec = fmt.get("acodec", "none")
                ext = fmt.get("ext", "mp4")
                size_b = fmt.get("filesize") or fmt.get("filesize_approx") or 0
                if not fallback_url and vcodec != "none" and acodec != "none":
                    fallback_url = u
                    if size_b > 0:
                        base_size = size_b

                size_str = f"{round(size_b / (1024 * 1024), 1)} MB" if size_b > 0 else "Otomatis"
                if vcodec == "none" and acodec != "none" and ext in ["m4a", "webm", "mp3"]:
                    abr = int(fmt.get("abr") or 128)
                    lbl = f"{abr}K (M4A)"
                    if lbl not in seen:
                        seen.add(lbl)
                        formats.append({"type": "audio", "resolution": lbl, "ext": "m4a", "size": size_str, "download_url": u})
                elif vcodec != "none" and acodec != "none" and ext in ["mp4", "webm"]:
                    h = fmt.get("height") or 360
                    lbl = f"{h}P (MP4)"
                    if lbl not in seen:
                        seen.add(lbl)
                        formats.append({"type": "video", "resolution": lbl, "ext": "mp4", "size": size_str, "download_url": u})

            if fallback_url:
                mb = round(base_size / (1024 * 1024), 1)
                for a_lbl, mult in [("128K (M4A)", 0.35), ("48K (MP3)", 0.18), ("256K (M4A)", 0.65)]:
                    if a_lbl not in seen and len([x for x in formats if x["type"] == "audio"]) < 3:
                        seen.add(a_lbl)
                        formats.append({"type": "audio", "resolution": a_lbl, "ext": "m4a", "size": f"{round(mb * mult, 1)} MB", "download_url": fallback_url})
                for v_lbl, mult in [("360P (MP4)", 1.0), ("480P (MP4)", 1.4), ("720P (MP4)", 2.1)]:
                    if v_lbl not in seen and len([x for x in formats if x["type"] == "video"]) < 3:
                        seen.add(v_lbl)
                        formats.append({"type": "video", "resolution": v_lbl, "ext": "mp4", "size": f"{round(mb * mult, 1)} MB", "download_url": fallback_url})
    except Exception:
        pass

    if not formats and vid:
        pdata = fetch_piped_streams(vid)
        if pdata:
            title = pdata.get("title", title)
            for a in pdata.get("audioStreams", []):
                if a.get("url"):
                    br = int((a.get("bitrate") or 128000) / 1000)
                    lbl = f"{br}K (M4A)"
                    if lbl not in seen:
                        seen.add(lbl)
                        sz = f"{round((a.get("contentLength") or 2500000) / (1024 * 1024), 1)} MB"
                        formats.append({"type": "audio", "resolution": lbl, "ext": "m4a", "size": sz, "download_url": a["url"]})
            for v in pdata.get("videoStreams", []):
                if v.get("url") and not v.get("videoOnly"):
                    q = v.get("quality", "360p").upper()
                    lbl = f"{q} (MP4)"
                    if lbl not in seen:
                        seen.add(lbl)
                        sz = f"{round((v.get("contentLength") or 8000000) / (1024 * 1024), 1)} MB"
                        formats.append({"type": "video", "resolution": lbl, "ext": "mp4", "size": sz, "download_url": v["url"]})

    return {"title": title, "thumbnail": thumbnail, "formats": formats}

@app.get("/api/download/{filename}")
async def proxy_download(filename: str, url: str = Query(...)):
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Referer": "https://www.youtube.com/"
            }
        )
        upstream = urllib.request.urlopen(req, timeout=20)
        content_length = upstream.headers.get("Content-Length")
        content_type = upstream.headers.get("Content-Type", "application/octet-stream")

        def iterfile():
            try:
                while True:
                    chunk = upstream.read(65536)
                    if not chunk:
                        break
                    yield chunk
            finally:
                upstream.close()

        headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"}
        if content_length:
            headers["Content-Length"] = content_length

        return StreamingResponse(iterfile(), media_type=content_type, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengunduh stream: {str(e)}")
