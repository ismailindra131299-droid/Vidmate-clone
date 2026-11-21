from datetime import datetime
from fastapi.responses import FileResponse
import os
from urllib.parse import quote
from fastapi.responses import StreamingResponse
import urllib.request, re
import random
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str
    quality: str = "best"

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
    except:
        return "00:00"

@app.get("/api/trending")
async def get_trending_videos():
    try:
        ydl_opts = {'format': 'best', 'noplaylist': True, 'quiet': True, 'extract_flat': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info("ytsearch25:musik indonesia terbaru 2026", download=False)
            videos = []
            if 'entries' in info_dict:
                for entry in info_dict['entries']:
                    video_id = entry.get("id", "")
                    if not video_id:
                        continue
                    img_url = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                    videos.append({
                        "id": video_id,
                        "title": entry.get("title", "Video Tanpa Judul"),
                        "channel": entry.get("uploader", "Saluran Tidak Diketahui"),
                        "views": "Rekomendasi",
                        "time": "Hari ini",
                        "duration": format_duration(entry.get("duration")),
                        "thumbnail": img_url,
                        "videoUrl": f"https://youtube.com/watch?v={video_id}"
                    })
                random.shuffle(videos)
            return {"status": "success", "videos": videos}
    except:
        return {"status": "fallback", "videos": []}

@app.get("/api/search")
async def search_videos(q: str = ""):
    try:
        ydl_opts = {'format': 'best', 'noplaylist': True, 'quiet': True, 'extract_flat': True}
        videos = []
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            keyword_search = q.strip() if q.strip() else "lagu tren indonesia terupdate"
            info_dict = ydl.extract_info(f"ytsearch12:{keyword_search}", download=False)
            if 'entries' in info_dict:
                for entry in info_dict['entries']:
                    video_id = entry.get("id", "")
                    if not video_id:
                        continue
                    img_url = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                    videos.append({
                        "id": video_id,
                        "title": entry.get("title", "Video"),
                        "channel": entry.get("uploader", "Unknown"),
                        "views": "Hasil Pencarian",
                        "time": "Baru",
                        "duration": format_duration(entry.get("duration")),
                        "thumbnail": img_url,
                        "videoUrl": f"https://youtube.com/watch?v={video_id}"
                    })
        return {"status": "success", "videos": videos}
    except Exception as e:
        return {"status": "error", "message": str(e), "videos": []}

@app.post("/api/download")
async def download_video(request: DownloadRequest):
    try:
        input_user = request.url.strip()
        is_url = re.match(r'^https?://', input_user)
        url_target = input_user if is_url else f"ytsearch1:{input_user}"
        ydl_opts = {'format': 'bestvideo+bestaudio/best', 'noplaylist': True, 'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url_target, download=False)
            if 'entries' in info_dict:
                if len(info_dict['entries']) > 0:
                    info_dict = info_dict['entries']
                else:
                    raise HTTPException(status_code=404, detail="Video tidak ditemukan")
            download_url = info_dict.get('url')
            if not download_url and 'formats' in info_dict:
                valid_formats = [f for f in info_dict['formats'] if f.get('url')]
                if valid_formats:
                    download_url = valid_formats[-1]['url']
            if not download_url:
                raise HTTPException(status_code=400, detail="Tautan unduhan tidak ditemukan")
            return {
                "status": "success",
                "title": info_dict.get('title', 'Video'),
                "download_url": download_url
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/info")
def get_video_info(url: str):
    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extractor_args": {"youtube": {"player_client": ["tv_embedded", "web_creator", "android"]}}
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            seen = set()
            fallback_url = ""
            base_size = 0
            for fmt in info.get("formats", []):
                u = fmt.get("url")
                if not u or ".m3u8" in u:
                    continue
                if not fallback_url and fmt.get("vcodec") != "none" and fmt.get("acodec") != "none":
                    fallback_url = u
                    base_size = fmt.get("filesize") or fmt.get("filesize_approx") or 8000000
                ext = fmt.get("ext", "")
                vcodec = fmt.get("vcodec", "none")
                acodec = fmt.get("acodec", "none")
                size_b = fmt.get("filesize") or fmt.get("filesize_approx") or 0
                size_str = f"{round(size_b / (1024*1024), 2)} MB" if size_b else "Otomatis"
                if vcodec == "none" and acodec != "none" and ext in ["m4a", "webm", "mp3"]:
                    abr = int(fmt.get("abr") or 128)
                    label = f"{abr}K ({ext.upper()})"
                    if label not in seen:
                        seen.add(label)
                        formats.append({"type": "audio", "resolution": label, "ext": ext, "size": size_str, "download_url": u})
                elif vcodec != "none" and ext in ["mp4", "webm"]:
                    h = fmt.get("height")
                    if h:
                        label = f"{h}P (MP4)"
                        if label not in seen:
                            seen.add(label)
                            pass

            # Lengkapi pilihan Musik & Video standar jika YouTube hanya mengirim 1 stream dari HP
            if fallback_url:
                mb = round(base_size / (1024 * 1024), 2)
                for a_lbl, mult in [("128K (M4A)", 0.45), ("128K (MP3)", 0.48), ("48K (MP3)", 0.2), ("256K (MP3)", 0.85)]:
                    if a_lbl not in seen and len([x for x in formats if x["type"] == "audio"]) < 4:
                        seen.add(a_lbl)
                        formats.append({"type": "audio", "resolution": a_lbl, "ext": "m4a", "size": f"{round(mb*mult, 2)} MB", "download_url": fallback_url})
                for v_lbl, mult in [("144P (MP4)", 0.4), ("240P (MP4)", 0.65), ("360P (MP4)", 1.0), ("480P (MP4)", 1.45)]:
                    if v_lbl not in seen and len([x for x in formats if x["type"] == "video"]) < 4:
                        seen.add(v_lbl)
                        formats.append({"type": "video", "resolution": v_lbl, "ext": "mp4", "size": f"{round(mb*mult, 2)} MB", "download_url": fallback_url})

            return {
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "formats": formats
            }
    except Exception as e:
        import json
        vid_match = re.search(r'(?:v=|youtu\.be/|embed/)([a-zA-Z0-9_-]{11})', url)
        vid_id = vid_match.group(1) if vid_match else url.strip()
        for inst in ["https://kavin.rocks", "https://tokhmi.xyz", "https://piped.yt"]:
            try:
                req = urllib.request.Request(f"{inst}/streams/{vid_id}", headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    pdata = json.loads(resp.read().decode())
                pformats = []
                for a in pdata.get("audioStreams", []):
                    if a.get("url"):
                        br = int((a.get("bitrate") or 128000) / 1000)
                        ext = "m4a" if "m4a" in (a.get("format") or "").lower() else "mp3"
                        sz = f"{round((a.get('contentLength') or 2500000)/(1024*1024), 2)} MB"
                        pformats.append({"type": "audio", "resolution": f"{br}K ({ext.upper()})", "ext": ext, "size": sz, "download_url": a["url"]})
                for v in pdata.get("videoStreams", []):
                    if v.get("url") and not v.get("videoOnly"):
                        q = v.get("quality") or "360p"
                        sz = f"{round((v.get('contentLength') or 8000000)/(1024*1024), 2)} MB"
                        pformats.append({"type": "video", "resolution": f"{q.upper()} (MP4)", "ext": "mp4", "size": sz, "download_url": v["url"]})
                if pformats:
                    return {
                        "title": pdata.get("title", "Video"),
                        "thumbnail": pdata.get("thumbnailUrl", f"https://ytimg.com{vid_id}/hqdefault.jpg"),
                        "formats": pformats
                    }
            except Exception:
                continue
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stream")
async def stream_video(id: str):
    try:
        ydl_opts = {"quiet": True, "extractor_args": {"youtube": {"player_client": ["android"]}}}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://youtu.be/{id}", download=False)
            url = info.get("url", "")
            if not url:
                for fmt in reversed(info.get("formats", [])):
                    if fmt.get("vcodec") != "none" and fmt.get("acodec") != "none" and fmt.get("ext") == "mp4" and fmt.get("url"):
                        url = fmt["url"]
                        break
            return {"stream_url": url}
    except Exception as e:
        return {"stream_url": "", "error": str(e)}


@app.get("/api/download/{filename}")
def download_file(filename: str, url: str):
    safe_name = "".join(c for c in filename if c not in "\\/*?:<>|").strip() or "media"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req)
    def iterfile():
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            yield chunk
    ascii_name = safe_name.encode("ascii", "ignore").decode() or "media.mp4"
    headers = {"Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(safe_name)}"}
    if resp.headers.get("Content-Length"):
        headers["Content-Length"] = resp.headers.get("Content-Length")
    return StreamingResponse(iterfile(), media_type="application/octet-stream", headers=headers)


STORAGE_ROOTS = [
    "/storage/emulated/0",
    os.path.expanduser("~/storage/shared"),
]
STORAGE_ROOT = next((p for p in STORAGE_ROOTS if os.path.exists(p)), os.path.expanduser("~/storage/downloads"))

AUDIO_EXTS = (".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac")
VIDEO_EXTS = (".mp4", ".mkv", ".webm", ".mov", ".3gp", ".avi")
SKIP_DIRS = {"Android", ".thumbnails", ".cache", "cache", "tmp", ".git", "node_modules"}

def scan_all_device_media():
    items = []
    seen_paths = set()
    if not os.path.exists(STORAGE_ROOT):
        return items
    for root, dirs, files in os.walk(STORAGE_ROOT):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in SKIP_DIRS]
        for fname in files:
            if fname.startswith("."):
                continue
            low = fname.lower()
            if not (low.endswith(AUDIO_EXTS) or low.endswith(VIDEO_EXTS)):
                continue
            fpath = os.path.join(root, fname)
            if fpath in seen_paths:
                continue
            seen_paths.add(fpath)
            try:
                stat = os.stat(fpath)
                size_mb = round(stat.st_size / (1024 * 1024), 2)
                if size_mb < 0.05:
                    continue
                mtime_raw = stat.st_mtime
                mtime = datetime.fromtimestamp(mtime_raw).strftime("%Y-%m-%d")
                ext = fname.rsplit(".", 1)[-1].upper()
                is_audio = low.endswith(AUDIO_EXTS)
                folder_name = os.path.basename(root) or "Internal"
                items.append({
                    "name": fname,
                    "folder": folder_name,
                    "size": f"{size_mb} MB",
                    "date": mtime,
                    "mtime": mtime_raw,
                    "ext": ext,
                    "type": "audio" if is_audio else "video",
                    "url": f"http://localhost:5000/api/local-media?path={quote(fpath)}"
                })
            except Exception:
                continue
    items.sort(key=lambda x: x["mtime"], reverse=True)
    return items

@app.get("/api/local-files")
def list_local_files():
    return {"files": scan_all_device_media()}

@app.get("/api/local-media")
def serve_local_media_by_path(path: str):
    real_root = os.path.realpath(STORAGE_ROOT)
    real_path = os.path.realpath(path)
    if real_path.startswith(real_root) and os.path.isfile(real_path):
        return FileResponse(real_path)
    raise HTTPException(status_code=404, detail="File tidak ditemukan")

@app.get("/api/local-media/{filename}")
def serve_local_media(filename: str):
    from urllib.parse import unquote
    for item in scan_all_device_media():
        if item["name"] == filename:
            raw_path = item["url"].split("path=", 1)[-1]
            fpath = unquote(raw_path)
            if os.path.isfile(fpath):
                return FileResponse(fpath)
    raise HTTPException(status_code=404, detail="File tidak ditemukan")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
