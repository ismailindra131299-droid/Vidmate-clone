// Konfigurasi URL Backend API Anda (Sesuaikan port jika berbeda)
const BACKEND_API_URL = 'http://localhost:5000/api/download';

export interface VideoInfo {
  status: string;
  message: string;
  target_url: string;
  quality?: string;
}

/**
 * Fungsi untuk mengirim URL video ke backend VidMate Clone untuk diproses
 * @param videoUrl Tautan video dari YouTube, TikTok, dll.
 * @param quality Pilihan kualitas video (default: best)
 */
export const extractVideo = async (videoUrl: string, quality: string = 'best'): Promise<VideoInfo> => {
  try {
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: videoUrl,
        quality: quality,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Gagal mengekstrak video dari server');
    }

    const data: VideoInfo = await response.json();
    return data;
  } catch (error) {
    console.error('Extractor Error:', error);
    throw error;
  }
};
