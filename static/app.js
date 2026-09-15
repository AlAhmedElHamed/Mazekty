// مزيكتي برو - Mazekty Pro Cross-Platform Controller

let socket = null;
let reconnectTimer = null;
let currentTasks = {}; // item_id -> DOM element
let stats = { total: 0, completed: 0, skipped: 0, failed: 0, in_progress: 0 };
let soundEnabled = true;
let currentLang = 'en';
let activeView = 'downloader';
let cachedLibraryFiles = [];
let currentlyPlayingFile = '';
let isQueuePaused = false;
let previewDataList = [];

// --- Comprehensive Bilingual Dictionary for 20+ Features ---
const i18n = {
  "en": {
    "auto_retry_end": "Auto-retry failed downloads at the end of queue",
    "btn_denoise_execute": "Clean & De-Noise Audio",
    "btn_identify_execute": "Analyze & Identify Track",
    "btn_merge_execute": "Merge & Generate DJ Mix",
    "btn_retry_failed": "Retry All Failed",
    "btn_retry_now": "Retry Now 🔄",
    "btn_stems_execute": "Extract 4 Stems Now",
    "clipboard_detected": "New Media Link Copied!",
    "clipboard_monitor": "Smart Clipboard Auto-Monitor",
    "crossfade_duration": "Crossfade Duration:",
    "denoise_desc": "Remove mic hiss, air noise and background hum to clarify vocals.",
    "denoise_hint": "💡 Ideal for voice recordings, lectures, podcasts, and noisy files.",
    "denoise_title": "Audio De-Noise & Voice Clarifier",
    "identify_desc": "Scan unknown audio files to fetch original title, artist, album and HD artwork.",
    "identify_title": "Track Identifier (Shazam-like)",
    "merger_desc": "Merge two tracks with seamless DJ crossfade transition.",
    "merger_title": "Audio Merger & DJ Crossfade",
    "retry_modal_title": "Change Format / Quality & Retry",
    "select_track1_label": "First Track:",
    "select_track2_label": "Second Track:",
    "sleep_timer_desc": "Audio volume will fade out gradually and playback will stop automatically:",
    "sleep_timer_title": "Smart Sleep Timer",
    "stems_desc": "Split any song into 4 independent stems: Vocals, Music, Bass, and Drums.",
    "stems_title": "AI Stems Separator (4 Stems)",
    "supported_platforms": "Supported Platforms:",
    "vis_modal_title": "Live Neon Spectrum Visualizer",
    "lyrics_title": "Karaoke Lyrics",
    "lyrics_loading": "Fetching synced karaoke lyrics...",
    "lyrics_not_found": "No synced lyrics found for this track.",
    "lyrics_synced": "Karaoke Synced ✓",
    "lyrics_plain": "Plain Text Lyrics",
    "btn_save_lrc": "Save .lrc File",
    "lrc_saved": "LRC lyrics saved successfully!",
    "btn_mini_player": "Mini Floating Player",
    "btn_visualizer": "Neon Spectrum Visualizer",
    "btn_sleep_timer": "Sleep Timer",
    "sleep_timer_active": "Sleep timer active: {min}m remaining",
    "sleep_timer_off": "Sleep timer turned off",
    "toast_download_now": "Download Now",
    "toast_ignore": "Dismiss",
    "app_brand": "Mazekty",
    "nav_downloader": "Downloader",
    "nav_search": "Direct Search",
    "nav_library": "Audio Library",
    "nav_studio": "Pro Studio",
    "nav_settings": "Settings",
    "links_label": "YouTube Links (Video, Playlist, or Multiple URLs):",
    "btn_paste": "📋 Paste from Clipboard",
    "btn_clear": "Clear",
    "format_label": "Download Format:",
    "quality_label": "Audio Quality (Bitrate):",
    "speed_limit_label": "Download Speed Limiter:",
    "speed_unlimited": "🚀 Unlimited (Max Speed)",
    "embed_thumb": "Embed Album Art",
    "embed_meta": "Embed ID3 Metadata",
    "skip_feature": "⚡ Auto Duplicate Skip",
    "btn_analyze": "🔍 Analyze Links / Playlist",
    "btn_schedule": "Schedule Download",
    "btn_download": "Add to Queue & Start Download",
    "preview_title": "URL Analysis & Playlist Tracks",
    "btn_select_all": "Select All",
    "btn_deselect_all": "Deselect All",
    "btn_close": "Close",
    "range_label": "Download track range:",
    "btn_apply_range": "Apply Range",
    "btn_download_selected": "Download Selected Tracks Only",
    "queue_title": "Download Queue & Real-time Monitor",
    "btn_pause_queue": "Pause Queue",
    "btn_resume_queue": "Resume Queue",
    "stat_total": "Total:",
    "stat_active": "Processing:",
    "stat_done": "Completed:",
    "stat_skipped": "Skipped:",
    "stat_fail": "Failed:",
    "btn_clear_completed": "🧹 Clean",
    "empty_tasks": "No downloads in queue. Paste URLs and click 'Add to Queue' to start the magic!",
    "search_banner_title": "In-App Direct YouTube Search",
    "search_banner_desc": "Search any song, artist or album directly without opening a browser or copying links (100% free, zero API keys).",
    "btn_search_now": "Search Now",
    "search_prompt": "Type what you want to hear and click 'Search Now'",
    "library_title": "Downloaded Audio Library",
    "auto_refresh_badge": "Auto Refresh ⚡",
    "btn_export_m3u": "Export M3U",
    "btn_refresh": "🔄 Refresh",
    "btn_open_finder": "📂 Open Folder",
    "btn_browse_folder": "Choose Folder",
    "empty_library": "No audio files in this folder yet.",
    "sort_date_desc": "📅 Newest First",
    "sort_date_asc": "📅 Oldest First",
    "sort_name_asc": "🔤 Alphabetical (A-Z)",
    "sort_size_desc": "💾 Largest Size",
    "trimmer_title": "Audio Trimmer & Ringtone Maker",
    "trimmer_desc": "Trim a specific snippet or export directly as an iPhone ringtone (.m4r).",
    "select_file_label": "Select file to trim:",
    "start_sec_label": "Start Time (Seconds):",
    "end_sec_label": "End Time (Seconds):",
    "make_ringtone_label": "Create iPhone Ringtone (.m4r format)",
    "btn_trim_execute": "Trim & Save Track Now",
    "enhancer_title": "Loudness Normalizer & Deep Bass Boost",
    "enhancer_desc": "Standardize audio levels to studio standards and pump up deep bass frequencies.",
    "loudnorm_label": "Loudness Normalization (EBU R128)",
    "bassboost_label": "Deep Bass Boost (+6dB Punch)",
    "btn_enhance_execute": "Enhance & Save Studio Master",
    "vocal_remover_title": "Vocal Remover & Karaoke Maker",
    "vocal_remover_desc": "Extract vocals and keep backing music & instruments via stereo phase cancellation.",
    "btn_vocal_execute": "Extract Vocals & Generate Karaoke",
    "pitch_shifter_title": "Pitch & BPM / Tempo Shifter",
    "pitch_shifter_desc": "Shift musical key (pitch) and playback speed seamlessly.",
    "pitch_label": "Pitch Shift (Semitones):",
    "speed_label": "Playback Speed (Tempo):",
    "btn_pitch_execute": "Apply Pitch/Speed & Save Master",
    "spatial_title": "8D Spatial Binaural Audio Effect",
    "spatial_desc": "Generate 360-degree rotating audio creating an immersive headphone experience.",
    "btn_spatial_execute": "Convert to 8D Spatial Audio",
    "equalizer_title": "10-Band Graphic Equalizer",
    "equalizer_desc": "Studio-tuned presets for pinpoint frequency mastering.",
    "eq_preset_label": "Select Preset:",
    "btn_eq_execute": "Apply Equalizer & Save",
    "silence_title": "Smart Silence Remover",
    "silence_desc": "Automatically detect and trim dead silence at start and end.",
    "btn_silence_execute": "Clean Silence Now",
    "converter_title": "Batch Audio Converter",
    "converter_desc": "Convert entire folder to target format in parallel.",
    "target_format_label": "Target Format:",
    "btn_convert_execute": "Convert Entire Library Now",
    "art_title": "High-Res Album Art Replacer",
    "art_desc": "Replace track album artwork with any local image file.",
    "select_image_label": "Select Cover Image (JPG/PNG):",
    "btn_art_execute": "Embed Album Art",
    "applemusic_title": "iPhone & Apple Music Playlist Sync",
    "applemusic_desc": "Create custom playlists and sync tracks directly to iPhone via Apple Music, Finder & Wi-Fi.",
    "btn_sync_now": "Sync Track to Playlist",
    "btn_sync_all": "Sync All to Playlist",
    "playlist_name_label": "Playlist Name:",
    "btn_sync_finder": "Sync iPhone (Finder/USB)",
    "btn_mobile_airsync": "Transfer via QR Code & Wi-Fi",
    "btn_mobile_sync": "Sync Mobile (QR)",
    "mobile_sync_modal_title": "Sync & Transfer to iPhone & Mobile",
    "mobile_sync_hint": "Scan QR Code with iPhone camera to stream or download playlist over local Wi-Fi:",
    "mobile_url_label": "Or open this URL directly in Safari:",
    "setting_folder_title": "Persistent Download Folder",
    "setting_folder_desc": "Remembered permanently across app sessions.",
    "setting_theme_mode": "Theme Mode",
    "setting_theme_mode_desc": "Choose interface appearance (Dark Glass, OLED Black, or Light Modern).",
    "setting_accent_title": "Accent Color",
    "setting_accent_desc": "Customize primary buttons and glow accents.",
    "setting_lang_title": "Application Language",
    "setting_lang_desc": "Choose interface display language.",
    "setting_os_title": "Operating System & Environment",
    "setting_os_desc": "Detected platform and local audio engine.",
    "status_connected": "Connected to Server ✓",
    "status_connecting": "Connecting...",
    "status_reconnecting": "Reconnecting...",
    "status_queued": "Queued ⏳",
    "status_downloading": "Downloading... ⚡",
    "status_converting": "Converting... 🎛️",
    "status_completed": "Completed ✓",
    "status_skipped": "Skipped (Already Exists ⏭️)",
    "status_cancelled": "Cancelled ✕",
    "status_failed": "Download Failed ❌",
    "tag_editor_title": "Audio Metadata & ID3 Tag Editor",
    "tag_title_label": "Track Title:",
    "tag_artist_label": "Artist Name:",
    "tag_album_label": "Album:",
    "tag_year_label": "Year:",
    "tag_genre_label": "Genre:",
    "btn_save_tags": "Save Tags to File ✓",
    "btn_cancel": "Cancel",
    "schedule_modal_title": "Schedule Automated Download",
    "schedule_desc": "Specify in how many minutes the download should automatically begin (ideal for overnight downloads):",
    "schedule_delay_label": "Start after (Minutes):",
    "btn_confirm_schedule": "Confirm Schedule ⏰",
    "nav_sync": "Transfer & Sync",
    "sync_hero_title": "Mobile Transfer & Sync Hub (Apple & Android)",
    "sync_hero_desc": "Advanced zero-cloud sync: Instant AirSync wireless streaming via QR Code, custom Apple Music playlist creation, and hardware Finder USB sync.",
    "sync_airsync_title": "Instant Wireless AirSync (QR Code)",
    "sync_airsync_subtitle": "Scan QR code with iPhone camera to launch native Safari player & downloader",
    "sync_apple_music_title": "Apple Music & Playlist Sync",
    "sync_apple_music_subtitle": "Sync tracks directly into Apple Music library and generate custom playlists",
    "sync_finder_title": "Wired USB Mobile Sync (Apple & Android)",
    "sync_finder_subtitle": "Auto-detects iPhone, iPad & Android devices connected via USB-C / Cable",
    "sync_network_adapter": "Network Interface / LAN IP:",
    "btn_download_zip_all": "Download All as ZIP (iPhone Files App)",
    "sync_zip_hint": "Saved to iOS Files app (Downloads) and extracted in 1-tap with zero computer tethering.",
    "sync_guide_title": "iPhone Quick Start Guide 📱:",
    "step1_title": "Connect to Same Wi-Fi:",
    "step1_desc": "Ensure your iPhone and computer are connected to the same local Wi-Fi.",
    "step2_title": "Scan QR Code:",
    "step2_desc": "Open native iOS Camera, point at the code, and tap the yellow link to launch Safari.",
    "step3_title": "Stream or Save:",
    "step3_desc": "Play continuously in background on lock screen, or 1-tap download ZIP to Files app.",
    "sync_playlist_label": "Playlist Name:",
    "quick_tags": "Quick Suggestions:",
    "btn_sync_all_playlist": "Sync All Library & Create Playlist",
    "sync_single_track_label": "Or select an individual track to sync:",
    "select_file_placeholder": "-- Select an audio file --",
    "btn_sync_single": "Sync Track",
    "btn_scan_devices": "Scan Devices",
    "checking_devices": "Scanning for connected Apple & Android devices...",
    "connect_cable_hint": "Connect your phone via USB-C or Lightning cable to sync music directly.",
    "btn_open_finder_sync": "Apple Finder Sync",
    "btn_sync_android_quick": "Sync to Android",
    "btn_goto_sync_tab": "Open Dedicated Sync & Transfer Tab 📱",
    "btn_copy": "Copy",
    "btn_open": "Open",
    "btn_ping": "Ping",
    "qr_loading": "Generating high-speed QR Code...",
    "lang_select_label": "App Language",
    "url_placeholder": "Paste links here... Video, Playlist, or multiple URLs (one per line)...",
    "search_input_placeholder": "Search by song or artist name... (e.g. Adele, Coldplay, Lo-Fi chill)...",
    "library_filter_placeholder": "Filter and search tracks by name...",
    "tab_sync_playlist_placeholder": "e.g. Mazekty Top Hits",
    "range_to": "to",
    "pro_hero_title": "Mazekty Pro Studio",
    "pro_hero_subtitle": "Advanced audio engineering tools running 100% locally on your machine with zero subscriptions.",
    "spatial_hint": "💡 Headphones are highly recommended for the best 360° spatial binaural experience.",
    "opt_format_mp3": "🎵 MP3 (Universal Standard)",
    "opt_format_m4a": "🍎 M4A (Apple AAC High Quality)",
    "opt_format_flac": "💎 FLAC (Lossless Studio Quality)",
    "opt_format_wav": "🎙️ WAV (Raw Studio Master)",
    "opt_format_mp4": "🎬 MP4 (HD Video & Audio)",
    "opt_quality_320": "⚡ 320 kbps (Ultra HD - Highest Quality)",
    "opt_quality_256": "✨ 256 kbps (High Quality)",
    "opt_quality_192": "🎵 192 kbps (Medium Quality)",
    "opt_quality_128": "📦 128 kbps (Standard - Smaller Size)",
    "opt_speed_unlimited": "🚀 Unlimited (Max Speed)",
    "opt_speed_3mb": "⚡ 3 MB/s (Balanced Fast)",
    "opt_speed_1mb": "🌐 1 MB/s (Quota Saver)",
    "opt_speed_500kb": "🐌 500 KB/s (Low Bandwidth)",
    "opt_eq_bass": "🔊 Bass Boost (Deep Low-End)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Clean Vocals)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Live Energy)",
    "opt_eq_electro": "⚡ Electronic / Dance (Punchy Beats)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Voice Isolation)",
    "opt_theme_dark": "🌌 Dark Glass (Default)",
    "opt_theme_oled": "🖤 OLED Black (Pure Pitch Black)",
    "opt_theme_light": "☀️ Light Modern",
    "setting_license_title": "Mazekty PRO License",
    "setting_license_desc": "Professional features are permanently active and 100% free.",
    "setting_license_active": "✓ Active & Lifetime Activated",
    "modal_step1": "✓ Step 1: Open iPhone Camera and scan QR code.",
    "modal_step2": "✓ Step 2: Safari opens your instant web player.",
    "modal_step3": "✓ Step 3: Tap 'Download All ZIP' to save to iOS Files app, or stream in background!",
    "btn_done": "Done ✓",
    "splash_loading": "Initializing Mazekty Pro audio engine...",
    "splash_ready": "Welcome to Mazekty Pro",
    "loading_view": "Loading...",
    "sound_toggle_title": "Mute / Unmute Sound Effects",
  },
  "ar": {
    "auto_retry_end": "إعادة محاولة التحميلات الفاشلة تلقائياً في نهاية الطابور",
    "btn_denoise_execute": "تنقية وإزالة الضوضاء",
    "btn_identify_execute": "فحص التراك والتعرف عليه",
    "btn_merge_execute": "دمج وتوليد ميكس الـ DJ",
    "btn_retry_failed": "إعادة محاولة الفاشل",
    "btn_retry_now": "إعادة المحاولة الآن 🔄",
    "btn_stems_execute": "بدء فصل المسارات الـ 4 فوراً",
    "clipboard_detected": "تم نسخ رابط وسائط جديد!",
    "clipboard_monitor": "المراقبة الذكية للحافظة التلقائية",
    "crossfade_duration": "مدة التداخل (Crossfade):",
    "denoise_desc": "إزالة وشيش الميكروفون وصفير الهواء والضوضاء الخلفية وتوضيح مخارج الحروف.",
    "denoise_hint": "💡 مثالي لتنقية التسجيلات الصوتية، المحاضرات، البودكاست، والملفات ذات الوشيش الخلفي.",
    "denoise_title": "منقي التشويش والضوضاء (Audio De-Noise)",
    "identify_desc": "فحص أي أغنية مجهولة لجلب اسمها الأصلي، اسم الفنان، الألبوم، والغلاف فائق الدقة.",
    "identify_title": "كاشف هوية التراكات المجهولة (Audio Identifier)",
    "merger_desc": "دمج أغنيتين أو أكثر مع انتقال انسيابي متداخل وتلاشي صوتي لتوليد ميكس مستمر.",
    "merger_title": "دمج التراكات وميكس الانتقال (DJ Crossfade)",
    "retry_modal_title": "تعديل الصيغة والجودة وإعادة المحاولة",
    "select_track1_label": "المقطع الأول:",
    "select_track2_label": "المقطع الثاني:",
    "sleep_timer_desc": "سيتم خفض الصوت تدريجياً وإيقاف المشغل تلقائياً بعد انقضاء الوقت:",
    "sleep_timer_title": "مؤقت النوم الذكي",
    "stems_desc": "فصل أي أغنية إلى 4 مسارات مستقلة: الغناء (Vocals)، الموسيقى (Music)، البيس (Bass)، والإيقاع (Drums).",
    "stems_title": "مفكك التراكات الصوتية (AI Stems Separator)",
    "supported_platforms": "المنصات المدعومة:",
    "vis_modal_title": "محلل الطيف الصوتي النيوني (Live Spectrum)",
    "lyrics_title": "كلمات الأغنية المتزامنة",
    "lyrics_loading": "جاري جلب الكلمات المتزامنة...",
    "lyrics_not_found": "لم يتم العثور على كلمات متزامنة لهذا التراك.",
    "lyrics_synced": "متزامن كاريوكي ✓",
    "lyrics_plain": "كلمات نصية",
    "btn_save_lrc": "حفظ كملف .lrc",
    "lrc_saved": "تم حفظ ملف الكلمات LRC بنجاح!",
    "btn_mini_player": "المشغل المصغر العائم",
    "btn_visualizer": "محلل الطيف الصوتي",
    "btn_sleep_timer": "مؤقت النوم",
    "sleep_timer_active": "مؤقت النوم نشط: متبقي {min} دقيقة",
    "sleep_timer_off": "تم إيقاف مؤقت النوم",
    "toast_download_now": "تحميل الآن",
    "toast_ignore": "تجاهل",
    "app_brand": "مزيكتي",
    "nav_downloader": "التحميل السريع",
    "nav_search": "البحث المباشر",
    "nav_library": "المكتبة الصوتية",
    "nav_studio": "استوديو برو",
    "nav_settings": "الإعدادات",
    "links_label": "روابط اليوتيوب (فيديو، بلاي ليست، أو عدة روابط):",
    "btn_paste": "📋 لصق من الحافظة",
    "btn_clear": "مسح",
    "format_label": "صيغة التحميل (Format):",
    "quality_label": "جودة الصوت (Bitrate):",
    "speed_limit_label": "محدد سرعة التنزيل:",
    "speed_unlimited": "🚀 بلا حدود (أقصى سرعة)",
    "embed_thumb": "دمج صورة الغلاف",
    "embed_meta": "دمج بيانات الميتا والوسوم",
    "skip_feature": "⚡ تخطي المكرر تلقائياً",
    "btn_analyze": "🔍 فحص الروابط / البلاي ليست",
    "btn_schedule": "جدولة التنزيل",
    "btn_download": "إضافة إلى الطابور وبدء التحميل",
    "preview_title": "نتائج فحص الروابط وقوائم التشغيل",
    "btn_select_all": "تحديد الكل",
    "btn_deselect_all": "إلغاء التحديد",
    "btn_close": "إغلاق",
    "range_label": "تحميل نطاق محدد من المقاطع:",
    "btn_apply_range": "تطبيق النطاق",
    "btn_download_selected": "تحميل المقاطع المحددة فقط",
    "queue_title": "طابور التنزيل والمتابعة اللحظية",
    "btn_pause_queue": "إيقاف مؤقت",
    "btn_resume_queue": "استئناف الطابور",
    "stat_total": "الإجمالي:",
    "stat_active": "قيد المعالجة:",
    "stat_done": "اكتمل:",
    "stat_skipped": "تم التخطي:",
    "stat_fail": "فشل:",
    "btn_clear_completed": "🧹 تنظيف",
    "empty_tasks": "لا توجد تنزيلات في الطابور حالياً. الصق الروابط واضغط 'إضافة إلى الطابور' ليبدأ السحر!",
    "search_banner_title": "البحث المباشر من داخل التطبيق",
    "search_banner_desc": "ابحث عن أي أغنية أو فنان أو ألبوم مباشرة بدون الحاجة لفتح المتصفح أو نسخ الروابط (مجاني وبدون أي مفاتيح API).",
    "btn_search_now": "بحث الآن",
    "search_prompt": "اكتب اسم ما تريد الاستماع إليه واضغط 'بحث الآن'",
    "library_title": "المكتبة الصوتية المحملة",
    "auto_refresh_badge": "تحديث تلقائي ⚡",
    "btn_export_m3u": "تصدير M3U",
    "btn_refresh": "🔄 تحديث",
    "btn_open_finder": "📂 فتح المجلد",
    "btn_browse_folder": "اختيار مجلد",
    "empty_library": "لا توجد ملفات في هذا المجلد حتى الآن.",
    "sort_date_desc": "📅 الأحدث إضافة",
    "sort_date_asc": "📅 الأقدم",
    "sort_name_asc": "🔤 أبجدياً (أ-ي)",
    "sort_size_desc": "💾 الأكبر حجماً",
    "trimmer_title": "قاص الصوت وصانع نغمات الآيفون",
    "trimmer_desc": "اقتطع جزءاً محدداً من الأغنية أو حوله إلى نغمة رنين للآيفون (.m4r).",
    "select_file_label": "اختر الملف المراد تقطيعه:",
    "start_sec_label": "البداية (بالثواني):",
    "end_sec_label": "النهاية (بالثواني):",
    "make_ringtone_label": "صنع نغمة رنين للآيفون بصيغة (.m4r)",
    "btn_trim_execute": "قص وحفظ التراك الآن",
    "enhancer_title": "موازنة الصوت وتضخيم البيس (Equalizer)",
    "enhancer_desc": "توحيد درجات الصوت وفق معايير الاستوديو وإبراز ترددات البيس الفخمة.",
    "loudnorm_label": "موازنة مستوى الصوت (Loudness EBU R128)",
    "bassboost_label": "تضخيم ترددات البيس الفخمة (Deep Bass Boost +6dB)",
    "btn_enhance_execute": "تحسين وحفظ نسخة الاستوديو",
    "vocal_remover_title": "عازل الصوت وصانع الكاريوكي",
    "vocal_remover_desc": "عزل صوت المغني والاحتفاظ بالموسيقى والآلات عبر تقنية إلغاء الطور الصوتي.",
    "btn_vocal_execute": "عزل الصوت وتوليد الكاريوكي",
    "pitch_shifter_title": "مغير طبقة الصوت وسرعة الإيقاع (Pitch & BPM)",
    "pitch_shifter_desc": "تغيير طبقة الصوت (Key) وسرعة الأغنية (Tempo) باحترافية.",
    "pitch_label": "طبقة النغمة (Semitones):",
    "speed_label": "سرعة التشغيل (Tempo):",
    "btn_pitch_execute": "تطبيق التعديلات وحفظ الماستر",
    "spatial_title": "مؤثر الصوت المكاني ثلاثي الأبعاد (8D Audio)",
    "spatial_desc": "توليد نغمات تدور 360 درجة حول الرأس بتأثير هيدفون ساحر.",
    "btn_spatial_execute": "تحويل إلى صوت 8D محيطي",
    "equalizer_title": "إكولايزر احترافي 10 قنوات (Graphic EQ)",
    "equalizer_desc": "إعدادات استوديو مسبقة التجهيز لضبط الترددات بدقة متناهية.",
    "eq_preset_label": "اختر الإعداد المسبق (Preset):",
    "btn_eq_execute": "تطبيق الإكولايزر وحفظ التراك",
    "silence_title": "حاذف الصمت الذكي (Smart Silence Remover)",
    "silence_desc": "كشف وقص فترات السكون الميتة في البداية والنهاية تلقائياً.",
    "btn_silence_execute": "تنظيف الصمت فوراً",
    "converter_title": "محول الصيغ الجماعي (Batch Audio Converter)",
    "converter_desc": "تحويل جميع ملفات المجلد إلى صيغة محددة دفعة واحدة.",
    "target_format_label": "اختر الصيغة المستهدفة للتحويل:",
    "btn_convert_execute": "تحويل كافة ملفات المكتبة الآن",
    "art_title": "مغير غلاف الألبوم بدقة عالية (Album Art)",
    "art_desc": "استبدال صورة غلاف الأغنية بأي صورة من جهازك بدقة متناهية.",
    "select_image_label": "اختر صورة الغلاف (JPG/PNG):",
    "btn_art_execute": "تثبيت صورة الغلاف في الملف",
    "applemusic_title": "مزامنة الآيفون وقوائم تشغيل Apple Music",
    "applemusic_desc": "إنشاء قوائم تشغيل مخصصة ونقل الأغاني مباشرة إلى الآيفون عبر Apple Music و Finder والـ Wi-Fi.",
    "btn_sync_now": "إضافة المقطع للبلاي ليست",
    "btn_sync_all": "مزامنة كل الأغاني للقائمة",
    "playlist_name_label": "اسم قائمة التشغيل (Playlist Name):",
    "btn_sync_finder": "مزامنة الآيفون (Finder/USB)",
    "btn_mobile_airsync": "نقل عبر QR Code والواي فاي",
    "btn_mobile_sync": "نقل للموبايل (QR Sync)",
    "mobile_sync_modal_title": "مزامنة ونقل الأغاني للآيفون والموبايل",
    "mobile_sync_hint": "امسح رمز الـ QR بكاميرا الآيفون لنقل وتشغيل البلاي ليست فوراً عبر نفس شبكة الواي فاي:",
    "mobile_url_label": "أو افتح هذا الرابط مباشرة من متصفح سفاري (Safari):",
    "setting_folder_title": "مجلد حفظ التنزيلات الدائم",
    "setting_folder_desc": "يتم تذكر هذا المجلد دائماً ولن يتغير عند إغلاق التطبيق.",
    "setting_theme_mode": "مظهر الواجهة (Theme Mode)",
    "setting_theme_mode_desc": "اختر مظهر الواجهة المفضل (زجاجي داكن، أسود OLED، أو فاتح عصري).",
    "setting_accent_title": "لون الإضاءة الرئيسي (Accent Color)",
    "setting_accent_desc": "خصص لون الأزرار والتوهج داخل التطبيق.",
    "setting_lang_title": "لغة التطبيق (App Language)",
    "setting_lang_desc": "اختر اللغة المفضلة للواجهة.",
    "setting_os_title": "نظام التشغيل والبيئة (Platform)",
    "setting_os_desc": "نظام التشغيل المكتشف ومحرك المعالجة الداخلي.",
    "status_connected": "متصل بالسيرفر ✓",
    "status_connecting": "جاري الاتصال...",
    "status_reconnecting": "جاري إعادة الاتصال...",
    "status_queued": "في الانتظار ⏳",
    "status_downloading": "جاري التحميل... ⚡",
    "status_converting": "تحويل الصوت... 🎛️",
    "status_completed": "تم بنجاح ✓",
    "status_skipped": "تم التخطي (موجود مسبقاً ⏭️)",
    "status_cancelled": "تم الإلغاء ✕",
    "status_failed": "فشل التحميل ❌",
    "tag_editor_title": "محرر وسوم ومعلومات الأغنية (ID3 Tags)",
    "tag_title_label": "عنوان الأغنية (Title):",
    "tag_artist_label": "اسم الفنان (Artist):",
    "tag_album_label": "الألبوم (Album):",
    "tag_year_label": "السنة (Year):",
    "tag_genre_label": "النوع (Genre):",
    "btn_save_tags": "حفظ التعديلات في الملف ✓",
    "btn_cancel": "إلغاء",
    "schedule_modal_title": "جدولة التنزيل التلقائي",
    "schedule_desc": "حدد بعد كم دقيقة تريد أن يبدأ التطبيق بتحميل الروابط المكتوبة في خانة التنزيل (مفيد للتحميل الليلي وتوفير الباقة):",
    "schedule_delay_label": "البدء بعد (بالدقائق):",
    "btn_confirm_schedule": "تأكيد الجدولة ⏰",
    "nav_sync": "النقل والمزامنة",
    "sync_hero_title": "مركز النقل والمزامنة للهواتف (آيفون وأندرويد)",
    "sync_hero_desc": "نظام مزامنة متطور بدون أي اشتراكات أو أطراف خارجية: بث لاسلكي فوري عبر QR Code وشبكة Wi-Fi، إنشاء وتصدير قوائم التشغيل (Playlists)، والمزامنة السلكية مع Apple Music و Finder.",
    "sync_airsync_title": "المزامنة اللاسلكية الفورية (AirSync QR Code)",
    "sync_airsync_subtitle": "امسح الكود بكاميرا الآيفون لفتح المشغل والمحمل المخصص لـ Safari فوراً",
    "sync_apple_music_title": "مزامنة Apple Music وبلاي ليست مخصصة",
    "sync_apple_music_subtitle": "إضافة الأغاني مباشرة إلى تطبيق الموسيقى مع إنشاء قائمة تشغيل باسمك",
    "sync_finder_title": "المزامنة السلكية عبر كابل USB (أبل وأندرويد)",
    "sync_finder_subtitle": "كشف ومزامنة أجهزة الآيفون والأندرويد المتصلة عبر كابل Type-C",
    "sync_network_adapter": "عنوان الشبكة / Network IP:",
    "btn_download_zip_all": "تحميل كل الأغاني ملف مضغوط (ZIP للآيفون)",
    "sync_zip_hint": "يتم حفظه في مجلد التنزيلات وتطبيقات الآيفون (Files app) وفك ضغطه بنقرة واحدة بدون كمبيوتر.",
    "sync_guide_title": "خطوات الاستخدام على الآيفون 📱:",
    "step1_title": "الاتصال بنفس الشبكة:",
    "step1_desc": "تأكد أن الآيفون والكمبيوتر متصلان بنفس شبكة الـ Wi-Fi المنزلية.",
    "step2_title": "مسح كود الـ QR:",
    "step2_desc": "افتح كاميرا الآيفون الافتراضية ووجّهها إلى الكود أعلاه، ثم اضغط على الرابط الأصفر للفتح في Safari.",
    "step3_title": "التشغيل أو الحفظ:",
    "step3_desc": "استمتع بتشغيل الأغاني في الخلفية مع قفل الشاشة، أو اضغط 'تحميل ZIP' لنقل كل التراكات إلى تطبيق 'الملفات' (Files).",
    "sync_playlist_label": "اسم قائمة التشغيل (Playlist Name):",
    "quick_tags": "اقتراحات سريعة:",
    "btn_sync_all_playlist": "مزامنة كل المكتبة وإنشاء قائمة التشغيل",
    "sync_single_track_label": "أو اختر تراكاً محدداً لمزامنته فقط:",
    "select_file_placeholder": "-- اختر ملفاً صوتياً --",
    "btn_sync_single": "مزامنة التراك",
    "btn_scan_devices": "فحص الأجهزة",
    "checking_devices": "جاري فحص اتصال أجهزة أبل وأندرويد عبر USB...",
    "connect_cable_hint": "قم بتوصيل هاتفك بكابل Type-C أو Lightning لنقل الموسيقى مباشرة.",
    "btn_open_finder_sync": "مزامنة الآيفون (Finder)",
    "btn_sync_android_quick": "نقل للأندرويد",
    "btn_goto_sync_tab": "فتح لوحة النقل والمزامنة المستقلة 📱",
    "btn_copy": "نسخ",
    "btn_open": "فتح",
    "btn_ping": "فحص",
    "qr_loading": "جاري إنشاء كود QR فائق السرعة...",
    "lang_select_label": "اللغة / Language",
    "url_placeholder": "ضع الرابط هنا... فيديو، قائمة تشغيل (Playlist)، أو عدة روابط (كل رابط في سطر)...",
    "search_input_placeholder": "ابحث باسم الأغنية أو الفنان... (مثال: عمرو دياب، Adele، تراك هادئ)...",
    "library_filter_placeholder": "تصفية والبحث في الملفات بالاسم...",
    "tab_sync_playlist_placeholder": "مثال: Mazekty Top Hits",
    "range_to": "إلى",
    "pro_hero_title": "استوديو مزيكتي برو (Mazekty Pro Studio)",
    "pro_hero_subtitle": "أدوات هندسة وتحسين الصوت المتقدمة تعمل 100% محلياً على جهازك وبدون أي اشتراكات.",
    "spatial_hint": "💡 يُفضل الاستماع إلى ملفات الـ 8D باستخدام سماعات الرأس (Headphones) للحصول على أفضل تجربة ثلاثية الأبعاد.",
    "opt_format_mp3": "🎵 MP3 (الصوت القياسي العالمي)",
    "opt_format_m4a": "🍎 M4A (Apple AAC عالي النقاوة)",
    "opt_format_flac": "💎 FLAC (صوت نقي بدون فقد Lossless)",
    "opt_format_wav": "🎙️ WAV (جودة ستوديو خام Studio Master)",
    "opt_format_mp4": "🎬 MP4 (فيديو وصوت كامل HD Video)",
    "opt_quality_320": "⚡ 320 kbps (أعلى جودة صوت - Ultra HD)",
    "opt_quality_256": "✨ 256 kbps (جودة ممتازة - High)",
    "opt_quality_192": "🎵 192 kbps (جودة جيدة - Medium)",
    "opt_quality_128": "📦 128 kbps (حجم أصغر - Standard)",
    "opt_speed_unlimited": "🚀 بلا حدود (أقصى سرعة)",
    "opt_speed_3mb": "⚡ 3 MB/s (سريع وموزون)",
    "opt_speed_1mb": "🌐 1 MB/s (متوسط للباقة)",
    "opt_speed_500kb": "🐌 500 KB/s (توفير الإنترنت)",
    "opt_eq_bass": "🔊 Bass Boost (تضخيم هائل للباس)",
    "opt_eq_vocal": "🎤 Vocal Clarity (صفاء ونقاوة صوت الغناء)",
    "opt_eq_rock": "🎸 Rock & Acoustic (طاقة وقوة الآلات الحية)",
    "opt_eq_electro": "⚡ Electronic / Dance (إيقاعات سريعة وواضحة)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (عزل الضوضاء وإبراز الكلام)",
    "opt_theme_dark": "🌌 Dark Glass (الزجاجي الداكن الافتراضي)",
    "opt_theme_oled": "🖤 OLED Black (أسود نقي لشاشات ريتينا)",
    "opt_theme_light": "☀️ Light Modern (الفاتح العصري)",
    "setting_license_title": "ترخيص مزيكتي برو (Mazekty PRO)",
    "setting_license_desc": "حالة الميزات الاحترافية مفعلة بشكل دائم ومجاني 100%.",
    "setting_license_active": "✓ مُفعل ونشط مدى الحياة",
    "modal_step1": "✓ الخطوة 1: افتح كاميرا الآيفون وامسح الرمز.",
    "modal_step2": "✓ الخطوة 2: ستفتح صفحة البلاي ليست في Safari.",
    "modal_step3": "✓ الخطوة 3: اضغط 'تحميل الكل ZIP' لتنتقل الأغاني لتطبيق Files بالآيفون، أو شغّل البلاي ليست في الخلفية!",
    "btn_done": "تم الإغلاق ✓",
    "splash_loading": "جاري تهيئة النظام والمحرك الصوتي...",
    "splash_ready": "مرحباً بك في مزيكتي برو",
    "loading_view": "جاري التحميل...",
    "sound_toggle_title": "كتم / تشغيل المؤثرات",
  },
  "es": {
    "auto_retry_end": "Reintentar descargas fallidas al final de la cola",
    "btn_denoise_execute": "Limpiar y Reducir Ruido",
    "btn_identify_execute": "Identificar Canción",
    "btn_merge_execute": "Mezclar y Crear Mix DJ",
    "btn_retry_failed": "Reintentar Fallidos",
    "btn_retry_now": "Reintentar Ahora 🔄",
    "btn_stems_execute": "Extraer 4 Pistas Ahora",
    "clipboard_detected": "¡Enlace de música copiado!",
    "clipboard_monitor": "Monitor Inteligente de Portapapeles",
    "crossfade_duration": "Duración de Transición:",
    "denoise_desc": "Elimina siseos y ruidos de fondo para voces claras.",
    "denoise_hint": "💡 Ideal para grabaciones de voz, podcasts y archivos con ruido.",
    "denoise_title": "Filtro Reductor de Ruido",
    "identify_desc": "Escanea audios desconocidos para obtener título, artista, álbum y carátula.",
    "identify_title": "Identificador de Canciones (Tipo Shazam)",
    "merger_desc": "Une dos canciones con suave transición crossfade.",
    "merger_title": "Mezclador de Audio y Crossfade",
    "retry_modal_title": "Cambiar Formato / Calidad y Reintentar",
    "select_track1_label": "Primera Pista:",
    "select_track2_label": "Segunda Pista:",
    "sleep_timer_desc": "El volumen disminuirá gradualmente hasta pausar:",
    "sleep_timer_title": "Temporizador de Apagado",
    "stems_desc": "Divide cualquier canción en 4 pistas: Voz, Música, Bajo y Batería.",
    "stems_title": "Separador de Pistas AI (4 Stems)",
    "supported_platforms": "Plataformas Compatibles:",
    "vis_modal_title": "Visualizador de Espectro Neón",
    "lyrics_title": "Letras Sincronizadas",
    "lyrics_loading": "Buscando letras sincronizadas...",
    "lyrics_not_found": "No se encontraron letras sincronizadas.",
    "lyrics_synced": "Karaoke Sincronizado ✓",
    "lyrics_plain": "Letra en Texto",
    "btn_save_lrc": "Guardar archivo .lrc",
    "lrc_saved": "¡Archivo LRC guardado con éxito!",
    "btn_mini_player": "Mini Reproductor Flotante",
    "btn_visualizer": "Visualizador de Espectro",
    "btn_sleep_timer": "Temporizador de Sueño",
    "sleep_timer_active": "Temporizador activo: {min}m restantes",
    "sleep_timer_off": "Temporizador desactivado",
    "toast_download_now": "Descargar Ahora",
    "toast_ignore": "Descartar",
    "app_brand": "Mazekty",
    "nav_downloader": "Descargador",
    "nav_search": "Búsqueda Directa",
    "nav_library": "Biblioteca de Audio",
    "nav_studio": "Estudio Pro",
    "nav_sync": "Transferir y Sincronizar",
    "nav_settings": "Configuración",
    "links_label": "Enlaces de YouTube (Video, Lista o Múltiples URLs):",
    "btn_paste": "📋 Pegar",
    "btn_clear": "Limpiar",
    "format_label": "Formato de descarga:",
    "quality_label": "Calidad de audio (Bitrate):",
    "speed_limit_label": "Límite de velocidad:",
    "speed_unlimited": "🚀 Ilimitado (Máxima velocidad)",
    "embed_thumb": "Incrustar portada",
    "embed_meta": "Incrustar metadatos ID3",
    "skip_feature": "⚡ Omitir duplicados",
    "btn_analyze": "🔍 Analizar enlaces",
    "btn_schedule": "Programar descarga",
    "btn_download": "Añadir a la cola y descargar",
    "preview_title": "Análisis de URLs y pistas",
    "btn_select_all": "Seleccionar todo",
    "btn_deselect_all": "Deseleccionar todo",
    "btn_close": "Cerrar",
    "range_label": "Rango de pistas a descargar:",
    "btn_apply_range": "Aplicar rango",
    "btn_download_selected": "Descargar seleccionados",
    "queue_title": "Cola de descarga en tiempo real",
    "btn_pause_queue": "Pausar cola",
    "btn_resume_queue": "Reanudar cola",
    "stat_total": "Total:",
    "stat_active": "En progreso:",
    "stat_done": "Completado:",
    "stat_skipped": "Omitido:",
    "stat_fail": "Fallido:",
    "btn_clear_completed": "🧹 Limpiar",
    "empty_tasks": "No hay descargas en la cola.",
    "search_banner_title": "Búsqueda directa",
    "search_banner_desc": "Busca cualquier canción, artista o álbum sin abrir el navegador.",
    "btn_search_now": "Buscar ahora",
    "search_prompt": "Escribe lo que deseas escuchar y presiona Buscar ahora",
    "library_title": "Biblioteca de audio",
    "auto_refresh_badge": "Actualización automática ⚡",
    "btn_export_m3u": "Exportar M3U",
    "btn_refresh": "🔄 Actualizar",
    "btn_open_finder": "📂 Abrir carpeta",
    "btn_browse_folder": "Examinar",
    "empty_library": "No hay archivos en esta carpeta todavía.",
    "sort_date_desc": "📅 Más reciente",
    "sort_date_asc": "📅 Más antiguo",
    "sort_name_asc": "🔤 Alfabético (A-Z)",
    "sort_size_desc": "💾 Mayor tamaño",
    "trimmer_title": "Cortador de audio y tonos",
    "trimmer_desc": "Recorta fragmentos o expórtalos como tonos de iPhone (.m4r).",
    "select_file_label": "Seleccionar archivo:",
    "start_sec_label": "Inicio (seg):",
    "end_sec_label": "Fin (seg):",
    "make_ringtone_label": "Crear tono de iPhone (.m4r)",
    "btn_trim_execute": "Recortar y guardar",
    "enhancer_title": "Normalizador de volumen y realce de graves",
    "enhancer_desc": "Estandariza volumen EBU R128 y potencia graves +6dB.",
    "loudnorm_label": "Normalización de volumen (EBU R128)",
    "bassboost_label": "Refuerzo de graves (+6dB Punch)",
    "btn_enhance_execute": "Mejorar audio",
    "vocal_remover_title": "Eliminador de voz y Karaoke",
    "vocal_remover_desc": "Aísla música instrumental cancelando voces estéreo.",
    "btn_vocal_execute": "Generar Karaoke",
    "pitch_shifter_title": "Cambiador de tono y tempo (Pitch & BPM)",
    "pitch_shifter_desc": "Modifica tono musical y velocidad sin pérdidas.",
    "pitch_label": "Tono (semitonos):",
    "speed_label": "Velocidad (Tempo):",
    "btn_pitch_execute": "Aplicar cambios",
    "spatial_title": "Audio espacial 8D",
    "spatial_desc": "Audio envolvente 360° para auriculares.",
    "btn_spatial_execute": "Convertir a audio 8D",
    "equalizer_title": "Ecualizador gráfico de 10 bandas",
    "equalizer_desc": "Preajustes de estudio profesionales.",
    "eq_preset_label": "Preajuste:",
    "btn_eq_execute": "Aplicar ecualizador",
    "silence_title": "Eliminador de silencios",
    "silence_desc": "Elimina silencios muertos al inicio y fin.",
    "btn_silence_execute": "Limpiar silencios",
    "converter_title": "Conversor por lotes",
    "converter_desc": "Convierte toda la carpeta al formato elegido.",
    "target_format_label": "Formato de destino:",
    "btn_convert_execute": "Convertir todo",
    "art_title": "Reemplazador de carátulas",
    "art_desc": "Incrusta imágenes de alta resolución en las canciones.",
    "select_image_label": "Elegir portada (JPG/PNG):",
    "btn_art_execute": "Incrustar carátula",
    "applemusic_title": "Sincronización con Apple Music y iPhone",
    "applemusic_desc": "Sincroniza pistas con Apple Music y transfiere vía Wi-Fi o USB.",
    "btn_sync_now": "Sincronizar pista",
    "btn_sync_all": "Sincronizar todo a lista",
    "playlist_name_label": "Nombre de lista de reproducción:",
    "btn_sync_finder": "Sincronizar con Finder",
    "btn_mobile_airsync": "Transferir vía QR",
    "btn_mobile_sync": "Móvil (QR)",
    "mobile_sync_modal_title": "Sincronizar con iPhone y móvil",
    "mobile_sync_hint": "Escanea el código QR con el iPhone para reproducir o descargar:",
    "mobile_url_label": "O abre en Safari:",
    "setting_folder_title": "Carpeta de descargas",
    "setting_folder_desc": "Ubicación persistente de tus archivos.",
    "setting_theme_mode": "Modo de tema",
    "setting_theme_mode_desc": "Aspecto visual de la aplicación.",
    "setting_accent_title": "Color de acento",
    "setting_accent_desc": "Personaliza colores de realce.",
    "setting_lang_title": "Idioma de la aplicación",
    "setting_lang_desc": "Elige tu idioma preferido.",
    "setting_os_title": "Sistema y entorno",
    "setting_os_desc": "Plataforma detectada y motor de procesamiento.",
    "status_connected": "Conectado al servidor ✓",
    "status_connecting": "Conectando...",
    "status_reconnecting": "Reconectando...",
    "status_queued": "En cola ⏳",
    "status_downloading": "Descargando... ⚡",
    "status_converting": "Procesando... 🎛️",
    "status_completed": "Completado ✓",
    "status_skipped": "Omitido ⏭️",
    "status_cancelled": "Cancelado ✕",
    "status_failed": "Error ❌",
    "tag_editor_title": "Editor de etiquetas ID3",
    "tag_title_label": "Título:",
    "tag_artist_label": "Artista:",
    "tag_album_label": "Álbum:",
    "tag_year_label": "Año:",
    "tag_genre_label": "Género:",
    "btn_save_tags": "Guardar etiquetas ✓",
    "btn_cancel": "Cancelar",
    "schedule_modal_title": "Programar descarga",
    "schedule_desc": "Minutos hasta iniciar la descarga automáticamente:",
    "schedule_delay_label": "Iniciar en (minutos):",
    "btn_confirm_schedule": "Confirmar ⏰",
    "sync_hero_title": "Centro de transferencia y sincronización (iOS y Android)",
    "sync_hero_desc": "Transmisión inalámbrica AirSync por QR, listas de Apple Music y sincronización USB por Finder.",
    "sync_airsync_title": "AirSync Inalámbrico Instantáneo (QR)",
    "sync_airsync_subtitle": "Escanea con la cámara del iPhone para abrir el reproductor en Safari",
    "sync_apple_music_title": "Sincronización con Apple Music",
    "sync_apple_music_subtitle": "Añade pistas directamente y genera listas de reproducción",
    "sync_finder_title": "Sincronización por cable USB (macOS Finder)",
    "sync_finder_subtitle": "Detecta y sincroniza dispositivos iPhone y iPad",
    "sync_network_adapter": "Interfaz de red / IP:",
    "btn_download_zip_all": "Descargar todo como ZIP (App Archivos de iPhone)",
    "sync_zip_hint": "Se guarda en la app Archivos de iOS y se descomprime en 1 toque.",
    "sync_guide_title": "Guía rápida para iPhone 📱:",
    "step1_title": "Mismo Wi-Fi:",
    "step1_desc": "Conecta el iPhone y la computadora a la misma red Wi-Fi.",
    "step2_title": "Escanear QR:",
    "step2_desc": "Abre la cámara de iOS y toca el enlace amarillo para abrir Safari.",
    "step3_title": "Reproducir o guardar:",
    "step3_desc": "Reproduce en segundo plano con pantalla bloqueada o descarga el ZIP.",
    "sync_playlist_label": "Nombre de la lista:",
    "quick_tags": "Sugerencias:",
    "btn_sync_all_playlist": "Sincronizar biblioteca y crear lista",
    "sync_single_track_label": "O sincroniza una pista individual:",
    "select_file_placeholder": "-- Seleccionar archivo --",
    "btn_sync_single": "Sincronizar pista",
    "btn_scan_devices": "Escanear dispositivos",
    "checking_devices": "Buscando dispositivos Apple vía USB...",
    "connect_cable_hint": "Conecta el iPhone mediante cable Lightning o Type-C.",
    "btn_open_finder_sync": "Abrir sincronización de iPhone en Finder",
    "btn_goto_sync_tab": "Abrir pestaña de Transferir y Sincronizar 📱",
    "btn_copy": "Copiar",
    "btn_open": "Abrir",
    "btn_ping": "Probar",
    "qr_loading": "Generando código QR...",
    "lang_select_label": "Idioma / Language",
    "url_placeholder": "Pega los enlaces aquí... Video, lista de reproducción o varias URLs (una por línea)...",
    "search_input_placeholder": "Buscar por canción o artista... (ej. Adele, Coldplay)...",
    "library_filter_placeholder": "Filtrar pistas por nombre...",
    "tab_sync_playlist_placeholder": "ej. Mazekty Top Hits",
    "range_to": "a",
    "pro_hero_title": "Estudio Mazekty Pro",
    "pro_hero_subtitle": "Herramientas de ingeniería de audio avanzadas que se ejecutan 100% en local sin suscripciones.",
    "spatial_hint": "💡 Se recomiendan auriculares para una experiencia espacial 360° inmersiva.",
    "opt_format_mp3": "🎵 MP3 (Estándar universal)",
    "opt_format_m4a": "🍎 M4A (Apple AAC alta calidad)",
    "opt_format_flac": "💎 FLAC (Calidad de estudio Lossless)",
    "opt_format_wav": "🎙️ WAV (Master de estudio sin comprimir)",
    "opt_format_mp4": "🎬 MP4 (Video y audio HD)",
    "opt_quality_320": "⚡ 320 kbps (Calidad máxima - Ultra HD)",
    "opt_quality_256": "✨ 256 kbps (Calidad alta)",
    "opt_quality_192": "🎵 192 kbps (Calidad media)",
    "opt_quality_128": "📦 128 kbps (Estándar - Menor tamaño)",
    "opt_speed_unlimited": "🚀 Ilimitado (Máxima velocidad)",
    "opt_speed_3mb": "⚡ 3 MB/s (Rápido y equilibrado)",
    "opt_speed_1mb": "🌐 1 MB/s (Ahorro de datos)",
    "opt_speed_500kb": "🐌 500 KB/s (Bajo consumo)",
    "opt_eq_bass": "🔊 Bass Boost (Refuerzo de graves)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Claridad de voz)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Energía en vivo)",
    "opt_eq_electro": "⚡ Electronic / Dance (Ritmos potentes)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Aislamiento de voz)",
    "opt_theme_dark": "🌌 Dark Glass (Predeterminado)",
    "opt_theme_oled": "🖤 OLED Black (Negro puro)",
    "opt_theme_light": "☀️ Light Modern (Claro moderno)",
    "setting_license_title": "Licencia Mazekty PRO",
    "setting_license_desc": "Funciones PRO activas permanentemente y 100% gratis.",
    "setting_license_active": "✓ Activo de por vida",
    "modal_step1": "✓ Paso 1: Abre la cámara del iPhone y escanea el código QR.",
    "modal_step2": "✓ Paso 2: Safari abrirá el reproductor web al instante.",
    "modal_step3": "✓ Paso 3: Toca 'Descargar todo en ZIP' para guardar en Archivos, o reproduce en segundo plano.",
    "btn_done": "Hecho ✓",
    "splash_loading": "Iniciando motor de audio Mazekty Pro...",
    "splash_ready": "Bienvenido a Mazekty Pro",
    "loading_view": "Cargando...",
    "sound_toggle_title": "Silenciar / Activar sonido",
  },
  "fr": {
    "auto_retry_end": "Réessayer les échecs à la fin de la file d'attente",
    "btn_denoise_execute": "Nettoyer et Débruiter",
    "btn_identify_execute": "Identifier le Morceau",
    "btn_merge_execute": "Fusionner et Mixer (DJ)",
    "btn_retry_failed": "Réessayer Tous les Échecs",
    "btn_retry_now": "Réessayer Maintenant 🔄",
    "btn_stems_execute": "Extraire les 4 Pistes",
    "clipboard_detected": "Lien musical copié détecté !",
    "clipboard_monitor": "Surveillance Intelligente du Presse-papiers",
    "crossfade_duration": "Durée du Fondu Enchaîné :",
    "denoise_desc": "Supprime les souffles et bruits de fond pour des voix nettes.",
    "denoise_hint": "💡 Idéal pour voix, cours, podcasts et fichiers bruités.",
    "denoise_title": "Suppresseur de Bruit Audio",
    "identify_desc": "Identifie un titre pour obtenir artiste, album et pochette HD.",
    "identify_title": "Identificateur de Titres (Style Shazam)",
    "merger_desc": "Fusionne deux pistes audio avec fondu enchaîné harmonieux.",
    "merger_title": "Fusion Audio et Fondu Enchaîné",
    "retry_modal_title": "Modifier Format / Qualité et Réessayer",
    "select_track1_label": "Première Piste :",
    "select_track2_label": "Deuxième Piste :",
    "sleep_timer_desc": "Le volume diminuera graduellement avant l'arrêt complet :",
    "sleep_timer_title": "Minuteur de Sommeil",
    "stems_desc": "Sépare en 4 pistes indépendantes : Voix, Musique, Basse, Batterie.",
    "stems_title": "Séparateur de Pistes IA (4 Stems)",
    "supported_platforms": "Plateformes Compatibles :",
    "vis_modal_title": "Visualiseur de Spectre Néon",
    "lyrics_title": "Paroles Synchronisées",
    "lyrics_loading": "Recherche des paroles karaoké...",
    "lyrics_not_found": "Aucune parole synchronisée trouvée.",
    "lyrics_synced": "Karaoké Synchronisé ✓",
    "lyrics_plain": "Paroles Brutes",
    "btn_save_lrc": "Enregistrer Fichier .lrc",
    "lrc_saved": "Fichier LRC enregistré avec succès !",
    "btn_mini_player": "Mini Lecteur Flottant",
    "btn_visualizer": "Visualiseur de Spectre",
    "btn_sleep_timer": "Minuteur de Veille",
    "sleep_timer_active": "Minuteur actif : {min}m restantes",
    "sleep_timer_off": "Minuteur de veille désactivé",
    "toast_download_now": "Télécharger Maintenant",
    "toast_ignore": "Ignorer",
    "app_brand": "Mazekty",
    "nav_downloader": "Téléchargeur",
    "nav_search": "Recherche Directe",
    "nav_library": "Bibliothèque Audio",
    "nav_studio": "Studio Pro",
    "nav_sync": "Transfert & Synchro",
    "nav_settings": "Paramètres",
    "links_label": "Liens YouTube (Vidéo, Playlist ou URLs multiples) :",
    "btn_paste": "📋 Coller",
    "btn_clear": "Effacer",
    "format_label": "Format de téléchargement :",
    "quality_label": "Qualité audio (Débit) :",
    "speed_limit_label": "Limite de vitesse :",
    "speed_unlimited": "🚀 Illimité (Vitesse maximale)",
    "embed_thumb": "Intégrer la pochette",
    "embed_meta": "Intégrer métadonnées ID3",
    "skip_feature": "⚡ Ignorer les doublons",
    "btn_analyze": "🔍 Analyser les liens",
    "btn_schedule": "Planifier",
    "btn_download": "Ajouter à la file et télécharger",
    "preview_title": "Analyse des liens et pistes",
    "btn_select_all": "Tout sélectionner",
    "btn_deselect_all": "Tout désélectionner",
    "btn_close": "Fermer",
    "range_label": "Plage de pistes à télécharger :",
    "btn_apply_range": "Appliquer",
    "btn_download_selected": "Télécharger la sélection",
    "queue_title": "File d'attente en temps réel",
    "btn_pause_queue": "Pause",
    "btn_resume_queue": "Reprendre",
    "stat_total": "Total :",
    "stat_active": "En cours :",
    "stat_done": "Terminé :",
    "stat_skipped": "Ignoré :",
    "stat_fail": "Échec :",
    "btn_clear_completed": "🧹 Nettoyer",
    "empty_tasks": "Aucun téléchargement en file d'attente.",
    "search_banner_title": "Recherche directe intégrée",
    "search_banner_desc": "Recherchez n'importe quel morceau, artiste ou album directement.",
    "btn_search_now": "Rechercher",
    "search_prompt": "Entrez votre recherche et cliquez sur Rechercher",
    "library_title": "Bibliothèque musicale",
    "auto_refresh_badge": "Actualisation auto ⚡",
    "btn_export_m3u": "Exporter M3U",
    "btn_refresh": "🔄 Actualiser",
    "btn_open_finder": "📂 Ouvrir le dossier",
    "btn_browse_folder": "Parcourir",
    "empty_library": "Aucun fichier dans ce dossier pour le moment.",
    "sort_date_desc": "📅 Plus récent",
    "sort_date_asc": "📅 Plus ancien",
    "sort_name_asc": "🔤 Alphabétique (A-Z)",
    "sort_size_desc": "💾 Plus volumineux",
    "trimmer_title": "Découpeur audio & sonneries",
    "trimmer_desc": "Découpez un extrait ou créez une sonnerie iPhone (.m4r).",
    "select_file_label": "Sélectionner un fichier :",
    "start_sec_label": "Début (s) :",
    "end_sec_label": "Fin (s) :",
    "make_ringtone_label": "Créer sonnerie iPhone (.m4r)",
    "btn_trim_execute": "Découper et enregistrer",
    "enhancer_title": "Normaliseur sonore & Bass Boost",
    "enhancer_desc": "Standardisation EBU R128 et amplification des basses.",
    "loudnorm_label": "Normalisation sonore (EBU R128)",
    "bassboost_label": "Boost des basses (+6dB Punch)",
    "btn_enhance_execute": "Améliorer le son",
    "vocal_remover_title": "Suppresseur de voix & Karaoké",
    "vocal_remover_desc": "Isolez les instruments par annulation de phase stéréo.",
    "btn_vocal_execute": "Générer Karaoké",
    "pitch_shifter_title": "Modificateur de tonalité & tempo",
    "pitch_shifter_desc": "Modifiez la tonalité et la vitesse sans altération.",
    "pitch_label": "Tonalité (demi-tons) :",
    "speed_label": "Vitesse (Tempo) :",
    "btn_pitch_execute": "Appliquer les réglages",
    "spatial_title": "Audio spatial 8D",
    "spatial_desc": "Son surround 360° immersif pour casque.",
    "btn_spatial_execute": "Convertir en 8D",
    "equalizer_title": "Égaliseur graphique 10 bandes",
    "equalizer_desc": "Préréglages de mastering studio professionnels.",
    "eq_preset_label": "Préréglage :",
    "btn_eq_execute": "Appliquer l'égaliseur",
    "silence_title": "Suppresseur de silence",
    "silence_desc": "Détecte et coupe automatiquement les silences.",
    "btn_silence_execute": "Nettoyer les silences",
    "converter_title": "Convertisseur par lots",
    "converter_desc": "Convertit l'ensemble du dossier vers le format choisi.",
    "target_format_label": "Format cible :",
    "btn_convert_execute": "Convertir tout",
    "art_title": "Remplacement de pochette",
    "art_desc": "Intégrez des pochettes d'album haute résolution.",
    "select_image_label": "Choisir l'image (JPG/PNG) :",
    "btn_art_execute": "Intégrer la pochette",
    "applemusic_title": "Synchronisation Apple Music & iPhone",
    "applemusic_desc": "Créez des playlists et synchronisez vers iPhone via Wi-Fi ou USB.",
    "btn_sync_now": "Synchroniser la piste",
    "btn_sync_all": "Synchroniser tout à la playlist",
    "playlist_name_label": "Nom de la playlist :",
    "btn_sync_finder": "Synchroniser avec Finder",
    "btn_mobile_airsync": "Transférer via QR",
    "btn_mobile_sync": "Mobile (QR)",
    "mobile_sync_modal_title": "Synchroniser avec iPhone & mobile",
    "mobile_sync_hint": "Scannez le QR code avec l'iPhone pour écouter ou télécharger :",
    "mobile_url_label": "Ou ouvrez dans Safari :",
    "setting_folder_title": "Dossier de téléchargement",
    "setting_folder_desc": "Emplacement mémorisé de vos fichiers.",
    "setting_theme_mode": "Thème visuel",
    "setting_theme_mode_desc": "Apparence de l'interface utilisateur.",
    "setting_accent_title": "Couleur d'accent",
    "setting_accent_desc": "Personnalisez la couleur des touches et reflets.",
    "setting_lang_title": "Langue de l'application",
    "setting_lang_desc": "Choisissez votre langue d'affichage.",
    "setting_os_title": "Système & environnement",
    "setting_os_desc": "Système d'exploitation et moteur audio local.",
    "status_connected": "Connecté au serveur ✓",
    "status_connecting": "Connexion en cours...",
    "status_reconnecting": "Reconnexion...",
    "status_queued": "En attente ⏳",
    "status_downloading": "Téléchargement... ⚡",
    "status_converting": "Conversion... 🎛️",
    "status_completed": "Terminé ✓",
    "status_skipped": "Ignoré ⏭️",
    "status_cancelled": "Annulé ✕",
    "status_failed": "Échec ❌",
    "tag_editor_title": "Éditeur de balises ID3",
    "tag_title_label": "Titre :",
    "tag_artist_label": "Artiste :",
    "tag_album_label": "Album :",
    "tag_year_label": "Année :",
    "tag_genre_label": "Genre :",
    "btn_save_tags": "Enregistrer les balises ✓",
    "btn_cancel": "Annuler",
    "schedule_modal_title": "Programmer le téléchargement",
    "schedule_desc": "Délai en minutes avant le démarrage automatique :",
    "schedule_delay_label": "Démarrer après (minutes) :",
    "btn_confirm_schedule": "Confirmer ⏰",
    "sync_hero_title": "Centre de transfert et synchronisation (iOS et Android)",
    "sync_hero_desc": "AirSync sans fil par QR code, création de playlists Apple Music et synchronisation Finder USB.",
    "sync_airsync_title": "AirSync sans fil instantané (QR Code)",
    "sync_airsync_subtitle": "Scannez avec l'appareil photo de l'iPhone pour lancer le lecteur Safari",
    "sync_apple_music_title": "Synchronisation Apple Music & Playlists",
    "sync_apple_music_subtitle": "Ajoutez directement les morceaux et créez des playlists",
    "sync_finder_title": "Synchronisation câble USB (macOS Finder)",
    "sync_finder_subtitle": "Détecte et synchronise vos appareils iPhone et iPad",
    "sync_network_adapter": "Interface réseau / IP :",
    "btn_download_zip_all": "Tout télécharger en ZIP (App Fichiers iPhone)",
    "sync_zip_hint": "Enregistré dans l'app Fichiers d'iOS et décompressé en 1 geste.",
    "sync_guide_title": "Guide rapide pour iPhone 📱 :",
    "step1_title": "Même réseau Wi-Fi :",
    "step1_desc": "Connectez votre iPhone et votre Mac au même réseau Wi-Fi.",
    "step2_title": "Scanner le QR Code :",
    "step2_desc": "Ouvrez l'appareil photo iOS et touchez le lien jaune pour Safari.",
    "step3_title": "Écouter ou enregistrer :",
    "step3_desc": "Lecture continue écran verrouillé ou téléchargement ZIP complet.",
    "sync_playlist_label": "Nom de la playlist :",
    "quick_tags": "Suggestions rapides :",
    "btn_sync_all_playlist": "Synchroniser toute la bibliothèque",
    "sync_single_track_label": "Ou synchroniser un morceau précis :",
    "select_file_placeholder": "-- Sélectionner un fichier --",
    "btn_sync_single": "Synchroniser le morceau",
    "btn_scan_devices": "Rechercher appareils",
    "checking_devices": "Recherche d'appareils Apple connectés...",
    "connect_cable_hint": "Connectez votre iPhone avec un câble Lightning ou Type-C.",
    "btn_open_finder_sync": "Ouvrir la synchronisation dans Finder",
    "btn_goto_sync_tab": "Ouvrir l'onglet Transfert & Synchro 📱",
    "btn_copy": "Copier",
    "btn_open": "Ouvrir",
    "btn_ping": "Tester",
    "qr_loading": "Génération du QR Code...",
    "lang_select_label": "Langue / Language",
    "url_placeholder": "Collez les liens ici... Vidéo, playlist ou plusieurs URLs (une par ligne)...",
    "search_input_placeholder": "Rechercher par titre ou artiste... (ex: Adele, Coldplay)...",
    "library_filter_placeholder": "Filtrer les pistes par nom...",
    "tab_sync_playlist_placeholder": "ex: Mazekty Top Hits",
    "range_to": "à",
    "pro_hero_title": "Studio Mazekty Pro",
    "pro_hero_subtitle": "Outils audio avancés fonctionnant 100% localement sans abonnement.",
    "spatial_hint": "💡 Casque recommandé pour une expérience spatiale 360° optimale.",
    "opt_format_mp3": "🎵 MP3 (Standard universel)",
    "opt_format_m4a": "🍎 M4A (Apple AAC haute fidélité)",
    "opt_format_flac": "💎 FLAC (Qualité studio sans perte)",
    "opt_format_wav": "🎙️ WAV (Master studio brut)",
    "opt_format_mp4": "🎬 MP4 (Vidéo & Audio HD)",
    "opt_quality_320": "⚡ 320 kbps (Ultra HD - Qualité maximale)",
    "opt_quality_256": "✨ 256 kbps (Haute qualité)",
    "opt_quality_192": "🎵 192 kbps (Qualité moyenne)",
    "opt_quality_128": "📦 128 kbps (Standard - Fichier réduit)",
    "opt_speed_unlimited": "🚀 Illimité (Vitesse maximale)",
    "opt_speed_3mb": "⚡ 3 Mo/s (Rapide et équilibré)",
    "opt_speed_1mb": "🌐 1 Mo/s (Économie de données)",
    "opt_speed_500kb": "🐌 500 Ko/s (Basse consommation)",
    "opt_eq_bass": "🔊 Bass Boost (Basses profondes)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Voix cristallines)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Énergie scénique)",
    "opt_eq_electro": "⚡ Electronic / Dance (Rythmes percutants)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Isolation vocale)",
    "opt_theme_dark": "🌌 Dark Glass (Par défaut)",
    "opt_theme_oled": "🖤 OLED Black (Noir profond)",
    "opt_theme_light": "☀️ Light Modern (Clair moderne)",
    "setting_license_title": "Licence Mazekty PRO",
    "setting_license_desc": "Fonctionnalités PRO actives en permanence et 100% gratuites.",
    "setting_license_active": "✓ Actif et débloqué à vie",
    "modal_step1": "✓ Étape 1: Ouvrez l'appareil photo iPhone et scannez le QR code.",
    "modal_step2": "✓ Étape 2: Safari ouvre immédiatement votre lecteur web.",
    "modal_step3": "✓ Étape 3: Touchez 'Télécharger tout en ZIP' pour l'app Fichiers ou écoutez en arrière-plan!",
    "btn_done": "Terminé ✓",
    "splash_loading": "Initialisation du moteur Mazekty Pro...",
    "splash_ready": "Bienvenue sur Mazekty Pro",
    "loading_view": "Chargement...",
    "sound_toggle_title": "Activer / Couper le son",
  },
  "de": {
    "auto_retry_end": "Fehlgeschlagene Downloads am Ende der Warteschlange wiederholen",
    "btn_denoise_execute": "Audio Entrauschen",
    "btn_identify_execute": "Titel Erkennen",
    "btn_merge_execute": "Zusammenfügen & DJ-Mix",
    "btn_retry_failed": "Fehlgeschlagene Wiederholen",
    "btn_retry_now": "Jetzt Wiederholen 🔄",
    "btn_stems_execute": "4 Spuren Extrahieren",
    "clipboard_detected": "Musik-Link in Zwischenablage erkannt!",
    "clipboard_monitor": "Intelligente Zwischenablage-Überwachung",
    "crossfade_duration": "Überblendungsdauer:",
    "denoise_desc": "Entfernt Hintergrundrauschen und Zischen für klare Stimmen.",
    "denoise_hint": "💡 Ideal für Sprachaufnahmen, Podcasts und verrauschte Dateien.",
    "denoise_title": "Audio-Entrauschung & Stimmfilter",
    "identify_desc": "Scannt unbekannte Songs für Titel, Künstler, Album und HD-Cover.",
    "identify_title": "Song-Erkennung (Shazam-Stil)",
    "merger_desc": "Verbindet zwei Tracks mit fließender Überblendung.",
    "merger_title": "Audio-Zusammenführung & DJ-Crossfade",
    "retry_modal_title": "Format / Qualität Ändern & Wiederholen",
    "select_track1_label": "Erster Track:",
    "select_track2_label": "Zweiter Track:",
    "sleep_timer_desc": "Lautstärke wird allmählich ausgeblendet bis zum Stopp:",
    "sleep_timer_title": "Intelligenter Schlummermodus",
    "stems_desc": "Trennt Songs in 4 Spuren: Gesang, Musik, Bass und Schlagzeug.",
    "stems_title": "KI-Spurentrennung (4 Stems)",
    "supported_platforms": "Unterstützte Plattformen:",
    "vis_modal_title": "Live-Neon-Spektrumanalysator",
    "lyrics_title": "Synchrone Songtexte",
    "lyrics_loading": "Synchronisierte Songtexte werden geladen...",
    "lyrics_not_found": "Keine synchronisierten Texte gefunden.",
    "lyrics_synced": "Karaoke Synchronisiert ✓",
    "lyrics_plain": "Einfacher Text",
    "btn_save_lrc": ".lrc-Datei Speichern",
    "lrc_saved": "LRC-Datei erfolgreich gespeichert!",
    "btn_mini_player": "Schwebender Mini-Player",
    "btn_visualizer": "Spektrum-Visualisierer",
    "btn_sleep_timer": "Schlummerfunktion",
    "sleep_timer_active": "Schlummerfunktion aktiv: {min}m verbleibend",
    "sleep_timer_off": "Schlummerfunktion deaktiviert",
    "toast_download_now": "Jetzt Herunterladen",
    "toast_ignore": "Schließen",
    "app_brand": "Mazekty",
    "nav_downloader": "Downloader",
    "nav_search": "Direktsuche",
    "nav_library": "Audio-Bibliothek",
    "nav_studio": "Pro Studio",
    "nav_sync": "Übertragung & Sync",
    "nav_settings": "Einstellungen",
    "links_label": "YouTube-Links (Video, Playlist oder mehrere URLs):",
    "btn_paste": "📋 Einfügen",
    "btn_clear": "Löschen",
    "format_label": "Download-Format:",
    "quality_label": "Audioqualität (Bitrate):",
    "speed_limit_label": "Geschwindigkeitslimit:",
    "speed_unlimited": "🚀 Unbegrenzt (Maximale Geschwindigkeit)",
    "embed_thumb": "Cover einbetten",
    "embed_meta": "ID3-Tags einbetten",
    "skip_feature": "⚡ Duplikate überspringen",
    "btn_analyze": "🔍 Links analysieren",
    "btn_schedule": "Download planen",
    "btn_download": "Zur Warteschlange hinzufügen",
    "preview_title": "URL-Analyse & Playlist-Titel",
    "btn_select_all": "Alle auswählen",
    "btn_deselect_all": "Alle abwählen",
    "btn_close": "Schließen",
    "range_label": "Titelbereich festlegen:",
    "btn_apply_range": "Bereich anwenden",
    "btn_download_selected": "Auswahl herunterladen",
    "queue_title": "Echtzeit-Warteschlange",
    "btn_pause_queue": "Pause",
    "btn_resume_queue": "Fortsetzen",
    "stat_total": "Gesamt:",
    "stat_active": "Aktiv:",
    "stat_done": "Fertig:",
    "stat_skipped": "Übersprungen:",
    "stat_fail": "Fehlgeschlagen:",
    "btn_clear_completed": "🧹 Bereinigen",
    "empty_tasks": "Keine Downloads in der Warteschlange.",
    "search_banner_title": "Integrierte Direktsuche",
    "search_banner_desc": "Suche nach Titeln, Künstlern oder Alben ohne Browser.",
    "btn_search_now": "Jetzt suchen",
    "search_prompt": "Suchbegriff eingeben und auf 'Jetzt suchen' klicken",
    "library_title": "Geladene Musikbibliothek",
    "auto_refresh_badge": "Automatische Aktualisierung ⚡",
    "btn_export_m3u": "M3U exportieren",
    "btn_refresh": "🔄 Aktualisieren",
    "btn_open_finder": "📂 Ordner öffnen",
    "btn_browse_folder": "Durchsuchen",
    "empty_library": "Noch keine Dateien in diesem Ordner.",
    "sort_date_desc": "📅 Neueste zuerst",
    "sort_date_asc": "📅 Älteste zuerst",
    "sort_name_asc": "🔤 Alphabetisch (A-Z)",
    "sort_size_desc": "💾 Dateigröße",
    "trimmer_title": "Audio-Cutter & Klingelton-Ersteller",
    "trimmer_desc": "Titel schneiden oder als iPhone-Klingelton (.m4r) exportieren.",
    "select_file_label": "Datei auswählen:",
    "start_sec_label": "Start (Sek):",
    "end_sec_label": "Ende (Sek):",
    "make_ringtone_label": "iPhone-Klingelton (.m4r) erstellen",
    "btn_trim_execute": "Zuschneiden & speichern",
    "enhancer_title": "Lautstärke-Normalisierung & Bass Boost",
    "enhancer_desc": "EBU R128 Studio-Pegel und kraftvolle Tiefbässe.",
    "loudnorm_label": "Lautstärke-Normalisierung (EBU R128)",
    "bassboost_label": "Tiefer Bass-Boost (+6dB Punch)",
    "btn_enhance_execute": "Audio optimieren",
    "vocal_remover_title": "Vocal Remover & Karaoke-Macher",
    "vocal_remover_desc": "Gesang isolieren und Instrumentalmusik erhalten.",
    "btn_vocal_execute": "Karaoke generieren",
    "pitch_shifter_title": "Tonhöhe & Tempo anpassen (Pitch & BPM)",
    "pitch_shifter_desc": "Tonart und Wiedergabegeschwindigkeit nahtlos verändern.",
    "pitch_label": "Tonhöhe (Halbtöne):",
    "speed_label": "Geschwindigkeit (Tempo):",
    "btn_pitch_execute": "Änderungen anwenden",
    "spatial_title": "8D Raumklang-Effekt",
    "spatial_desc": "360-Grad rotierender Raumklang für Kopfhörer.",
    "btn_spatial_execute": "In 8D-Audio umwandeln",
    "equalizer_title": "10-Band Grafischer Equalizer",
    "equalizer_desc": "Präzise Studio-Voreinstellungen.",
    "eq_preset_label": "Voreinstellung:",
    "btn_eq_execute": "Equalizer anwenden",
    "silence_title": "Stille-Entferner",
    "silence_desc": "Tote Stille am Anfang und Ende automatisch entfernen.",
    "btn_silence_execute": "Stille entfernen",
    "converter_title": "Batch-Audio-Konverter",
    "converter_desc": "Gesamten Ordner parallel konvertieren.",
    "target_format_label": "Zielformat:",
    "btn_convert_execute": "Alle konvertieren",
    "art_title": "Cover-Austausch in hoher Auflösung",
    "art_desc": "Beliebiges Bild dauerhaft als Albumcover einbetten.",
    "select_image_label": "Cover-Bild wählen (JPG/PNG):",
    "btn_art_execute": "Cover einbetten",
    "applemusic_title": "Apple Music & iPhone-Synchronisierung",
    "applemusic_desc": "Playlists erstellen und direkt auf das iPhone übertragen.",
    "btn_sync_now": "Titel synchronisieren",
    "btn_sync_all": "Alle zur Playlist synchronisieren",
    "playlist_name_label": "Playlist-Name:",
    "btn_sync_finder": "Finder-Sync starten",
    "btn_mobile_airsync": "Über QR-Code übertragen",
    "btn_mobile_sync": "Mobil (QR)",
    "mobile_sync_modal_title": "Auf iPhone & Mobilgeräte synchronisieren",
    "mobile_sync_hint": "QR-Code scannen, um Titel im lokalen WLAN zu streamen oder laden:",
    "mobile_url_label": "Oder im Browser öffnen:",
    "setting_folder_title": "Download-Ordner",
    "setting_folder_desc": "Dauerhafter Speicherort für geladene Titel.",
    "setting_theme_mode": "Erscheinungsbild",
    "setting_theme_mode_desc": "Wähle das Oberflächendesign.",
    "setting_accent_title": "Akzentfarbe",
    "setting_accent_desc": "Passe Hauptfarben und Leuchteffekte an.",
    "setting_lang_title": "Sprache",
    "setting_lang_desc": "Wähle deine bevorzugte Sprache.",
    "setting_os_title": "Betriebssystem & Engine",
    "setting_os_desc": "Erkanntes Betriebssystem und lokale Audio-Engine.",
    "status_connected": "Mit Server verbunden ✓",
    "status_connecting": "Verbindungsaufbau...",
    "status_reconnecting": "Neu verbinden...",
    "status_queued": "In Warteschlange ⏳",
    "status_downloading": "Lade herunter... ⚡",
    "status_converting": "Konvertierung... 🎛️",
    "status_completed": "Abgeschlossen ✓",
    "status_skipped": "Übersprungen ⏭️",
    "status_cancelled": "Abgebrochen ✕",
    "status_failed": "Fehlgeschlagen ❌",
    "tag_editor_title": "ID3-Metadaten-Editor",
    "tag_title_label": "Titel:",
    "tag_artist_label": "Künstler:",
    "tag_album_label": "Album:",
    "tag_year_label": "Jahr:",
    "tag_genre_label": "Genre:",
    "btn_save_tags": "Tags speichern ✓",
    "btn_cancel": "Abbrechen",
    "schedule_modal_title": "Download planen",
    "schedule_desc": "Zeit in Minuten bis zum automatischen Start:",
    "schedule_delay_label": "Start nach (Minuten):",
    "btn_confirm_schedule": "Bestätigen ⏰",
    "sync_hero_title": "Mobiles Übertragungs- & Sync-Center (iOS & Android)",
    "sync_hero_desc": "Drahtloses AirSync via QR-Code, Apple Music Playlists und Finder USB-Sync.",
    "sync_airsync_title": "Drahtloses AirSync (QR-Code)",
    "sync_airsync_subtitle": "Mit iPhone-Kamera scannen für Safari-Player & Downloader",
    "sync_apple_music_title": "Apple Music & Playlists",
    "sync_apple_music_subtitle": "Titel direkt importieren und Playlists erstellen",
    "sync_finder_title": "Hardware USB-Kabel Sync (Finder)",
    "sync_finder_subtitle": "Erkennt und synchronisiert verbundene iPhones & iPads",
    "sync_network_adapter": "Netzwerkschnittstelle / IP:",
    "btn_download_zip_all": "Alles als ZIP laden (iPhone Dateien-App)",
    "sync_zip_hint": "Direkt in der iOS Dateien-App speichern und mit 1 Klick entpacken.",
    "sync_guide_title": "Schnellstart für iPhone 📱:",
    "step1_title": "Gleiches WLAN:",
    "step1_desc": "Verbinde iPhone und Computer mit demselben WLAN-Netzwerk.",
    "step2_title": "QR-Code scannen:",
    "step2_desc": "Öffne die iPhone-Kamera und tippe auf den gelben Link für Safari.",
    "step3_title": "Abspielen oder sichern:",
    "step3_desc": "Kontinuierliche Hintergrundwiedergabe oder ZIP-Download.",
    "sync_playlist_label": "Playlist-Name:",
    "quick_tags": "Schnellvorschläge:",
    "btn_sync_all_playlist": "Gesamte Bibliothek synchronisieren",
    "sync_single_track_label": "Einzelnen Titel synchronisieren:",
    "select_file_placeholder": "-- Datei wählen --",
    "btn_sync_single": "Titel synchronisieren",
    "btn_scan_devices": "Geräte scannen",
    "checking_devices": "Suche nach Apple-Geräten über USB...",
    "connect_cable_hint": "Verbinde das iPhone mit einem Lightning- oder Type-C-Kabel.",
    "btn_open_finder_sync": "iPhone-Sync im Finder öffnen",
    "btn_goto_sync_tab": "Übertragung & Sync Tab öffnen 📱",
    "btn_copy": "Kopieren",
    "btn_open": "Öffnen",
    "btn_ping": "Testen",
    "qr_loading": "QR-Code wird generiert...",
    "lang_select_label": "Sprache / Language",
    "url_placeholder": "Links hier einfügen... Video, Playlist oder mehrere URLs (eine pro Zeile)...",
    "search_input_placeholder": "Nach Song oder Künstler suchen... (z. B. Adele, Coldplay)...",
    "library_filter_placeholder": "Titel nach Namen filtern...",
    "tab_sync_playlist_placeholder": "z.B. Mazekty Top Hits",
    "range_to": "bis",
    "pro_hero_title": "Mazekty Pro Studio",
    "pro_hero_subtitle": "Erweiterte Audiowerkzeuge, die zu 100 % lokal ohne Abonnements laufen.",
    "spatial_hint": "💡 Für das beste räumliche 360°-Audioerlebnis werden Kopfhörer empfohlen.",
    "opt_format_mp3": "🎵 MP3 (Universeller Standard)",
    "opt_format_m4a": "🍎 M4A (Apple AAC Hohe Qualität)",
    "opt_format_flac": "💎 FLAC (Verlustfreie Studioqualität)",
    "opt_format_wav": "🎙️ WAV (Unkomprimierter Studio-Master)",
    "opt_format_mp4": "🎬 MP4 (HD-Video & Audio)",
    "opt_quality_320": "⚡ 320 kbps (Ultra HD - Höchste Qualität)",
    "opt_quality_256": "✨ 256 kbps (Hohe Qualität)",
    "opt_quality_192": "🎵 192 kbps (Mittlere Qualität)",
    "opt_quality_128": "📦 128 kbps (Standard - Kleinere Datei)",
    "opt_speed_unlimited": "🚀 Unbegrenzt (Maximale Geschwindigkeit)",
    "opt_speed_3mb": "⚡ 3 MB/s (Schnell & Ausgewogen)",
    "opt_speed_1mb": "🌐 1 MB/s (Datensparend)",
    "opt_speed_500kb": "🐌 500 KB/s (Geringe Bandbreite)",
    "opt_eq_bass": "🔊 Bass Boost (Tiefer Bass)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Klare Stimmen)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Live-Dynamik)",
    "opt_eq_electro": "⚡ Electronic / Dance (Kraftvolle Beats)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Sprachisolierung)",
    "opt_theme_dark": "🌌 Dark Glass (Standard)",
    "opt_theme_oled": "🖤 OLED Black (Reines Schwarz)",
    "opt_theme_light": "☀️ Light Modern (Hell & Modern)",
    "setting_license_title": "Mazekty PRO Lizenz",
    "setting_license_desc": "Alle PRO-Funktionen sind dauerhaft aktiv und 100% kostenlos.",
    "setting_license_active": "✓ Lebenslang aktiviert",
    "modal_step1": "✓ Schritt 1: iPhone-Kamera öffnen und QR-Code scannen.",
    "modal_step2": "✓ Schritt 2: Safari öffnet sofort Ihren Web-Player.",
    "modal_step3": "✓ Schritt 3: 'Alle als ZIP herunterladen' tippen für Dateien-App oder im Hintergrund hören!",
    "btn_done": "Fertig ✓",
    "splash_loading": "Mazekty Pro Audio-Engine wird initialisiert...",
    "splash_ready": "Willkommen bei Mazekty Pro",
    "loading_view": "Wird geladen...",
    "sound_toggle_title": "Soundeffekte ein/aus",
  },
  "tr": {
    "auto_retry_end": "Kuyruk sonunda başarısız indirmeleri otomatik tekrar dene",
    "btn_denoise_execute": "Gürültüyü Temizle",
    "btn_identify_execute": "Parçayı Tanı",
    "btn_merge_execute": "Birleştir ve DJ Miksi Oluştur",
    "btn_retry_failed": "Başarısızları Tekrar Dene",
    "btn_retry_now": "Şimdi Tekrar Dene 🔄",
    "btn_stems_execute": "4 Parçayı Ayrıştır",
    "clipboard_detected": "Yeni Müzik Bağlantısı Kopyalandı!",
    "clipboard_monitor": "Akıllı Pano Otomatik İzleme",
    "crossfade_duration": "Çapraz Geçiş Süresi:",
    "denoise_desc": "Mikrofon cızırtısını ve arka plan gürültüsünü temizler.",
    "denoise_hint": "💡 Ses kayıtları, podcastler ve gürültülü dosyalar için idealdir.",
    "denoise_title": "Ses Gürültü Giderici (De-Noise)",
    "identify_desc": "Bilinmeyen parçayı tarar; başlık, sanatçı, albüm ve HD kapak getirir.",
    "identify_title": "Parça Tanımlayıcı (Shazam Benzeri)",
    "merger_desc": "İki parçayı akıcı DJ geçişi ile birbirine bağlar.",
    "merger_title": "Ses Birleştirici ve DJ Crossfade",
    "retry_modal_title": "Formatı / Kaliteyi Değiştir ve Tekrar Dene",
    "select_track1_label": "Birinci Parça:",
    "select_track2_label": "İkinci Parça:",
    "sleep_timer_desc": "Ses kademeli olarak kısılacak ve oynatıcı duracaktır:",
    "sleep_timer_title": "Akıllı Uyku Zamanlayıcı",
    "stems_desc": "Şarkıyı 4 bağımsız kanala ayırır: Vokal, Müzik, Bas ve Davul.",
    "stems_title": "Yapay Zeka Kanal Ayrıştırıcı (4 Stems)",
    "supported_platforms": "Desteklenen Platformlar:",
    "vis_modal_title": "Canlı Neon Spektrum Görselleştirici",
    "lyrics_title": "Senkronize Şarkı Sözleri",
    "lyrics_loading": "Senkronize sözler yükleniyor...",
    "lyrics_not_found": "Bu parça için senkronize söz bulunamadı.",
    "lyrics_synced": "Karaoke Senkronize ✓",
    "lyrics_plain": "Düz Metin Sözler",
    "btn_save_lrc": ".lrc Dosyasını Kaydet",
    "lrc_saved": "LRC dosyası başarıyla kaydedildi!",
    "btn_mini_player": "Mini Kayan Oynatıcı",
    "btn_visualizer": "Spektrum Görselleştirici",
    "btn_sleep_timer": "Uyku Zamanlayıcı",
    "sleep_timer_active": "Uyku zamanlayıcı aktif: {min}dk kaldı",
    "sleep_timer_off": "Uyku zamanlayıcı kapatıldı",
    "toast_download_now": "Şimdi İndir",
    "toast_ignore": "Kapat",
    "app_brand": "Mazekty",
    "nav_downloader": "İndirici",
    "nav_search": "Doğrudan Arama",
    "nav_library": "Ses Kitaplığı",
    "nav_studio": "Pro Stüdyo",
    "nav_sync": "Aktarım ve Eşitleme",
    "nav_settings": "Ayarlar",
    "links_label": "YouTube Bağlantıları (Video, Oynatma Listesi veya Çoklu URL):",
    "btn_paste": "📋 Yapıştır",
    "btn_clear": "Temizle",
    "format_label": "İndirme formatı:",
    "quality_label": "Ses kalitesi (Bitrate):",
    "speed_limit_label": "İndirme hız sınırı:",
    "speed_unlimited": "🚀 Sınırsız (Maksimum Hız)",
    "embed_thumb": "Kapak resmini göm",
    "embed_meta": "ID3 etiketlerini göm",
    "skip_feature": "⚡ Mükerrer olanları atla",
    "btn_analyze": "🔍 Bağlantıları analiz et",
    "btn_schedule": "Zamanla",
    "btn_download": "Kuyruğa ekle ve indir",
    "preview_title": "URL Analizi ve Parçalar",
    "btn_select_all": "Tümünü seç",
    "btn_deselect_all": "Seçimi kaldır",
    "btn_close": "Kapat",
    "range_label": "Parça aralığı seç:",
    "btn_apply_range": "Aralığı uygula",
    "btn_download_selected": "Seçilenleri indir",
    "queue_title": "Gerçek zamanlı indirme kuyruğu",
    "btn_pause_queue": "Duraklat",
    "btn_resume_queue": "Devam et",
    "stat_total": "Toplam:",
    "stat_active": "İşleniyor:",
    "stat_done": "Tamamlandı:",
    "stat_skipped": "Atlandı:",
    "stat_fail": "Başarısız:",
    "btn_clear_completed": "🧹 Temizle",
    "empty_tasks": "Kuyrukta indirme yok.",
    "search_banner_title": "Uygulama İçi Doğrudan Arama",
    "search_banner_desc": "Tarayıcı açmadan doğrudan herhangi bir şarkı veya albüm arayın.",
    "btn_search_now": "Şimdi Ara",
    "search_prompt": "Dinlemek istediğiniz şeyi yazıp Şimdi Ara butonuna tıklayın",
    "library_title": "İndirilen Müzik Kitaplığı",
    "auto_refresh_badge": "Otomatik Yenileme ⚡",
    "btn_export_m3u": "M3U Dışa Aktar",
    "btn_refresh": "🔄 Yenile",
    "btn_open_finder": "📂 Klasörü Aç",
    "btn_browse_folder": "Gözat",
    "empty_library": "Bu klasörde henüz dosya yok.",
    "sort_date_desc": "📅 En Yeni",
    "sort_date_asc": "📅 En Eski",
    "sort_name_asc": "🔤 Alfabetik (A-Z)",
    "sort_size_desc": "💾 En Büyük Boyut",
    "trimmer_title": "Ses Kesici ve Zil Sesi Yapıcı",
    "trimmer_desc": "Parçayı kesin veya doğrudan iPhone zil sesi (.m4r) yapın.",
    "select_file_label": "Dosya seçin:",
    "start_sec_label": "Başlangıç (sn):",
    "end_sec_label": "Bitiş (sn):",
    "make_ringtone_label": "iPhone zil sesi (.m4r) oluştur",
    "btn_trim_execute": "Kes ve Kaydet",
    "enhancer_title": "Ses Seviyeleme ve Bas Güçlendirme",
    "enhancer_desc": "EBU R128 stüdyo standartlarında ses ve derin bas artışı.",
    "loudnorm_label": "Ses Normalizasyonu (EBU R128)",
    "bassboost_label": "Derin Bas Güçlendirici (+6dB Punch)",
    "btn_enhance_execute": "Sesi İyileştir",
    "vocal_remover_title": "Vokal Ayırıcı ve Karaoke",
    "vocal_remover_desc": "Vokalleri ayırıp enstrümantal müziği koruyun.",
    "btn_vocal_execute": "Karaoke Üret",
    "pitch_shifter_title": "Ton ve Hız Değiştirici (Pitch & BPM)",
    "pitch_shifter_desc": "Müzikal tonu ve çalma hızını kayıpsız değiştirin.",
    "pitch_label": "Ton (Yarım ses):",
    "speed_label": "Çalma hızı (Tempo):",
    "btn_pitch_execute": "Değişiklikleri Kaydet",
    "spatial_title": "8D Uzamsal Ses Efekti",
    "spatial_desc": "Kulaklıklar için 360 derece dönen çevreleyen ses.",
    "btn_spatial_execute": "8D Sese Dönüştür",
    "equalizer_title": "10 Bant Grafik Ekolayzer",
    "equalizer_desc": "Profesyonel stüdyo ön ayarları.",
    "eq_preset_label": "Ön ayar:",
    "btn_eq_execute": "Ekolayzeri Uygula",
    "silence_title": "Sessizlik Temizleyici",
    "silence_desc": "Başlangıç ve sondaki ölü sessizlikleri otomatik kırpar.",
    "btn_silence_execute": "Sessizlikleri Temizle",
    "converter_title": "Toplu Ses Dönüştürücü",
    "converter_desc": "Tüm klasörü seçilen formata paralel dönüştürün.",
    "target_format_label": "Hedef Format:",
    "btn_convert_execute": "Tümünü Dönüştür",
    "art_title": "Yüksek Çözünürlüklü Kapak Değiştirici",
    "art_desc": "Şarkı kapağını istediğiniz görselle güncelleyin.",
    "select_image_label": "Kapak Resmi Seç (JPG/PNG):",
    "btn_art_execute": "Kapağı Göm",
    "applemusic_title": "Apple Music ve iPhone Eşitleme",
    "applemusic_desc": "Özel çalma listeleri oluşturun ve iPhone'a aktarın.",
    "btn_sync_now": "Parçayı Eşitle",
    "btn_sync_all": "Tümünü Listeye Eşitle",
    "playlist_name_label": "Çalma Listesi Adı:",
    "btn_sync_finder": "Finder ile Eşitle",
    "btn_mobile_airsync": "QR ile Aktar",
    "btn_mobile_sync": "Mobil (QR)",
    "mobile_sync_modal_title": "iPhone ve Mobil Cihazlara Aktar",
    "mobile_sync_hint": "Yerel Wi-Fi üzerinden dinlemek veya indirmek için QR kodu taratın:",
    "mobile_url_label": "Veya Safari'de açın:",
    "setting_folder_title": "İndirme Klasörü",
    "setting_folder_desc": "Kalıcı indirme konumu.",
    "setting_theme_mode": "Görünüm Teması",
    "setting_theme_mode_desc": "Uygulama arayüz tarzını seçin.",
    "setting_accent_title": "Vurgu Rengi",
    "setting_accent_desc": "Düğme ve parlama renklerini özelleştirin.",
    "setting_lang_title": "Uygulama Dili",
    "setting_lang_desc": "Arayüz dilini seçin.",
    "setting_os_title": "İşletim Sistemi",
    "setting_os_desc": "Algılanan platform ve yerel ses motoru.",
    "status_connected": "Sunucuya Bağlandı ✓",
    "status_connecting": "Bağlanıyor...",
    "status_reconnecting": "Yeniden bağlanıyor...",
    "status_queued": "Kuyrukta ⏳",
    "status_downloading": "İndiriliyor... ⚡",
    "status_converting": "İşleniyor... 🎛️",
    "status_completed": "Tamamlandı ✓",
    "status_skipped": "Atlandı ⏭️",
    "status_cancelled": "İptal Edildi ✕",
    "status_failed": "Başarısız ❌",
    "tag_editor_title": "ID3 Etiket Düzenleyici",
    "tag_title_label": "Parça Başlığı:",
    "tag_artist_label": "Sanatçı Adı:",
    "tag_album_label": "Albüm:",
    "tag_year_label": "Yıl:",
    "tag_genre_label": "Tür:",
    "btn_save_tags": "Etiketleri Kaydet ✓",
    "btn_cancel": "İptal",
    "schedule_modal_title": "Otomatik İndirme Zamanla",
    "schedule_desc": "İndirmenin kaç dakika sonra başlayacağını belirtin:",
    "schedule_delay_label": "Başlama süresi (Dakika):",
    "btn_confirm_schedule": "Zamanlamayı Onayla ⏰",
    "sync_hero_title": "Mobil Aktarım ve Eşitleme Merkezi (iOS ve Android)",
    "sync_hero_desc": "QR kod ile kablosuz AirSync, Apple Music listeleri ve Finder USB eşitlemesi.",
    "sync_airsync_title": "Anında Kablosuz AirSync (QR Kod)",
    "sync_airsync_subtitle": "Safari oynatıcısını açmak için iPhone kamerasıyla taratın",
    "sync_apple_music_title": "Apple Music ve Çalma Listeleri",
    "sync_apple_music_subtitle": "Şarkıları doğrudan içe aktarın ve özel listeler oluşturun",
    "sync_finder_title": "Kablolu USB Eşitleme (macOS Finder)",
    "sync_finder_subtitle": "Bağlı iPhone ve iPad cihazlarını algılar ve eşitler",
    "sync_network_adapter": "Ağ Arayüzü / IP:",
    "btn_download_zip_all": "Tümünü ZIP Olarak İndir (iPhone Dosyalar Uygulaması)",
    "sync_zip_hint": "iOS Dosyalar uygulamasına iner ve tek dokunuşla açılır.",
    "sync_guide_title": "iPhone Hızlı Başlangıç Kılavuzu 📱:",
    "step1_title": "Aynı Wi-Fi Ağı:",
    "step1_desc": "iPhone ve bilgisayarınızın aynı Wi-Fi ağına bağlı olduğundan emin olun.",
    "step2_title": "QR Kodu Taratın:",
    "step2_desc": "iOS kamerasını açın ve Safari için sarı bağlantıya dokunun.",
    "step3_title": "Çalın veya Kaydedin:",
    "step3_desc": "Kilit ekranında arka planda çalın veya tüm ZIP dosyasını indirin.",
    "sync_playlist_label": "Çalma Listesi Adı:",
    "quick_tags": "Öneriler:",
    "btn_sync_all_playlist": "Tüm Kitaplığı Eşitle ve Liste Oluştur",
    "sync_single_track_label": "Veya belirli bir parçayı eşitleyin:",
    "select_file_placeholder": "-- Dosya seçin --",
    "btn_sync_single": "Parçayı Eşitle",
    "btn_scan_devices": "Cihazları Tara",
    "checking_devices": "USB üzerinden Apple ve Android cihazlar taranıyor...",
    "connect_cable_hint": "iPhone'unuzu Lightning veya Type-C kablosuyla bağlayın.",
    "btn_open_finder_sync": "Finder'da iPhone Eşitlemesini Aç",
    "btn_goto_sync_tab": "Aktarım ve Eşitleme Sekmesini Aç 📱",
    "btn_copy": "Kopyala",
    "btn_open": "Aç",
    "btn_ping": "Test Et",
    "qr_loading": "QR Kod oluşturuluyor...",
    "lang_select_label": "Dil / Language",
    "url_placeholder": "Bağlantıları buraya yapıştırın... Video, Playlist veya birden fazla bağlantı (her satıra bir)...",
    "search_input_placeholder": "Şarkı veya sanatçı adına göre ara... (ör. Tarkan, Adele)...",
    "library_filter_placeholder": "Parçaları ada göre filtrele...",
    "tab_sync_playlist_placeholder": "ör. Mazekty Top Hits",
    "range_to": "ile",
    "pro_hero_title": "Mazekty Pro Stüdyo",
    "pro_hero_subtitle": "Abonelik gerektirmeyen, tamamen yerel çalışan gelişmiş ses mühendisliği araçları.",
    "spatial_hint": "💡 En iyi 360° uzamsal ses deneyimi için kulaklık kullanılması önerilir.",
    "opt_format_mp3": "🎵 MP3 (Evrensel Standart)",
    "opt_format_m4a": "🍎 M4A (Apple AAC Yüksek Kalite)",
    "opt_format_flac": "💎 FLAC (Kayıpsız Stüdyo Kalitesi)",
    "opt_format_wav": "🎙️ WAV (Ham Stüdyo Master)",
    "opt_format_mp4": "🎬 MP4 (HD Video ve Ses)",
    "opt_quality_320": "⚡ 320 kbps (Ultra HD - En Yüksek Kalite)",
    "opt_quality_256": "✨ 256 kbps (Yüksek Kalite)",
    "opt_quality_192": "🎵 192 kbps (Orta Kalite)",
    "opt_quality_128": "📦 128 kbps (Standart - Küçük Boyut)",
    "opt_speed_unlimited": "🚀 Sınırsız (Maksimum Hız)",
    "opt_speed_3mb": "⚡ 3 MB/sn (Dengeli Hızlı)",
    "opt_speed_1mb": "🌐 1 MB/sn (Kota Tasarrufu)",
    "opt_speed_500kb": "🐌 500 KB/sn (Düşük Bant Genişliği)",
    "opt_eq_bass": "🔊 Bass Boost (Derin Bas Gücü)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Net Vokal)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Canlı Enerji)",
    "opt_eq_electro": "⚡ Electronic / Dance (Güçlü Ritimler)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Ses İzolasyonu)",
    "opt_theme_dark": "🌌 Dark Glass (Varsayılan)",
    "opt_theme_oled": "🖤 OLED Black (Tam Siyah)",
    "opt_theme_light": "☀️ Light Modern (Açık Tema)",
    "setting_license_title": "Mazekty PRO Lisansı",
    "setting_license_desc": "Profesyonel özellikler kalıcı olarak aktif ve %100 ücretsizdir.",
    "setting_license_active": "✓ Ömür Boyu Aktif",
    "modal_step1": "✓ Adım 1: iPhone kamerasını açın ve QR kodunu tarayın.",
    "modal_step2": "✓ Adım 2: Safari web oynatıcınızı anında açacaktır.",
    "modal_step3": "✓ Adım 3: 'Tümünü ZIP İndir'e basarak Dosyalar uygulamasına kaydedin veya arka planda çalın!",
    "btn_done": "Kapat ✓",
    "splash_loading": "Mazekty Pro ses motoru başlatılıyor...",
    "splash_ready": "Mazekty Pro'ya Hoş Geldiniz",
    "loading_view": "Yükleniyor...",
    "sound_toggle_title": "Ses Efektlerini Aç / Kapat",
  },
  "pt": {
    "auto_retry_end": "Tentar novamente downloads com falha no fim da fila",
    "btn_denoise_execute": "Limpar Ruído do Áudio",
    "btn_identify_execute": "Identificar Faixa",
    "btn_merge_execute": "Mesclar e Criar Mix DJ",
    "btn_retry_failed": "Repetir Falhas",
    "btn_retry_now": "Tentar Novamente 🔄",
    "btn_stems_execute": "Extrair 4 Pistas Agora",
    "clipboard_detected": "Link de música copiado!",
    "clipboard_monitor": "Monitor Inteligente da Área de Transferência",
    "crossfade_duration": "Duração do Crossfade:",
    "denoise_desc": "Remove chiados e ruídos de fundo para vozes nítidas.",
    "denoise_hint": "💡 Ideal para gravações de voz, podcasts e arquivos com ruído.",
    "denoise_title": "Redutor de Ruído e Clarificador de Voz",
    "identify_desc": "Analisa áudios para obter título, artista, álbum e capa HD.",
    "identify_title": "Identificador de Faixas (Estilo Shazam)",
    "merger_desc": "Mescla duas músicas com transição suave crossfade.",
    "merger_title": "Mesclador de Áudio e DJ Crossfade",
    "retry_modal_title": "Alterar Formato / Qualidade e Repetir",
    "select_track1_label": "Primeira Faixa:",
    "select_track2_label": "Segunda Faixa:",
    "sleep_timer_desc": "O volume diminuirá gradualmente até a pausa:",
    "sleep_timer_title": "Temporizador de Suspensão",
    "stems_desc": "Divide músicas em 4 pistas: Voz, Música, Baixo e Bateria.",
    "stems_title": "Separador de Faixas IA (4 Stems)",
    "supported_platforms": "Plataformas Suportadas:",
    "vis_modal_title": "Visualizador de Espectro Neon",
    "lyrics_title": "Letras Sincronizadas",
    "lyrics_loading": "Buscando letras sincronizadas...",
    "lyrics_not_found": "Nenhuma letra sincronizada encontrada.",
    "lyrics_synced": "Karaokê Sincronizado ✓",
    "lyrics_plain": "Letra em Texto",
    "btn_save_lrc": "Salvar Arquivo .lrc",
    "lrc_saved": "Arquivo LRC salvo com sucesso!",
    "btn_mini_player": "Mini Player Flutuante",
    "btn_visualizer": "Visualizador de Espectro",
    "btn_sleep_timer": "Temporizador",
    "sleep_timer_active": "Temporizador ativo: {min}m restantes",
    "sleep_timer_off": "Temporizador desativado",
    "toast_download_now": "Baixar Agora",
    "toast_ignore": "Dispensar",
    "app_brand": "Mazekty",
    "nav_downloader": "Baixador",
    "nav_search": "Pesquisa Direta",
    "nav_library": "Biblioteca de Áudio",
    "nav_studio": "Pro Studio",
    "nav_sync": "Transferir e Sincronizar",
    "nav_settings": "Configurações",
    "links_label": "Links do YouTube (Vídeo, Playlist ou Múltiplas URLs):",
    "btn_paste": "📋 Colar",
    "btn_clear": "Limpar",
    "format_label": "Formato de download:",
    "quality_label": "Qualidade do áudio (Bitrate):",
    "speed_limit_label": "Limite de velocidade:",
    "speed_unlimited": "🚀 Ilimitado (Velocidade Máxima)",
    "embed_thumb": "Embutir capa",
    "embed_meta": "Embutir metadados ID3",
    "skip_feature": "⚡ Pular duplicados",
    "btn_analyze": "🔍 Analisar links",
    "btn_schedule": "Agendar download",
    "btn_download": "Adicionar à fila e baixar",
    "preview_title": "Análise de URLs e faixas",
    "btn_select_all": "Selecionar tudo",
    "btn_deselect_all": "Desmarcar tudo",
    "btn_close": "Fechar",
    "range_label": "Intervalo de faixas:",
    "btn_apply_range": "Aplicar intervalo",
    "btn_download_selected": "Baixar selecionados",
    "queue_title": "Fila em tempo real",
    "btn_pause_queue": "Pausar fila",
    "btn_resume_queue": "Retomar fila",
    "stat_total": "Total:",
    "stat_active": "Em andamento:",
    "stat_done": "Concluído:",
    "stat_skipped": "Ignorado:",
    "stat_fail": "Falhou:",
    "btn_clear_completed": "🧹 Limpar",
    "empty_tasks": "Nenhum download na fila no momento.",
    "search_banner_title": "Pesquisa direta no app",
    "search_banner_desc": "Pesquise qualquer música, artista ou álbum sem abrir o navegador.",
    "btn_search_now": "Pesquisar agora",
    "search_prompt": "Digite o que deseja ouvir e clique em Pesquisar agora",
    "library_title": "Biblioteca de músicas baixadas",
    "auto_refresh_badge": "Atualização automática ⚡",
    "btn_export_m3u": "Exportar M3U",
    "btn_refresh": "🔄 Atualizar",
    "btn_open_finder": "📂 Abrir pasta",
    "btn_browse_folder": "Procurar",
    "empty_library": "Nenhum arquivo nesta pasta ainda.",
    "sort_date_desc": "📅 Mais recente",
    "sort_date_asc": "📅 Mais antigo",
    "sort_name_asc": "🔤 Alfabético (A-Z)",
    "sort_size_desc": "💾 Maior tamanho",
    "trimmer_title": "Cortador de áudio e toques",
    "trimmer_desc": "Corte trechos ou exporte como toque de iPhone (.m4r).",
    "select_file_label": "Selecionar arquivo:",
    "start_sec_label": "Início (seg):",
    "end_sec_label": "Fim (seg):",
    "make_ringtone_label": "Criar toque de iPhone (.m4r)",
    "btn_trim_execute": "Cortar e salvar",
    "enhancer_title": "Normalizador de volume e reforço de graves",
    "enhancer_desc": "Padrão EBU R128 e graves encorpados.",
    "loudnorm_label": "Normalização de volume (EBU R128)",
    "bassboost_label": "Reforço de graves (+6dB Punch)",
    "btn_enhance_execute": "Aprimorar áudio",
    "vocal_remover_title": "Removedor de voz e Karaokê",
    "vocal_remover_desc": "Isole instrumentos através de cancelamento de fase estéreo.",
    "btn_vocal_execute": "Gerar Karaokê",
    "pitch_shifter_title": "Modificador de tom e andamento (Pitch & BPM)",
    "pitch_shifter_desc": "Altere a tonalidade musical e a velocidade sem perdas.",
    "pitch_label": "Tom (semitons):",
    "speed_label": "Velocidade (Tempo):",
    "btn_pitch_execute": "Aplicar ajustes",
    "spatial_title": "Áudio espacial 8D",
    "spatial_desc": "Som 360° imersivo para fones de ouvido.",
    "btn_spatial_execute": "Converter para áudio 8D",
    "equalizer_title": "Equalizador gráfico de 10 bandas",
    "equalizer_desc": "Predefinições de estúdio profissionais.",
    "eq_preset_label": "Predefinição:",
    "btn_eq_execute": "Aplicar equalizador",
    "silence_title": "Removedor de silêncio",
    "silence_desc": "Remove silêncio morto no início e no fim.",
    "btn_silence_execute": "Limpar silêncio",
    "converter_title": "Conversor em lote",
    "converter_desc": "Converta a pasta inteira para o formato escolhido.",
    "target_format_label": "Formato de destino:",
    "btn_convert_execute": "Converter tudo",
    "art_title": "Substituição de capa em alta resolução",
    "art_desc": "Incorpore imagens de capa diretamente nas faixas.",
    "select_image_label": "Escolher capa (JPG/PNG):",
    "btn_art_execute": "Incorporar capa",
    "applemusic_title": "Sincronização Apple Music e iPhone",
    "applemusic_desc": "Crie playlists e sincronize para o iPhone via Wi-Fi ou cabo.",
    "btn_sync_now": "Sincronizar faixa",
    "btn_sync_all": "Sincronizar tudo para a playlist",
    "playlist_name_label": "Nome da playlist:",
    "btn_sync_finder": "Sincronizar no Finder",
    "btn_mobile_airsync": "Transferir por QR Code",
    "btn_mobile_sync": "Celular (QR)",
    "mobile_sync_modal_title": "Sincronizar com iPhone e celular",
    "mobile_sync_hint": "Escaneie o QR code com o iPhone para ouvir ou baixar via Wi-Fi local:",
    "mobile_url_label": "Ou abra no Safari:",
    "setting_folder_title": "Pasta de download",
    "setting_folder_desc": "Local permanente de salvamento.",
    "setting_theme_mode": "Tema visual",
    "setting_theme_mode_desc": "Aparência da interface.",
    "setting_accent_title": "Cor de destaque",
    "setting_accent_desc": "Personalize cores e brilho dos botões.",
    "setting_lang_title": "Idioma do aplicativo",
    "setting_lang_desc": "Escolha o idioma de exibição.",
    "setting_os_title": "Sistema e ambiente",
    "setting_os_desc": "Sistema operacional e motor de áudio.",
    "status_connected": "Conectado ao servidor ✓",
    "status_connecting": "Conectando...",
    "status_reconnecting": "Reconectando...",
    "status_queued": "Na fila ⏳",
    "status_downloading": "Baixando... ⚡",
    "status_converting": "Processando... 🎛️",
    "status_completed": "Concluído ✓",
    "status_skipped": "Ignorado ⏭️",
    "status_cancelled": "Cancelado ✕",
    "status_failed": "Falhou ❌",
    "tag_editor_title": "Editor de tags ID3",
    "tag_title_label": "Título:",
    "tag_artist_label": "Artista:",
    "tag_album_label": "Álbum:",
    "tag_year_label": "Ano:",
    "tag_genre_label": "Gênero:",
    "btn_save_tags": "Salvar tags ✓",
    "btn_cancel": "Cancelar",
    "schedule_modal_title": "Agendar download",
    "schedule_desc": "Minutos até iniciar o download automaticamente:",
    "schedule_delay_label": "Iniciar após (minutos):",
    "btn_confirm_schedule": "Confirmar ⏰",
    "sync_hero_title": "Central de transferência e sincronização (iOS e Android)",
    "sync_hero_desc": "Transmissão sem fio AirSync via QR, playlists Apple Music e sincronização USB Finder.",
    "sync_airsync_title": "AirSync sem fio instantâneo (QR Code)",
    "sync_airsync_subtitle": "Escaneie com a câmera do iPhone para abrir o reprodutor no Safari",
    "sync_apple_music_title": "Apple Music e Playlists",
    "sync_apple_music_subtitle": "Adicione faixas diretamente e crie playlists personalizadas",
    "sync_finder_title": "Sincronização por cabo USB (Finder macOS)",
    "sync_finder_subtitle": "Detecta e sincroniza dispositivos iPhone e iPad",
    "sync_network_adapter": "Interface de rede / IP:",
    "btn_download_zip_all": "Baixar tudo em ZIP (App Arquivos do iPhone)",
    "sync_zip_hint": "Salvo no app Arquivos do iOS e extraído com 1 toque.",
    "sync_guide_title": "Guia rápido para iPhone 📱:",
    "step1_title": "Mesmo Wi-Fi:",
    "step1_desc": "Conecte seu iPhone e o computador à mesma rede Wi-Fi.",
    "step2_title": "Escanear QR Code:",
    "step2_desc": "Abra a câmera do iOS e toque no link amarelo para abrir no Safari.",
    "step3_title": "Tocar ou salvar:",
    "step3_desc": "Reproduza em segundo plano na tela bloqueada ou baixe o ZIP.",
    "sync_playlist_label": "Nome da playlist:",
    "quick_tags": "Sugestões rápidas:",
    "btn_sync_all_playlist": "Sincronizar biblioteca e criar lista",
    "sync_single_track_label": "Ou sincronize uma faixa específica:",
    "select_file_placeholder": "-- Escolha um arquivo --",
    "btn_sync_single": "Sincronizar faixa",
    "btn_scan_devices": "Buscar dispositivos",
    "checking_devices": "Buscando dispositivos Apple via USB...",
    "connect_cable_hint": "Conecte o iPhone com um cabo Lightning ou Type-C.",
    "btn_open_finder_sync": "Abrir sincronização no Finder",
    "btn_goto_sync_tab": "Abrir aba Transferir e Sincronizar 📱",
    "btn_copy": "Copiar",
    "btn_open": "Abrir",
    "btn_ping": "Testar",
    "qr_loading": "Gerando QR Code...",
    "lang_select_label": "Idioma / Language",
    "url_placeholder": "Cole os links aqui... Vídeo, playlist ou vários links (um por linha)...",
    "search_input_placeholder": "Pesquisar por música ou artista... (ex: Adele, Coldplay)...",
    "library_filter_placeholder": "Filtrar faixas por nome...",
    "tab_sync_playlist_placeholder": "ex: Mazekty Top Hits",
    "range_to": "até",
    "pro_hero_title": "Estúdio Mazekty Pro",
    "pro_hero_subtitle": "Ferramentas avançadas de engenharia de áudio rodando 100% localmente sem assinaturas.",
    "spatial_hint": "💡 Recomenda-se fones de ouvido para a melhor experiência espacial 360°.",
    "opt_format_mp3": "🎵 MP3 (Padrão Universal)",
    "opt_format_m4a": "🍎 M4A (Apple AAC Alta Qualidade)",
    "opt_format_flac": "💎 FLAC (Lossless Qualidade Estúdio)",
    "opt_format_wav": "🎙️ WAV (Master de Estúdio Bruto)",
    "opt_format_mp4": "🎬 MP4 (Vídeo e Áudio HD)",
    "opt_quality_320": "⚡ 320 kbps (Ultra HD - Qualidade Máxima)",
    "opt_quality_256": "✨ 256 kbps (Alta Qualidade)",
    "opt_quality_192": "🎵 192 kbps (Qualidade Média)",
    "opt_quality_128": "📦 128 kbps (Padrão - Menor Tamanho)",
    "opt_speed_unlimited": "🚀 Ilimitado (Velocidade Máxima)",
    "opt_speed_3mb": "⚡ 3 MB/s (Rápido e Equilibrado)",
    "opt_speed_1mb": "🌐 1 MB/s (Economia de Dados)",
    "opt_speed_500kb": "🐌 500 KB/s (Baixo Consumo)",
    "opt_eq_bass": "🔊 Bass Boost (Graves Profundos)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Vozes Claras)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Energia ao Vivo)",
    "opt_eq_electro": "⚡ Electronic / Dance (Batidas Fortes)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Isolamento de Voz)",
    "opt_theme_dark": "🌌 Dark Glass (Padrão)",
    "opt_theme_oled": "🖤 OLED Black (Preto Puro)",
    "opt_theme_light": "☀️ Light Modern (Claro Moderno)",
    "setting_license_title": "Licença Mazekty PRO",
    "setting_license_desc": "Recursos profissionais permanentemente ativos e 100% gratuitos.",
    "setting_license_active": "✓ Ativo Vitalício",
    "modal_step1": "✓ Passo 1: Abra a câmera do iPhone e escaneie o código QR.",
    "modal_step2": "✓ Passo 2: O Safari abrirá seu player instantaneamente.",
    "modal_step3": "✓ Passo 3: Toque em 'Baixar tudo em ZIP' para salvar no app Arquivos ou ouça em segundo plano!",
    "btn_done": "Concluído ✓",
    "splash_loading": "Inicializando motor de áudio Mazekty Pro...",
    "splash_ready": "Bem-vindo ao Mazekty Pro",
    "loading_view": "Carregando...",
    "sound_toggle_title": "Ativar / Desativar Sons",
  },
  "ru": {
    "auto_retry_end": "Автоматически повторять неудачные загрузки в конце очереди",
    "btn_denoise_execute": "Очистить и Удалить Шум",
    "btn_identify_execute": "Опознать Трек",
    "btn_merge_execute": "Объединить и Сделать DJ-Микс",
    "btn_retry_failed": "Повторить Неудачные",
    "btn_retry_now": "Повторить Сейчас 🔄",
    "btn_stems_execute": "Разделить на 4 Дорожки",
    "clipboard_detected": "Обнаружена скопированная ссылка на музыку!",
    "clipboard_monitor": "Умный Монитор Буфера Обмена",
    "crossfade_duration": "Длительность Перехода:",
    "denoise_desc": "Удаляет шипение микрофона и фоновый шум для чистоты голоса.",
    "denoise_hint": "💡 Идеально для голосовых записей, подкастов и зашумленных файлов.",
    "denoise_title": "Шумоподавление и Очистка Голоса",
    "identify_desc": "Сканирует неизвестные треки: определяет название, автора, альбом и HD-обложку.",
    "identify_title": "Определитель Треков (Аналог Shazam)",
    "merger_desc": "Бесшовно объединяет два трека с плавным кроссфейдом.",
    "merger_title": "Сведение Аудио и DJ Crossfade",
    "retry_modal_title": "Изменить Формат / Качество и Повторить",
    "select_track1_label": "Первый Трек:",
    "select_track2_label": "Второй Трек:",
    "sleep_timer_desc": "Громкость плавно убавится, и плеер остановится автоматически:",
    "sleep_timer_title": "Умный Таймер Сна",
    "stems_desc": "Разделяет любой трек на 4 дорожки: Вокал, Музыка, Бас и Ударные.",
    "stems_title": "ИИ-Разделитель Дорожек (4 Stems)",
    "supported_platforms": "Поддерживаемые Платформы:",
    "vis_modal_title": "Неоновый Спектральный Анализатор",
    "lyrics_title": "Синхронизированный Текст",
    "lyrics_loading": "Загрузка караоке-текста...",
    "lyrics_not_found": "Синхронизированный текст не найден.",
    "lyrics_synced": "Караоке Синхронизировано ✓",
    "lyrics_plain": "Обычный Текст",
    "btn_save_lrc": "Сохранить Файл .lrc",
    "lrc_saved": "Файл LRC успешно сохранен!",
    "btn_mini_player": "Мини Плавающий Плеер",
    "btn_visualizer": "Спектральный Анализатор",
    "btn_sleep_timer": "Таймер Сна",
    "sleep_timer_active": "Таймер сна активен: осталось {min} мин",
    "sleep_timer_off": "Таймер сна выключен",
    "toast_download_now": "Скачать Сейчас",
    "toast_ignore": "Закрыть",
    "app_brand": "Mazekty",
    "nav_downloader": "Загрузчик",
    "nav_search": "Прямой поиск",
    "nav_library": "Аудио библиотека",
    "nav_studio": "Про Студия",
    "nav_sync": "Передача и синхронизация",
    "nav_settings": "Настройки",
    "links_label": "Ссылки YouTube (Видео, Плейлист или несколько URL):",
    "btn_paste": "📋 Вставить",
    "btn_clear": "Очистить",
    "format_label": "Формат загрузки:",
    "quality_label": "Качество звука (Битрейт):",
    "speed_limit_label": "Лимит скорости:",
    "speed_unlimited": "🚀 Без ограничений (Максимальная скорость)",
    "embed_thumb": "Встроить обложку",
    "embed_meta": "Встроить ID3-теги",
    "skip_feature": "⚡ Пропускать дубликаты",
    "btn_analyze": "🔍 Анализ ссылок",
    "btn_schedule": "Запланировать",
    "btn_download": "Добавить в очередь и скачать",
    "preview_title": "Анализ URL и треки",
    "btn_select_all": "Выбрать все",
    "btn_deselect_all": "Снять выбор",
    "btn_close": "Закрыть",
    "range_label": "Диапазон треков:",
    "btn_apply_range": "Применить",
    "btn_download_selected": "Скачать выбранные",
    "queue_title": "Очередь загрузки в реальном времени",
    "btn_pause_queue": "Пауза",
    "btn_resume_queue": "Продолжить",
    "stat_total": "Всего:",
    "stat_active": "В процессе:",
    "stat_done": "Готово:",
    "stat_skipped": "Пропущено:",
    "stat_fail": "Ошибка:",
    "btn_clear_completed": "🧹 Очистить",
    "empty_tasks": "В очереди нет активных загрузок.",
    "search_banner_title": "Прямой поиск в приложении",
    "search_banner_desc": "Ищите любые треки, исполнителей или альбомы без браузера.",
    "btn_search_now": "Искать сейчас",
    "search_prompt": "Введите запрос и нажмите 'Искать сейчас'",
    "library_title": "Загруженная аудиотека",
    "auto_refresh_badge": "Автообновление ⚡",
    "btn_export_m3u": "Экспорт M3U",
    "btn_refresh": "🔄 Обновить",
    "btn_open_finder": "📂 Открыть папку",
    "btn_browse_folder": "Обзор",
    "empty_library": "В этой папке пока нет файлов.",
    "sort_date_desc": "📅 Сначала новые",
    "sort_date_asc": "📅 Сначала старые",
    "sort_name_asc": "🔤 По алфавиту (А-Я)",
    "sort_size_desc": "💾 По размеру",
    "trimmer_title": "Обрезка аудио и создание рингтонов",
    "trimmer_desc": "Обрезайте треки или сохраняйте как рингтон iPhone (.m4r).",
    "select_file_label": "Выберите файл:",
    "start_sec_label": "Начало (сек):",
    "end_sec_label": "Конец (сек):",
    "make_ringtone_label": "Создать рингтон iPhone (.m4r)",
    "btn_trim_execute": "Обрезать и сохранить",
    "enhancer_title": "Нормализация громкости и басс-буст",
    "enhancer_desc": "Стандартизация уровня EBU R128 и глубокий бас.",
    "loudnorm_label": "Нормализация громкости (EBU R128)",
    "bassboost_label": "Усиление басов (+6dB Punch)",
    "btn_enhance_execute": "Улучшить звук",
    "vocal_remover_title": "Удаление вокала и караоке",
    "vocal_remover_desc": "Изолируйте инструментал через противофазное подавление вокала.",
    "btn_vocal_execute": "Создать караоке",
    "pitch_shifter_title": "Смена тональности и темпа (Pitch & BPM)",
    "pitch_shifter_desc": "Изменяйте тональность и скорость воспроизведения без потерь.",
    "pitch_label": "Тональность (полутоны):",
    "speed_label": "Скорость (Темп):",
    "btn_pitch_execute": "Применить настройки",
    "spatial_title": "8D Пространственный звук",
    "spatial_desc": "360-градусный объемный звук для наушников.",
    "btn_spatial_execute": "Конвертировать в 8D",
    "equalizer_title": "10-полосный эквалайзер",
    "equalizer_desc": "Профессиональные студийные пресеты.",
    "eq_preset_label": "Пресет:",
    "btn_eq_execute": "Применить эквалайзер",
    "silence_title": "Удаление тишины",
    "silence_desc": "Автоматическое удаление пауз в начале и конце.",
    "btn_silence_execute": "Очистить тишину",
    "converter_title": "Пакетный конвертер",
    "converter_desc": "Конвертируйте все файлы папки параллельно.",
    "target_format_label": "Целевой формат:",
    "btn_convert_execute": "Конвертировать все",
    "art_title": "Замена обложки высокого разрешения",
    "art_desc": "Встраивайте любые изображения в качестве обложки трека.",
    "select_image_label": "Выбрать изображение (JPG/PNG):",
    "btn_art_execute": "Встроить обложку",
    "applemusic_title": "Синхронизация с Apple Music и iPhone",
    "applemusic_desc": "Создавайте плейлисты и передавайте треки на iPhone по Wi-Fi или кабелю.",
    "btn_sync_now": "Синхронизировать трек",
    "btn_sync_all": "Синхронизировать все в плейлист",
    "playlist_name_label": "Название плейлиста:",
    "btn_sync_finder": "Синхронизация через Finder",
    "btn_mobile_airsync": "Передача по QR-коду",
    "btn_mobile_sync": "Мобильный (QR)",
    "mobile_sync_modal_title": "Синхронизация с iPhone и мобильными",
    "mobile_sync_hint": "Отсканируйте QR-код камерой iPhone для воспроизведения или загрузки по Wi-Fi:",
    "mobile_url_label": "Или откройте в Safari:",
    "setting_folder_title": "Папка загрузки",
    "setting_folder_desc": "Постоянное место сохранения файлов.",
    "setting_theme_mode": "Тема оформления",
    "setting_theme_mode_desc": "Внешний вид интерфейса.",
    "setting_accent_title": "Цвет акцента",
    "setting_accent_desc": "Цветовая схема кнопок и свечения.",
    "setting_lang_title": "Язык приложения",
    "setting_lang_desc": "Выберите язык интерфейса.",
    "setting_os_title": "Операционная система",
    "setting_os_desc": "Обнаруженная платформа и аудио-движок.",
    "status_connected": "Подключено к серверу ✓",
    "status_connecting": "Подключение...",
    "status_reconnecting": "Переподключение...",
    "status_queued": "В очереди ⏳",
    "status_downloading": "Загрузка... ⚡",
    "status_converting": "Обработка... 🎛️",
    "status_completed": "Готово ✓",
    "status_skipped": "Пропущено ⏭️",
    "status_cancelled": "Отменено ✕",
    "status_failed": "Ошибка ❌",
    "tag_editor_title": "Редактор ID3-тегов",
    "tag_title_label": "Название трека:",
    "tag_artist_label": "Исполнитель:",
    "tag_album_label": "Альбом:",
    "tag_year_label": "Год:",
    "tag_genre_label": "Жанр:",
    "btn_save_tags": "Сохранить теги ✓",
    "btn_cancel": "Отмена",
    "schedule_modal_title": "Запланировать загрузку",
    "schedule_desc": "Через сколько минут начать автоматическую загрузку:",
    "schedule_delay_label": "Запуск через (минут):",
    "btn_confirm_schedule": "Подтвердить ⏰",
    "sync_hero_title": "Центр передачи и синхронизации (iOS и Android)",
    "sync_hero_desc": "Беспроводной AirSync по QR-коду, плейлисты Apple Music и синхронизация по кабелю в Finder.",
    "sync_airsync_title": "Мгновенный беспроводной AirSync (QR-код)",
    "sync_airsync_subtitle": "Наведите камеру iPhone для запуска плеера в Safari",
    "sync_apple_music_title": "Apple Music и плейлисты",
    "sync_apple_music_subtitle": "Импортируйте треки напрямую и создавайте плейлисты",
    "sync_finder_title": "Синхронизация по кабелю USB (Finder macOS)",
    "sync_finder_subtitle": "Обнаружение и синхронизация iPhone и iPad",
    "sync_network_adapter": "Сетевой интерфейс / IP:",
    "btn_download_zip_all": "Скачать все ZIP-архивом (Приложение Файлы на iPhone)",
    "sync_zip_hint": "Сохраняется в приложении Файлы iOS и распаковывается в 1 касание.",
    "sync_guide_title": "Быстрый старт для iPhone 📱:",
    "step1_title": "Общий Wi-Fi:",
    "step1_desc": "Убедитесь, что iPhone и компьютер подключены к одной сети Wi-Fi.",
    "step2_title": "Сканируйте QR:",
    "step2_desc": "Откройте камеру iOS и нажмите на желтую ссылку для Safari.",
    "step3_title": "Слушайте или сохраняйте:",
    "step3_desc": "Фоновое воспроизведение при заблокированном экране или загрузка ZIP.",
    "sync_playlist_label": "Имя плейлиста:",
    "quick_tags": "Быстрые варианты:",
    "btn_sync_all_playlist": "Синхронизировать всю библиотеку",
    "sync_single_track_label": "Или синхронизировать один трек:",
    "select_file_placeholder": "-- Выберите файл --",
    "btn_sync_single": "Синхронизировать трек",
    "btn_scan_devices": "Поиск устройств",
    "checking_devices": "Поиск подключенных устройств Apple через USB...",
    "connect_cable_hint": "Подключите iPhone кабелем Lightning или Type-C.",
    "btn_open_finder_sync": "Открыть синхронизацию в Finder",
    "btn_goto_sync_tab": "Открыть вкладку Передача и синхронизация 📱",
    "btn_copy": "Копировать",
    "btn_open": "Открыть",
    "btn_ping": "Проверить",
    "qr_loading": "Генерация QR-кода...",
    "lang_select_label": "Язык / Language",
    "url_placeholder": "Вставьте ссылки сюда... Видео, плейлист или несколько ссылок (по одной в строке)...",
    "search_input_placeholder": "Поиск по названию трека или исполнителю... (напр. Adele, Coldplay)...",
    "library_filter_placeholder": "Фильтр треков по названию...",
    "tab_sync_playlist_placeholder": "напр. Mazekty Top Hits",
    "range_to": "до",
    "pro_hero_title": "Студия Mazekty Pro",
    "pro_hero_subtitle": "Продвинутые инструменты аудиообработки, работающие на 100% локально без подписок.",
    "spatial_hint": "💡 Рекомендуется использовать наушники для максимального 360° пространственного звучания.",
    "opt_format_mp3": "🎵 MP3 (Универсальный стандарт)",
    "opt_format_m4a": "🍎 M4A (Apple AAC высокое качество)",
    "opt_format_flac": "💎 FLAC (Студийное без потерь Lossless)",
    "opt_format_wav": "🎙️ WAV (Несжатый студийный мастер)",
    "opt_format_mp4": "🎬 MP4 (HD Видео и аудио)",
    "opt_quality_320": "⚡ 320 кбит/с (Ultra HD - Максимальное)",
    "opt_quality_256": "✨ 256 кбит/с (Высокое качество)",
    "opt_quality_192": "🎵 192 кбит/с (Среднее качество)",
    "opt_quality_128": "📦 128 кбит/с (Стандарт - Меньший размер)",
    "opt_speed_unlimited": "🚀 Без ограничений (Макс. скорость)",
    "opt_speed_3mb": "⚡ 3 МБ/с (Быстро и стабильно)",
    "opt_speed_1mb": "🌐 1 МБ/с (Экономия трафика)",
    "opt_speed_500kb": "🐌 500 КБ/с (Медленное соединение)",
    "opt_eq_bass": "🔊 Bass Boost (Мощный бас)",
    "opt_eq_vocal": "🎤 Vocal Clarity (Чистый вокал)",
    "opt_eq_rock": "🎸 Rock & Acoustic (Живой звук)",
    "opt_eq_electro": "⚡ Electronic / Dance (Энергичные биты)",
    "opt_eq_podcast": "🎙️ Podcast & Voice (Выделение речи)",
    "opt_theme_dark": "🌌 Dark Glass (По умолчанию)",
    "opt_theme_oled": "🖤 OLED Black (Глубокий черный)",
    "opt_theme_light": "☀️ Light Modern (Светлая тема)",
    "setting_license_title": "Лицензия Mazekty PRO",
    "setting_license_desc": "Профессиональные функции активны навсегда и на 100% бесплатны.",
    "setting_license_active": "✓ Активно навсегда",
    "modal_step1": "✓ Шаг 1: Откройте камеру iPhone и отсканируйте QR-код.",
    "modal_step2": "✓ Шаг 2: В Safari мгновенно откроется веб-плеер.",
    "modal_step3": "✓ Шаг 3: Нажмите 'Скачать все в ZIP' для сохранения в 'Файлы' или слушайте в фоне!",
    "btn_done": "Закрыть ✓",
    "splash_loading": "Инициализация аудиодвижка Mazekty Pro...",
    "splash_ready": "Добро пожаловать в Mazekty Pro",
    "loading_view": "Загрузка...",
    "sound_toggle_title": "Вкл / Выкл звуковые эффекты",
  }
};

// --- Web Audio Sound Synthesizer ---
let audioCtx = null;
function playUiSound(type = 'pop') {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'pop') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {}
}

// --- Confetti Animation ---
const confettiCanvas = document.getElementById('confettiCanvas');
let confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

function triggerConfetti() {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#a855f7'];
  for (let i = 0; i < 70; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 16 - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10
    });
  }
  if (!confettiAnimId) renderConfetti();
}

function renderConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    let p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.35; // gravity
    p.alpha -= 0.015;
    p.rotation += p.vRot;

    if (p.alpha <= 0) {
      confettiParticles.splice(i, 1);
      continue;
    }

    confettiCtx.save();
    confettiCtx.globalAlpha = p.alpha;
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    confettiCtx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(renderConfetti);
  } else {
    confettiAnimId = null;
  }
}

// --- Dynamic Ambient Floating Music Notes Background ---
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
let bgNotes = [];

function resizeBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBg);
resizeBg();

const noteChars = ['♪', '♫', '♬', '♩', '✦'];
for (let i = 0; i < 25; i++) {
  bgNotes.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    char: noteChars[Math.floor(Math.random() * noteChars.length)],
    size: Math.random() * 16 + 14,
    speedY: Math.random() * 0.5 + 0.2,
    speedX: (Math.random() - 0.5) * 0.4,
    opacity: Math.random() * 0.25 + 0.08
  });
}

function renderBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgNotes.forEach(n => {
    n.y -= n.speedY;
    n.x += n.speedX;
    if (n.y < -20) n.y = bgCanvas.height + 20;
    if (n.x < -20) n.x = bgCanvas.width + 20;
    if (n.x > bgCanvas.width + 20) n.x = -20;

    bgCtx.font = `${n.size}px monospace`;
    bgCtx.fillStyle = `rgba(129, 140, 248, ${n.opacity})`;
    bgCtx.fillText(n.char, n.x, n.y);
  });
  requestAnimationFrame(renderBg);
}
renderBg();

// --- DOM Elements ---
const navItems = document.querySelectorAll('.nav-item');
const viewPanels = document.querySelectorAll('.view-panel');
const stageTitle = document.getElementById('stageTitle');
const sidebarLangSelect = document.getElementById('sidebarLangSelect');
const btnToggleLang = document.getElementById('btnToggleLang');
const langBadge = document.getElementById('langBadge');
const btnToggleSound = document.getElementById('btnToggleSound');
const soundIcon = document.getElementById('soundIcon');
const btnQuickFolder = document.getElementById('btnQuickFolder');
const topFolderLabel = document.getElementById('topFolderLabel');
const btnOpenSidebarFolder = document.getElementById('btnOpenSidebarFolder');
const osBadgeLabel = document.getElementById('osBadgeLabel');

// Splash & Progress Elements
const appSplashScreen = document.getElementById('appSplashScreen');
const splashProgressFill = document.getElementById('splashProgressFill');
const splashStatusText = document.getElementById('splashStatusText');
const topProgressBar = document.getElementById('topProgressBar');
const topProgressBarFill = document.getElementById('topProgressBarFill');
const viewSpinnerOverlay = document.getElementById('viewSpinnerOverlay');
const viewSpinnerText = document.getElementById('viewSpinnerText');

// Downloader Elements
const urlInput = document.getElementById('urlInput');
const formatSelect = document.getElementById('formatSelect');
const qualitySelect = document.getElementById('qualitySelect');
const qualityWrapper = document.getElementById('qualityWrapper');
const speedLimitSelect = document.getElementById('speedLimitSelect');
const embedThumbnail = document.getElementById('embedThumbnail');
const embedMetadata = document.getElementById('embedMetadata');
const btnPaste = document.getElementById('btnPaste');
const btnClear = document.getElementById('btnClear');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnDownload = document.getElementById('btnDownload');
const btnDownloadText = document.getElementById('btnDownloadText');
const btnScheduleModal = document.getElementById('btnScheduleModal');

// Queue Controls
const btnPauseResumeQueue = document.getElementById('btnPauseResumeQueue');
const pauseQueueIcon = document.getElementById('pauseQueueIcon');
const pauseQueueText = document.getElementById('pauseQueueText');
const tasksList = document.getElementById('tasksList');
const emptyTasks = document.getElementById('emptyTasks');
const btnClearCompleted = document.getElementById('btnClearCompleted');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statDone = document.getElementById('statDone');
const statSkipped = document.getElementById('statSkipped');
const statFail = document.getElementById('statFail');

// Preview Elements
const previewCard = document.getElementById('previewCard');
const previewList = document.getElementById('previewList');
const btnClosePreview = document.getElementById('btnClosePreview');
const playlistStatsBadge = document.getElementById('playlistStatsBadge');
const btnSelectAllPreview = document.getElementById('btnSelectAllPreview');
const btnDeselectAllPreview = document.getElementById('btnDeselectAllPreview');
const rangeSelectorRow = document.getElementById('rangeSelectorRow');
const rangeStart = document.getElementById('rangeStart');
const rangeEnd = document.getElementById('rangeEnd');
const btnApplyRange = document.getElementById('btnApplyRange');
const btnDownloadSelected = document.getElementById('btnDownloadSelected');

// Search Elements
const searchInput = document.getElementById('searchInput');
const btnSearchGo = document.getElementById('btnSearchGo');
const searchResults = document.getElementById('searchResults');

// Library Elements
const libraryList = document.getElementById('libraryList');
const emptyLibrary = document.getElementById('emptyLibrary');
const btnRefreshLibrary = document.getElementById('btnRefreshLibrary');
const btnOpenLibraryFolder = document.getElementById('btnOpenLibraryFolder');
const btnExportM3U = document.getElementById('btnExportM3U');
const libraryFilterInput = document.getElementById('libraryFilterInput');
const librarySortSelect = document.getElementById('librarySortSelect');

// Studio Elements
const trimFileSelect = document.getElementById('trimFileSelect');
const trimStart = document.getElementById('trimStart');
const trimEnd = document.getElementById('trimEnd');
const trimIsRingtone = document.getElementById('trimIsRingtone');
const btnDoTrim = document.getElementById('btnDoTrim');

const enhanceFileSelect = document.getElementById('enhanceFileSelect');
const enhanceNorm = document.getElementById('enhanceNorm');
const enhanceBass = document.getElementById('enhanceBass');
const btnDoEnhance = document.getElementById('btnDoEnhance');

const vocalFileSelect = document.getElementById('vocalFileSelect');
const btnDoVocalRemove = document.getElementById('btnDoVocalRemove');

const pitchFileSelect = document.getElementById('pitchFileSelect');
const pitchSlider = document.getElementById('pitchSlider');
const pitchValueLabel = document.getElementById('pitchValueLabel');
const speedSlider = document.getElementById('speedSlider');
const speedValueLabel = document.getElementById('speedValueLabel');
const btnDoPitchSpeed = document.getElementById('btnDoPitchSpeed');

const spatialFileSelect = document.getElementById('spatialFileSelect');
const btnDoSpatial8D = document.getElementById('btnDoSpatial8D');

const eqFileSelect = document.getElementById('eqFileSelect');
const eqPresetSelect = document.getElementById('eqPresetSelect');
const btnDoEqualizer = document.getElementById('btnDoEqualizer');

const silenceFileSelect = document.getElementById('silenceFileSelect');
const btnDoSilenceRemove = document.getElementById('btnDoSilenceRemove');

const batchFormatSelect = document.getElementById('batchFormatSelect');
const btnDoBatchConvert = document.getElementById('btnDoBatchConvert');

const artFileSelect = document.getElementById('artFileSelect');
const artImageInput = document.getElementById('artImageInput');
const btnDoReplaceArtwork = document.getElementById('btnDoReplaceArtwork');

const syncPlaylistName = document.getElementById('syncPlaylistName');
const syncFileSelect = document.getElementById('syncFileSelect');
const btnSyncAppleMusic = document.getElementById('btnSyncAppleMusic');
const btnSyncAllAppleMusic = document.getElementById('btnSyncAllAppleMusic');
const btnSyncIosFinder = document.getElementById('btnSyncIosFinder');
const btnOpenMobileSyncModal = document.getElementById('btnOpenMobileSyncModal');
const btnLibraryMobileSync = document.getElementById('btnLibraryMobileSync');

// Settings Elements
const settingsFolderInput = document.getElementById('settingsFolderInput');
const btnSettingsBrowseFolder = document.getElementById('btnSettingsBrowseFolder');
const settingsThemeModeSelect = document.getElementById('settingsThemeModeSelect');
const settingsLangSelect = document.getElementById('settingsLangSelect');
const colorDots = document.querySelectorAll('.color-dot');

// Modals
const tagModalOverlay = document.getElementById('tagModalOverlay');
const btnCloseTagModal = document.getElementById('btnCloseTagModal');
const btnCancelTagEdit = document.getElementById('btnCancelTagEdit');
const btnSaveTagEdit = document.getElementById('btnSaveTagEdit');
const tagEditFilename = document.getElementById('tagEditFilename');
const tagTitleInput = document.getElementById('tagTitleInput');
const tagArtistInput = document.getElementById('tagArtistInput');
const tagAlbumInput = document.getElementById('tagAlbumInput');
const tagYearInput = document.getElementById('tagYearInput');
const tagGenreInput = document.getElementById('tagGenreInput');

const scheduleModalOverlay = document.getElementById('scheduleModalOverlay');
const btnCloseScheduleModal = document.getElementById('btnCloseScheduleModal');
const btnCancelSchedule = document.getElementById('btnCancelSchedule');
const btnConfirmSchedule = document.getElementById('btnConfirmSchedule');
const scheduleDelayMinutes = document.getElementById('scheduleDelayMinutes');

const mobileModalOverlay = document.getElementById('mobileModalOverlay');
const btnCloseMobileModal = document.getElementById('btnCloseMobileModal');
const btnDoneMobileModal = document.getElementById('btnDoneMobileModal');
const qrcodeContainer = document.getElementById('qrcodeContainer');
const mobileUrlInput = document.getElementById('mobileUrlInput');
const btnCopyMobileUrl = document.getElementById('btnCopyMobileUrl');

// Floating Bottom Player
const playerWidget = document.getElementById('playerWidget');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const globalAudioPlayer = document.getElementById('globalAudioPlayer');
const btnPlayerAppleSync = document.getElementById('btnPlayerAppleSync');
const btnPlayerClose = document.getElementById('btnPlayerClose');

// --- NEW FEATURES DOM REFERENCES ---
const platformChips = document.querySelectorAll('.platform-chip');
const autoRetryFailedToggle = document.getElementById('autoRetryFailedToggle');
const btnRetryFailed = document.getElementById('btnRetryFailed');

const retryModalOverlay = document.getElementById('retryModalOverlay');
const btnCloseRetryModal = document.getElementById('btnCloseRetryModal');
const btnCancelRetryModal = document.getElementById('btnCancelRetryModal');
const btnConfirmRetrySingle = document.getElementById('btnConfirmRetrySingle');
const retryItemId = document.getElementById('retryItemId');
const retryTrackTitleText = document.getElementById('retryTrackTitleText');
const retryFormatSelect = document.getElementById('retryFormatSelect');
const retryQualitySelect = document.getElementById('retryQualitySelect');

const clipboardMonitorToggle = document.getElementById('clipboardMonitorToggle');
const clipboardToast = document.getElementById('clipboardToast');
const clipboardToastUrl = document.getElementById('clipboardToastUrl');
const btnClipboardAdd = document.getElementById('btnClipboardAdd');
const btnClipboardDismiss = document.getElementById('btnClipboardDismiss');

const btnPlayerLyrics = document.getElementById('btnPlayerLyrics');
const btnPlayerVisualizer = document.getElementById('btnPlayerVisualizer');
const btnPlayerSleepTimer = document.getElementById('btnPlayerSleepTimer');
const btnPlayerMini = document.getElementById('btnPlayerMini');

const lyricsDrawer = document.getElementById('lyricsDrawer');
const btnCloseLyrics = document.getElementById('btnCloseLyrics');
const lyricsTrackTitle = document.getElementById('lyricsTrackTitle');
const lyricsArtistName = document.getElementById('lyricsArtistName');
const btnSaveLrc = document.getElementById('btnSaveLrc');
const lyricsContainer = document.getElementById('lyricsContainer');

const visualizerOverlay = document.getElementById('visualizerOverlay');
const btnCloseVisualizer = document.getElementById('btnCloseVisualizer');
const visModeSelect = document.getElementById('visModeSelect');
const spectrumCanvas = document.getElementById('spectrumCanvas');

const sleepTimerModal = document.getElementById('sleepTimerModal');
const btnCloseSleepTimer = document.getElementById('btnCloseSleepTimer');
const sleepTimerStatus = document.getElementById('sleepTimerStatus');
const sleepOptionBtns = document.querySelectorAll('.sleep-option-btn');

// Studio Tools 11-14 DOM References
const stemsFileSelect = document.getElementById('stemsFileSelect');
const btnDoStems = document.getElementById('btnDoStems');
const stemsFeedback = document.getElementById('stemsFeedback');

const mergeFileSelect1 = document.getElementById('mergeFileSelect1');
const mergeFileSelect2 = document.getElementById('mergeFileSelect2');
const crossfadeSlider = document.getElementById('crossfadeSlider');
const crossfadeValueLabel = document.getElementById('crossfadeValueLabel');
const btnDoMerge = document.getElementById('btnDoMerge');

const denoiseFileSelect = document.getElementById('denoiseFileSelect');
const btnDoDenoise = document.getElementById('btnDoDenoise');

const identifyFileSelect = document.getElementById('identifyFileSelect');
const btnDoIdentify = document.getElementById('btnDoIdentify');
const identifyResultBox = document.getElementById('identifyResultBox');


// --- Navigation Handling ---
navItems.forEach(item => {
  item.addEventListener('click', () => {
    playUiSound('pop');
    const viewName = item.dataset.view;
    switchView(viewName);
  });
});

// --- Top Progress & View Spinner Management ---
function showTopProgress() {
  if (topProgressBar) topProgressBar.classList.add('active');
}

function hideTopProgress() {
  if (topProgressBar) topProgressBar.classList.remove('active');
}

function showViewSpinner(textKey = 'loading_view') {
  if (viewSpinnerOverlay) {
    if (viewSpinnerText && i18n[currentLang] && i18n[currentLang][textKey]) {
      viewSpinnerText.textContent = i18n[currentLang][textKey];
    }
    viewSpinnerOverlay.classList.add('show');
  }
}

function hideViewSpinner() {
  if (viewSpinnerOverlay) {
    viewSpinnerOverlay.classList.remove('show');
  }
}

// --- Splash Screen Lifecycle ---
let splashDismissed = false;
function dismissSplashScreen() {
  if (splashDismissed || !appSplashScreen) return;
  splashDismissed = true;
  if (splashProgressFill) splashProgressFill.style.width = '100%';
  if (splashStatusText && i18n[currentLang] && i18n[currentLang].splash_ready) {
    splashStatusText.textContent = i18n[currentLang].splash_ready;
  }
  setTimeout(() => {
    appSplashScreen.classList.add('fade-out');
    setTimeout(() => {
      appSplashScreen.style.display = 'none';
    }, 600);
  }, 400);
}

// Animate splash progress on startup
if (splashProgressFill) {
  setTimeout(() => { if (!splashDismissed) splashProgressFill.style.width = '45%'; }, 150);
  setTimeout(() => { if (!splashDismissed) splashProgressFill.style.width = '80%'; }, 500);
}
// Fallback dismissal
setTimeout(dismissSplashScreen, 1200);

function switchView(viewName) {
  if (activeView === viewName) return;
  activeView = viewName;
  navItems.forEach(nav => nav.classList.toggle('active', nav.dataset.view === viewName));
  viewPanels.forEach(panel => panel.classList.toggle('active', panel.id === `view-${viewName}`));

  const titleKey = `nav_${viewName}`;
  if (stageTitle && i18n[currentLang] && i18n[currentLang][titleKey]) {
    stageTitle.textContent = i18n[currentLang][titleKey];
  }

  showTopProgress();

  if (viewName === 'library' || viewName === 'studio') {
    showViewSpinner();
    const p = fetchLibrary();
    if (p && p.finally) {
      p.finally(() => {
        hideViewSpinner();
        hideTopProgress();
      });
    } else {
      setTimeout(() => {
        hideViewSpinner();
        hideTopProgress();
      }, 300);
    }
  } else if (viewName === 'sync') {
    showViewSpinner();
    const p = loadSyncTabState();
    if (p && p.finally) {
      p.finally(() => {
        hideViewSpinner();
        hideTopProgress();
      });
    } else {
      setTimeout(() => {
        hideViewSpinner();
        hideTopProgress();
      }, 300);
    }
  } else {
    setTimeout(() => {
      hideTopProgress();
    }, 250);
  }
}

// --- Format selector change ---
formatSelect.addEventListener('change', () => {
  const isVideo = (formatSelect.value === 'mp4');
  if (isVideo) {
    qualityWrapper.style.display = 'none';
  } else {
    qualityWrapper.style.display = 'flex';
  }
});

// --- Theme and Accent Management ---
function applyTheme(themeMode, accentColor) {
  const currentMode = themeMode || document.documentElement.getAttribute('data-theme') || localStorage.getItem('mazekty_theme_mode') || 'dark';
  const currentAccent = accentColor || document.documentElement.getAttribute('data-accent') || localStorage.getItem('mazekty_theme_accent') || 'violet';
  document.documentElement.setAttribute('data-theme', currentMode);
  document.documentElement.setAttribute('data-accent', currentAccent);
  try {
    localStorage.setItem('mazekty_theme_mode', currentMode);
    localStorage.setItem('mazekty_theme_accent', currentAccent);
  } catch(e) {}
  if (settingsThemeModeSelect) settingsThemeModeSelect.value = currentMode;
  colorDots.forEach(dot => {
    dot.classList.toggle('active', dot.dataset.color === currentAccent);
  });
}

settingsThemeModeSelect.addEventListener('change', async () => {
  const mode = settingsThemeModeSelect.value;
  applyTheme(mode, document.documentElement.getAttribute('data-accent'));
  await saveConfigToServer({ theme_mode: mode });
});

colorDots.forEach(dot => {
  dot.addEventListener('click', async () => {
    playUiSound('pop');
    const color = dot.dataset.color;
    applyTheme(document.documentElement.getAttribute('data-theme'), color);
    await saveConfigToServer({ theme_accent: color });
  });
});

// --- Language Switching (8 Global Languages) ---
const supportedLanguages = ['en', 'ar', 'es', 'fr', 'de', 'tr', 'pt', 'ru'];

if (sidebarLangSelect) {
  sidebarLangSelect.addEventListener('change', () => {
    playUiSound('pop');
    setLanguage(sidebarLangSelect.value);
  });
}

if (btnToggleLang) {
  btnToggleLang.addEventListener('click', () => {
    playUiSound('pop');
    const currentIndex = supportedLanguages.indexOf(currentLang);
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    setLanguage(supportedLanguages[nextIndex]);
  });
}

if (settingsLangSelect) {
  settingsLangSelect.addEventListener('change', () => {
    setLanguage(settingsLangSelect.value);
  });
}

function setLanguage(lang) {
  if (!i18n[lang]) lang = 'en';
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar' ? 'rtl' : 'ltr');
  if (langBadge) langBadge.textContent = lang.toUpperCase();
  if (sidebarLangSelect) sidebarLangSelect.value = lang;
  if (settingsLangSelect) settingsLangSelect.value = lang;

  // 1. Text elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[lang] && i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    } else if (i18n['en'] && i18n['en'][key]) {
      el.textContent = i18n['en'][key];
    }
  });

  // 2. Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (i18n[lang] && i18n[lang][key]) {
      el.placeholder = i18n[lang][key];
    } else if (i18n['en'] && i18n['en'][key]) {
      el.placeholder = i18n['en'][key];
    }
  });

  // 3. Tooltip titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    if (i18n[lang] && i18n[lang][key]) {
      el.title = i18n[lang][key];
    } else if (i18n['en'] && i18n['en'][key]) {
      el.title = i18n['en'][key];
    }
  });

  const titleKey = `nav_${activeView}`;
  if (stageTitle) {
    if (i18n[lang] && i18n[lang][titleKey]) {
      stageTitle.textContent = i18n[lang][titleKey];
    } else if (i18n['en'] && i18n['en'][titleKey]) {
      stageTitle.textContent = i18n['en'][titleKey];
    }
  }

  saveConfigToServer({ language: lang });
}

// --- Sound Effects Toggle ---
btnToggleSound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
  playUiSound('pop');
});

// --- WebSocket Realtime Handling ---
function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    dismissSplashScreen();
    const connText = document.getElementById('connectionText');
    const connBadge = document.getElementById('connectionBadge');
    if (connText) connText.textContent = i18n[currentLang].status_connected;
    if (connBadge) connBadge.className = 'status-indicator-wrap connected';
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWsEvent(data);
    } catch (e) {}
  };

  socket.onclose = () => {
    const connText = document.getElementById('connectionText');
    const connBadge = document.getElementById('connectionBadge');
    if (connText) connText.textContent = i18n[currentLang].status_reconnecting;
    if (connBadge) connBadge.className = 'status-indicator-wrap error';

    if (!reconnectTimer) {
      reconnectTimer = setInterval(setupWebSocket, 2500);
    }
  };
}

function handleWsEvent(msg) {
  switch (msg.event) {
    case 'init_state':
      if (msg.stats) updateStats(msg.stats);
      if (msg.is_paused !== undefined) updateQueuePauseUI(msg.is_paused);
      if (msg.config) applyServerConfig(msg.config);
      if (msg.items && msg.items.length > 0) {
        emptyTasks.style.display = 'none';
        msg.items.forEach(renderQueueItem);
      }
      break;

    case 'queue_paused':
      updateQueuePauseUI(true);
      break;

    case 'queue_resumed':
      updateQueuePauseUI(false);
      break;

    case 'items_queued':
      emptyTasks.style.display = 'none';
      if (msg.stats) updateStats(msg.stats);
      if (msg.items) msg.items.forEach(renderQueueItem);
      playUiSound('pop');
      break;

    case 'item_started':
      if (msg.stats) updateStats(msg.stats);
      updateTaskStatus(msg.item_id, 'downloading', i18n[currentLang].status_downloading, msg.title);
      break;

    case 'progress':
      updateTaskProgress(msg.item_id, msg.percent, msg.speed, msg.eta, msg.status, msg.title);
      break;

    case 'item_completed':
      if (msg.stats) updateStats(msg.stats);
      updateTaskStatus(msg.item_id, 'completed', i18n[currentLang].status_completed, msg.title);
      playUiSound('success');
      triggerConfetti();
      fetchLibrary();
      checkAutoRetryAtEnd();
      break;

    case 'item_skipped':
      if (msg.stats) updateStats(msg.stats);
      updateTaskStatus(msg.item_id, 'skipped', i18n[currentLang].status_skipped, msg.title);
      break;

    case 'item_cancelled':
      if (msg.stats) updateStats(msg.stats);
      updateTaskStatus(msg.item_id, 'cancelled', i18n[currentLang].status_cancelled, msg.title);
      break;

    case 'item_error':
      if (msg.stats) updateStats(msg.stats);
      updateTaskStatus(msg.item_id, 'error', i18n[currentLang].status_failed, msg.title, msg.error);
      playUiSound('error');
      checkAutoRetryAtEnd();
      break;

    case 'stats_update':
      if (msg.stats) updateStats(msg.stats);
      checkAutoRetryAtEnd();
      break;
  }
}

function updateQueuePauseUI(paused) {
  isQueuePaused = paused;
  if (pauseQueueIcon) pauseQueueIcon.textContent = paused ? '▶️' : '⏸️';
  if (pauseQueueText) pauseQueueText.textContent = paused ? i18n[currentLang].btn_resume_queue : i18n[currentLang].btn_pause_queue;
  btnPauseResumeQueue.classList.toggle('danger', paused);
}

btnPauseResumeQueue.addEventListener('click', async () => {
  playUiSound('pop');
  const endpoint = isQueuePaused ? '/api/queue/resume' : '/api/queue/pause';
  await fetch(endpoint, { method: 'POST' });
});

function updateStats(newStats) {
  stats = newStats;
  statTotal.textContent = stats.total || 0;
  statActive.textContent = stats.in_progress || 0;
  statDone.textContent = stats.completed || 0;
  statSkipped.textContent = stats.skipped || 0;
  statFail.textContent = stats.failed || 0;
}

function renderQueueItem(item) {
  if (currentTasks[item.id]) return;

  const card = document.createElement('div');
  card.className = `task-card glass-card status-${item.status}`;
  card.id = `task-${item.id}`;

  const indexBadge = (item.playlist_index && item.playlist_total)
    ? `<span class="badge-index">#${item.playlist_index}/${item.playlist_total}</span>`
    : '';

  const formatBadge = item.audio_format ? `<span class="badge-pro" style="margin-inline-start:6px;">${item.audio_format.toUpperCase()}</span>` : '';

  card.innerHTML = `
    <div class="task-header">
      <div class="task-title-wrap">
        ${indexBadge}
        ${formatBadge}
        <span class="task-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="task-status-pill">${getStatusLabel(item.status)}</span>
        <button type="button" class="btn-cancel-item task-retry-btn ${item.status === 'error' ? '' : 'hidden'}" title="تغيير الصيغة والمحاولة" onclick="openRetryModal('${item.id}', '${escapeHtml(item.title).replace(/'/g, "\\'")}')">🔄</button>
        <button type="button" class="btn-cancel-item" title="إلغاء التنزيل" onclick="cancelQueueItem('${item.id}')">✕</button>
      </div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width: 0%"></div>
    </div>
    <div class="task-footer">
      <span class="task-percent">0%</span>
      <span class="task-metrics"></span>
    </div>
  `;

  tasksList.prepend(card);
  currentTasks[item.id] = card;
}

window.cancelQueueItem = async function(itemId) {
  playUiSound('pop');
  await fetch(`/api/queue/cancel/${itemId}`, { method: 'POST' });
};

function updateTaskStatus(itemId, statusClass, statusText, title, errorDetail) {
  let card = currentTasks[itemId];
  if (!card) return;

  card.className = `task-card glass-card status-${statusClass}`;
  const pill = card.querySelector('.task-status-pill');
  if (pill) pill.textContent = statusText;

  const titleEl = card.querySelector('.task-title');
  if (titleEl && title) titleEl.textContent = title;

  const fill = card.querySelector('.progress-bar-fill');
  const percentEl = card.querySelector('.task-percent');
  const metricsEl = card.querySelector('.task-metrics');

  if (statusClass === 'completed') {
    if (fill) fill.style.width = '100%';
    if (percentEl) percentEl.textContent = '100%';
    if (metricsEl) metricsEl.textContent = '✓';
  } else if (statusClass === 'skipped') {
    if (fill) fill.style.width = '100%';
    if (percentEl) percentEl.textContent = '⏭️';
    if (metricsEl) metricsEl.textContent = 'موجود مسبقاً';
  } else if (statusClass === 'cancelled') {
    if (metricsEl) metricsEl.textContent = 'تم الإلغاء من الطابور';
  } else if (statusClass === 'error') {
    if (metricsEl) metricsEl.textContent = errorDetail ? errorDetail.slice(0, 50) : 'خطأ';
    const retryBtn = card.querySelector('.task-retry-btn');
    if (retryBtn) retryBtn.classList.remove('hidden');
  } else {
    const retryBtn = card.querySelector('.task-retry-btn');
    if (retryBtn) retryBtn.classList.add('hidden');
  }
}

function updateTaskProgress(itemId, percent, speed, eta, statusText, title) {
  let card = currentTasks[itemId];
  if (!card) return;

  const fill = card.querySelector('.progress-bar-fill');
  const percentEl = card.querySelector('.task-percent');
  const metricsEl = card.querySelector('.task-metrics');
  const pill = card.querySelector('.task-status-pill');
  const titleEl = card.querySelector('.task-title');

  if (fill) fill.style.width = `${percent}%`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (titleEl && title) titleEl.textContent = title;

  let metricsStr = '';
  if (speed) metricsStr += `🚀 ${speed} `;
  if (eta) metricsStr += `⏳ ${eta}`;
  if (metricsEl) metricsEl.textContent = metricsStr;

  if (pill && statusText) {
    if (statusText.startsWith('processing')) pill.textContent = 'معالجة الغلاف والوسوم...';
    else if (statusText === 'converting') pill.textContent = 'تحويل الصيغة...';
    else pill.textContent = i18n[currentLang].status_downloading;
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'queued': return i18n[currentLang].status_queued;
    case 'downloading': return i18n[currentLang].status_downloading;
    case 'converting': return i18n[currentLang].status_converting;
    case 'completed': return i18n[currentLang].status_completed;
    case 'skipped': return i18n[currentLang].status_skipped;
    case 'cancelled': return i18n[currentLang].status_cancelled;
    default: return status;
  }
}

// --- Clipboard & Input Tools ---
btnPaste.addEventListener('click', async () => {
  playUiSound('pop');
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = (urlInput.value ? urlInput.value + '\n' : '') + text.trim();
      urlInput.focus();
    }
  } catch (err) {
    alert(currentLang === 'ar' ? 'يرجى لصق الرابط يدوياً داخل المربع.' : 'Please paste URL manually.');
  }
});

btnClear.addEventListener('click', () => {
  urlInput.value = '';
  urlInput.focus();
});

btnClearCompleted.addEventListener('click', async () => {
  playUiSound('pop');
  const finishedCards = tasksList.querySelectorAll('.status-completed, .status-skipped, .status-cancelled, .status-error');
  finishedCards.forEach(c => {
    const id = c.id.replace('task-', '');
    delete currentTasks[id];
    c.remove();
  });
  if (tasksList.children.length <= 1) {
    emptyTasks.style.display = 'block';
  }
  try {
    await fetch('/api/queue/clear-completed', { method: 'POST' });
  } catch (e) {}
});

// --- URL Analyzer & Playlist Range Picker ---
btnAnalyze.addEventListener('click', async () => {
  const rawUrls = urlInput.value.trim();
  if (!rawUrls) {
    alert(currentLang === 'ar' ? 'يرجى إدخال رابط يوتيوب أولاً.' : 'Please enter a YouTube link.');
    return;
  }

  playUiSound('pop');
  btnAnalyze.disabled = true;
  btnAnalyze.textContent = currentLang === 'ar' ? 'جاري الفحص...' : 'Analyzing...';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrls })
    });
    const result = await res.json();
    displayPreview(result);
  } catch (e) {
    alert('Analysis error');
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = i18n[currentLang].btn_analyze;
  }
});

function displayPreview(data) {
  previewList.innerHTML = '';
  previewDataList = [];
  previewCard.classList.remove('hidden');

  let totalItemsCount = 0;

  if (data.results) {
    data.results.forEach(r => {
      if (r.status === 'success' && r.data) {
        const item = r.data;
        if (item.is_playlist) {
          totalItemsCount += item.count;
          rangeSelectorRow.style.display = 'flex';
          rangeStart.value = 1;
          rangeEnd.value = item.count;
          playlistStatsBadge.textContent = `قائمة تشغيل: ${item.count} مقطع`;

          (item.entries || []).forEach((e, idx) => {
            previewDataList.push({ id: e.id, title: e.title, url: e.url, index: idx + 1 });
          });
        } else {
          totalItemsCount += 1;
          rangeSelectorRow.style.display = 'none';
          previewDataList.push({ id: item.id, title: item.title, url: item.url, index: 1 });
        }
      }
    });
  }

  renderPreviewItems();
}

function renderPreviewItems() {
  previewList.innerHTML = '';
  previewDataList.forEach((e) => {
    const row = document.createElement('div');
    row.className = 'preview-item-row';
    row.innerHTML = `
      <label class="preview-check-wrap">
        <input type="checkbox" class="preview-checkbox" data-url="${escapeHtml(e.url)}" checked />
        <span class="preview-index-tag">#${e.index}</span>
        <span class="preview-track-title">${escapeHtml(e.title)}</span>
      </label>
    `;
    previewList.appendChild(row);
  });
}

btnSelectAllPreview.addEventListener('click', () => {
  previewList.querySelectorAll('.preview-checkbox').forEach(cb => cb.checked = true);
});

btnDeselectAllPreview.addEventListener('click', () => {
  previewList.querySelectorAll('.preview-checkbox').forEach(cb => cb.checked = false);
});

btnApplyRange.addEventListener('click', () => {
  const start = parseInt(rangeStart.value, 10) || 1;
  const end = parseInt(rangeEnd.value, 10) || previewDataList.length;
  previewDataList.forEach((e, i) => {
    const cb = previewList.querySelectorAll('.preview-checkbox')[i];
    if (cb) cb.checked = (e.index >= start && e.index <= end);
  });
  playUiSound('pop');
});

btnClosePreview.addEventListener('click', () => {
  previewCard.classList.add('hidden');
});

btnDownloadSelected.addEventListener('click', () => {
  const selectedCbs = previewList.querySelectorAll('.preview-checkbox:checked');
  const selectedUrls = Array.from(selectedCbs).map(cb => cb.dataset.url);
  if (selectedUrls.length === 0) {
    alert(currentLang === 'ar' ? 'يرجى تحديد مقطع واحد على الأقل.' : 'Please select at least one track.');
    return;
  }
  startDownloadProcess(selectedUrls);
});

// --- Download Execution ---
btnDownload.addEventListener('click', () => {
  startDownloadProcess();
});

async function startDownloadProcess(specificUrls = null) {
  const rawUrls = urlInput.value.trim();
  if (!rawUrls && (!specificUrls || specificUrls.length === 0)) {
    alert(currentLang === 'ar' ? 'يرجى إدخال رابط يوتيوب أولاً.' : 'Please enter a YouTube link.');
    return;
  }

  playUiSound('pop');
  btnDownload.disabled = true;
  btnDownloadText.textContent = currentLang === 'ar' ? 'جاري الإضافة...' : 'Adding to Queue...';

  const selectedFormat = formatSelect.value;
  const selectedQuality = qualitySelect.value;
  const speedLimit = parseInt(speedLimitSelect.value, 10) || 0;

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: specificUrls ? specificUrls.join('\n') : rawUrls,
        quality: selectedQuality,
        audio_format: selectedFormat,
        embed_thumbnail: embedThumbnail.checked,
        embed_metadata: embedMetadata.checked,
        rate_limit_kbps: speedLimit > 0 ? speedLimit : null,
        folder: topFolderLabel.title || null
      })
    });

    if (res.ok) {
      btnDownloadText.textContent = i18n[currentLang].btn_download;
      previewCard.classList.add('hidden');
      urlInput.value = '';
    } else {
      const err = await res.json();
      alert(err.detail || 'Download error');
    }
  } catch (e) {
    alert('Connection error');
  } finally {
    btnDownload.disabled = false;
    btnDownloadText.textContent = i18n[currentLang].btn_download;
  }
}

// --- Schedule Modal Trigger ---
btnScheduleModal.addEventListener('click', () => {
  scheduleModalOverlay.classList.remove('hidden');
});

btnCloseScheduleModal.addEventListener('click', () => {
  scheduleModalOverlay.classList.add('hidden');
});

btnCancelSchedule.addEventListener('click', () => {
  scheduleModalOverlay.classList.add('hidden');
});

btnConfirmSchedule.addEventListener('click', async () => {
  const delayMin = parseInt(scheduleDelayMinutes.value, 10) || 60;
  const delaySec = delayMin * 60;
  const rawUrls = urlInput.value.trim();
  if (!rawUrls) {
    alert(currentLang === 'ar' ? 'يرجى إدخال روابط يوتيوب أولاً.' : 'Please enter links first.');
    return;
  }

  playUiSound('pop');
  try {
    const res = await fetch('/api/schedule-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delay_seconds: delaySec,
        download_request: {
          urls: rawUrls,
          quality: qualitySelect.value,
          audio_format: formatSelect.value,
          embed_thumbnail: embedThumbnail.checked,
          embed_metadata: embedMetadata.checked,
          rate_limit_kbps: parseInt(speedLimitSelect.value, 10) || null,
          folder: topFolderLabel.title || null
        }
      })
    });
    const data = await res.json();
    alert(data.message);
    scheduleModalOverlay.classList.add('hidden');
  } catch (e) {
    alert('Schedule error');
  }
});

// --- Search Handling ---
btnSearchGo.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  playUiSound('pop');
  btnSearchGo.disabled = true;
  btnSearchGo.innerHTML = `<span>⏳</span> <span>${currentLang === 'ar' ? 'جاري البحث...' : 'Searching...'}</span>`;

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, limit: 12 })
    });
    const data = await res.json();
    renderSearchResults(data.results || []);
  } catch (e) {
    alert('Search error');
  } finally {
    btnSearchGo.disabled = false;
    btnSearchGo.innerHTML = `<span>🔍</span> <span>${i18n[currentLang].btn_search_now}</span>`;
  }
}

function renderSearchResults(results) {
  searchResults.innerHTML = '';
  if (results.length === 0) {
    searchResults.innerHTML = `<div class="empty-search-state"><p>لم يتم العثور على نتائج</p></div>`;
    return;
  }

  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'search-result-card glass-card';
    card.innerHTML = `
      <img src="${r.thumbnail}" class="search-card-thumb" loading="lazy" />
      <div class="search-card-info">
        <h4 class="search-card-title" title="${escapeHtml(r.title)}">${escapeHtml(r.title)}</h4>
        <span class="search-card-uploader">${escapeHtml(r.uploader || '')}</span>
      </div>
      <button type="button" class="btn-action btn-mini-download hover-lift" onclick="downloadSingleDirect('${escapeHtml(r.url)}', '${escapeHtml(r.title)}')">
        <span>📥</span>
        <span>${currentLang === 'ar' ? 'تحميل' : 'Download'}</span>
      </button>
    `;
    searchResults.appendChild(card);
  });
}

window.downloadSingleDirect = async function(url, title) {
  playUiSound('pop');
  await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: url,
      quality: qualitySelect.value,
      audio_format: formatSelect.value,
      embed_thumbnail: true,
      embed_metadata: true,
      folder: topFolderLabel.title || null
    })
  });
  switchView('downloader');
};

// --- Library Handling (Filtering, Sorting, Tags, Boost, M3U) ---
async function fetchLibrary() {
  try {
    const res = await fetch(`/api/downloads?folder=${encodeURIComponent(topFolderLabel.title || '')}`);
    const data = await res.json();
    cachedLibraryFiles = data.files || [];
    window.cachedLibraryFiles = cachedLibraryFiles;
    renderLibrary();
    populateStudioSelects();
    if (typeof populateSyncFiles === 'function') populateSyncFiles();
  } catch (e) {}
}

btnRefreshLibrary.addEventListener('click', () => {
  playUiSound('pop');
  fetchLibrary();
});

btnExportM3U.addEventListener('click', async () => {
  playUiSound('pop');
  try {
    const res = await fetch('/api/export-m3u', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: topFolderLabel.title || null })
    });
    const data = await res.json();
    if (res.ok) {
      triggerConfetti();
      playUiSound('success');
      alert(currentLang === 'ar' ? `📜 تم تصدير قائمة التشغيل بنجاح:\n${data.file}` : `📜 Exported M3U Playlist:\n${data.file}`);
    }
  } catch (e) {
    alert('M3U export error');
  }
});

libraryFilterInput.addEventListener('input', renderLibrary);
librarySortSelect.addEventListener('change', renderLibrary);

function renderLibrary() {
  const filterText = (libraryFilterInput.value || '').toLowerCase();
  const sortMode = librarySortSelect.value;

  let filtered = cachedLibraryFiles.filter(f => f.name.toLowerCase().includes(filterText));

  filtered.sort((a, b) => {
    if (sortMode === 'date_desc') return b.modified - a.modified;
    if (sortMode === 'date_asc') return a.modified - b.modified;
    if (sortMode === 'name_asc') return a.name.localeCompare(b.name);
    if (sortMode === 'size_desc') return b.size_mb - a.size_mb;
    return 0;
  });

  libraryList.innerHTML = '';
  if (filtered.length === 0) {
    emptyLibrary.style.display = 'block';
    emptyLibrary.textContent = i18n[currentLang].empty_library;
    libraryList.appendChild(emptyLibrary);
    return;
  }

  emptyLibrary.style.display = 'none';
  filtered.forEach(f => {
    const row = document.createElement('div');
    row.className = 'library-item-card glass-card';
    const isRingtone = f.is_ringtone;
    const isVideo = f.is_video;
    const icon = isVideo ? '🎬' : (isRingtone ? '🔔' : '🎵');

    row.innerHTML = `
      <div class="library-item-left">
        <span class="file-type-icon">${icon}</span>
        <div class="file-details">
          <span class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
          <span class="file-size-label">${f.size_mb} MB</span>
        </div>
      </div>
      <div class="track-actions-cell">
        <button type="button" class="btn-mini-action" onclick="playAudioTrack('${escapeHtml(f.name)}')">▶️ تشغيل</button>
        <button type="button" class="btn-mini-action" title="تعديل الوسوم" onclick="openTagModal('${escapeHtml(f.name)}')">🏷️ ميتا</button>
        <button type="button" class="btn-mini-action" title="رفع وتضخيم الصوت" onclick="boostVolumeTrack('${escapeHtml(f.name)}')">🔊 +6dB</button>
        <button type="button" class="btn-mini-action" title="مزامنة مع مشغل النظام" onclick="syncSingleTrackToMusic('${escapeHtml(f.name)}')">🍎 مزامنة</button>
      </div>
    `;
    libraryList.appendChild(row);
  });
}

window.playAudioTrack = function(filename) {
  currentlyPlayingFile = filename;
  nowPlayingTitle.textContent = filename;
  playerWidget.classList.remove('hidden');

  const folder = topFolderLabel.title || '';
  globalAudioPlayer.src = `/api/audio/${encodeURIComponent(filename)}?folder=${encodeURIComponent(folder)}`;
  globalAudioPlayer.play();
  playUiSound('pop');
};

btnPlayerClose.addEventListener('click', () => {
  globalAudioPlayer.pause();
  playerWidget.classList.add('hidden');
});

btnPlayerAppleSync.addEventListener('click', () => {
  if (currentlyPlayingFile) syncSingleTrackToMusic(currentlyPlayingFile);
});

// --- ID3 Tag Editor Modal ---
window.openTagModal = async function(filename) {
  playUiSound('pop');
  tagEditFilename.value = filename;
  tagTitleInput.value = '';
  tagArtistInput.value = '';
  tagAlbumInput.value = '';
  tagYearInput.value = '';
  tagGenreInput.value = '';

  tagModalOverlay.classList.remove('hidden');

  try {
    const res = await fetch(`/api/tags?filename=${encodeURIComponent(filename)}&folder=${encodeURIComponent(topFolderLabel.title || '')}`);
    const data = await res.json();
    tagTitleInput.value = data.title || '';
    tagArtistInput.value = data.artist || '';
    tagAlbumInput.value = data.album || '';
    tagYearInput.value = data.year || '';
    tagGenreInput.value = data.genre || '';
  } catch (e) {}
};

btnCloseTagModal.addEventListener('click', () => tagModalOverlay.classList.add('hidden'));
btnCancelTagEdit.addEventListener('click', () => tagModalOverlay.classList.add('hidden'));

btnSaveTagEdit.addEventListener('click', async () => {
  playUiSound('pop');
  const filename = tagEditFilename.value;
  try {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        title: tagTitleInput.value,
        artist: tagArtistInput.value,
        album: tagAlbumInput.value,
        year: tagYearInput.value,
        genre: tagGenreInput.value,
        folder: topFolderLabel.title || null
      })
    });
    if (res.ok) {
      playUiSound('success');
      tagModalOverlay.classList.add('hidden');
      alert(currentLang === 'ar' ? '✓ تم حفظ وسوم الأغنية في الملف بنجاح!' : '✓ Tags saved successfully!');
    }
  } catch (e) {
    alert('Save tags error');
  }
});

window.boostVolumeTrack = async function(filename) {
  playUiSound('pop');
  try {
    const res = await fetch('/api/boost-volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        gain_db: 6.0,
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      alert(`🔊 ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Volume boost error');
  }
};

// --- Studio Tools Form Handlers ---
function populateStudioSelects() {
  const selects = [
    trimFileSelect, enhanceFileSelect, vocalFileSelect,
    pitchFileSelect, spatialFileSelect, eqFileSelect,
    silenceFileSelect, artFileSelect, syncFileSelect,
    stemsFileSelect, mergeFileSelect1, mergeFileSelect2,
    denoiseFileSelect, identifyFileSelect
  ];

  selects.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '';
    cachedLibraryFiles.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = f.name;
      sel.appendChild(opt);
    });
    if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
      sel.value = currentVal;
    }
  });
}

// 1. Trimmer
btnDoTrim.addEventListener('click', async () => {
  const filename = trimFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoTrim.disabled = true;
  btnDoTrim.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/trim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        start: parseFloat(trimStart.value) || 0,
        end: parseFloat(trimEnd.value) || 30,
        is_ringtone: trimIsRingtone.checked,
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`✂️ ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Trim error');
  } finally {
    btnDoTrim.disabled = false;
    btnDoTrim.innerHTML = `<span>✂️</span> <span>${i18n[currentLang].btn_trim_execute}</span>`;
  }
});

// 2. Enhancer
btnDoEnhance.addEventListener('click', async () => {
  const filename = enhanceFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoEnhance.disabled = true;
  btnDoEnhance.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        normalize: enhanceNorm.checked,
        bass_boost: enhanceBass.checked,
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🎛️ ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Enhance error');
  } finally {
    btnDoEnhance.disabled = false;
    btnDoEnhance.innerHTML = `<span>🎛️</span> <span>${i18n[currentLang].btn_enhance_execute}</span>`;
  }
});

// 3. Vocal Remover
btnDoVocalRemove.addEventListener('click', async () => {
  const filename = vocalFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoVocalRemove.disabled = true;
  btnDoVocalRemove.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/vocal-remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, folder: topFolderLabel.title || null })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🎤 ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Vocal remove error');
  } finally {
    btnDoVocalRemove.disabled = false;
    btnDoVocalRemove.innerHTML = `<span>🎤</span> <span>${i18n[currentLang].btn_vocal_execute}</span>`;
  }
});

// 4. Pitch & Speed
pitchSlider.addEventListener('input', () => {
  const val = parseInt(pitchSlider.value, 10);
  pitchValueLabel.textContent = val === 0 ? '0 (أصلي)' : `${val > 0 ? '+' : ''}${val} نصف تون`;
});
speedSlider.addEventListener('input', () => {
  speedValueLabel.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;
});

btnDoPitchSpeed.addEventListener('click', async () => {
  const filename = pitchFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoPitchSpeed.disabled = true;
  btnDoPitchSpeed.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/pitch-speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        pitch: parseFloat(pitchSlider.value),
        speed: parseFloat(speedSlider.value),
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🎼 ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Pitch/Speed error');
  } finally {
    btnDoPitchSpeed.disabled = false;
    btnDoPitchSpeed.innerHTML = `<span>🎵</span> <span>${i18n[currentLang].btn_pitch_execute}</span>`;
  }
});

// 5. 8D Spatial Audio
btnDoSpatial8D.addEventListener('click', async () => {
  const filename = spatialFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoSpatial8D.disabled = true;
  btnDoSpatial8D.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/spatial-8d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, folder: topFolderLabel.title || null })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🎧 ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('8D audio error');
  } finally {
    btnDoSpatial8D.disabled = false;
    btnDoSpatial8D.innerHTML = `<span>🎧</span> <span>${i18n[currentLang].btn_spatial_execute}</span>`;
  }
});

// 6. 10-Band Equalizer
btnDoEqualizer.addEventListener('click', async () => {
  const filename = eqFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoEqualizer.disabled = true;
  btnDoEqualizer.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/equalizer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        preset: eqPresetSelect.value,
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🎛️ ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Equalizer error');
  } finally {
    btnDoEqualizer.disabled = false;
    btnDoEqualizer.innerHTML = `<span>🎛️</span> <span>${i18n[currentLang].btn_eq_execute}</span>`;
  }
});

// 7. Silence Remover
btnDoSilenceRemove.addEventListener('click', async () => {
  const filename = silenceFileSelect.value;
  if (!filename) return;

  playUiSound('pop');
  btnDoSilenceRemove.disabled = true;
  btnDoSilenceRemove.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/remove-silence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, folder: topFolderLabel.title || null })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🤫 ${data.filename}`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Silence remove error');
  } finally {
    btnDoSilenceRemove.disabled = false;
    btnDoSilenceRemove.innerHTML = `<span>✂️</span> <span>${i18n[currentLang].btn_silence_execute}</span>`;
  }
});

// 8. Batch Converter
btnDoBatchConvert.addEventListener('click', async () => {
  playUiSound('pop');
  btnDoBatchConvert.disabled = true;
  btnDoBatchConvert.innerHTML = `<span>⏳</span> <span>...</span>`;

  try {
    const res = await fetch('/api/batch-convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_format: batchFormatSelect.value,
        bitrate: "320",
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🔄 تم تحويل ${data.converted} ملف بنجاح! (فشل: ${data.failed})`);
      fetchLibrary();
    }
  } catch (e) {
    alert('Batch convert error');
  } finally {
    btnDoBatchConvert.disabled = false;
    btnDoBatchConvert.innerHTML = `<span>🔄</span> <span>${i18n[currentLang].btn_convert_execute}</span>`;
  }
});

// 9. Album Art Replacer
btnDoReplaceArtwork.addEventListener('click', async () => {
  const filename = artFileSelect.value;
  const file = artImageInput.files[0];
  if (!filename || !file) {
    alert(currentLang === 'ar' ? 'يرجى اختيار ملف الصوت وصورة الغلاف.' : 'Please select audio file and cover image.');
    return;
  }

  playUiSound('pop');
  btnDoReplaceArtwork.disabled = true;
  btnDoReplaceArtwork.innerHTML = `<span>⏳</span> <span>...</span>`;

  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('image', file);
  if (topFolderLabel.title) formData.append('folder', topFolderLabel.title);

  try {
    const res = await fetch('/api/replace-artwork', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      alert(`🖼️ ${currentLang === 'ar' ? 'تم دمج صورة الغلاف بنجاح!' : 'Album art embedded successfully!'}`);
      artImageInput.value = '';
    }
  } catch (e) {
    alert('Artwork replace error');
  } finally {
    btnDoReplaceArtwork.disabled = false;
    btnDoReplaceArtwork.innerHTML = `<span>🖼️</span> <span>${i18n[currentLang].btn_art_execute}</span>`;
  }
});

// 10. Apple / System Media & Mobile Sync
async function syncSingleTrackToMusic(filename) {
  if (!filename) return;
  playUiSound('pop');
  const playlist = (syncPlaylistName && syncPlaylistName.value.trim()) ? syncPlaylistName.value.trim() : 'Mazekty';
  try {
    const res = await fetch('/api/sync-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename,
        playlist_name: playlist,
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      alert(`🍎 ${data.message || 'Synced to music playlist!'}`);
    } else {
      alert(data.detail || 'Could not sync');
    }
  } catch (e) {
    alert('Music sync error');
  }
}

btnSyncAppleMusic.addEventListener('click', () => {
  const filename = syncFileSelect.value;
  if (filename) syncSingleTrackToMusic(filename);
});

btnSyncAllAppleMusic.addEventListener('click', async () => {
  const playlist = (syncPlaylistName && syncPlaylistName.value.trim()) ? syncPlaylistName.value.trim() : 'Mazekty';
  const confirmPrompt = currentLang === 'ar'
    ? `هل تريد مزامنة جميع الملفات الصوتية في قائمة التشغيل "${playlist}" دفعة واحدة؟`
    : `Sync all audio files to playlist "${playlist}"?`;
  if (!confirm(confirmPrompt)) return;

  playUiSound('pop');
  btnSyncAllAppleMusic.disabled = true;
  const origHtml = btnSyncAllAppleMusic.innerHTML;
  btnSyncAllAppleMusic.innerHTML = `<span>⏳</span> <span>...</span>`;
  try {
    const res = await fetch('/api/sync-all-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlist_name: playlist,
        folder: topFolderLabel.title || null
      })
    });
    const data = await res.json();
    if (res.ok) {
      playUiSound('success');
      triggerConfetti();
      const msg = currentLang === 'ar'
        ? `🍎 تم بنجاح! تمت إضافة ${data.added_count} تراك إلى قائمة "${playlist}" (فشل: ${data.failed_count})`
        : `🍎 Added ${data.added_count} tracks to playlist "${playlist}" (failed: ${data.failed_count})`;
      alert(msg);
    }
  } catch (e) {
    alert('Batch sync error');
  } finally {
    btnSyncAllAppleMusic.disabled = false;
    btnSyncAllAppleMusic.innerHTML = origHtml;
  }
});

// Finder USB iOS Sync
if (btnSyncIosFinder) {
  btnSyncIosFinder.addEventListener('click', async () => {
    playUiSound('pop');
    btnSyncIosFinder.disabled = true;
    try {
      const devRes = await fetch('/api/sync/devices');
      const devData = await devRes.json();
      await fetch('/api/sync/trigger-ios', { method: 'POST' });

      if (devData.devices && devData.devices.length > 0) {
        const devNames = devData.devices.map(d => d.name).join(', ');
        alert(currentLang === 'ar'
          ? `📲 تم اكتشاف جهاز: ${devNames}\nجاري فتح نافذة Finder ومزامنة البلاي ليست مع الآيفون!`
          : `📲 Detected device: ${devNames}\nOpening Finder sync window!`);
      } else {
        alert(currentLang === 'ar'
          ? `📲 تم تحفيز نافذة Finder. قم بتوصيل الآيفون بكابل USB بالماك وستبدأ المزامنة الفورية!`
          : `📲 Finder sync activated. Connect your iPhone via USB cable to sync playlist!`);
      }
    } catch (e) {
      alert('iOS sync error');
    } finally {
      btnSyncIosFinder.disabled = false;
    }
  });
}

// Mobile QR AirSync Modal
let qrcodeObj = null;
async function openMobileSyncModal() {
  playUiSound('pop');
  mobileModalOverlay.classList.remove('hidden');
  qrcodeContainer.innerHTML = '<span style="color:#000; font-size: 0.88rem;">جاري إنشاء الرمز...</span>';

  try {
    const res = await fetch('/api/mobile/info');
    const data = await res.json();
    const mobileUrl = data.mobile_url;
    mobileUrlInput.value = mobileUrl;
    qrcodeContainer.innerHTML = '';

    if (window.QRCode) {
      qrcodeObj = new QRCode(qrcodeContainer, {
        text: mobileUrl,
        width: 170,
        height: 170,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrcodeContainer.innerHTML = `<a href="${mobileUrl}" target="_blank" style="color:#6366f1; font-weight:700;">${mobileUrl}</a>`;
    }
  } catch (e) {
    qrcodeContainer.innerHTML = '<span style="color:red;">Error loading Wi-Fi address</span>';
  }
}

if (btnOpenMobileSyncModal) btnOpenMobileSyncModal.addEventListener('click', openMobileSyncModal);
if (btnLibraryMobileSync) btnLibraryMobileSync.addEventListener('click', openMobileSyncModal);
if (btnCloseMobileModal) btnCloseMobileModal.addEventListener('click', () => mobileModalOverlay.classList.add('hidden'));
if (btnDoneMobileModal) btnDoneMobileModal.addEventListener('click', () => mobileModalOverlay.classList.add('hidden'));

if (btnCopyMobileUrl) {
  btnCopyMobileUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(mobileUrlInput.value);
    playUiSound('pop');
    alert(currentLang === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!');
  });
}

// ==========================================================================
// DEDICATED SYNC & TRANSFER TAB LOGIC (Mazekty Pro)
// ==========================================================================

const syncWifiStatusBadge = document.getElementById('syncWifiStatusBadge');
const syncWifiStatusText = document.getElementById('syncWifiStatusText');
const syncUsbStatusBadge = document.getElementById('syncUsbStatusBadge');
const syncUsbDot = document.getElementById('syncUsbDot');
const syncUsbStatusText = document.getElementById('syncUsbStatusText');

const btnSyncRefreshQr = document.getElementById('btnSyncRefreshQr');
const syncIpDropdown = document.getElementById('syncIpDropdown');
const syncTabQrContainer = document.getElementById('syncTabQrContainer');
const syncTabMobileUrl = document.getElementById('syncTabMobileUrl');
const btnSyncTabCopyUrl = document.getElementById('btnSyncTabCopyUrl');
const btnSyncTabOpenBrowser = document.getElementById('btnSyncTabOpenBrowser');
const btnSyncTabPing = document.getElementById('btnSyncTabPing');
const syncPingBtnText = document.getElementById('syncPingBtnText');
const syncPingFeedback = document.getElementById('syncPingFeedback');
const btnSyncTabDownloadZip = document.getElementById('btnSyncTabDownloadZip');

const tabSyncPlaylistName = document.getElementById('tabSyncPlaylistName');
const btnTabSyncAllMusic = document.getElementById('btnTabSyncAllMusic');
const tabSyncSingleFileSelect = document.getElementById('tabSyncSingleFileSelect');
const btnTabSyncSingleMusic = document.getElementById('btnTabSyncSingleMusic');
const tabSyncMusicFeedback = document.getElementById('tabSyncMusicFeedback');

const btnTabRefreshDevices = document.getElementById('btnTabRefreshDevices');
const tabSyncDevicesContainer = document.getElementById('tabSyncDevicesContainer');
const btnTabSyncFinderAction = document.getElementById('btnTabSyncFinderAction');
const btnGoToSyncTab = document.getElementById('btnGoToSyncTab');

let syncTabQrInstance = null;

async function loadSyncTabState(preferredIp = null) {
  if (!syncTabQrContainer) return;

  try {
    const url = preferredIp ? `/api/mobile/info?ip=${encodeURIComponent(preferredIp)}` : '/api/mobile/info';
    const res = await fetch(url);
    const data = await res.json();

    // Populate Network Interface Dropdown
    if (syncIpDropdown && data.available_ips) {
      const activeIp = preferredIp || data.local_ip;
      syncIpDropdown.innerHTML = '';
      data.available_ips.forEach(ip => {
        const opt = document.createElement('option');
        opt.value = ip;
        let label = `🌐 LAN (${ip})`;
        if (ip.startsWith('192.168.')) {
          label = `📶 Wi-Fi (${ip})`;
        } else if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(ip)) {
          label = `📶 Ethernet / LAN (${ip})`;
        } else if (ip.startsWith('10.128.') || ip.startsWith('10.64.') || ip.startsWith('100.')) {
          label = `🛡️ VPN / Tunnel (${ip})`;
        }
        opt.textContent = label;
        if (ip === activeIp) opt.selected = true;
        syncIpDropdown.appendChild(opt);
      });
    }

    const mobileUrl = data.mobile_url;
    if (syncTabMobileUrl) syncTabMobileUrl.value = mobileUrl;
    if (syncWifiStatusText) {
      syncWifiStatusText.textContent = `Wi-Fi: ${data.local_ip}:${data.port}`;
      if (syncWifiStatusBadge) {
        const dot = syncWifiStatusBadge.querySelector('.pill-dot');
        if (dot) dot.className = 'pill-dot active';
      }
    }

    // Render High-Resolution QR Code
    syncTabQrContainer.innerHTML = '';
    if (window.QRCode) {
      syncTabQrInstance = new QRCode(syncTabQrContainer, {
        text: mobileUrl,
        width: 190,
        height: 190,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      syncTabQrContainer.innerHTML = `<a href="${mobileUrl}" target="_blank" style="color:#6366f1; font-weight:700; font-size:1.1rem;">${mobileUrl}</a>`;
    }
  } catch (err) {
    console.error('Error loading mobile sync info:', err);
    if (syncTabQrContainer) {
      syncTabQrContainer.innerHTML = '<span style="color:#ef4444; font-size:0.85rem;">تعذر جلب عنوان الشبكة. تحقق من اتصال الواي فاي.</span>';
    }
  }

  // Also refresh connected devices & populate track dropdown
  await refreshSyncDevices();
  populateSyncFiles();
}

// IP selector change
if (syncIpDropdown) {
  syncIpDropdown.addEventListener('change', () => {
    playUiSound('pop');
    loadSyncTabState(syncIpDropdown.value);
  });
}

// Refresh QR Code button
if (btnSyncRefreshQr) {
  btnSyncRefreshQr.addEventListener('click', () => {
    playUiSound('pop');
    loadSyncTabState(syncIpDropdown ? syncIpDropdown.value : null);
  });
}

// Copy Mobile URL
if (btnSyncTabCopyUrl) {
  btnSyncTabCopyUrl.addEventListener('click', () => {
    if (!syncTabMobileUrl || !syncTabMobileUrl.value) return;
    navigator.clipboard.writeText(syncTabMobileUrl.value);
    playUiSound('pop');
    alert(currentLang === 'ar' ? 'تم نسخ رابط الآيفون بنجاح!' : 'iPhone link copied to clipboard!');
  });
}

// Open Mobile URL in Browser
if (btnSyncTabOpenBrowser) {
  btnSyncTabOpenBrowser.addEventListener('click', () => {
    if (!syncTabMobileUrl || !syncTabMobileUrl.value) return;
    playUiSound('pop');
    window.open(syncTabMobileUrl.value, '_blank');
  });
}

// Ping connectivity test
if (btnSyncTabPing) {
  btnSyncTabPing.addEventListener('click', async () => {
    playUiSound('pop');
    if (syncPingBtnText) syncPingBtnText.textContent = '...';
    const t0 = performance.now();
    try {
      const res = await fetch('/api/mobile/info');
      const t1 = performance.now();
      const ms = Math.round(t1 - t0);
      if (res.ok) {
        syncPingFeedback.className = 'sync-ping-feedback';
        syncPingFeedback.classList.remove('hidden');
        syncPingFeedback.textContent = currentLang === 'ar'
          ? `✓ السيرفر يستجيب بسرعة فائقة (${ms}ms) - جاهز للبث والمزامنة مع الآيفون على شبكة Wi-Fi!`
          : `✓ Server responding rapidly (${ms}ms) - Ready for iPhone AirSync!`;
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      syncPingFeedback.className = 'sync-ping-feedback error';
      syncPingFeedback.classList.remove('hidden');
      syncPingFeedback.textContent = currentLang === 'ar'
        ? '⚠️ تعذر الاتصال بالسيرفر. تأكد من تشغيل التطبيق.'
        : '⚠️ Could not connect to server.';
    } finally {
      if (syncPingBtnText) syncPingBtnText.textContent = i18n[currentLang].btn_ping || 'فحص';
    }
  });
}

// 1-Tap ZIP Download
if (btnSyncTabDownloadZip) {
  btnSyncTabDownloadZip.addEventListener('click', () => {
    playUiSound('pop');
    window.location.href = '/api/mobile/download-zip';
  });
}

// Quick suggestions tags for Playlist Name
document.querySelectorAll('.quick-tag-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    playUiSound('pop');
    const name = chip.dataset.name;
    if (name && tabSyncPlaylistName) {
      tabSyncPlaylistName.value = name;
    }
  });
});

// Sync All tracks to Apple Music + Playlist
if (btnTabSyncAllMusic) {
  btnTabSyncAllMusic.addEventListener('click', async () => {
    const playlist = (tabSyncPlaylistName && tabSyncPlaylistName.value.trim()) || "Mazekty";
    playUiSound('pop');
    btnTabSyncAllMusic.disabled = true;
    const origText = btnTabSyncAllMusic.innerHTML;
    btnTabSyncAllMusic.innerHTML = '<span>⏳</span> <span>جاري إضافة الأغاني وإنشاء القائمة...</span>';

    try {
      const res = await fetch('/api/sync/apple-music-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_name: playlist })
      });
      const data = await res.json();
      if (res.ok) {
        playUiSound('success');
        triggerConfetti();
        if (tabSyncMusicFeedback) {
          tabSyncMusicFeedback.className = 'sync-feedback-box';
          tabSyncMusicFeedback.classList.remove('hidden');
          tabSyncMusicFeedback.textContent = currentLang === 'ar'
            ? `🍎 تم بنجاح! تمت إضافة ${data.added_count} تراك إلى قائمة "${playlist}" في Apple Music.`
            : `🍎 Successfully added ${data.added_count} tracks to playlist "${playlist}".`;
        }
      } else {
        throw new Error(data.detail || 'Sync failed');
      }
    } catch (e) {
      if (tabSyncMusicFeedback) {
        tabSyncMusicFeedback.className = 'sync-feedback-box error';
        tabSyncMusicFeedback.classList.remove('hidden');
        tabSyncMusicFeedback.textContent = e.message || 'فشلت المزامنة';
      }
    } finally {
      btnTabSyncAllMusic.disabled = false;
      btnTabSyncAllMusic.innerHTML = origText;
    }
  });
}

// Populate single track selector
function populateSyncFiles() {
  if (!tabSyncSingleFileSelect) return;
  tabSyncSingleFileSelect.innerHTML = `<option value="">${i18n[currentLang].select_file_placeholder || '-- اختر ملفاً صوتياً --'}</option>`;
  if (window.cachedLibraryFiles && window.cachedLibraryFiles.length > 0) {
    window.cachedLibraryFiles.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = `🎵 ${f.name}`;
      tabSyncSingleFileSelect.appendChild(opt);
    });
  }
}

// Sync single track
if (btnTabSyncSingleMusic) {
  btnTabSyncSingleMusic.addEventListener('click', async () => {
    const filename = tabSyncSingleFileSelect ? tabSyncSingleFileSelect.value : '';
    if (!filename) {
      alert(currentLang === 'ar' ? 'يرجى اختيار ملف صوتي أولاً!' : 'Please select an audio file first!');
      return;
    }
    const playlist = (tabSyncPlaylistName && tabSyncPlaylistName.value.trim()) || "Mazekty";
    playUiSound('pop');
    btnTabSyncSingleMusic.disabled = true;

    try {
      const res = await fetch('/api/sync/apple-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename, playlist_name: playlist })
      });
      const data = await res.json();
      if (res.ok) {
        playUiSound('success');
        if (tabSyncMusicFeedback) {
          tabSyncMusicFeedback.className = 'sync-feedback-box';
          tabSyncMusicFeedback.classList.remove('hidden');
          tabSyncMusicFeedback.textContent = currentLang === 'ar'
            ? `🍎 تمت إضافة "${filename}" إلى قائمة "${playlist}" بنجاح!`
            : `🍎 Added "${filename}" to playlist "${playlist}"!`;
        }
      } else {
        throw new Error(data.detail || 'Sync failed');
      }
    } catch (e) {
      if (tabSyncMusicFeedback) {
        tabSyncMusicFeedback.className = 'sync-feedback-box error';
        tabSyncMusicFeedback.classList.remove('hidden');
        tabSyncMusicFeedback.textContent = e.message || 'فشلت المزامنة';
      }
    } finally {
      btnTabSyncSingleMusic.disabled = false;
    }
  });
}

// Hardware device scanner
let isRefreshingDevices = false;
let lastRenderedDevicesKey = null;

async function refreshSyncDevices(force = false) {
  if (!tabSyncDevicesContainer || isRefreshingDevices) return;
  isRefreshingDevices = true;
  try {
    const res = await fetch('/api/sync/devices');
    const data = await res.json();
    const devices = data.devices || [];

    const currentKey = JSON.stringify(devices.map(d => ({ id: d.id, status: d.status, model: d.model, can_adb: d.can_adb_sync })));
    if (!force && currentKey === lastRenderedDevicesKey && tabSyncDevicesContainer.children.length > 0) {
      return;
    }
    lastRenderedDevicesKey = currentKey;

    if (syncUsbStatusText && syncUsbDot) {
      if (devices.length > 0) {
        const iosDevs = devices.filter(d => d.platform === 'ios');
        const androidDevs = devices.filter(d => d.platform === 'android');
        if (iosDevs.length > 0 && androidDevs.length > 0) {
          syncUsbStatusText.textContent = `USB: 🍏 Apple (${iosDevs.length}) + 🤖 Android (${androidDevs.length}) ✓`;
        } else if (androidDevs.length > 0) {
          syncUsbStatusText.textContent = `Android: ${androidDevs[0].model || androidDevs[0].name} ✓`;
        } else {
          syncUsbStatusText.textContent = `Apple: ${iosDevs[0].model || iosDevs[0].name} ✓`;
        }
        syncUsbDot.className = 'pill-dot active';
      } else {
        syncUsbStatusText.textContent = currentLang === 'ar' ? 'USB: لا يوجد جهاز متصل' : 'USB: No device connected';
        syncUsbDot.className = 'pill-dot';
      }
    }

    tabSyncDevicesContainer.innerHTML = '';
    if (devices.length > 0) {
      devices.forEach(d => {
        const isAndroid = d.platform === 'android';
        const icon = isAndroid ? '🤖' : '🍏';
        const isAdb = isAndroid && d.can_adb_sync;
        const div = document.createElement('div');
        div.className = 'sync-device-card connected';

        const platformDesc = isAndroid
          ? `${d.manufacturer || 'Android'} ${d.serial ? `• SN: ${d.serial}` : ''} • USB-C Cable ${isAdb ? '(ADB Active ✓)' : '(USB MTP ✓)'}`
          : `${d.manufacturer || 'Apple Inc.'} ${d.serial ? `• SN: ${d.serial}` : ''} • USB-C / Lightning Cable ✓`;

        const btnText = isAndroid
          ? (currentLang === 'ar' ? 'نقل لهاتف الأندرويد' : 'Sync to Android')
          : (currentLang === 'ar' ? 'مزامنة مع Apple Music' : 'Sync to Apple Music');

        div.innerHTML = `
          <span class="device-icon">${icon}</span>
          <div class="device-info flex-1">
            <strong>${d.model || d.name} ${d.ios_version ? `(${d.ios_version})` : ''}</strong>
            <span>${platformDesc}</span>
          </div>
          <button type="button" class="primary-btn hover-glow sync-device-now-btn" style="padding: 8px 14px; font-size: 0.82rem; white-space: nowrap;">
            <span>⚡</span>
            <span>${btnText}</span>
          </button>
        `;
        const actionBtn = div.querySelector('.sync-device-now-btn');
        if (actionBtn) {
          actionBtn.addEventListener('click', () => {
            if (isAndroid) {
              syncToAndroidDevice(d.id);
            } else {
              if (btnTabSyncAllMusic) btnTabSyncAllMusic.click();
              setTimeout(() => {
                if (btnTabSyncFinderAction) btnTabSyncFinderAction.click();
              }, 1200);
            }
          });
        }
        tabSyncDevicesContainer.appendChild(div);
      });
    } else {
      tabSyncDevicesContainer.innerHTML = `
        <div class="sync-device-card placeholder">
          <span class="device-icon">🔌</span>
          <div class="device-info">
            <strong>${currentLang === 'ar' ? 'لم يتم كشف هاتف (iPhone أو Android) متصل عبر كابل' : 'No iPhone or Android phone detected via USB cable'}</strong>
            <span>${currentLang === 'ar' ? 'قم بتوصيل هاتفك بالكمبيوتر بكابل واضغط "سماح / وثوق"، أو استخدم AirSync اللاسلكي أعلاه للمزامنة بدون أسلاك.' : 'Connect your phone with a USB cable and tap "Trust / Allow", or use AirSync wireless above.'}</span>
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.error('Device scan error:', e);
  } finally {
    isRefreshingDevices = false;
  }
}

async function syncToAndroidDevice(deviceId) {
  playUiSound('pop');
  const playlistInput = document.getElementById('tabSyncPlaylistName');
  const playlistName = playlistInput ? playlistInput.value.trim() : 'Mazekty';
  const feedbackEl = document.getElementById('tabSyncMusicFeedback');
  if (feedbackEl) {
    feedbackEl.className = 'sync-feedback-box info';
    feedbackEl.textContent = currentLang === 'ar'
      ? '⏳ جاري فحص ونقل المقاطع الصوتية إلى هاتف الأندرويد...'
      : '⏳ Syncing audio tracks to connected Android device...';
    feedbackEl.classList.remove('hidden');
  }
  try {
    const res = await fetch('/api/sync/trigger-android', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, playlist_name: playlistName })
    });
    const data = await res.json();
    if (data.success) {
      playUiSound('success');
      if (feedbackEl) {
        feedbackEl.className = 'sync-feedback-box success';
        feedbackEl.textContent = `✓ ${data.message}`;
      }
      alert(`🤖 Android Sync:\n${data.message}`);
    } else {
      playUiSound('error');
      if (feedbackEl) {
        feedbackEl.className = 'sync-feedback-box error';
        feedbackEl.textContent = `⚠️ ${data.message}`;
      }
      alert(`⚠️ Android Sync:\n${data.message}`);
    }
  } catch (err) {
    playUiSound('error');
    if (feedbackEl) {
      feedbackEl.className = 'sync-feedback-box error';
      feedbackEl.textContent = `⚠️ Error: ${err.message}`;
    }
    alert(`⚠️ Android Sync Error: ${err.message}`);
  }
}

const btnTabSyncAndroidAction = document.getElementById('btnTabSyncAndroidAction');
if (btnTabSyncAndroidAction) {
  btnTabSyncAndroidAction.addEventListener('click', () => {
    syncToAndroidDevice(null);
  });
}

// Auto-poll connected devices periodically when on sync tab and window is active
setInterval(() => {
  if (activeView === 'sync' && !document.hidden && !isRefreshingDevices) {
    refreshSyncDevices(false);
  }
}, 6000);

if (btnTabRefreshDevices) {
  btnTabRefreshDevices.addEventListener('click', () => {
    playUiSound('pop');
    refreshSyncDevices(true);
  });
}

// Finder sync button
if (btnTabSyncFinderAction) {
  btnTabSyncFinderAction.addEventListener('click', async () => {
    playUiSound('pop');
    btnTabSyncFinderAction.disabled = true;
    try {
      const devRes = await fetch('/api/sync/devices');
      const devData = await devRes.json();
      await fetch('/api/sync/trigger-ios', { method: 'POST' });

      if (devData.devices && devData.devices.length > 0) {
        const names = devData.devices.map(d => d.name).join(', ');
        alert(currentLang === 'ar'
          ? `📲 تم كشف جهاز: ${names}\nتم فتح نافذة Finder. اختر جهازك واضغط على Sync لنقل البلاي ليست!`
          : `📲 Detected device: ${names}\nFinder opened! Select device and sync playlist!`);
      } else {
        alert(currentLang === 'ar'
          ? `📲 تم فتح Finder. صل الآيفون بالماك واضغط زر مزامنة الموسيقى.`
          : `📲 Finder opened. Connect iPhone and sync music.`);
      }
    } catch (e) {
      alert('Finder error');
    } finally {
      btnTabSyncFinderAction.disabled = false;
    }
  });
}

// Shortcut from Studio Tool 10 to dedicated Sync tab
if (btnGoToSyncTab) {
  btnGoToSyncTab.addEventListener('click', () => {
    playUiSound('pop');
    switchView('sync');
  });
}

// Also cache library files when fetched
const originalFetchLibrary = window.fetchLibrary;


// --- Folder Management ---
btnQuickFolder.addEventListener('click', pickFolderDialog);
btnSettingsBrowseFolder.addEventListener('click', pickFolderDialog);
btnOpenSidebarFolder.addEventListener('click', openCurrentFolder);
btnOpenLibraryFolder.addEventListener('click', openCurrentFolder);

async function pickFolderDialog() {
  playUiSound('pop');
  try {
    const res = await fetch('/api/select-folder', { method: 'POST' });
    const data = await res.json();
    if (data.folder) {
      topFolderLabel.textContent = data.folder.split(/[\\/]/).pop() || data.folder;
      topFolderLabel.title = data.folder;
      settingsFolderInput.value = data.folder;
      fetchLibrary();
    }
  } catch (e) {}
}

async function openCurrentFolder() {
  playUiSound('pop');
  await fetch('/api/open-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: topFolderLabel.title || null })
  });
}

// --- Config Management ---
async function saveConfigToServer(updates) {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch (e) {}
}

function applyServerConfig(cfg) {
  if (cfg.download_folder) {
    topFolderLabel.textContent = cfg.download_folder.split(/[\\/]/).pop() || cfg.download_folder;
    topFolderLabel.title = cfg.download_folder;
    settingsFolderInput.value = cfg.download_folder;
  }
  if (cfg.theme_mode || cfg.theme_accent) {
    applyTheme(cfg.theme_mode, cfg.theme_accent);
  }
  if (cfg.language && cfg.language !== currentLang) {
    setLanguage(cfg.language);
  }
  if (cfg.os_name && osBadgeLabel) {
    osBadgeLabel.textContent = `${cfg.os_name} | 100% Local FFmpeg`;
  }
}

// Helper
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}


// ==========================================================================
// NEW FEATURES SUITE (Mazekty Pro v2.5)
// ==========================================================================

// 1. Platform Filter Chips
if (platformChips && platformChips.length > 0) {
  platformChips.forEach(chip => {
    chip.addEventListener('click', () => {
      platformChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      playUiSound('pop');

      const platform = chip.dataset.platform;
      if (urlInput) {
        if (platform === 'youtube') {
          urlInput.placeholder = 'https://www.youtube.com/watch?v=... أو رابط قناة كاملة /@channel';
        } else if (platform === 'soundcloud') {
          urlInput.placeholder = 'https://soundcloud.com/artist/track أو رابط ألبوم ساوند كلاود...';
        } else if (platform === 'spotify') {
          urlInput.placeholder = 'https://open.spotify.com/track/... أو رابط ألبوم أو قائمة سبوتيفاي...';
        } else {
          urlInput.placeholder = 'انسخ وألصق روابط يوتيوب، ساوند كلاود، سبوتيفاي، أو أبل ميوزك...';
        }
      }
    });
  });
}

// 2. Retry Queue & Modal Handlers
let autoRetryCount = 0;
let lastAutoRetryTime = 0;

function checkAutoRetryAtEnd() {
  if (!autoRetryFailedToggle || !autoRetryFailedToggle.checked) return;
  const now = Date.now();
  if (now - lastAutoRetryTime < 5000) return;
  if (stats.in_progress === 0 && stats.failed > 0 && autoRetryCount < 2) {
    autoRetryCount++;
    lastAutoRetryTime = now;
    fetch('/api/queue/retry-failed', { method: 'POST' }).then(() => {
      playUiSound('pop');
    }).catch(() => {});
  }
}

if (btnRetryFailed) {
  btnRetryFailed.addEventListener('click', async () => {
    playUiSound('pop');
    try {
      const res = await fetch('/api/queue/retry-failed', { method: 'POST' });
      const data = await res.json();
      if (data.retried_count > 0) {
        triggerConfetti();
      }
    } catch (e) {}
  });
}

window.openRetryModal = function(itemId, title) {
  playUiSound('pop');
  if (retryItemId) retryItemId.value = itemId;
  if (retryTrackTitleText) retryTrackTitleText.textContent = title ? `المقطع: ${title}` : 'اختر صيغة أو جودة بديلة للتحميل:';
  if (retryModalOverlay) retryModalOverlay.classList.remove('hidden');
};

if (btnCloseRetryModal) btnCloseRetryModal.addEventListener('click', () => retryModalOverlay.classList.add('hidden'));
if (btnCancelRetryModal) btnCancelRetryModal.addEventListener('click', () => retryModalOverlay.classList.add('hidden'));

if (btnConfirmRetrySingle) {
  btnConfirmRetrySingle.addEventListener('click', async () => {
    const itemId = retryItemId ? retryItemId.value : '';
    if (!itemId) return;
    const newFormat = retryFormatSelect ? retryFormatSelect.value : 'mp3';
    const newQuality = retryQualitySelect ? retryQualitySelect.value : '192';

    playUiSound('pop');
    btnConfirmRetrySingle.disabled = true;
    try {
      const res = await fetch('/api/queue/retry-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          new_format: newFormat,
          new_quality: newQuality
        })
      });
      if (res.ok) {
        if (retryModalOverlay) retryModalOverlay.classList.add('hidden');
      }
    } catch (e) {} finally {
      btnConfirmRetrySingle.disabled = false;
    }
  });
}

// 3. Smart Clipboard Auto-Monitor
let lastCopiedUrl = '';
let clipboardPollTimer = null;

function initClipboardMonitor() {
  try {
    const saved = localStorage.getItem('mazekty_clipboard_monitor');
    if (saved !== null && clipboardMonitorToggle) {
      clipboardMonitorToggle.checked = (saved === 'true');
    }
  } catch (e) {}

  if (clipboardMonitorToggle) {
    clipboardMonitorToggle.addEventListener('change', () => {
      try {
        localStorage.setItem('mazekty_clipboard_monitor', clipboardMonitorToggle.checked);
      } catch (e) {}
    });
  }

  clipboardPollTimer = setInterval(async () => {
    if (!clipboardMonitorToggle || !clipboardMonitorToggle.checked) return;
    if (!document.hasFocus()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text || typeof text !== 'string') return;
      const trimmed = text.trim();
      if (trimmed === lastCopiedUrl) return;

      const isMediaUrl = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|soundcloud\.com|open\.spotify\.com|music\.apple\.com)\S+/i.test(trimmed);
      if (isMediaUrl) {
        lastCopiedUrl = trimmed;
        if (clipboardToastUrl) clipboardToastUrl.textContent = trimmed.length > 55 ? trimmed.substring(0, 52) + '...' : trimmed;
        if (clipboardToast) {
          clipboardToast.classList.remove('hidden');
          playUiSound('pop');
        }
      }
    } catch (e) {}
  }, 2500);
}

if (btnClipboardDismiss) {
  btnClipboardDismiss.addEventListener('click', () => {
    if (clipboardToast) clipboardToast.classList.add('hidden');
  });
}

if (btnClipboardAdd) {
  btnClipboardAdd.addEventListener('click', () => {
    if (clipboardToast) clipboardToast.classList.add('hidden');
    if (lastCopiedUrl && urlInput) {
      urlInput.value = lastCopiedUrl;
      switchView('downloader');
      startDownloadProcess();
    }
  });
}

// 4. Synced Karaoke Lyrics (.lrc)
let parsedLyrics = [];
let currentLyricsRaw = '';

if (btnPlayerLyrics) {
  btnPlayerLyrics.addEventListener('click', () => {
    playUiSound('pop');
    if (!lyricsDrawer) return;
    const isHidden = lyricsDrawer.classList.contains('hidden');
    if (isHidden) {
      lyricsDrawer.classList.remove('hidden');
      loadLyricsForCurrentSong();
    } else {
      lyricsDrawer.classList.add('hidden');
    }
  });
}

if (btnCloseLyrics) {
  btnCloseLyrics.addEventListener('click', () => {
    if (lyricsDrawer) lyricsDrawer.classList.add('hidden');
  });
}

async function loadLyricsForCurrentSong() {
  if (!currentlyPlayingFile || !lyricsContainer) return;
  const cleanTitle = currentlyPlayingFile.replace(/\.[a-zA-Z0-9]+$/, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();

  if (lyricsTrackTitle) lyricsTrackTitle.textContent = cleanTitle;
  if (lyricsArtistName) lyricsArtistName.textContent = i18n[currentLang].lyrics_loading || 'جاري جلب الكلمات...';
  lyricsContainer.innerHTML = `<div class="lyrics-loading">${i18n[currentLang].lyrics_loading || 'جاري جلب الكلمات...'}</div>`;

  try {
    const res = await fetch(`/api/lyrics?title=${encodeURIComponent(cleanTitle)}`);
    const data = await res.json();
    if (data.success && data.lyrics) {
      currentLyricsRaw = data.lyrics;
      if (lyricsArtistName) lyricsArtistName.textContent = data.synced ? `✓ ${i18n[currentLang].lyrics_synced || 'متزامن كاريوكي'}` : (i18n[currentLang].lyrics_plain || 'كلمات نصية');
      renderLyrics(data.lyrics, data.synced);
    } else {
      currentLyricsRaw = '';
      if (lyricsArtistName) lyricsArtistName.textContent = '-';
      lyricsContainer.innerHTML = `<div class="lyrics-empty">${i18n[currentLang].lyrics_not_found || 'لم يتم العثور على كلمات متزامنة لهذا التراك.'}</div>`;
    }
  } catch (e) {
    lyricsContainer.innerHTML = `<div class="lyrics-empty">خطأ أثناء جلب الكلمات.</div>`;
  }
}

function parseLrc(lrcText) {
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  lines.forEach(line => {
    const matches = [...line.matchAll(timeRegex)];
    const text = line.replace(timeRegex, '').trim();
    if (matches.length > 0 && text) {
      matches.forEach(m => {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const totalSec = min * 60 + sec + ms / 1000;
        result.push({ time: totalSec, text });
      });
    }
  });

  return result.sort((a, b) => a.time - b.time);
}

function renderLyrics(lyricsText, isSynced) {
  if (!lyricsContainer) return;
  lyricsContainer.innerHTML = '';

  if (isSynced) {
    parsedLyrics = parseLrc(lyricsText);
    parsedLyrics.forEach((item, idx) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lyrics-line';
      lineDiv.dataset.idx = idx;
      lineDiv.dataset.time = item.time;
      lineDiv.textContent = item.text;
      lineDiv.addEventListener('click', () => {
        if (globalAudioPlayer) {
          globalAudioPlayer.currentTime = item.time;
        }
      });
      lyricsContainer.appendChild(lineDiv);
    });
  } else {
    parsedLyrics = [];
    const p = document.createElement('div');
    p.style.whiteSpace = 'pre-wrap';
    p.style.lineHeight = '1.8';
    p.style.fontSize = '0.95rem';
    p.style.color = 'var(--text-secondary)';
    p.textContent = lyricsText;
    lyricsContainer.appendChild(p);
  }
}

// Sync lyrics scroll with audio playback
if (globalAudioPlayer) {
  globalAudioPlayer.addEventListener('timeupdate', () => {
    if (!parsedLyrics || parsedLyrics.length === 0 || !lyricsDrawer || lyricsDrawer.classList.contains('hidden')) return;
    const curTime = globalAudioPlayer.currentTime;
    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (curTime >= parsedLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    const allLines = lyricsContainer.querySelectorAll('.lyrics-line');
    allLines.forEach((l, idx) => {
      if (idx === activeIdx) {
        if (!l.classList.contains('active')) {
          l.classList.add('active');
          l.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        l.classList.remove('active');
      }
    });
  });
}

// Save .lrc file button
if (btnSaveLrc) {
  btnSaveLrc.addEventListener('click', async () => {
    if (!currentlyPlayingFile || !currentLyricsRaw) return;
    playUiSound('pop');
    try {
      const res = await fetch('/api/lyrics/save-lrc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: currentlyPlayingFile,
          lyrics_content: currentLyricsRaw,
          folder: topFolderLabel ? topFolderLabel.title : null
        })
      });
      if (res.ok) {
        playUiSound('success');
        alert(i18n[currentLang].lrc_saved || 'تم حفظ ملف الكلمات بنجاح!');
      }
    } catch (e) {}
  });
}

// 5. Live Neon Spectrum Visualizer
let visAudioCtx = null;
let analyserNode = null;
let audioSourceNode = null;
let visualizerAnimId = null;

function initAudioContext() {
  if (analyserNode) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    visAudioCtx = new AudioContextClass();
    analyserNode = visAudioCtx.createAnalyser();
    analyserNode.fftSize = 128;

    if (globalAudioPlayer) {
      audioSourceNode = visAudioCtx.createMediaElementSource(globalAudioPlayer);
      audioSourceNode.connect(analyserNode);
      analyserNode.connect(visAudioCtx.destination);
    }
  } catch (e) {
    console.warn('[Visualizer] Web Audio init error:', e);
  }
}

function startVisualizerLoop() {
  if (!spectrumCanvas || !analyserNode) return;
  const ctx = spectrumCanvas.getContext('2d');
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function renderFrame() {
    visualizerAnimId = requestAnimationFrame(renderFrame);
    analyserNode.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);

    const mode = visModeSelect ? visModeSelect.value : 'bars';
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;

    if (mode === 'bars') {
      const barWidth = (width / bufferLength) * 2.2;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.85;

        const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#3b82f6');

        ctx.fillStyle = grad;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#8b5cf6';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, height - barHeight, barWidth - 3, barHeight, [4, 4, 0, 0]);
        } else {
          ctx.rect(x, height - barHeight, barWidth - 3, barHeight);
        }
        ctx.fill();
        x += barWidth;
      }
    } else if (mode === 'wave') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    } else if (mode === 'circle') {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 50;

      ctx.save();
      ctx.translate(centerX, centerY);
      for (let i = 0; i < bufferLength; i++) {
        const rad = (i / bufferLength) * 2 * Math.PI;
        const barLen = (dataArray[i] / 255) * 60;
        const x1 = Math.cos(rad) * radius;
        const y1 = Math.sin(rad) * radius;
        const x2 = Math.cos(rad) * (radius + barLen);
        const y2 = Math.sin(rad) * (radius + barLen);

        ctx.strokeStyle = `hsl(${(i * 5) % 360}, 90%, 65%)`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsl(${(i * 5) % 360}, 90%, 65%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderFrame();
}

if (btnPlayerVisualizer) {
  btnPlayerVisualizer.addEventListener('click', () => {
    playUiSound('pop');
    initAudioContext();
    if (visAudioCtx && visAudioCtx.state === 'suspended') {
      visAudioCtx.resume();
    }
    if (visualizerOverlay) {
      visualizerOverlay.classList.remove('hidden');
      startVisualizerLoop();
    }
  });
}

if (btnCloseVisualizer) {
  btnCloseVisualizer.addEventListener('click', () => {
    if (visualizerAnimId) cancelAnimationFrame(visualizerAnimId);
    if (visualizerOverlay) visualizerOverlay.classList.add('hidden');
  });
}

// 6. Smart Sleep Timer
let sleepTimerId = null;
let sleepEndTime = null;

if (btnPlayerSleepTimer) {
  btnPlayerSleepTimer.addEventListener('click', () => {
    playUiSound('pop');
    if (sleepTimerModal) sleepTimerModal.classList.remove('hidden');
  });
}

if (btnCloseSleepTimer) {
  btnCloseSleepTimer.addEventListener('click', () => {
    if (sleepTimerModal) sleepTimerModal.classList.add('hidden');
  });
}

if (sleepOptionBtns && sleepOptionBtns.length > 0) {
  sleepOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      playUiSound('pop');
      const mins = parseInt(btn.dataset.minutes, 10);
      if (mins === 0) {
        if (sleepTimerId) clearInterval(sleepTimerId);
        sleepTimerId = null;
        sleepEndTime = null;
        if (globalAudioPlayer) globalAudioPlayer.volume = 1;
        if (sleepTimerStatus) sleepTimerStatus.textContent = i18n[currentLang].sleep_timer_off || 'تم إيقاف مؤقت النوم';
        if (btnPlayerSleepTimer) btnPlayerSleepTimer.style.color = '';
      } else {
        if (sleepTimerId) clearInterval(sleepTimerId);
        sleepEndTime = Date.now() + mins * 60 * 1000;
        if (btnPlayerSleepTimer) btnPlayerSleepTimer.style.color = 'var(--primary)';

        sleepTimerId = setInterval(() => {
          const remaining = sleepEndTime - Date.now();
          if (remaining <= 0) {
            clearInterval(sleepTimerId);
            sleepTimerId = null;
            if (globalAudioPlayer) {
              globalAudioPlayer.pause();
              globalAudioPlayer.volume = 1;
            }
            if (sleepTimerStatus) sleepTimerStatus.textContent = i18n[currentLang].sleep_timer_off || 'تم الإيقاف تلقائياً';
            if (btnPlayerSleepTimer) btnPlayerSleepTimer.style.color = '';
          } else {
            if (remaining < 60000 && globalAudioPlayer) {
              globalAudioPlayer.volume = Math.max(0.05, remaining / 60000);
            }
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            if (sleepTimerStatus) {
              sleepTimerStatus.textContent = `⏳ متبقي: ${m}:${s < 10 ? '0' : ''}${s}`;
            }
          }
        }, 1000);

        if (sleepTimerStatus) {
          sleepTimerStatus.textContent = `✓ تم ضبط المؤقت على ${mins} دقيقة`;
        }
      }
    });
  });
}

// 7. Mini Floating Player / PiP Widget
if (btnPlayerMini) {
  btnPlayerMini.addEventListener('click', () => {
    playUiSound('pop');
    if (playerWidget) {
      playerWidget.classList.toggle('mini-player-mode');
    }
  });
}

// 8. Pro Studio Tools 11-14 Handlers
// Tool 11: AI Stems
if (btnDoStems) {
  btnDoStems.addEventListener('click', async () => {
    const filename = stemsFileSelect ? stemsFileSelect.value : '';
    if (!filename) return;

    playUiSound('pop');
    btnDoStems.disabled = true;
    const origHtml = btnDoStems.innerHTML;
    btnDoStems.innerHTML = `<span>⏳</span> <span>جاري فصل المسارات الصوتية...</span>`;
    if (stemsFeedback) {
      stemsFeedback.className = 'studio-feedback-badge loading';
      stemsFeedback.textContent = 'جاري تحليل الترددات وفصل الغناء والموسيقى والبيس والإيقاع...';
      stemsFeedback.classList.remove('hidden');
    }

    try {
      const res = await fetch('/api/studio/stems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          folder: topFolderLabel ? topFolderLabel.title : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playUiSound('success');
        triggerConfetti();
        if (stemsFeedback) {
          stemsFeedback.className = 'studio-feedback-badge success';
          stemsFeedback.textContent = `✓ تم بنجاح! تم إنشاء مجلد Stems يضم 4 مسارات: Vocals, Music, Bass, Drums`;
        }
        fetchLibrary();
      } else {
        if (stemsFeedback) {
          stemsFeedback.className = 'studio-feedback-badge error';
          stemsFeedback.textContent = data.detail || 'حدث خطأ أثناء فصل المسارات';
        }
      }
    } catch (e) {
      if (stemsFeedback) {
        stemsFeedback.className = 'studio-feedback-badge error';
        stemsFeedback.textContent = 'تعذر الاتصال بالمحرك الصوتي';
      }
    } finally {
      btnDoStems.disabled = false;
      btnDoStems.innerHTML = origHtml;
    }
  });
}

// Tool 12: Audio Merger & DJ Crossfade
if (crossfadeSlider && crossfadeValueLabel) {
  crossfadeSlider.addEventListener('input', () => {
    crossfadeValueLabel.textContent = `${parseFloat(crossfadeSlider.value).toFixed(1)}s`;
  });
}

if (btnDoMerge) {
  btnDoMerge.addEventListener('click', async () => {
    const track1 = mergeFileSelect1 ? mergeFileSelect1.value : '';
    const track2 = mergeFileSelect2 ? mergeFileSelect2.value : '';
    if (!track1 || !track2) {
      alert('الرجاء اختيار مقطعين صوتيين للدمج');
      return;
    }
    const crossfadeSec = crossfadeSlider ? parseFloat(crossfadeSlider.value) : 4.0;

    playUiSound('pop');
    btnDoMerge.disabled = true;
    const origHtml = btnDoMerge.innerHTML;
    btnDoMerge.innerHTML = `<span>⏳</span> <span>جاري معالجة ميكس الانتقال...</span>`;

    try {
      const res = await fetch('/api/studio/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track1: track1,
          track2: track2,
          crossfade_sec: crossfadeSec,
          folder: topFolderLabel ? topFolderLabel.title : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playUiSound('success');
        triggerConfetti();
        alert(`🎧 ${data.message || 'تم دمج المقطعين بنجاح!'}`);
        fetchLibrary();
      } else {
        alert(data.detail || 'حدث خطأ أثناء الدمج');
      }
    } catch (e) {
      alert('خطأ في معالجة الدمج');
    } finally {
      btnDoMerge.disabled = false;
      btnDoMerge.innerHTML = origHtml;
    }
  });
}

// Tool 13: Audio De-Noise
if (btnDoDenoise) {
  btnDoDenoise.addEventListener('click', async () => {
    const filename = denoiseFileSelect ? denoiseFileSelect.value : '';
    if (!filename) return;

    playUiSound('pop');
    btnDoDenoise.disabled = true;
    const origHtml = btnDoDenoise.innerHTML;
    btnDoDenoise.innerHTML = `<span>⏳</span> <span>جاري تنقية الصوت والوشيش...</span>`;

    try {
      const res = await fetch('/api/studio/denoise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          noise_reduction: 12,
          folder: topFolderLabel ? topFolderLabel.title : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playUiSound('success');
        triggerConfetti();
        alert(`✨ ${data.message || 'تمت تنقية الملف الصوتي وحفظ النسخة الماستر!'}`);
        fetchLibrary();
      } else {
        alert(data.detail || 'حدث خطأ أثناء تنقية الصوت');
      }
    } catch (e) {
      alert('خطأ أثناء تنقية الصوت');
    } finally {
      btnDoDenoise.disabled = false;
      btnDoDenoise.innerHTML = origHtml;
    }
  });
}

// Tool 14: Shazam-like Audio Identifier
if (btnDoIdentify) {
  btnDoIdentify.addEventListener('click', async () => {
    const filename = identifyFileSelect ? identifyFileSelect.value : '';
    if (!filename) return;

    playUiSound('pop');
    btnDoIdentify.disabled = true;
    const origHtml = btnDoIdentify.innerHTML;
    btnDoIdentify.innerHTML = `<span>⏳</span> <span>جاري فحص التراك والبحث السحابي...</span>`;
    if (identifyResultBox) {
      identifyResultBox.classList.remove('hidden');
      identifyResultBox.innerHTML = `<div style="text-align:center; padding:12px; color:var(--text-secondary);">جاري البحث والتعرف على الأغنية...</div>`;
    }

    try {
      const res = await fetch('/api/studio/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          folder: topFolderLabel ? topFolderLabel.title : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.match) {
        const m = data.match;
        playUiSound('success');
        triggerConfetti();

        if (identifyResultBox) {
          identifyResultBox.innerHTML = `
            <div class="identify-card">
              ${m.artwork_url ? `<img src="${m.artwork_url}" class="identify-art" alt="Cover" />` : ''}
              <div class="identify-meta">
                <div class="identify-track-name">${escapeHtml(m.track_name || '')}</div>
                <div class="identify-artist">${escapeHtml(m.artist_name || '')}</div>
                <div class="identify-album">${escapeHtml(m.album_name || '')} (${escapeHtml(m.release_year || '')})</div>
              </div>
              <button type="button" class="btn-action btn-download" style="margin-inline-start:auto; padding:8px 14px; font-size:0.82rem;" id="btnApplyIdentified">
                💾 حفظ التاجات للملف
              </button>
            </div>
          `;

          const btnApply = document.getElementById('btnApplyIdentified');
          if (btnApply) {
            btnApply.addEventListener('click', async () => {
              playUiSound('pop');
              btnApply.disabled = true;
              btnApply.textContent = '⏳ جاري الحفظ...';
              try {
                const tagRes = await fetch('/api/library/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    filename: filename,
                    title: m.track_name || '',
                    artist: m.artist_name || '',
                    album: m.album_name || '',
                    year: m.release_year || '',
                    genre: m.genre || '',
                    folder: topFolderLabel ? topFolderLabel.title : null
                  })
                });
                if (tagRes.ok) {
                  playUiSound('success');
                  btnApply.textContent = '✓ تم الحفظ بنجاح!';
                  fetchLibrary();
                }
              } catch (e) {}
            });
          }
        }
      } else {
        if (identifyResultBox) {
          identifyResultBox.innerHTML = `<div style="text-align:center; padding:12px; color:var(--danger);">لم يتم العثور على تطابق لهذا الملف.</div>`;
        }
      }
    } catch (e) {
      if (identifyResultBox) {
        identifyResultBox.innerHTML = `<div style="text-align:center; padding:12px; color:var(--danger);">خطأ أثناء التعرف على التراك.</div>`;
      }
    } finally {
      btnDoIdentify.disabled = false;
      btnDoIdentify.innerHTML = origHtml;
    }
  });
}

// Auto-restore clipboard monitor setting & initialize theme from localStorage
initClipboardMonitor();
applyTheme();

// Startup
setupWebSocket();
fetchLibrary();
