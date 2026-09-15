import os
import re
import sys
import subprocess
import unicodedata
from typing import Callable, Optional, Dict, Any, List
import yt_dlp
from yt_dlp.utils import sanitize_filename

try:
    import mutagen
    from mutagen.id3 import ID3, TIT2, TPE1, TALB, TYER, TCON, APIC, ID3NoHeaderError
    from mutagen.mp4 import MP4, MP4Cover
    from mutagen.flac import FLAC, Picture
except ImportError:
    mutagen = None

from platform_utils import find_ffmpeg, sync_to_system_music_library

FFMPEG_PATH = find_ffmpeg()

class YouTubeDownloader:
    def __init__(self, output_dir: str = "downloads"):
        self.output_dir = os.path.abspath(output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

    @staticmethod
    def clean_urls(raw_input: str) -> List[str]:
        """Extract valid URLs from input string."""
        lines = re.split(r'[\r\n,]+', raw_input.strip())
        urls = []
        for line in lines:
            line = line.strip()
            if line.startswith("http://") or line.startswith("https://"):
                urls.append(line)
        return urls

    @staticmethod
    def normalize_string(s: str) -> str:
        """Normalize string for fuzzy comparison."""
        if not s:
            return ""
        for ext in [".mp3", ".m4a", ".flac", ".wav", ".m4r", ".mp4", ".aac"]:
            if s.lower().endswith(ext):
                s = s[:-len(ext)]
                break
        s = unicodedata.normalize('NFKD', s)
        s = re.sub(r'[\W_]+', '', s.lower())
        return s

    def is_already_downloaded(self, title: str, folder: Optional[str] = None) -> Optional[str]:
        """Check if an audio/video file matching title already exists."""
        target_dir = os.path.abspath(folder) if folder else self.output_dir
        if not os.path.isdir(target_dir):
            return None

        # 1. Exact sanitized check
        sanitized = sanitize_filename(title)
        for ext in [".mp3", ".m4a", ".flac", ".wav", ".mp4", ".m4r"]:
            exact = os.path.join(target_dir, f"{sanitized}{ext}")
            if os.path.isfile(exact) and os.path.getsize(exact) > 10240:
                return f"{sanitized}{ext}"

        # 2. Normalized check
        norm_title = self.normalize_string(title)
        if not norm_title:
            return None

        valid_exts = (".mp3", ".m4a", ".flac", ".wav", ".mp4", ".m4r")
        try:
            for entry in os.scandir(target_dir):
                if entry.is_file() and entry.name.lower().endswith(valid_exts) and entry.stat().st_size > 10240:
                    if self.normalize_string(entry.name) == norm_title:
                        return entry.name
        except Exception:
            pass

        return None

    def search_youtube(self, query: str, limit: int = 12) -> List[Dict[str, Any]]:
        """Search YouTube directly via yt-dlp (100% free, zero external API keys)."""
        if not query or not query.strip():
            return []

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'skip_download': True,
        }

        search_query = f"ytsearch{limit}:{query.strip()}"
        results = []

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(search_query, download=False)
                entries = info.get('entries', [])
                for e in entries:
                    if not e:
                        continue
                    v_id = e.get('id')
                    results.append({
                        "id": v_id,
                        "title": e.get('title', 'Unknown Title'),
                        "uploader": e.get('uploader') or e.get('channel', ''),
                        "duration": e.get('duration'),
                        "thumbnail": e.get('thumbnail') or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
                        "url": e.get('url') or f"https://www.youtube.com/watch?v={v_id}"
                    })
            except Exception as err:
                print(f"Search error: {err}")

        return results

    def resolve_urls(self, raw_input: str) -> List[Dict[str, Any]]:
        """Resolve URLs into flat list of tracks with playlist support."""
        urls = self.clean_urls(raw_input)
        resolved = []

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'skip_download': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            for url in urls:
                try:
                    info = ydl.extract_info(url, download=False)
                    if not info:
                        resolved.append({"url": url, "title": "فيديو يوتيوب", "is_playlist": False})
                        continue

                    if 'entries' in info and info['entries']:
                        playlist_title = info.get('title', 'قائمة تشغيل')
                        entries = [e for e in info['entries'] if e]
                        total = len(entries)
                        for idx, e in enumerate(entries, start=1):
                            entry_id = e.get('id')
                            entry_url = e.get('url') or (f"https://www.youtube.com/watch?v={entry_id}" if entry_id else url)
                            entry_title = e.get('title') or f"مقطع {idx} من {playlist_title}"
                            resolved.append({
                                "url": entry_url,
                                "title": entry_title,
                                "is_playlist": True,
                                "playlist_title": playlist_title,
                                "playlist_index": idx,
                                "playlist_total": total,
                                "duration": e.get('duration'),
                                "thumbnail": e.get('thumbnail')
                            })
                    else:
                        resolved.append({
                            "url": info.get('webpage_url', url),
                            "title": info.get('title', 'فيديو يوتيوب'),
                            "is_playlist": False,
                            "duration": info.get('duration'),
                            "thumbnail": info.get('thumbnail'),
                            "uploader": info.get('uploader') or info.get('channel', '')
                        })
                except Exception as err:
                    resolved.append({"url": url, "title": url, "is_playlist": False, "error": str(err)})

        return resolved

    def get_info(self, url: str) -> Dict[str, Any]:
        """Fetch metadata preview for single video or playlist."""
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("تعذر جلب معلومات هذا الرابط")

            is_playlist = 'entries' in info and info['entries']
            if is_playlist:
                entries = list(info.get('entries', []))
                return {
                    "is_playlist": True,
                    "id": info.get('id'),
                    "title": info.get('title', 'قائمة تشغيل غير معنونة'),
                    "count": len(entries),
                    "entries": [
                        {
                            "id": e.get('id'),
                            "title": e.get('title', 'مقطع'),
                            "duration": e.get('duration'),
                            "url": e.get('url') or f"https://www.youtube.com/watch?v={e.get('id')}"
                        }
                        for e in entries if e
                    ]
                }
            else:
                return {
                    "is_playlist": False,
                    "id": info.get('id'),
                    "title": info.get('title', 'فيديو يوتيوب'),
                    "duration": info.get('duration'),
                    "thumbnail": info.get('thumbnail'),
                    "uploader": info.get('uploader') or info.get('channel', ''),
                    "url": info.get('webpage_url', url)
                }

    def download_item(
        self,
        url: str,
        quality: str = "320",
        audio_format: str = "mp3",
        embed_thumbnail: bool = True,
        embed_metadata: bool = True,
        rate_limit_kbps: Optional[int] = None,
        custom_folder: Optional[str] = None,
        progress_hook: Optional[Callable[[Dict[str, Any]], None]] = None,
        postprocessor_hook: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """Download a single item with format, speed limit, and tag embedding."""
        target_dir = os.path.abspath(custom_folder) if custom_folder else self.output_dir
        os.makedirs(target_dir, exist_ok=True)

        is_video = (audio_format.lower() == "mp4")
        outtmpl = os.path.join(target_dir, "%(title)s.%(ext)s")

        ydl_opts: Dict[str, Any] = {
            'outtmpl': outtmpl,
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': False,
            'nocheckcertificate': True,
            'overwrites': False,
            'noplaylist': True,
        }

        # Bandwidth Limiter
        if rate_limit_kbps and rate_limit_kbps > 0:
            ydl_opts['ratelimit'] = rate_limit_kbps * 1024  # bytes per second

        if is_video:
            ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            postprocessors = []
            if embed_metadata:
                postprocessors.append({'key': 'FFmpegMetadata'})
            if embed_thumbnail:
                postprocessors.append({'key': 'EmbedThumbnail', 'already_have_thumbnail': False})
            ydl_opts['postprocessors'] = postprocessors
            ydl_opts['writethumbnail'] = embed_thumbnail
        else:
            codec = 'mp3'
            if audio_format in ['m4a', 'flac', 'wav', 'aac']:
                codec = audio_format

            postprocessors = [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': codec,
                    'preferredquality': quality,
                }
            ]

            if embed_metadata:
                postprocessors.append({'key': 'FFmpegMetadata'})

            if embed_thumbnail and codec in ['mp3', 'm4a']:
                postprocessors.append({'key': 'EmbedThumbnail', 'already_have_thumbnail': False})

            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = postprocessors
            ydl_opts['writethumbnail'] = embed_thumbnail and codec in ['mp3', 'm4a']

        hooks = []
        if progress_hook:
            hooks.append(progress_hook)
        ydl_opts['progress_hooks'] = hooks

        pp_hooks = []
        if postprocessor_hook:
            pp_hooks.append(postprocessor_hook)
        ydl_opts['postprocessor_hooks'] = pp_hooks

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return info

    # ==========================================
    # PRO & ADVANCED AUDIO ENGINEERING METHODS
    # ==========================================

    @staticmethod
    def trim_audio(input_file: str, start_sec: float, end_sec: float, output_file: str, is_ringtone: bool = False) -> bool:
        """Trim audio file using local FFmpeg."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        duration = max(0.1, end_sec - start_sec)
        codec = "aac" if is_ringtone else "libmp3lame"
        bitrate = "256k" if is_ringtone else "320k"

        cmd = [
            FFMPEG_PATH, "-y",
            "-ss", str(start_sec),
            "-i", input_file,
            "-t", str(duration),
            "-c:a", codec,
            "-b:a", bitrate,
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg trim error: {res.stderr}")
        return True

    @staticmethod
    def enhance_audio(input_file: str, output_file: str, bass_boost: bool = True, normalize: bool = True) -> bool:
        """Loudness normalization & Bass boost via FFmpeg."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        filters = []
        if normalize:
            filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")
        if bass_boost:
            filters.append("bass=g=6:f=110")

        filter_str = ",".join(filters) if filters else "anull"

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", filter_str,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg audio enhancement error: {res.stderr}")
        return True

    @staticmethod
    def remove_vocals(input_file: str, output_file: str) -> bool:
        """
        Vocal Remover / Karaoke Maker using local FFmpeg phase cancellation.
        Subtracts center channel vocals while keeping wide stereophonic instruments.
        """
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        # Phase inversion of center vocal frequency band
        filter_str = "pan=stereo|c0=c0-c1|c1=c1-c0,volume=1.4"

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", filter_str,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Vocal remover error: {res.stderr}")
        return True

    @staticmethod
    def change_pitch_and_speed(input_file: str, output_file: str, pitch_semitones: float = 0.0, speed_multiplier: float = 1.0) -> bool:
        """
        Key / Pitch Shifter and BPM / Tempo changer.
        Changes pitch without distortion and alters playback speed.
        """
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        # pitch_semitones: e.g. +2 (2 semitones up), -3 (3 semitones down)
        # pitch factor: 2^(semitones / 12)
        pitch_factor = 2.0 ** (pitch_semitones / 12.0)
        new_sample_rate = int(44100 * pitch_factor)

        # To retain target speed, atempo must compensate for sample rate shift
        tempo_comp = speed_multiplier / pitch_factor

        # FFmpeg atempo must be within [0.5, 2.0]. Chain filters if outside.
        filters = [f"asetrate={new_sample_rate}"]
        
        # Clamp tempo chunks
        current_tempo = tempo_comp
        while current_tempo > 2.0:
            filters.append("atempo=2.0")
            current_tempo /= 2.0
        while current_tempo < 0.5:
            filters.append("atempo=0.5")
            current_tempo /= 0.5
        filters.append(f"atempo={current_tempo:.4f}")
        filters.append("aresample=44100")

        filter_str = ",".join(filters)

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", filter_str,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Pitch/Speed error: {res.stderr}")
        return True

    @staticmethod
    def apply_equalizer(input_file: str, output_file: str, preset: str = "bass_boost", custom_gains: Optional[Dict[str, float]] = None) -> bool:
        """10-Band Graphic Equalizer with studio presets."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        # 10 frequency bands
        bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
        presets_gains = {
            "bass_boost": {31: 7, 62: 7, 125: 5, 250: 2, 500: 0, 1000: 0, 2000: 0, 4000: 1, 8000: 2, 16000: 3},
            "vocal_clarity": {31: -4, 62: -3, 125: 0, 250: 2, 500: 4, 1000: 5, 2000: 5, 4000: 4, 8000: 2, 16000: 0},
            "rock": {31: 4, 62: 3, 125: 1, 250: 0, 500: -1, 1000: 1, 2000: 3, 4000: 4, 8000: 5, 16000: 4},
            "electronic": {31: 6, 62: 6, 125: 3, 250: 0, 500: 1, 1000: 2, 2000: 3, 4000: 4, 8000: 6, 16000: 6},
            "podcast": {31: -6, 62: -4, 125: 1, 250: 4, 500: 4, 1000: 4, 2000: 3, 4000: 1, 8000: -2, 16000: -4}
        }

        gains = presets_gains.get(preset, presets_gains["bass_boost"])
        if custom_gains:
            gains.update(custom_gains)

        eq_filters = []
        for freq in bands:
            g = gains.get(freq, 0.0)
            if g != 0:
                eq_filters.append(f"equalizer=f={freq}:width_type=o:width=1:g={g}")

        filter_str = ",".join(eq_filters) if eq_filters else "anull"

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", filter_str,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Equalizer error: {res.stderr}")
        return True

    @staticmethod
    def spatial_8d(input_file: str, output_file: str) -> bool:
        """8D Audio generator creating binaural circular panning."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        # apulsator creates cyclical stereo panning (0.125 Hz = 8 seconds per full revolution)
        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", "apulsator=hz=0.125:mode=sine:width=0.88,aecho=0.8:0.88:40:0.3",
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"8D audio error: {res.stderr}")
        return True

    @staticmethod
    def remove_silence(input_file: str, output_file: str) -> bool:
        """Automatically detects and trims leading and trailing silence."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        silence_filter = (
            "silenceremove=start_periods=1:start_duration=0.5:start_threshold=-50dB:detection=peak,"
            "areverse,"
            "silenceremove=start_periods=1:start_duration=0.5:start_threshold=-50dB:detection=peak,"
            "areverse"
        )

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", silence_filter,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Silence remove error: {res.stderr}")
        return True

    @staticmethod
    def boost_volume(input_file: str, output_file: str, gain_db: float = 6.0) -> bool:
        """One-click volume boost for quiet audio files."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Input audio file not found")

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", f"volume={gain_db}dB",
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Volume boost error: {res.stderr}")
        return True

    @staticmethod
    def batch_convert(folder_path: str, target_format: str = "mp3", bitrate: str = "320") -> Dict[str, Any]:
        """Convert entire folder of audio files to target format."""
        if not os.path.isdir(folder_path):
            return {"converted": 0, "failed": 0, "total": 0}

        valid_in = (".mp3", ".m4a", ".flac", ".wav", ".aac", ".ogg", ".wma", ".webm")
        entries = [
            os.path.join(folder_path, e.name)
            for e in os.scandir(folder_path)
            if e.is_file() and e.name.lower().endswith(valid_in)
        ]

        converted_count = 0
        failed_count = 0

        target_ext = f".{target_format.lower().strip('.')}"
        codec_map = {
            ".mp3": ("libmp3lame", f"{bitrate}k"),
            ".m4a": ("aac", f"{bitrate}k"),
            ".flac": ("flac", None),
            ".wav": ("pcm_s16le", None),
        }
        codec, br = codec_map.get(target_ext, ("libmp3lame", "320k"))

        for file_path in entries:
            base, ext = os.path.splitext(file_path)
            if ext.lower() == target_ext:
                continue

            out_file = f"{base}_converted{target_ext}"
            cmd = [FFMPEG_PATH, "-y", "-i", file_path, "-c:a", codec]
            if br:
                cmd.extend(["-b:a", br])
            cmd.append(out_file)

            try:
                res = subprocess.run(cmd, capture_output=True, text=True)
                if res.returncode == 0 and os.path.exists(out_file):
                    converted_count += 1
                else:
                    failed_count += 1
            except Exception:
                failed_count += 1

        return {"converted": converted_count, "failed": failed_count, "total": len(entries)}

    @staticmethod
    def export_m3u_playlist(folder_path: str, output_file: Optional[str] = None) -> str:
        """Exports all audio files in the folder to a standard M3U playlist file."""
        if not os.path.isdir(folder_path):
            raise FileNotFoundError("Directory not found")

        valid_exts = (".mp3", ".m4a", ".flac", ".wav", ".aac")
        files = [
            e.name for e in os.scandir(folder_path)
            if e.is_file() and e.name.lower().endswith(valid_exts)
        ]
        files.sort()

        target = output_file or os.path.join(folder_path, "Mazekty_Playlist.m3u")
        with open(target, "w", encoding="utf-8") as f:
            f.write("#EXTM3U\n")
            f.write("#PLAYLIST:Mazekty Music Library\n\n")
            for filename in files:
                title = os.path.splitext(filename)[0]
                f.write(f"#EXTINF:-1,{title}\n")
                f.write(f"{filename}\n\n")

        return target

    # ==========================================
    # METADATA & ID3 TAG EDITOR
    # ==========================================

    @staticmethod
    def get_audio_tags(file_path: str) -> Dict[str, Any]:
        """Extract title, artist, album, year, and genre from an audio file."""
        if not os.path.exists(file_path) or not mutagen:
            return {}

        tags = {
            "title": "",
            "artist": "",
            "album": "",
            "year": "",
            "genre": "",
            "has_cover": False
        }

        try:
            if file_path.lower().endswith(".mp3"):
                try:
                    audio = ID3(file_path)
                    if "TIT2" in audio: tags["title"] = str(audio["TIT2"].text[0])
                    if "TPE1" in audio: tags["artist"] = str(audio["TPE1"].text[0])
                    if "TALB" in audio: tags["album"] = str(audio["TALB"].text[0])
                    if "TYER" in audio: tags["year"] = str(audio["TYER"].text[0])
                    if "TCON" in audio: tags["genre"] = str(audio["TCON"].text[0])
                    tags["has_cover"] = any(k.startswith("APIC") for k in audio.keys())
                except ID3NoHeaderError:
                    pass
            elif file_path.lower().endswith(".m4a"):
                audio = MP4(file_path)
                if "\xa9nam" in audio: tags["title"] = str(audio["\xa9nam"][0])
                if "\xa9ART" in audio: tags["artist"] = str(audio["\xa9ART"][0])
                if "\xa9alb" in audio: tags["album"] = str(audio["\xa9alb"][0])
                if "\xa9day" in audio: tags["year"] = str(audio["\xa9day"][0])
                if "\xa9gen" in audio: tags["genre"] = str(audio["\xa9gen"][0])
                tags["has_cover"] = "covr" in audio and len(audio["covr"]) > 0
            elif file_path.lower().endswith(".flac"):
                audio = FLAC(file_path)
                if "title" in audio: tags["title"] = str(audio["title"][0])
                if "artist" in audio: tags["artist"] = str(audio["artist"][0])
                if "album" in audio: tags["album"] = str(audio["album"][0])
                if "date" in audio: tags["year"] = str(audio["date"][0])
                if "genre" in audio: tags["genre"] = str(audio["genre"][0])
                tags["has_cover"] = len(audio.pictures) > 0
        except Exception as e:
            print(f"Tag read error: {e}")

        # Fallback to filename if title is empty
        if not tags["title"]:
            tags["title"] = os.path.splitext(os.path.basename(file_path))[0]

        return tags

    @staticmethod
    def save_audio_tags(file_path: str, tags: Dict[str, str]) -> bool:
        """Write ID3 tags directly into audio file."""
        if not os.path.exists(file_path) or not mutagen:
            return False

        try:
            if file_path.lower().endswith(".mp3"):
                try:
                    audio = ID3(file_path)
                except ID3NoHeaderError:
                    audio = ID3()

                if "title" in tags: audio["TIT2"] = TIT2(encoding=3, text=tags["title"])
                if "artist" in tags: audio["TPE1"] = TPE1(encoding=3, text=tags["artist"])
                if "album" in tags: audio["TALB"] = TALB(encoding=3, text=tags["album"])
                if "year" in tags: audio["TYER"] = TYER(encoding=3, text=str(tags["year"]))
                if "genre" in tags: audio["TCON"] = TCON(encoding=3, text=tags["genre"])
                audio.save(file_path)
                return True

            elif file_path.lower().endswith(".m4a"):
                audio = MP4(file_path)
                if "title" in tags: audio["\xa9nam"] = [tags["title"]]
                if "artist" in tags: audio["\xa9ART"] = [tags["artist"]]
                if "album" in tags: audio["\xa9alb"] = [tags["album"]]
                if "year" in tags: audio["\xa9day"] = [str(tags["year"])]
                if "genre" in tags: audio["\xa9gen"] = [tags["genre"]]
                audio.save()
                return True

            elif file_path.lower().endswith(".flac"):
                audio = FLAC(file_path)
                if "title" in tags: audio["title"] = [tags["title"]]
                if "artist" in tags: audio["artist"] = [tags["artist"]]
                if "album" in tags: audio["album"] = [tags["album"]]
                if "year" in tags: audio["date"] = [str(tags["year"])]
                if "genre" in tags: audio["genre"] = [tags["genre"]]
                audio.save()
                return True
        except Exception as e:
            print(f"Tag write error: {e}")
            return False

        return False

    @staticmethod
    def replace_artwork(audio_file: str, image_file: str) -> bool:
        """Embed custom album artwork into audio file."""
        if not os.path.exists(audio_file) or not os.path.exists(image_file) or not mutagen:
            return False

        try:
            with open(image_file, "rb") as img_f:
                image_data = img_f.read()

            mime = "image/jpeg" if image_file.lower().endswith((".jpg", ".jpeg")) else "image/png"

            if audio_file.lower().endswith(".mp3"):
                try:
                    audio = ID3(audio_file)
                except ID3NoHeaderError:
                    audio = ID3()
                # Remove existing APIC
                audio.delall("APIC")
                audio["APIC"] = APIC(
                    encoding=3,
                    mime=mime,
                    type=3,  # cover front
                    desc="Cover",
                    data=image_data
                )
                audio.save(audio_file)
                return True

            elif audio_file.lower().endswith(".m4a"):
                audio = MP4(audio_file)
                fmt = MP4Cover.FORMAT_JPEG if mime == "image/jpeg" else MP4Cover.FORMAT_PNG
                audio["covr"] = [MP4Cover(image_data, imageformat=fmt)]
                audio.save()
                return True

            elif audio_file.lower().endswith(".flac"):
                audio = FLAC(audio_file)
                audio.clear_pictures()
                pic = Picture()
                pic.data = image_data
                pic.type = 3
                pic.mime = mime
                audio.add_picture(pic)
                audio.save()
                return True
        except Exception as e:
            print(f"Artwork replace error: {e}")
            return False

        return False

    @staticmethod
    def extract_lyrics(url: str) -> Dict[str, Any]:
        """Fetch automatic or uploaded synchronized subtitles/lyrics via yt-dlp."""
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['all'],
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                subtitles = info.get('subtitles') or info.get('automatic_captions') or {}
                available_langs = list(subtitles.keys())
                lyrics_text = ""
                # Find ar, en, or first available
                chosen_lang = next((l for l in ['ar', 'en', 'ar-orig', 'en-orig'] if l in subtitles), None)
                if not chosen_lang and available_langs:
                    chosen_lang = available_langs[0]

                return {
                    "has_lyrics": bool(chosen_lang),
                    "language": chosen_lang,
                    "available_languages": available_langs[:10],
                    "title": info.get('title', '')
                }
            except Exception as e:
                return {"has_lyrics": False, "error": str(e)}

    # ==========================================
    # SYSTEM MEDIA SYNC (CROSS-PLATFORM)
    # ==========================================

    @staticmethod
    def sync_to_apple_music(file_path: str, playlist_name: str = "Mazekty") -> Dict[str, Any]:
        """Add audio file directly into Apple Music / OS Music Library with playlist support."""
        return sync_to_system_music_library(file_path, playlist_name)

    @classmethod
    def sync_all_to_apple_music(cls, folder_path: str, playlist_name: str = "Mazekty") -> Dict[str, Any]:
        """Import all audio files from folder into a designated playlist in Apple Music."""
        if not os.path.isdir(folder_path):
            return {"added_count": 0, "failed_count": 0, "total": 0, "playlist": playlist_name}

        valid_exts = (".mp3", ".m4a", ".wav", ".flac")
        files = [
            os.path.join(folder_path, entry.name)
            for entry in os.scandir(folder_path)
            if entry.is_file() and entry.name.lower().endswith(valid_exts)
        ]

        added_count = 0
        failed_count = 0
        for f in files:
            res = sync_to_system_music_library(f, playlist_name)
            if res.get("success"):
                added_count += 1
            else:
                failed_count += 1

        return {
            "added_count": added_count,
            "failed_count": failed_count,
            "total": len(files),
            "playlist": playlist_name
        }

    @staticmethod
    def create_playlist_zip(folder_path: str, file_names: Optional[List[str]] = None, output_zip: Optional[str] = None) -> str:
        """Packages audio files into a single ZIP file for mobile downloading."""
        import zipfile
        if not os.path.isdir(folder_path):
            raise FileNotFoundError("Directory not found")

        valid_exts = (".mp3", ".m4a", ".wav", ".flac")
        if file_names and len(file_names) > 0:
            target_files = [
                os.path.join(folder_path, name)
                for name in file_names
                if os.path.exists(os.path.join(folder_path, name))
            ]
        else:
            target_files = [
                os.path.join(folder_path, entry.name)
                for entry in os.scandir(folder_path)
                if entry.is_file() and entry.name.lower().endswith(valid_exts)
            ]

        target_zip = output_zip or os.path.join(folder_path, "Mazekty_Playlist_Mobile.zip")
        with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
            for tf in target_files:
                zf.write(tf, arcname=os.path.basename(tf))

        return target_zip
