import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAllAssignmentsToSarvestan } from '../services/sarvestanBridge';
import { cleanPersianText, toFaDigits } from '../utils/persianUtils';

export default function SettingsScreen() {
  const { theme, setTheme, themes } = useTheme();
  const { session, siteInfo, assignments, logout } = useMoodleAuth();
  const [msg, setMsg] = useState('');

  const handleExportAll = () => {
    exportAllAssignmentsToSarvestan(assignments);
    setMsg('تمام تکالیف با موفقیت برای سروستان ارسال شدند.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleClearCache = () => {
    localStorage.removeItem('mehestan_moodle_courses_v1');
    localStorage.removeItem('mehestan_moodle_assignments_v1');
    setMsg('حافظه موقت دروس و تکالیف با موفقیت پاک‌سازی شد.');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto text-right">
      <div className="sarv-card p-4 space-y-1 shadow-sm">
        <h2 className="text-sm font-black text-base-content flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span>تنظیمات مهستان</span>
        </h2>
        <p className="text-xs text-neutral">شخصی‌سازی ظاهر، پالت‌های رنگی و یکپارچگی با اکوسیستم سروستان</p>
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

      {/* یکپارچگی با سروستان */}
      <div className="sarv-card p-4 space-y-3 shadow-sm">
        <h3 className="text-xs font-black text-base-content flex items-center gap-2">
          <Share2 className="w-4 h-4 text-emerald-500" />
          <span>پل ارتباطی دوطرفه با سروستان</span>
        </h3>
        <p className="text-xs text-neutral leading-relaxed">
          انتقال خودکار تمامی تکالیف و موعدهای امتحانی به تقویم، ویجت‌ها و پلنر هوشمند مطالعه سروستان جهت نمایش در صفحه قفل و هوم‌اسکرین.
        </p>
        <button
          type="button"
          onClick={handleExportAll}
          className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-black hover:bg-emerald-500/25 transition cursor-pointer"
        >
          انتقال تمام تکالیف به سروستان
        </button>
      </div>

      {/* انتخابگر ۱۶ تم رسمی سروستان */}
      <div className="sarv-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-base-content flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span>پالت تم‌های سروستان (۱۶ تم)</span>
          </h3>
          <span className="text-[10px] text-neutral font-bold">تم فعال: {themes.find((t) => t.id === theme)?.persianName}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-base-500/25 hover:border-base-500/50 hover:bg-base-500/10'
                }`}
              >
                <div className="flex items-center -space-x-1">
                  <span
                    className="w-4 h-4 rounded-full border border-black/25 z-10"
                    style={{ backgroundColor: t.primary }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/25"
                    style={{ backgroundColor: t.base }}
                  />
                </div>
                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-primary' : 'text-base-content'}`}>
                  {t.persianName}
                </span>
              </button>
            );
          })}
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
    </div>
  );
}
