import os
import sys
import json
import uuid
import asyncio
import subprocess
import traceback
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from downloader import YouTubeDownloader
from platform_utils import (
    get_config_path,
    get_user_data_dir,
    get_default_download_dir,
    open_folder_in_explorer,
    choose_folder_dialog,
    get_os_name,
    sync_to_system_music_library,
    get_local_ip,
    get_all_local_ips,
    detect_connected_ios_devices,
    detect_connected_android_devices,
    detect_all_connected_mobile_devices,
    sync_to_android_device,
    trigger_finder_ios_sync
)

app = FastAPI(title="مزيكتي - Mazekty")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
CONFIG_FILE = get_config_path()

def load_config() -> Dict[str, Any]:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    default_dir = get_default_download_dir(BASE_DIR)
    return {
        "download_folder": default_dir,
        "language": "en",
        "is_pro": True,
        "theme_accent": "violet",
        "theme_mode": "dark",
        "os_name": get_os_name()
    }

def save_config(updates: Dict[str, Any]):
    cfg = load_config()
    cfg.update(updates)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Could not save config to {CONFIG_FILE}: {e}")
    return cfg

initial_cfg = load_config()
DEFAULT_DOWNLOAD_DIR = os.path.abspath(initial_cfg.get("download_folder", get_default_download_dir(BASE_DIR)))
os.makedirs(DEFAULT_DOWNLOAD_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Queue and State
download_queue: asyncio.Queue = asyncio.Queue()
queue_worker_task: Optional[asyncio.Task] = None
main_event_loop: Optional[asyncio.AbstractEventLoop] = None

# Queue Pause / Cancel controls
is_queue_paused: bool = False
queue_resume_event: asyncio.Event = asyncio.Event()
queue_resume_event.set()
cancelled_item_ids = set()

session_stats = {
    "total": 0,
    "completed": 0,
    "skipped": 0,
    "failed": 0,
    "in_progress": 0
}

all_items: Dict[str, Dict[str, Any]] = {}
downloader_instance = YouTubeDownloader(output_dir=DEFAULT_DOWNLOAD_DIR)

async def queue_worker():
    """Continuously processes items from the download queue with pause/cancel controls."""
    while True:
        # Check if queue is paused
        await queue_resume_event.wait()

        item = await download_queue.get()
        item_id = item["id"]
        target_folder = item.get("folder") or DEFAULT_DOWNLOAD_DIR

        # Check if cancelled before starting
        if item_id in cancelled_item_ids:
            item["status"] = "cancelled"
            session_stats["skipped"] += 1
            await manager.broadcast({
                "event": "item_cancelled",
                "item_id": item_id,
                "title": item["title"],
                "stats": session_stats
            })
            download_queue.task_done()
            continue

        session_stats["in_progress"] += 1
        await manager.broadcast({
            "event": "stats_update",
            "stats": session_stats
        })

        # 1. Smart Skip Existing
        existing_file = downloader_instance.is_already_downloaded(item["title"], target_folder)
        if existing_file:
            item["status"] = "skipped"
            item["existing_file"] = existing_file
            session_stats["in_progress"] -= 1
            session_stats["skipped"] += 1

            await manager.broadcast({
                "event": "item_skipped",
                "item_id": item_id,
                "title": item["title"],
                "existing_file": existing_file,
                "stats": session_stats
            })
            download_queue.task_done()
            continue

        # 2. Download Item
        item["status"] = "downloading"
        await manager.broadcast({
            "event": "item_started",
            "item_id": item_id,
            "title": item["title"],
            "url": item["url"],
            "index": item.get("playlist_index"),
            "total": item.get("playlist_total"),
            "format": item.get("audio_format", "mp3"),
            "stats": session_stats
        })

        def progress_hook(d):
            status = d.get('status')
            if status == 'downloading':
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
                percent = round((downloaded / total) * 100, 1) if total > 0 else 0
                speed = d.get('_speed_str', '')
                eta = d.get('_eta_str', '')
                info_dict = d.get('info_dict', {})
                title = info_dict.get('title') or item["title"]

                if main_event_loop and main_event_loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        manager.broadcast({
                            "event": "progress",
                            "item_id": item_id,
                            "percent": percent,
                            "speed": speed,
                            "eta": eta,
                            "title": title,
                            "status": "downloading"
                        }),
                        main_event_loop
                    )
            elif status == 'finished':
                if main_event_loop and main_event_loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        manager.broadcast({
                            "event": "progress",
                            "item_id": item_id,
                            "percent": 100,
                            "status": "converting",
                            "title": item["title"]
                        }),
                        main_event_loop
                    )

        def postprocessor_hook(d):
            pp = d.get('postprocessor', '')
            status = d.get('status')
            if status == 'started':
                if main_event_loop and main_event_loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        manager.broadcast({
                            "event": "progress",
                            "item_id": item_id,
                            "percent": 100,
                            "status": f"processing: {pp}",
                            "title": item["title"]
                        }),
                        main_event_loop
                    )

        try:
            loop = asyncio.get_running_loop()
            info = await loop.run_in_executor(
                None,
                lambda: downloader_instance.download_item(
                    url=item["url"],
                    quality=item.get("quality", "320"),
                    audio_format=item.get("audio_format", "mp3"),
                    embed_thumbnail=item.get("embed_thumbnail", True),
                    embed_metadata=item.get("embed_metadata", True),
                    rate_limit_kbps=item.get("rate_limit_kbps"),
                    custom_folder=target_folder,
                    progress_hook=progress_hook,
                    postprocessor_hook=postprocessor_hook
                )
            )

            final_title = info.get('title', item["title"]) if isinstance(info, dict) else item["title"]
            item["status"] = "completed"
            item["title"] = final_title
            session_stats["in_progress"] -= 1
            session_stats["completed"] += 1

            await manager.broadcast({
                "event": "item_completed",
                "item_id": item_id,
                "title": final_title,
                "stats": session_stats
            })
        except Exception as err:
            err_msg = str(err)
            traceback.print_exc()
            item["status"] = "error"
            item["error"] = err_msg
            session_stats["in_progress"] -= 1
            session_stats["failed"] += 1

            await manager.broadcast({
                "event": "item_error",
                "item_id": item_id,
                "title": item["title"],
                "error": err_msg,
                "stats": session_stats
            })
        finally:
            download_queue.task_done()

@app.on_event("startup")
async def startup_event():
    global main_event_loop, queue_worker_task
    main_event_loop = asyncio.get_running_loop()
    queue_worker_task = asyncio.create_task(queue_worker())

@app.on_event("shutdown")
async def shutdown_event():
    if queue_worker_task:
        queue_worker_task.cancel()

# ==========================================
# REQUEST MODELS
# ==========================================

class AnalyzeRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    urls: str
    quality: str = "320"
    audio_format: Optional[str] = "mp3"
    embed_thumbnail: bool = True
    embed_metadata: bool = True
    rate_limit_kbps: Optional[int] = None
    folder: Optional[str] = None
    selected_urls: Optional[List[str]] = None

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 12

class TrimRequest(BaseModel):
    filename: str
    start: float
    end: float
    is_ringtone: bool = False
    folder: Optional[str] = None

class EnhanceRequest(BaseModel):
    filename: str
    bass_boost: bool = True
    normalize: bool = True
    folder: Optional[str] = None

class VocalRemoveRequest(BaseModel):
    filename: str
    folder: Optional[str] = None

class PitchSpeedRequest(BaseModel):
    filename: str
    pitch: float = 0.0      # semitones (-6 to +6)
    speed: float = 1.0      # multiplier (0.5 to 2.0)
    folder: Optional[str] = None

class Spatial8DRequest(BaseModel):
    filename: str
    folder: Optional[str] = None

class EqualizerRequest(BaseModel):
    filename: str
    preset: str = "bass_boost"
    folder: Optional[str] = None
    custom_gains: Optional[Dict[str, float]] = None

class SilenceRemoveRequest(BaseModel):
    filename: str
    folder: Optional[str] = None

class VolumeBoostRequest(BaseModel):
    filename: str
    gain_db: float = 6.0
    folder: Optional[str] = None

class BatchConvertRequest(BaseModel):
    target_format: str = "mp3"
    bitrate: str = "320"
    folder: Optional[str] = None

class TagEditRequest(BaseModel):
    filename: str
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    year: Optional[str] = None
    genre: Optional[str] = None
    folder: Optional[str] = None

class SyncMusicRequest(BaseModel):
    filename: str
    playlist_name: Optional[str] = "Mazekty"
    folder: Optional[str] = None

class SyncAllRequest(BaseModel):
    folder: Optional[str] = None
    playlist_name: Optional[str] = "Mazekty"

class SyncAndroidRequest(BaseModel):
    device_id: Optional[str] = None
    playlist_name: Optional[str] = "Mazekty"
    folder: Optional[str] = None
    files: Optional[List[str]] = None

class OpenFolderRequest(BaseModel):
    folder: Optional[str] = None

class ScheduleDownloadRequest(BaseModel):
    download_request: DownloadRequest
    delay_seconds: int

class ConfigUpdateRequest(BaseModel):
    download_folder: Optional[str] = None
    language: Optional[str] = None
    theme_accent: Optional[str] = None
    theme_mode: Optional[str] = None

# ==========================================
# QUEUE CONTROL ENDPOINTS (FREE FEATURE)
# ==========================================

@app.post("/api/queue/pause")
async def pause_queue():
    global is_queue_paused
    is_queue_paused = True
    queue_resume_event.clear()
    await manager.broadcast({"event": "queue_paused"})
    return {"status": "paused"}

@app.post("/api/queue/resume")
async def resume_queue():
    global is_queue_paused
    is_queue_paused = False
    queue_resume_event.set()
    await manager.broadcast({"event": "queue_resumed"})
    return {"status": "resumed"}

@app.post("/api/queue/cancel/{item_id}")
async def cancel_queue_item(item_id: str):
    cancelled_item_ids.add(item_id)
    if item_id in all_items:
        all_items[item_id]["status"] = "cancelled"
    await manager.broadcast({"event": "item_cancelled", "item_id": item_id})
    return {"status": "cancelled", "item_id": item_id}

@app.get("/api/queue/status")
async def get_queue_status():
    return {
        "is_paused": is_queue_paused,
        "queue_size": download_queue.qsize(),
        "stats": session_stats
    }

# ==========================================
# CONFIG & SYSTEM ENDPOINTS
# ==========================================

@app.get("/api/config")
async def get_config():
    cfg = load_config()
    cfg["os_name"] = get_os_name()
    return cfg

@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest):
    updates = {}
    if req.download_folder:
        updates["download_folder"] = os.path.abspath(req.download_folder)
        os.makedirs(updates["download_folder"], exist_ok=True)
    if req.language:
        updates["language"] = req.language
    if req.theme_accent:
        updates["theme_accent"] = req.theme_accent
    if req.theme_mode:
        updates["theme_mode"] = req.theme_mode
    return save_config(updates)

@app.post("/api/select-folder")
async def select_folder():
    cfg = load_config()
    current_dir = cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    chosen = choose_folder_dialog(initial_dir=current_dir)
    if chosen:
        save_config({"download_folder": chosen})
        return {"folder": chosen}
    return {"folder": None}

@app.post("/api/open-folder")
async def open_folder(req: OpenFolderRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    os.makedirs(target_dir, exist_ok=True)
    success = open_folder_in_explorer(target_dir)
    return {"status": "opened" if success else "failed", "folder": target_dir}

# ==========================================
# FREE FEATURES: ID3 TAGS, M3U EXPORT, VOLUME
# ==========================================

@app.get("/api/tags")
async def get_tags_endpoint(filename: str, folder: Optional[str] = None):
    cfg = load_config()
    target_dir = os.path.abspath(folder) if folder and folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    file_path = os.path.join(target_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return YouTubeDownloader.get_audio_tags(file_path)

@app.post("/api/tags")
async def save_tags_endpoint(req: TagEditRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    file_path = os.path.join(target_dir, req.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    tags = {k: v for k, v in req.dict().items() if k not in ["filename", "folder"] and v is not None}
    success = YouTubeDownloader.save_audio_tags(file_path, tags)
    if success:
        return {"status": "success", "tags": tags}
    raise HTTPException(status_code=500, detail="Could not save audio tags")

@app.post("/api/export-m3u")
async def export_m3u_endpoint(req: SyncAllRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    try:
        m3u_path = YouTubeDownloader.export_m3u_playlist(target_dir)
        return {"status": "success", "file": os.path.basename(m3u_path), "path": m3u_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/boost-volume")
async def boost_volume_endpoint(req: VolumeBoostRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="File not found")

    base, ext = os.path.splitext(req.filename)
    out_name = f"{base}_boosted{ext}"
    output_file = os.path.join(target_dir, out_name)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.boost_volume(input_file, output_file, gain_db=req.gain_db)
        )
        return {"status": "success", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# PRO STUDIO FEATURES
# ==========================================

@app.post("/api/vocal-remove")
async def vocal_remove_endpoint(req: VocalRemoveRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="File not found")

    base, _ = os.path.splitext(req.filename)
    out_name = f"{base}_karaoke_inst.mp3"
    output_file = os.path.join(target_dir, out_name)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.remove_vocals(input_file, output_file)
        )
        return {"status": "success", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pitch-speed")
async def pitch_speed_endpoint(req: PitchSpeedRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="File not found")

    base, _ = os.path.splitext(req.filename)
    out_name = f"{base}_pitch_{req.pitch:+0.1f}_speed_{req.speed:.1f}x.mp3"
    output_file = os.path.join(target_dir, out_name)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.change_pitch_and_speed(input_file, output_file, req.pitch, req.speed)
        )
        return {"status": "success", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/spatial-8d")
async def spatial_8d_endpoint(req: Spatial8DRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="File not found")

    base, _ = os.path.splitext(req.filename)
    out_name = f"{base}_8D_spatial.mp3"
    output_file = os.path.join(target_dir, out_name)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.spatial_8d(input_file, output_file)
        )
        return {"status": "success", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/equalizer")
async def equalizer_endpoint(req: EqualizerRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="File not found")

    base, _ = os.path.splitext(req.filename)
    out_name = f"{base}_eq_{req.preset}.mp3"
    output_file = os.path.join(target_dir, out_name)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.apply_equalizer(input_file, output_file, req.preset, req.custom_gains)
        )
        return {"status": "success", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/remove-silence")
async def remove_silence_endpoint(req: SilenceRemoveRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)
    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="File not found")

    base, ext = os.path.splitext(req.filename)
    out_name = f"{base}_clean_silence{ext}"
    output_file = os.path.join(target_dir, out_name)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.remove_silence(input_file, output_file)
        )
        return {"status": "success", "filename": out_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch-convert")
async def batch_convert_endpoint(req: BatchConvertRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    loop = asyncio.get_running_loop()
    try:
        res = await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.batch_convert(target_dir, req.target_format, req.bitrate)
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/replace-artwork")
async def replace_artwork_endpoint(
    filename: str = Form(...),
    folder: Optional[str] = Form(None),
    image: UploadFile = File(...)
):
    cfg = load_config()
    target_dir = os.path.abspath(folder) if folder and folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    audio_file = os.path.join(target_dir, filename)
    if not os.path.exists(audio_file):
        raise HTTPException(status_code=404, detail="Audio file not found")

    temp_img_path = os.path.join(target_dir, f"_temp_art_{uuid.uuid4().hex[:6]}.jpg")
    try:
        with open(temp_img_path, "wb") as f:
            f.write(await image.read())

        success = YouTubeDownloader.replace_artwork(audio_file, temp_img_path)
        if success:
            return {"status": "success", "filename": filename}
        raise HTTPException(status_code=500, detail="Could not replace album art")
    finally:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

@app.get("/api/lyrics")
async def get_lyrics_endpoint(url: str):
    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(None, lambda: YouTubeDownloader.extract_lyrics(url))
    return res

# ==========================================
# SCHEDULED DOWNLOAD TIMER (PRO FEATURE)
# ==========================================

async def run_delayed_download(delay_sec: int, req: DownloadRequest):
    await asyncio.sleep(delay_sec)
    await async_resolve_and_enqueue(
        urls_raw=req.urls,
        quality=req.quality,
        audio_format=req.audio_format or "mp3",
        embed_thumb=req.embed_thumbnail,
        embed_meta=req.embed_metadata,
        rate_limit_kbps=req.rate_limit_kbps,
        folder=req.folder or DEFAULT_DOWNLOAD_DIR,
        selected_urls=req.selected_urls
    )

@app.post("/api/schedule-download")
async def schedule_download_endpoint(req: ScheduleDownloadRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_delayed_download, req.delay_seconds, req.download_request)
    return {
        "status": "scheduled",
        "delay_seconds": req.delay_seconds,
        "message": f"تمت جدولة التحميل ليعمل بعد {req.delay_seconds // 60} دقيقة تلقائياً."
    }

# ==========================================
# SEARCH & TRIM & ENHANCE & SYNC
# ==========================================

@app.post("/api/search")
async def search_youtube_endpoint(req: SearchRequest):
    query = req.query.strip()
    if not query:
        return {"results": []}

    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        None,
        lambda: downloader_instance.search_youtube(query=query, limit=req.limit or 12)
    )
    return {"results": results, "query": query}

@app.post("/api/trim")
async def trim_audio_endpoint(req: TrimRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)

    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="الملف غير موجود")

    base, _ = os.path.splitext(req.filename)
    out_filename = f"{base}_ringtone.m4r" if req.is_ringtone else f"{base}_trimmed.mp3"
    output_file = os.path.join(target_dir, out_filename)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.trim_audio(
                input_file=input_file,
                start_sec=req.start,
                end_sec=req.end,
                output_file=output_file,
                is_ringtone=req.is_ringtone
            )
        )
        return {"status": "success", "filename": out_filename, "folder": target_dir}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/enhance")
async def enhance_audio_endpoint(req: EnhanceRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    input_file = os.path.join(target_dir, req.filename)

    if not os.path.exists(input_file):
        raise HTTPException(status_code=404, detail="الملف غير موجود")

    base, _ = os.path.splitext(req.filename)
    out_filename = f"{base}_studio_enhanced.mp3"
    output_file = os.path.join(target_dir, out_filename)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.enhance_audio(
                input_file=input_file,
                output_file=output_file,
                bass_boost=req.bass_boost,
                normalize=req.normalize
            )
        )
        return {"status": "success", "filename": out_filename, "folder": target_dir}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sync-music")
async def sync_music_endpoint(req: SyncMusicRequest):
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    file_path = os.path.join(target_dir, req.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="الملف غير موجود")

    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(
        None,
        lambda: sync_to_system_music_library(file_path=file_path, playlist_name=req.playlist_name or "Mazekty")
    )

    if res.get("success"):
        return {"status": "success", "message": res.get("message"), "playlist": res.get("playlist")}
    else:
        raise HTTPException(status_code=500, detail=res.get("message", "تعذر ربط الملف مع مشغل الموسيقى."))

@app.post("/api/sync-all-music")
async def sync_all_music_endpoint(req: SyncAllRequest):
    """Batch import all audio files in the folder to System / Apple Music under a playlist."""
    cfg = load_config()
    target_dir = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)

    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(
        None,
        lambda: YouTubeDownloader.sync_all_to_apple_music(folder_path=target_dir, playlist_name=req.playlist_name or "Mazekty")
    )
    return res

# ==========================================
# MOBILE & IPHONE SYNC ENDPOINTS
# ==========================================

@app.get("/mobile")
async def get_mobile_page():
    """Serves the mobile web player and downloader optimized for iOS Safari."""
    mobile_html_path = os.path.join(STATIC_DIR, "mobile.html")
    if os.path.exists(mobile_html_path):
        return FileResponse(mobile_html_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Mobile page not found")

@app.get("/api/mobile/info")
async def get_mobile_info(request: Request, ip: Optional[str] = None):
    """Returns local network URL for QR Code and iPhone connectivity."""
    all_ips = get_all_local_ips()
    primary_ip = ip if (ip and ip in all_ips) else get_local_ip()
    port = request.url.port or 8000
    return {
        "local_ip": primary_ip,
        "available_ips": all_ips,
        "port": port,
        "mobile_url": f"http://{primary_ip}:{port}/mobile"
    }

@app.get("/api/mobile/download-zip")
async def download_mobile_zip(folder: Optional[str] = None):
    """Packages all audio files into a single ZIP for instant iPhone Files app download."""
    cfg = load_config()
    target_dir = os.path.abspath(folder) if folder and folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    loop = asyncio.get_running_loop()
    try:
        zip_path = await loop.run_in_executor(
            None,
            lambda: YouTubeDownloader.create_playlist_zip(target_dir)
        )
        return FileResponse(zip_path, media_type="application/zip", filename="Mazekty_Playlist_Mobile.zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sync/devices")
async def get_connected_devices():
    """Detects both iOS (iPhone/iPad) and Android mobile devices connected via USB."""
    loop = asyncio.get_running_loop()
    devices = await loop.run_in_executor(None, detect_all_connected_mobile_devices)
    ios_count = sum(1 for d in devices if d.get("platform") == "ios")
    android_count = sum(1 for d in devices if d.get("platform") == "android")
    return {
        "devices": devices,
        "count": len(devices),
        "ios_count": ios_count,
        "android_count": android_count
    }

@app.post("/api/sync/trigger-ios")
async def trigger_ios_sync_endpoint():
    """Triggers Finder sync for connected iOS devices on macOS."""
    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(None, trigger_finder_ios_sync)
    return res

@app.post("/api/sync/trigger-android")
async def trigger_android_sync_endpoint(req: Optional[SyncAndroidRequest] = None):
    """Syncs songs directly to connected Android device via ADB."""
    loop = asyncio.get_running_loop()
    dev_id = req.device_id if req else None
    playlist = req.playlist_name if (req and req.playlist_name) else "Mazekty"
    target_folder = (req.folder if req and req.folder else None) or DEFAULT_DOWNLOAD_DIR

    file_list = None
    if req and req.files:
        file_list = [os.path.join(target_folder, f) if not os.path.isabs(f) else f for f in req.files]
    else:
        if os.path.exists(target_folder):
            file_list = [
                os.path.join(target_folder, f) for f in os.listdir(target_folder)
                if f.lower().endswith(('.mp3', '.m4a', '.flac', '.wav', '.mp4'))
            ]

    res = await loop.run_in_executor(None, lambda: sync_to_android_device(dev_id, file_list, playlist))
    return res

@app.post("/api/analyze")
async def analyze_url(req: AnalyzeRequest):
    urls = YouTubeDownloader.clean_urls(req.url)
    if not urls:
        raise HTTPException(status_code=400, detail="لم يتم العثور على روابط صالحة")

    downloader = YouTubeDownloader()
    results = []
    loop = asyncio.get_running_loop()

    for u in urls[:10]:
        try:
            info = await loop.run_in_executor(None, downloader.get_info, u)
            results.append({"url": u, "status": "success", "data": info})
        except Exception as e:
            results.append({"url": u, "status": "error", "message": str(e)})

    return {"results": results, "total": len(urls)}

async def async_resolve_and_enqueue(
    urls_raw: str,
    quality: str,
    audio_format: str,
    embed_thumb: bool,
    embed_meta: bool,
    folder: str,
    rate_limit_kbps: Optional[int] = None,
    selected_urls: Optional[List[str]] = None
):
    loop = asyncio.get_running_loop()
    resolved_items = await loop.run_in_executor(
        None,
        downloader_instance.resolve_urls,
        urls_raw
    )

    new_items_list = []
    for entry in resolved_items:
        # Filter if selected_urls provided
        if selected_urls and entry["url"] not in selected_urls:
            continue

        item_id = f"item_{uuid.uuid4().hex[:8]}"
        item_data = {
            "id": item_id,
            "url": entry["url"],
            "title": entry.get("title") or "فيديو يوتيوب",
            "quality": quality,
            "audio_format": audio_format,
            "embed_thumbnail": embed_thumb,
            "embed_metadata": embed_meta,
            "rate_limit_kbps": rate_limit_kbps,
            "folder": folder,
            "playlist_index": entry.get("playlist_index"),
            "playlist_total": entry.get("playlist_total"),
            "playlist_title": entry.get("playlist_title"),
            "status": "queued"
        }
        all_items[item_id] = item_data
        new_items_list.append(item_data)
        session_stats["total"] += 1
        await download_queue.put(item_data)

    await manager.broadcast({
        "event": "items_queued",
        "items": new_items_list,
        "stats": session_stats,
        "queue_size": download_queue.qsize()
    })

@app.post("/api/download")
async def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    urls = YouTubeDownloader.clean_urls(req.urls)
    if not urls:
        raise HTTPException(status_code=400, detail="يرجى إدخال رابط يوتيوب واحد على الأقل")

    cfg = load_config()
    target_folder = os.path.abspath(req.folder) if req.folder and req.folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    os.makedirs(target_folder, exist_ok=True)

    save_config({"download_folder": target_folder})

    background_tasks.add_task(
        async_resolve_and_enqueue,
        urls_raw=req.urls,
        quality=req.quality,
        audio_format=req.audio_format or "mp3",
        embed_thumb=req.embed_thumbnail,
        embed_meta=req.embed_metadata,
        folder=target_folder,
        rate_limit_kbps=req.rate_limit_kbps,
        selected_urls=req.selected_urls
    )

    return {
        "status": "processing_urls",
        "message": "جاري فك الروابط وإضافتها إلى الطابور فوراً...",
        "target_folder": target_folder
    }

@app.get("/api/downloads")
async def list_downloads(folder: Optional[str] = None):
    cfg = load_config()
    target_dir = os.path.abspath(folder) if folder and folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    if not os.path.exists(target_dir):
        return {"files": [], "folder": target_dir}

    files = []
    valid_exts = (".mp3", ".m4a", ".flac", ".wav", ".m4r", ".mp4", ".aac")
    try:
        for entry in os.scandir(target_dir):
            if entry.is_file() and entry.name.lower().endswith(valid_exts):
                stat = entry.stat()
                size_mb = round(stat.st_size / (1024 * 1024), 2)
                files.append({
                    "name": entry.name,
                    "size_mb": size_mb,
                    "modified": stat.st_mtime,
                    "is_video": entry.name.lower().endswith(".mp4"),
                    "is_ringtone": entry.name.lower().endswith(".m4r")
                })
        files.sort(key=lambda x: x["modified"], reverse=True)
    except Exception as e:
        return {"files": [], "folder": target_dir, "error": str(e)}

    return {"files": files, "folder": target_dir}

@app.get("/api/audio/{filename}")
async def get_audio_file(filename: str, folder: Optional[str] = None):
    cfg = load_config()
    target_dir = os.path.abspath(folder) if folder and folder.strip() else cfg.get("download_folder", DEFAULT_DOWNLOAD_DIR)
    file_path = os.path.join(target_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    
    media_type = "audio/mpeg"
    if filename.lower().endswith((".m4a", ".m4r")):
        media_type = "audio/mp4"
    elif filename.lower().endswith(".wav"):
        media_type = "audio/wav"
    elif filename.lower().endswith(".flac"):
        media_type = "audio/flac"
    elif filename.lower().endswith(".mp4"):
        media_type = "video/mp4"

    return FileResponse(file_path, media_type=media_type, filename=filename)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        cfg = load_config()
        cfg["os_name"] = get_os_name()
        await websocket.send_json({
            "event": "init_state",
            "stats": session_stats,
            "queue_size": download_queue.qsize(),
            "is_paused": is_queue_paused,
            "config": cfg,
            "items": list(all_items.values())[-50:]
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
