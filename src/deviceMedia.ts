import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export interface DeviceMediaItem {
  name: string;
  folder?: string;
  size: string;
  date: string;
  ext: string;
  type: "audio" | "video";
  url: string;
}

const AUDIO_EXTS = [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"];
const VIDEO_EXTS = [".mp4", ".mkv", ".webm", ".mov", ".3gp", ".avi"];
const SKIP_DIRS = new Set(["Android", ".thumbnails", ".cache", "cache", "tmp"]);

async function walkNativeFolder(relPath: string, results: DeviceMediaItem[], depth = 0) {
  if (depth > 4) return;
  try {
    const res = await Filesystem.readdir({
      path: relPath,
      directory: Directory.ExternalStorage,
    });

    for (const entry of res.files) {
      const name = typeof entry === "string" ? entry : entry.name;
      if (!name || name.startsWith(".") || SKIP_DIRS.has(name)) continue;
      const fullRel = relPath ? `${relPath}/${name}` : name;
      const entryType = typeof entry === "string" ? "" : entry.type;

      if (entryType === "directory") {
        await walkNativeFolder(fullRel, results, depth + 1);
      } else {
        const low = name.toLowerCase();
        const isAudio = AUDIO_EXTS.some((e) => low.endsWith(e));
        const isVideo = VIDEO_EXTS.some((e) => low.endsWith(e));
        if (!isAudio && !isVideo) continue;

        const sizeBytes = typeof entry === "string" ? 0 : Number(entry.size || 0);
        const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
        const mtime = typeof entry === "string" ? Date.now() : Number(entry.mtime || Date.now());
        const dateStr = new Date(mtime).toISOString().slice(0, 10);
        const ext = name.split(".").pop()?.toUpperCase() || "FILE";

        const uriRes = await Filesystem.getUri({
          path: fullRel,
          directory: Directory.ExternalStorage,
        });
        const playableUrl = Capacitor.convertFileSrc(uriRes.uri);

        results.push({
          name,
          folder: relPath.split("/").pop() || "Internal",
          size: `${sizeMb} MB`,
          date: dateStr,
          ext,
          type: isAudio ? "audio" : "video",
          url: playableUrl,
        });
      }
    }
  } catch {
    // Lewati folder terkunci
  }
}

export async function getAllUserMedia(apiUrl: string): Promise<DeviceMediaItem[]> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Filesystem.checkPermissions();
      if (perm.publicStorage !== "granted") {
        await Filesystem.requestPermissions();
      }
      const items: DeviceMediaItem[] = [];
      await walkNativeFolder("", items, 0);
      return items;
    } catch {
      return [];
    }
  }

  try {
    const res = await fetch(`${apiUrl}/api/local-files`);
    const data = await res.json();
    return Array.isArray(data.files) ? data.files : [];
  } catch {
    return [];
  }
}
