from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

# Mencegah error CORS saat diakses oleh Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str
    quality: str = "best"

@app.get("/api/trending")
async def get_trending_videos():
    try:
        ydl_opts = {
            'extract_flat': 'in_playlist',
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'playlistend': 10 
        }
        # Mengambil tren YouTube Indonesia secara real-time
        trending_url = "ytsearch10:trending indonesia"
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_results = ydl.extract_info(trending_url, download=False)
            
        video_list = []
        if 'entries' in search_results:
            for entry in search_results['entries']:
                if not entry:
                    continue
                
                duration_raw = entry.get('duration', 0) or 0
                menit = duration_raw // 60
                detik = duration_raw % 60
                
                video_list.append({
                    "id": entry.get('id'),
                    "title": entry.get('title', 'Video Tanpa Judul'),
                    "channel": entry.get('uploader', 'Channel Media'),
                    "views": f"{int(entry.get('view_count', 0)/1000)} rb ditonton" if entry.get('view_count') else "Baru saja",
                    "time": "Hari ini",
                    "duration": f"{menit}:{detik:02d}",
                    "thumbnail": f"https://youtube.com{entry.get('id')}/mqdefault.jpg",
                    "videoUrl": f"https://youtube.com{entry.get('id')}"
                })
        return {"status": "success", "videos": video_list}
        
    except Exception as e:
        # Fallback data jika Termux kehilangan koneksi internet sesaat
        return {
            "status": "fallback",
            "videos": [
                {
                    "id": "fallback1",
                    "title": "Gagal memuat tren otomatis. Pastikan Termux terhubung internet.",
                    "channel": "System Security",
                    "views": "0 ditonton",
                    "time": "Now",
                    "duration": "00:00",
                    "thumbnail": "https://picsum.photos",
                    "videoUrl": ""
                }
            ]
        }

@app.post("/api/download")
async def download_video(request: DownloadRequest):
    try:
        url_target = request.url
        kualitas_user = request.quality
        
        format_rule = "bestvideo+bestaudio/best" if kualitas_user == "best" else "best"
        
        ydl_opts = {
            'format': format_rule,
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'nocheckcertificate': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url_target, download=False)
            
        if not info_dict:
            raise HTTPException(status_code=400, detail="Gagal membaca informasi video.")
            
        title = info_dict.get('title', 'Video Tanpa Judul')
        thumbnail = info_dict.get('thumbnail') or f"https://youtube.com{info_dict.get('id')}/mqdefault.jpg"
        
        duration_raw = info_dict.get('duration', 0) or 0
        duration_str = f"{duration_raw // 60}:{duration_raw % 60:02d}"
        
        # Ekstraksi URL Download langsung (.mp4)
        download_url = info_dict.get('url', None)
        if not download_url and 'formats' in info_dict:
            valid_formats = [f for f in info_dict['formats'] if f.get('url')]
            if valid_formats:
                # Ambil format terbaik yang memiliki link direct URL
                download_url = valid_formats[-1]['url']
                
        if not download_url:
            raise HTTPException(status_code=400, detail="Tautan unduhan langsung tidak ditemukan.")
            
        return {
            "status": "success",
            "message": "Video berhasil diekstrak",
            "title": title,
            "thumbnail": thumbnail,
            "duration": duration_str,
            "download_url": download_url,
            "target_url": url_target
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
