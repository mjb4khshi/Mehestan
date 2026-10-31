import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { cleanPersianText, toFaDigits, stripHtml, cleanNotificationText, getShortUniversityName } from '../utils/persianUtils';

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
          <div className="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
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
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 261.778 284.888"
                    className="w-6 h-6 drop-shadow-sm transition-transform hover:scale-105 active:scale-95"
                    style={{ fill: 'var(--color-primary, #0066a4)' }}
                    aria-label="مهستان"
                  >
                    <path
                      d="M249.915,219.637A142.574,142.574,0,0,1,9.144,229.3a10.687,10.687,0,0,1,5.2-16.123c53.684-19.214,82.435-41.48,99.12-73.329,17.565-33.528,22.1-70.255,9.816-120.6A10.687,10.687,0,0,1,134.236,6.046,142.566,142.566,0,0,1,249.915,219.637Z"
                      transform="translate(-7.254 -6.03)"
                    />
                  </svg>
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
              <span className="text-[10px] text-neutral truncate max-w-[180px] sm:max-w-xs block font-medium">
                {title ? 'سامانه یادگیری' : getShortUniversityName(siteInfo?.sitename)}
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

      {/* شیت انتخابگر تم‌های سروستان — دقیقا مطابق Sarvestan Bottom Sheet */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {themeSheetOpen && (
              <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setThemeSheetOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Sheet Panel */}
                <motion.div
                  initial={{ y: '100%', opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0.5 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="relative z-10 w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl bg-base border border-base-500/50 p-5 shadow-2xl max-h-[85vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-base-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary grid place-items-center">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-base-content">پالت‌های رنگی سرو</h3>
                        <p className="text-[11px] text-neutral">تم ظاهر برنامه را به سلیقه خود انتخاب کنید</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setThemeSheetOpen(false)}
                      className="w-8 h-8 rounded-full bg-base-500/30 text-neutral hover:text-base-content grid place-items-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto py-3 pb-8 space-y-1.5 flex-1 pr-1">
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
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-right border relative overflow-hidden select-none cursor-pointer ${
                            isSelected
                              ? 'bg-primary/12 border-primary/50 text-primary font-bold shadow-sm'
                              : 'bg-base-500/15 border-base-500/30 text-base-content hover:bg-base-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 relative z-10">
                            {/* پیش‌نمایش ۳ رنگ شاخص پالت */}
                            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-base-500/20 border border-base-500/35 shrink-0 shadow-2xs">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-2xs shrink-0"
                                style={{ backgroundColor: t.primary }}
                                title="رنگ اصلی"
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-2xs shrink-0"
                                style={{ backgroundColor: t.accent || t.primary }}
                                title="رنگ مکمل"
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-2xs shrink-0"
                                style={{ backgroundColor: t.base }}
                                title="رنگ زمینه"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold leading-tight">
                                {t.persianName}
                              </p>
                              <p className="text-[10px] text-neutral mt-0.5">
                                {t.mode === 'dark' ? 'حالت تاریک' : 'حالت روشن'} · {t.name}
                              </p>
                            </div>
                          </div>
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-content grid place-items-center shrink-0 relative z-10">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-neutral/60 relative z-10">
                              انتخاب
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* شیت اعلان‌های رسمی مودل — مطابق سبک سروستان */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {notifySheetOpen && (
              <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setNotifySheetOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Sheet Panel */}
                <motion.div
                  initial={{ y: '100%', opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0.5 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="relative z-10 w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl bg-base border border-base-500/50 p-5 shadow-2xl max-h-[85vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-base-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary grid place-items-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-base-content">اعلانات و پیام‌ها</h3>
                        <p className="text-[11px] text-neutral">رویدادها و پیام‌های رسمی دانشگاه</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifySheetOpen(false)}
                      className="w-8 h-8 rounded-full bg-base-500/30 text-neutral hover:text-base-content grid place-items-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto py-3 pb-8 space-y-2 flex-1 pr-1">
                    {loadingNotifications ? (
                      <div className="flex flex-col items-center justify-center py-12 text-neutral space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-xs">در حال دریافت اعلان‌ها از مودل...</span>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3.5 rounded-2xl bg-base-500/15 border border-base-500/30 space-y-1 hover:border-primary/40 transition"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-base-content text-xs flex items-center gap-1.5">
                              {n.unread && <span className="w-2 h-2 rounded-full bg-primary" />}
                              <span>{cleanPersianText(n.subject || 'اعلان مودل')}</span>
                            </h4>
                            <span className="text-[10px] text-neutral font-mono">
                              {formatNotifTime(n.timecreated)}
                            </span>
                          </div>
                          {n.text && (
                            <p className="text-[11px] text-neutral/90 leading-relaxed break-words whitespace-pre-wrap">
                              {cleanNotificationText(n.text)}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-neutral space-y-1.5">
                        <Bell className="w-8 h-8 mx-auto opacity-30" />
                        <p className="font-bold text-xs">اعلانی برای نمایش وجود ندارد.</p>
                        <p className="text-[10px]">رویدادهای جدید تحصیلی مودل در اینجا ثبت می‌شوند.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </>
  );
}
