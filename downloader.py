import os
import re
import sys
import json
import urllib.request
import urllib.parse
import subprocess
import unicodedata
from typing import Callable, Optional, Dict, Any, List
import yt_dlp
from yt_dlp.utils import sanitize_filename

try:
    import mutagen
    from mutagen.id3 import ID3, TIT2, TPE1, TALB, TYER, TDRC, TCON, APIC, ID3NoHeaderError
    from mutagen.mp4 import MP4, MP4Cover
    from mutagen.flac import FLAC, Picture
except ImportError:
    mutagen = None

from platform_utils import find_ffmpeg, sync_to_system_music_library, run_silent_cmd

FFMPEG_PATH = find_ffmpeg()

class YouTubeDownloader:
    def __init__(self, output_dir: str = "downloads"):
        self.output_dir = os.path.abspath(output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

    @staticmethod
    def normalize_url(url: str) -> str:
        """Auto-append /videos to YouTube channel URLs to download all uploads."""
        url = url.strip()
        # YouTube Channel pattern: @channel, /c/name, /channel/UC..., /user/name
        chan_pattern = r'^(https?://(?:www\.)?youtube\.com/(@[\w\.-]+|channel/[\w-]+|c/[\w-]+|user/[\w-]+))/?$'
        m = re.match(chan_pattern, url)
        if m:
            return f"{m.group(1)}/videos"
        return url

    @staticmethod
    def clean_urls(raw_input: str) -> List[str]:
        """Extract valid URLs from input string."""
        lines = re.split(r'[\r\n,]+', raw_input.strip())
        urls = []
        for line in lines:
            line = line.strip()
            if line.startswith("http://") or line.startswith("https://"):
                urls.append(YouTubeDownloader.normalize_url(line))
        return urls

    @staticmethod
    def resolve_external_track_info(url: str) -> Optional[Dict[str, Any]]:
        """Resolves Spotify or Apple Music track metadata to search on YouTube."""
        try:
            if "open.spotify.com" in url:
                oembed_url = f"https://open.spotify.com/oembed?url={urllib.parse.quote(url)}"
                req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    title = data.get('title', '')
                    return {
                        "title": title,
                        "query": f"{title} audio",
                        "thumbnail": data.get('thumbnail_url'),
                        "source": "spotify"
                    }
            elif "music.apple.com" in url:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                    og_title = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']', html)
                    og_desc = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']', html)
                    if og_title:
                        t = og_title.group(1).replace("&#39;", "'").replace("&amp;", "&")
                        d = og_desc.group(1) if og_desc else ""
                        return {
                            "title": t,
                            "query": f"{t} {d} audio",
                            "thumbnail": None,
                            "source": "applemusic"
                        }
        except Exception as e:
            print(f"External metadata resolution error: {e}")
        return None

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
        """Resolve URLs into flat list of tracks with channel, playlist, Spotify & SoundCloud support."""
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
                # 1. Spotify & Apple Music Resolver
                if "open.spotify.com" in url or "music.apple.com" in url:
                    ext_info = self.resolve_external_track_info(url)
                    if ext_info and ext_info.get("query"):
                        matches = self.search_youtube(ext_info["query"], limit=1)
                        if matches:
                            m = matches[0]
                            resolved.append({
                                "url": m["url"],
                                "title": ext_info.get("title") or m["title"],
                                "is_playlist": False,
                                "duration": m.get("duration"),
                                "thumbnail": ext_info.get("thumbnail") or m.get("thumbnail"),
                                "uploader": m.get("uploader", ""),
                                "original_url": url,
                                "source": ext_info.get("source", "external")
                            })
                            continue

                # 2. YouTube, SoundCloud & Generic extractors
                try:
                    info = ydl.extract_info(url, download=False)
                    if not info:
                        resolved.append({"url": url, "title": "فيديو يوتيوب", "is_playlist": False})
                        continue

                    is_channel = bool(re.search(r'youtube\.com/(@[\w\.-]+|channel/[\w-]+|c/[\w-]+|user/[\w-]+)', url))

                    if 'entries' in info and info['entries']:
                        playlist_title = info.get('title', 'قناة' if is_channel else 'قائمة تشغيل')
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
                                "is_channel": is_channel,
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
                            "is_channel": False,
                            "duration": info.get('duration'),
                            "thumbnail": info.get('thumbnail'),
                            "uploader": info.get('uploader') or info.get('channel', '')
                        })
                except Exception as err:
                    resolved.append({"url": url, "title": url, "is_playlist": False, "error": str(err)})

        return resolved

    def get_info(self, url: str) -> Dict[str, Any]:
        """Fetch metadata preview for single video, channel, or playlist."""
        norm_url = self.normalize_url(url)
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Check for Spotify / Apple Music
            if "open.spotify.com" in norm_url or "music.apple.com" in norm_url:
                ext_info = self.resolve_external_track_info(norm_url)
                if ext_info:
                    return {
                        "is_playlist": False,
                        "is_channel": False,
                        "id": "external",
                        "title": ext_info.get("title", "Unknown Track"),
                        "thumbnail": ext_info.get("thumbnail"),
                        "uploader": ext_info.get("source", "External"),
                        "url": norm_url
                    }

            info = ydl.extract_info(norm_url, download=False)
            if not info:
                raise ValueError("تعذر جلب معلومات هذا الرابط")

            is_channel = bool(re.search(r'youtube\.com/(@[\w\.-]+|channel/[\w-]+|c/[\w-]+|user/[\w-]+)', norm_url))
            is_playlist = ('entries' in info and info['entries']) or is_channel

            if is_playlist and 'entries' in info:
                entries = list(info.get('entries', []))
                default_title = "قناة يوتيوب" if is_channel else "قائمة تشغيل"
                return {
                    "is_playlist": True,
                    "is_channel": is_channel,
                    "id": info.get('id'),
                    "title": info.get('title', default_title),
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
                    "is_channel": False,
                    "id": info.get('id'),
                    "title": info.get('title', 'فيديو يوتيوب'),
                    "duration": info.get('duration'),
                    "thumbnail": info.get('thumbnail'),
                    "uploader": info.get('uploader') or info.get('channel', ''),
                    "url": info.get('webpage_url', norm_url)
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
        """Download a single item with format, speed limit, tag embedding, and smart fallback."""
        target_dir = os.path.abspath(custom_folder) if custom_folder else self.output_dir
        os.makedirs(target_dir, exist_ok=True)

        is_video = (audio_format.lower() == "mp4")
        outtmpl = os.path.join(target_dir, "%(title)s.%(ext)s")

        ydl_opts: Dict[str, Any] = {
            'outtmpl': outtmpl,
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': False,
            'nocheckcertificate': False,
            'overwrites': False,
            'noplaylist': True,
            'socket_timeout': 30,
            'retries': 15,
            'fragment_retries': 15,
            'http_chunk_size': 10485760,  # 10MB chunking prevents YouTube throttling on long videos
            'buffersize': 1024 * 64,
            'concurrent_fragment_downloads': 4,
            'keepvideo': False,
        }

        # Set ffmpeg_location so yt-dlp finds portable or local FFmpeg
        current_ffmpeg = find_ffmpeg()
        if current_ffmpeg and current_ffmpeg != "ffmpeg" and os.path.isabs(current_ffmpeg):
            ydl_opts['ffmpeg_location'] = os.path.dirname(current_ffmpeg)

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

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                return info
        except Exception as first_err:
            # Smart Fallback: If custom format / high bitrate failed, fallback to standard MP3 192k
            if not is_video and (quality in ["320", "256"] or audio_format in ["flac", "wav", "m4a"]):
                try:
                    fallback_opts = dict(ydl_opts)
                    fallback_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }]
                    if embed_metadata:
                        fallback_opts['postprocessors'].append({'key': 'FFmpegMetadata'})
                    fallback_opts['format'] = 'bestaudio/best'
                    with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                        info = ydl.extract_info(url, download=True)
                        return info
                except Exception:
                    pass
            raise first_err

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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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

        # Detect original sample rate via ffprobe
        original_sr = 44100
        try:
            from platform_utils import find_ffprobe
            ffprobe_path = find_ffprobe()
            probe_cmd = [
                ffprobe_path, "-v", "quiet", "-select_streams", "a:0",
                "-show_entries", "stream=sample_rate",
                "-of", "default=noprint_wrappers=1:nokey=1", input_file
            ]
            probe_res = run_silent_cmd(probe_cmd, capture_output=True, text=True, timeout=5)
            if probe_res.returncode == 0 and probe_res.stdout.strip().isdigit():
                original_sr = int(probe_res.stdout.strip())
        except Exception:
            pass

        new_sample_rate = int(original_sr * pitch_factor)

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
        filters.append(f"aresample={original_sr}")

        filter_str = ",".join(filters)

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", filter_str,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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
            # Convert string keys from JSON to int to match preset gains
            gains.update({int(k): v for k, v in custom_gains.items()})

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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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

        res = run_silent_cmd(cmd, capture_output=True, text=True)
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
                res = run_silent_cmd(cmd, capture_output=True, text=True)
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
                    if "TDRC" in audio: tags["year"] = str(audio["TDRC"].text[0])
                    elif "TYER" in audio: tags["year"] = str(audio["TYER"].text[0])
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
                if "year" in tags: audio["TDRC"] = TDRC(encoding=3, text=str(tags["year"]))
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
    def merge_audio_tracks(files: List[str], crossfade_sec: float, output_file: str) -> bool:
        """Merges multiple audio tracks with smooth DJ crossfade."""
        if not files or len(files) < 2:
            raise ValueError("At least 2 audio files required to merge")

        for f in files:
            if not os.path.exists(f):
                raise FileNotFoundError(f"File not found: {f}")

        cmd = [FFMPEG_PATH, "-y"]
        for f in files:
            cmd.extend(["-i", f])

        filter_parts = []
        n = len(files)
        prev_label = "[0]"
        for i in range(1, n):
            next_label = f"[{i}]"
            out_label = f"[a{i}]" if i < n - 1 else "[aout]"
            filter_parts.append(f"{prev_label}{next_label}acrossfade=d={crossfade_sec}:c1=tri:c2=tri{out_label}")
            prev_label = f"[a{i}]"

        filter_complex = ";".join(filter_parts)
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[aout]",
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ])

        res = run_silent_cmd(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Merge error: {res.stderr}")
        return True

    @staticmethod
    def denoise_audio(input_file: str, output_file: str) -> bool:
        """FFT Adaptive De-Noiser & Voice Enhancer."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Audio file not found")

        filter_str = "afftdn=nr=18:nf=-25:tn=1,highpass=f=75,lowpass=f=12000,volume=1.2"
        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-af", filter_str,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            output_file
        ]

        res = run_silent_cmd(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Denoise error: {res.stderr}")
        return True

    @staticmethod
    def separate_stems(input_file: str, output_folder: Optional[str] = None) -> Dict[str, str]:
        """Separates audio into 4 stems: Vocals, Music/Instruments, Bass, Drums."""
        if not os.path.exists(input_file):
            raise FileNotFoundError("Audio file not found")

        folder = output_folder or os.path.dirname(input_file)
        base = os.path.splitext(os.path.basename(input_file))[0]

        vocals_file = os.path.join(folder, f"{base}_stems_vocals.mp3")
        instruments_file = os.path.join(folder, f"{base}_stems_instruments.mp3")
        bass_file = os.path.join(folder, f"{base}_stems_bass.mp3")
        drums_file = os.path.join(folder, f"{base}_stems_drums.mp3")

        # 1. Vocals (Mid-channel bandpass: 220Hz - 4200Hz center frequency)
        run_silent_cmd([
            FFMPEG_PATH, "-y", "-i", input_file,
            "-af", "pan=mono|c0=0.5*c0+0.5*c1,highpass=f=220,lowpass=f=4200,volume=1.6",
            "-c:a", "libmp3lame", "-b:a", "320k", vocals_file
        ])

        # 2. Instruments (Karaoke: center vocal cancellation)
        run_silent_cmd([
            FFMPEG_PATH, "-y", "-i", input_file,
            "-af", "pan=stereo|c0=c0-c1|c1=c1-c0,volume=1.4",
            "-c:a", "libmp3lame", "-b:a", "320k", instruments_file
        ])

        # 3. Bass (Low-pass sub-bass & bass guitar: < 220Hz)
        run_silent_cmd([
            FFMPEG_PATH, "-y", "-i", input_file,
            "-af", "lowpass=f=220,volume=1.8",
            "-c:a", "libmp3lame", "-b:a", "320k", bass_file
        ])

        # 4. Drums / Percussion (High-frequency transients: > 3500Hz)
        run_silent_cmd([
            FFMPEG_PATH, "-y", "-i", input_file,
            "-af", "highpass=f=3500,volume=1.5",
            "-c:a", "libmp3lame", "-b:a", "320k", drums_file
        ])

        return {
            "vocals": os.path.basename(vocals_file),
            "instruments": os.path.basename(instruments_file),
            "bass": os.path.basename(bass_file),
            "drums": os.path.basename(drums_file)
        }

    @staticmethod
    def fetch_synced_lyrics(title: str, artist: Optional[str] = None) -> Dict[str, Any]:
        """Fetch synced .lrc lyrics from LRCLIB open database."""
        clean_title = re.sub(r'\(.*?\)|\[.*?\]', '', title)
        clean_title = re.sub(r'(?i)(official\s*(music\s*)?video|lyrics?|audio|hd|4k)', '', clean_title).strip()

        query = f"{artist} {clean_title}".strip() if artist else clean_title
        url = f"https://lrclib.net/api/search?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mazekty/2.5'})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data and isinstance(data, list) and len(data) > 0:
                    best = data[0]
                    for item in data:
                        if item.get("syncedLyrics"):
                            best = item
                            break
                    return {
                        "found": True,
                        "track_name": best.get("trackName"),
                        "artist_name": best.get("artistName"),
                        "album_name": best.get("albumName"),
                        "duration": best.get("duration"),
                        "synced_lyrics": best.get("syncedLyrics"),
                        "plain_lyrics": best.get("plainLyrics")
                    }
        except Exception as e:
            print(f"Lyrics search error: {e}")
        return {"found": False, "error": "No lyrics found"}

    @staticmethod
    def save_lrc_file(target_path: str, synced_lyrics: str) -> str:
        """Saves synced lyrics as a standard .lrc file matching audio filename."""
        base, _ = os.path.splitext(target_path)
        lrc_path = f"{base}.lrc"
        with open(lrc_path, "w", encoding="utf-8") as f:
            f.write(synced_lyrics)
        return lrc_path

    @staticmethod
    def identify_audio(file_path: str) -> Dict[str, Any]:
        """Identify unknown track, fetch tags, album art and year."""
        if not os.path.exists(file_path):
            raise FileNotFoundError("Audio file not found")

        current_tags = YouTubeDownloader.get_audio_tags(file_path)
        base_name = os.path.splitext(os.path.basename(file_path))[0]

        query = current_tags.get("title") or base_name
        if current_tags.get("artist"):
            query = f"{current_tags['artist']} {query}"

        query = re.sub(r'\(.*?\)|\[.*?\]', '', query)
        query = re.sub(r'(?i)(official\s*(music\s*)?video|lyrics?|audio|hd|4k|1080p|remix|feat\.?|ft\.?)', '', query).strip()

        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&entity=song&limit=3"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mazekty/2.5'})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get("results", [])
                if results:
                    top = results[0]
                    artwork = top.get("artworkUrl100", "").replace("100x100bb.jpg", "1000x1000bb.jpg")
                    year = top.get("releaseDate", "")[:4]
                    return {
                        "found": True,
                        "title": top.get("trackName"),
                        "artist": top.get("artistName"),
                        "album": top.get("collectionName"),
                        "year": year,
                        "genre": top.get("primaryGenreName"),
                        "artwork_url": artwork,
                        "preview_url": top.get("previewUrl")
                    }
        except Exception as e:
            print(f"Identify error: {e}")

        return {"found": False, "query": query, "tags": current_tags}

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
