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
  Heart,
  Globe,
  ExternalLink,
  Rocket,
  RefreshCw,
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
import UpdateModal from '../components/UpdateModal';
import { checkForUpdate, CURRENT_VERSION } from '../services/updater';
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

  // وضعیت به‌روزرسانی درون‌برنامه‌ای مشابه سروستان
  const [updateState, setUpdateState] = useState({
    checking: false,
    checked: false,
    hasUpdate: false,
    latestRelease: null,
    error: null,
  });
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const handleCheckUpdate = async (openModalIfUpdate = true) => {
    if (updateState.checking) return;
    setUpdateState((s) => ({ ...s, checking: true, error: null }));
    const res = await checkForUpdate();
    setUpdateState({
      checking: false,
      checked: true,
      hasUpdate: res.hasUpdate,
      latestRelease: res.latestRelease,
      error: res.error,
    });
    if (res.hasUpdate && openModalIfUpdate && res.latestRelease) {
      setUpdateModalOpen(true);
    } else if (!res.hasUpdate && !res.error) {
      setMsg('مهستان شما به آخرین نسخه رسمی به‌روز است.');
      setTimeout(() => setMsg(''), 3000);
    } else if (res.error) {
      setMsg(res.error);
      setTimeout(() => setMsg(''), 3500);
    }
  };

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

      {/* کارت دونیت (حمایت از توسعه — دارمت) عین سروستان */}
      <a
        href="https://daramet.com/mjb4khshi"
        target="_blank"
        rel="noopener noreferrer"
        className="sarv-card p-3 flex items-center justify-between gap-3 border border-rose-500/20 bg-gradient-to-l from-rose-500/5 via-base-100 to-amber-500/5 hover:border-rose-500/40 active:scale-[0.99] transition-all group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-rose-500" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-base-content truncate">حمایت از توسعه سروستان و مهستان</span>
              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-500 shrink-0">
                دونیت
              </span>
            </div>
            <p className="text-[10.5px] text-neutral truncate mt-0.5">
              پروژه‌های رایگان و مستقل؛ با یک قهوه دلگرمی ببخشید
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11.5px] font-bold text-rose-600 dark:text-rose-400 shrink-0 px-2.5 py-1.5 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
          <span>دارمت</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </a>

      {/* پیوندهای اکوسیستم سروستان (وب‌سایت، دانلود و کانال تلگرام) */}
      <div className="sarv-card overflow-hidden shadow-sm divide-y divide-base-500/20">
        <div className="p-3 bg-base-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 1080 1080"
              className="w-4.5 h-4.5 drop-shadow-sm text-emerald-600"
              fill="currentColor"
            >
              <path d="M540,167.08 C540,167.08 213.25,912.92 540,912.92 C866.75,912.92 540,167.08 540,167.08 Z" />
            </svg>
            <h3 className="text-xs font-black text-base-content">
              اکوسیستم سروستان (Sarvestan)
            </h3>
          </div>
          <span className="text-[10px] text-neutral font-bold">سامانه همراه دانشجو</span>
        </div>

        {/* وب‌سایت رسمی سروستان */}
        <a
          href="https://mjb4khshi.github.io/sarvestan"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between gap-3 p-3 text-right hover:bg-base-500/20 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-base-content">وب‌سایت رسمی سروستان</p>
              <p className="text-[10.5px] text-neutral mt-0.5 truncate">mjb4khshi.github.io/sarvestan · معرفی و امکانات</p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-neutral shrink-0" />
        </a>

        {/* دانلود سروستان */}
        <a
          href="https://github.com/mjb4khshi/sarvestan/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between gap-3 p-3 text-right hover:bg-base-500/20 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-success/15 text-success grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-base-content">دانلود اپلیکیشن و افزونه سروستان</p>
              <p className="text-[10.5px] text-neutral mt-0.5 truncate">نسخه اندروید، وب‌اپ PWA و اکستنشن مرورگر</p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-neutral shrink-0" />
        </a>

        {/* کانال تلگرام سروستان */}
        <a
          href="https://t.me/s4rvest4n"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between gap-3 p-3 text-right hover:bg-base-500/20 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-base-content">کانال اطلاع‌رسانی تلگرام</p>
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-500 font-bold">@s4rvest4n</span>
              </div>
              <p className="text-[10.5px] text-neutral mt-0.5 truncate">t.me/s4rvest4n · اخبار آپدیت‌ها و انتشارات</p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-neutral shrink-0" />
        </a>
      </div>

      {/* بخش به‌روزرسانی و نسخه درون‌برنامه‌ای مهستان عین سروستان */}
      <div className="sarv-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black text-base-content">نسخه و به‌روزرسانی برنامه</h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-base-500/25 text-neutral">
            نسخه {toFaDigits(CURRENT_VERSION)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-base-500/10 border border-base-500/20">
          <div className="min-w-0">
            <p className="text-xs font-bold text-base-content">
              {updateState.checking
                ? 'در حال بررسی آخرین انتشار در گیت‌هاب...'
                : updateState.hasUpdate
                ? `نسخه جدید ${toFaDigits(updateState.latestRelease?.tagName)} منتشر گردید`
                : updateState.checked
                ? 'مهستان شما به آخرین نسخه رسمی به‌روز است'
                : 'بررسی نسخه‌های جدید و آپدیت‌ها'}
            </p>
            <p className="text-[10.5px] text-neutral mt-0.5">
              مخزن رسمی گیت‌هاب (mjb4khshi/Mehestan)
            </p>
          </div>

          {updateState.hasUpdate ? (
            <button
              type="button"
              onClick={() => setUpdateModalOpen(true)}
              className="shrink-0 px-3.5 py-1.5 rounded-xl bg-primary text-primary-content font-bold text-xs shadow-sm hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>به‌روزرسانی</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleCheckUpdate(true)}
              disabled={updateState.checking}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-base-500/20 hover:bg-base-500/35 text-base-content font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {updateState.checking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال بررسی...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{updateState.checked ? 'بررسی مجدد' : 'بررسی نسخه'}</span>
                </>
              )}
            </button>
          )}
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

      {/* مودال پیش‌نمایش فایل‌های شخصی ابری */}
      {previewFile && (
        <DocumentViewerModal
          file={previewFile}
          token={session?.token}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* مودال بررسی و دریافت به‌روزرسانی */}
      {updateModalOpen && updateState.latestRelease && (
        <UpdateModal
          release={updateState.latestRelease}
          onClose={() => setUpdateModalOpen(false)}
        />
      )}
    </div>
  );
}