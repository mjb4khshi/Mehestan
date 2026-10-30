import React, { useState } from 'react';
import {
  Palette,
  Bell,
  RefreshCw,
  LogOut,
  ArrowRight,
  Check,
  X,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { cleanPersianText, toFaDigits } from '../utils/persianUtils';

export default function TopBar({ title, onBack, showBack = false }) {
  const { theme, setTheme, themes, isDark } = useTheme();
  const { siteInfo, refreshData, loading, logout, isAuthenticated } = useMoodleAuth();
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [notifySheetOpen, setNotifySheetOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-base/80 backdrop-blur-xl border-b border-base-500/30 px-4 py-2.5 flex items-center justify-between">
        {/* سمت راست: نشان مهستان یا دکمه بازگشت و عنوان */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer"
              title="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 grid place-items-center shadow-sm shrink-0">
              <img src="./mehestan-icon.svg" alt="مهستان" className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-sm font-black text-base-content truncate tracking-tight">{title || 'مهستان'}</h1>
            {isAuthenticated && siteInfo?.fullname && (
              <p className="text-[10px] text-neutral truncate font-medium">
                {cleanPersianText(siteInfo.fullname)}
              </p>
            )}
          </div>
        </div>

        {/* سمت چپ: دکمه‌های تم، همگام‌سازی، اعلان و خروج */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* دکمه انتخابگر ۱۶ تم رسمی سروستان */}
          <button
            type="button"
            onClick={() => setThemeSheetOpen(true)}
            className="p-2 rounded-xl text-neutral hover:text-primary hover:bg-base-500/20 transition cursor-pointer"
            title="پالت تم‌های سروستان"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* دکمه اعلان‌ها و پیام‌های دانشگاه */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setNotifySheetOpen(true)}
              className="p-2 rounded-xl text-neutral hover:text-primary hover:bg-base-500/20 transition cursor-pointer relative"
              title="اعلان‌ها و رویدادها"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          {/* دکمه همگام‌سازی زنده با مودل */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="p-2 rounded-xl text-neutral hover:text-primary hover:bg-base-500/20 transition cursor-pointer"
              title="به‌روزرسانی اطلاعات از مودل"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          )}

          {/* دکمه خروج */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-neutral hover:text-error hover:bg-error/10 transition cursor-pointer"
              title="خروج از حساب"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
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

      {/* شیت اعلان‌ها و مشخصات کاربر */}
      {notifySheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="sarv-card w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-base-500/30">
            <div className="p-4 border-b border-base-500/20 flex items-center justify-between bg-base-500/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black text-base-content">اطلاعات کاربری و سامانه</h3>
              </div>
              <button
                type="button"
                onClick={() => setNotifySheetOpen(false)}
                className="p-1 rounded-lg hover:bg-base-500/20 text-neutral"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-primary-soft border border-primary-soft space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <GraduationCap className="w-4 h-4" />
                  <span>{cleanPersianText(siteInfo?.sitename || 'سامانه مودل')}</span>
                </div>
                <p className="text-[11px] text-neutral">
                  دانشجو: <span className="font-bold text-base-content">{cleanPersianText(siteInfo?.fullname)}</span>
                </p>
                <p className="text-[10px] text-neutral font-mono">
                  شماره دانشجویی / نام کاربری: {toFaDigits(siteInfo?.username)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-base-500/15 border border-base-500/25 space-y-2 text-[11px] text-neutral leading-relaxed">
                <span className="font-bold text-base-content block">همگام با اکوسیستم سروستان:</span>
                <p>
                  مهستان به‌صورت بومی به تقویم، وظایف و پلنر هوشمند سروستان متصل است. تکالیف بارگیری‌شده را می‌توانید با یک کلیک به تسک‌های روزانه تبدیل فرمایید.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
