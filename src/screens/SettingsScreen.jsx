import React, { useState, useEffect } from 'react';
import {
  Settings,
  Palette,
  Share2,
  LogOut,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Check,
  GraduationCap,
  FolderLock,
  Download,
  Award,
  HardDrive,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  Eye,
  Calendar,
  Bell,
  BellRing,
} from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAllAssignmentsToSarvestan, syncAllWithSarvestan, exportAssignmentsAsIcs } from '../services/sarvestanBridge';
import { getPrivateFiles, getUserBadges, getMoodleFileUrl, downloadMoodleFile } from '../services/moodle/api';
import {
  isMoodleNotificationEnabled,
  setMoodleNotificationEnabled,
  testMoodleNotification,
  getNotificationPermission,
  requestNotificationPermission,
} from '../services/moodleNotifications';
import DocumentViewerModal from '../components/DocumentViewerModal';
import { cleanPersianText, toFaDigits, formatFileSizeFa } from '../utils/persianUtils';

export default function SettingsScreen() {
  const { session, siteInfo, assignments, logout } = useMoodleAuth();
  const [msg, setMsg] = useState('');

  const [notifsEnabled, setNotifsEnabled] = useState(isMoodleNotificationEnabled());
  const [privateFiles, setPrivateFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const handleToggleNotifs = async () => {
    const next = !notifsEnabled;
    if (next) {
      await requestNotificationPermission();
    }
    setMoodleNotificationEnabled(next);
    setNotifsEnabled(next);
    setMsg(next ? 'اعلان‌های سیستمی مودل فعال شدند.' : 'اعلان‌های سیستمی مودل غیرفعال شدند.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleTestNotif = async () => {
    try {
      await testMoodleNotification();
      setMsg('اعلان آزمایشی به دستگاه شما ارسال گردید.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message || 'خطا در ارسال اعلان آزمایشی');
      setTimeout(() => setMsg(''), 3500);
    }
  };

  const handleInAppDownload = async (fileUrl, filename) => {
    if (downloadingUrl) return;
    setDownloadingUrl(fileUrl);
    try {
      await downloadMoodleFile(fileUrl, filename, session?.token);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingUrl(null);
    }
  };

  // بارگذاری فایل‌های خصوصی ابری مودل
  useEffect(() => {
    async function loadFiles() {
      if (!session) return;
      setLoadingFiles(true);
      try {
        const res = await getPrivateFiles(session.siteUrl, session.token);
        if (res && Array.isArray(res.files)) {
          setPrivateFiles(res.files);
        }
      } catch (err) {
        console.error('Failed to load private files:', err);
      } finally {
        setLoadingFiles(false);
      }
    }
    loadFiles();
  }, [session]);

  // بارگذاری نشان‌های تحصیلی دانشجو
  useEffect(() => {
    async function loadBadges() {
      if (!session) return;
      setLoadingBadges(true);
      try {
        const res = await getUserBadges(session.siteUrl, session.token, siteInfo?.userid || 9999);
        if (res && Array.isArray(res.badges)) {
          setBadges(res.badges);
        }
      } catch (err) {
        console.error('Failed to load badges:', err);
      } finally {
        setLoadingBadges(false);
      }
    }
    loadBadges();
  }, [session, siteInfo]);

  const handleExportAll = () => {
    syncAllWithSarvestan({
      assignments,
      courses: session?.courses || [],
      user: siteInfo,
    });
    setMsg('همگام‌سازی کامل با سروستان با موفقیت انجام شد و در صف ذخیره گردید.');
    setTimeout(() => setMsg(''), 3500);
  };

  const handleDownloadIcs = () => {
    try {
      exportAssignmentsAsIcs(assignments);
      setMsg('فایل تقویم ددلاین‌ها (.ics) با موفقیت دانلود شد.');
      setTimeout(() => setMsg(''), 3500);
    } catch (err) {
      setMsg(err.message || 'خطا در خروجی تقویم');
      setTimeout(() => setMsg(''), 3500);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem('mehestan_moodle_courses_v1');
    localStorage.removeItem('mehestan_moodle_assignments_v1');
    setMsg('حافظه موقت دروس و تکالیف با موفقیت پاک‌سازی شد.');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto text-right min-w-0">
      {/* سربرگ تنظیمات */}
      <div className="sarv-card p-4 space-y-1 shadow-sm">
        <h2 className="text-sm font-black text-base-content flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span>تنظیمات و امکانات تکمیلی مودل</span>
        </h2>
        <p className="text-xs text-neutral">
          فضای ابری شخصی، دستاوردهای تحصیلی، پالت تم‌های سروستان و مدیریت حافظه
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* حساب کاربری و اتصال */}
      <div className="sarv-card p-4 space-y-3 shadow-sm">
        <h3 className="text-xs font-black text-base-content flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <span>مشخصات اتصال سامانه آموزش مجازی</span>
        </h3>
        <div className="space-y-2 text-xs text-neutral">
          <div className="flex justify-between items-center py-1 border-b border-base-500/15">
            <span>نام و نام خانوادگی:</span>
            <span className="font-black text-base-content">{cleanPersianText(siteInfo?.fullname) || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-base-500/15">
            <span>شماره دانشجویی / کاربری:</span>
            <span className="font-mono text-base-content">{toFaDigits(siteInfo?.username) || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>آدرس سرور مودل:</span>
            <span className="font-mono text-[11px] text-base-content truncate max-w-[200px]" dir="ltr">
              {session?.siteUrl}
            </span>
          </div>
        </div>
      </div>

      {/* فایل‌های شخصی ابری دانشجو در سرور مودل (Moodle Private Files) */}
      <div className="sarv-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-base-content flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-amber-500" />
            <span>فضای ابری فایل‌های شخصی مودل (Private Files)</span>
          </h3>
          <span className="text-[10px] text-neutral font-bold">
            {toFaDigits(privateFiles.length)} فایل ذخیره‌شده
          </span>
        </div>

        <p className="text-xs text-neutral leading-relaxed">
          فایل‌های اختصاصی بارگذاری‌شده در فضای ابری حساب کاربری شما بر روی سرور دانشگاه:
        </p>

        {loadingFiles ? (
          <div className="flex items-center justify-center py-6 text-neutral text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>در حال دریافت فایل‌های شخصی...</span>
          </div>
        ) : privateFiles.length > 0 ? (
          <div className="space-y-2">
            {privateFiles.map((file, idx) => {
              const downloadUrl = getMoodleFileUrl(file.fileurl, session.token);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-base-500/15 border border-base-500/25 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-base-content truncate" title={file.filename}>
                        {cleanPersianText(file.filename)}
                      </p>
                      <span className="text-[10px] text-neutral font-mono">
                        {formatFileSizeFa(file.filesize)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 mr-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 px-2.5 rounded-lg text-neutral hover:text-primary hover:bg-primary/10 transition flex items-center gap-1 font-bold cursor-pointer text-xs"
                      title="مشاهده آنلاین فایل"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">مشاهده</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInAppDownload(file.fileurl, file.filename)}
                      disabled={downloadingUrl === file.fileurl}
                      className="p-1.5 px-2.5 rounded-lg text-primary hover:bg-primary/10 transition flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50 text-xs"
                      title="دانلود فایل"
                    >
                      {downloadingUrl === file.fileurl ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px] hidden sm:inline">دریافت</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-base-500/10 text-center text-xs text-neutral">
            فایل شخصی در فضای ابری مودل بارگذاری نشده است.
          </div>
        )}
      </div>

      {/* نشان‌ها و دستاوردهای تحصیلی (Badges) */}
      <div className="sarv-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-base-content flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            <span>نشان‌ها و دستاوردهای تحصیلی (Badges)</span>
          </h3>
          <span className="text-[10px] text-neutral font-bold">
            {toFaDigits(badges.length)} نشان کسب‌شده
          </span>
        </div>

        {loadingBadges ? (
          <div className="flex items-center justify-center py-6 text-neutral text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>در حال دریافت نشان‌ها...</span>
          </div>
        ) : badges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {badges.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-base-500/15 border border-base-500/30 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-500 grid place-items-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-base-content truncate">
                    {cleanPersianText(b.name)}
                  </h4>
                </div>
                <p className="text-[11px] text-neutral leading-relaxed line-clamp-2">
                  {cleanPersianText(b.description)}
                </p>
                {b.issuername && (
                  <span className="text-[9px] text-neutral/70 block">
                    اعطا شده توسط: {cleanPersianText(b.issuername)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-base-500/10 text-center text-xs text-neutral">
            هنوز نشانی برای شما در دروس ثبت نشده است.
          </div>
        )}
      </div>

      {/* یکپارچگی با سروستان */}
      <div className="sarv-card p-4 space-y-3 shadow-sm border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-base-content flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-500" />
            <span>پل ارتباطی و اتصال با داشبورد سروستان</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
            کانال محلی آماده
          </span>
        </div>
        <p className="text-[11px] text-neutral leading-relaxed">
          انتقال هوشمند تکالیف، آزمون‌ها و ددلاین‌های مودل به تقویم، ویجت‌ها و پلنر روزانه مطالعه سروستان بدون نیاز به اینترنت.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportAll}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 text-white text-xs font-black hover:brightness-110 active:scale-98 transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>همگام‌سازی کامل با سروستان</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="w-full py-2.5 px-3 rounded-xl bg-base-500/20 hover:bg-base-500/30 text-base-content text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border border-base-500/30"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>خروجی تقویم (.ics)</span>
          </button>
        </div>
      </div>

      {/* اعلان‌ها و هشدارهای سیستمی مودل */}
      <div className="sarv-card p-4 space-y-3 shadow-sm border-primary/25 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black text-base-content">
              اعلان‌ها و هشدارهای سیستمی مودل
            </h3>
          </div>
          <button
            type="button"
            onClick={handleToggleNotifs}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 ${
              notifsEnabled
                ? 'bg-success text-success-content shadow-xs'
                : 'bg-base-500/25 text-neutral'
            }`}
          >
            <span>{notifsEnabled ? 'فعال' : 'غیرفعال'}</span>
          </button>
        </div>

        <p className="text-[11px] text-neutral leading-relaxed">
          ارسال مستقیم اطلاعیه‌های اساتید، پیام‌های جدید، و ثبت نمرات سامانه مودل به عنوان نوتیفیکیشن در دستگاه شما.
          (موعد و ددلاین‌های تکالیف طبق برنامه به سروستان واگذار می‌شوند).
        </p>

        <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-neutral font-medium">
            وضعیت دسترسی مرورگر: {getNotificationPermission() === 'granted' ? 'تایید شده' : 'نیاز به تایید دسترسی'}
          </span>
          <button
            type="button"
            onClick={handleTestNotif}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-content text-xs font-bold hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>ارسال اعلان آزمایشی</span>
          </button>
        </div>
      </div>

      {/* پاک‌سازی حافظه موقت و خروج */}
      <div className="sarv-card p-4 space-y-2.5 shadow-sm">
        <h3 className="text-xs font-black text-base-content">عملیات حساب و حافظه</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearCache}
            className="flex-1 py-2.5 rounded-xl border border-base-500/30 hover:bg-base-500/20 text-xs font-bold text-neutral hover:text-base-content transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاک‌سازی کش دروس</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex-1 py-2.5 rounded-xl bg-error/15 border border-error/30 hover:bg-error/25 text-xs font-black text-error transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج از حساب</span>
          </button>
        </div>
      </div>

      {/* مودال پیش‌نمایش فایل‌های شخصی ابری */}
      {previewFile && (
        <DocumentViewerModal
          file={previewFile}
          token={session?.token}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}