import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

// 1. ENDPOINT UNTUK MENGAMBIL INFO VIDEO (FITUR UTAMA YANG ANDA TANYAKAN)
app.post('/api/video-info', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL tidak boleh kosong' });

    // Perintah yt-dlp untuk mengambil Judul, Channel, dan Durasi dalam format JSON
    const command = `yt-dlp --dump-json --skip-download "${url}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Gagal memuat informasi video' });
        }
        try {
            const info = JSON.parse(stdout);
            res.json({
                success: true,
                title: info.title,
                channel: info.uploader,
                duration: info.duration_string,
                view_count: info.view_count
            });
        } catch (e) {
            res.status(500).json({ error: 'Gagal memproses data video' });
        }
    });
});

// 2. ENDPOINT PROSES UNDUHAN
app.post('/api/download', (req, res) => {
    const { url, format } = req.body;
    const outputDir = '/sdcard/Download/%(title)s.%(ext)s';
    
    // Pilih format video atau hanya audio berdasarkan input tombol kustom
    const formatOption = format.includes('MP3') ? 'bestaudio' : 'bestvideo+bestaudio/best';
    const command = `yt-dlp -o "${outputDir}" -f "${formatOption}" "${url}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: 'Gagal mengunduh' });
        res.json({ success: true, message: 'Unduhan selesai! Cek folder Download.' });
    });
});

app.listen(8080, () => console.log('Backend aktif di port 8080'));
