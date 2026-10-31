import React, { useState, useEffect } from 'react';
import {
  Palette,
  Bell,
  RefreshCw,
  LogOut,
  ChevronLeft,
  Check,
  X,
  Sparkles,
  GraduationCap,
  Clock,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { getNotifications } from '../services/moodle/api';
import { cleanPersianText, toFaDigits } from '../utils/persianUtils';

export default function TopBar({ title, onBack, showBack = false }) {
  const { theme, setTheme, themes, isDark, activeThemeMeta } = useTheme();
  const { session, siteInfo, refreshData, loading, logout, isAuthenticated } = useMoodleAuth();
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [notifySheetOpen, setNotifySheetOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (!notifySheetOpen || !session) return;
    async function loadNotifs() {
      setLoadingNotifications(true);
      try {
        if (session.isDemo) {
          setNotifications([
            {
              id: 1,
              subject: 'نمره تمرین سری دوم ثبت گردید',
              text: 'استاد درس ساختمان داده‌ها نمره ۱۸.۵ را برای تمرین پیاده‌سازی ساختارهای پایه ثبت نمودند.',
              timecreated: Math.floor(Date.now() / 1000) - 14400,
              unread: true,
            },
            {
              id: 2,
              subject: 'تمدید مهلت ارسال تمرین سری چهارم',
              text: 'مهلت ارسال تمرین ۴ تا ساعت ۲۳:۵۹ روز شنبه تمدید گردید.',
              timecreated: Math.floor(Date.now() / 1000) - 86400,
              unread: false,
            },
            {
              id: 3,
              subject: 'آزمون آنلاین دوره‌ای میان‌ترم',
              text: 'کوییز تستی آزمایشی در درس مدارهای منطقی فعال گردید.',
              timecreated: Math.floor(Date.now() / 1000) - 172800,
              unread: false,
            },
          ]);
        } else {
          const res = await getNotifications(session.siteUrl, session.token, siteInfo?.userid || 9999);
          if (res && Array.isArray(res.notifications)) {
            setNotifications(res.notifications);
          }
        }
      } catch (err) {
        console.warn('Failed to load notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    }
    loadNotifs();
  }, [notifySheetOpen, session, siteInfo]);

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp * 1000);
      return toFaDigits(
        d.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return '';
    }
  };

  const unreadNotifs = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full backdrop-blur-md bg-base/92 border-b border-base-500/40 transition-colors will-change-transform"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          transform: 'translateZ(0)',
        }}
      >
        <div className="mx-auto max-w-[430px] md:max-w-[560px] lg:max-w-none h-14 flex items-center justify-between gap-2 px-3">
          {/* سمت راست: نشان مهستان یا دکمه بازگشت و عنوان */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
              {showBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-8 h-8 rounded-xl grid place-items-center text-neutral hover:text-base-content bg-base-500/20 hover:bg-base-500/40 active:scale-95 transition-all outline-none cursor-pointer"
                  aria-label="بازگشت"
                >
                  <ChevronLeft className="w-4.5 h-4.5 rotate-180" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 grid place-items-center shadow-sm">
                  <img src="./mehestan-icon.svg" alt="مهستان" className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex flex-col leading-tight min-w-0">
              <h1 className="text-[14px] font-bold text-base-content flex items-center gap-1.5 truncate">
                {title || (
                  <>
                    <span>مهستان</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-secondary-soft text-secondary">
                      مودل
                    </span>
                  </>
                )}
              </h1>
              <span className="text-[10px] text-neutral truncate">
                {title ? 'سامانه یادگیری الکترونیکی' : (siteInfo?.sitename || 'دانشگاه صنعتی خواجه نصیرالدین طوسی')}
              </span>
            </div>
          </div>

          {/* سمت چپ: ابزارهای سریع (تم، اعلان، همگام‌سازی، خروج) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* انتخابگر تم مدرن سروستان */}
            <button
              type="button"
              onClick={() => setThemeSheetOpen(true)}
              className="flex items-center gap-1.5 h-8 px-2 rounded-xl bg-base-500/30 hover:bg-base-500/50 border border-base-500/40 text-neutral hover:text-base-content active:scale-95 transition-all outline-none cursor-pointer"
              title={`تغییر تم (تم فعلی: ${activeThemeMeta?.persianName || 'تم'})`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-black/20"
                style={{ backgroundColor: activeThemeMeta?.primary || '#0077c2' }}
              />
              <span className="text-[11px] font-medium hidden xs:inline max-w-[65px] truncate">
                {activeThemeMeta?.persianName?.split(' ')[0] || 'تم'}
              </span>
              <Palette className="w-3.5 h-3.5 text-neutral" />
            </button>

            {/* زنگوله اعلانات */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setNotifySheetOpen(true)}
                className="relative w-8 h-8 rounded-xl bg-base-500/30 hover:bg-base-500/50 border border-base-500/40 grid place-items-center text-neutral hover:text-base-content active:scale-95 transition-all outline-none cursor-pointer"
                title="اعلانات و پیام‌ها"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-content text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {toFaDigits(unreadNotifs)}
                  </span>
                )}
              </button>
            )}

            {/* همگام‌سازی زنده با مودل */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={refreshData}
                disabled={loading}
                className="w-8 h-8 rounded-xl bg-base-500/30 hover:bg-base-500/50 border border-base-500/40 grid place-items-center text-neutral hover:text-base-content active:scale-95 transition-all outline-none cursor-pointer"
                title="به‌روزرسانی اطلاعات از مودل"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              </button>
            )}

            {/* خروج */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                className="w-8 h-8 rounded-xl bg-base-500/30 hover:bg-danger-soft border border-base-500/40 grid place-items-center text-neutral hover:text-danger active:scale-95 transition-all outline-none cursor-pointer"
                title="خروج از حساب"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* شیت انتخابگر ۱۶ تم سروستان */}
      {themeSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="sarv-card w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-base-500/30">
            <div className="p-4 border-b border-base-500/20 flex items-center justify-between bg-base-500/10">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black text-base-content">پالت رنگی سروستان (۱۶ تم)</h3>
              </div>
              <button
                type="button"
                onClick={() => setThemeSheetOpen(false)}
                className="p-1 rounded-lg hover:bg-base-500/20 text-neutral"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-1.5 flex-1 text-xs">
              {themes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      setThemeSheetOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-base-500/20 hover:border-base-500/50 hover:bg-base-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center -space-x-1">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 z-10"
                          style={{ backgroundColor: t.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: t.base }}
                        />
                      </div>
                      <span className={`font-bold ${isSelected ? 'text-primary' : 'text-base-content'}`}>
                        {t.persianName}
                      </span>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* شیت اعلان‌های رسمی مودل و مشخصات کاربر */}
      {notifySheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="sarv-card w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-base-500/30">
            <div className="p-4 border-b border-base-500/20 flex items-center justify-between bg-base-500/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black text-base-content">اعلان‌ها و رویدادهای دانشگاه</h3>
              </div>
              <button
                type="button"
                onClick={() => setNotifySheetOpen(false)}
                className="p-1 rounded-lg hover:bg-base-500/20 text-neutral cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="p-3 rounded-xl bg-primary-soft border border-primary-soft space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <GraduationCap className="w-4 h-4" />
                  <span className="truncate">{cleanPersianText(siteInfo?.sitename || 'سامانه آموزش الکترونیکی')}</span>
                </div>
                <p className="text-[11px] text-neutral">
                  دانشجو: <span className="font-bold text-base-content">{cleanPersianText(siteInfo?.fullname)}</span>
                </p>
                <p className="text-[10px] text-neutral font-mono">
                  شماره دانشجویی: {toFaDigits(siteInfo?.username)}
                </p>
              </div>

              {/* لیست اعلان‌ها */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base-content text-[11px]">پیام‌ها و اطلاعیه‌های اخیر:</span>
                  <span className="text-[10px] text-neutral">{toFaDigits(notifications.length)} مورد</span>
                </div>

                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-6 text-neutral gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>در حال دریافت اعلان‌ها...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-base-500/15 border border-base-500/25 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-base-content text-[11px] leading-relaxed">
                          {cleanPersianText(n.subject)}
                        </h4>
                        {n.unread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral leading-relaxed">
                        {cleanPersianText(n.text)}
                      </p>
                      <span className="text-[9px] text-neutral/70 block">
                        {formatNotifTime(n.timecreated)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-base-500/10 text-center text-neutral text-[11px]">
                    اعلانی برای نمایش وجود ندارد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
