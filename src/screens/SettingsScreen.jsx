import React, { useState } from 'react';
import { Settings, Moon, Sun, Share2, LogOut, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAllAssignmentsToSarvestan } from '../services/sarvestanBridge';

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
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
    setMsg('کش محلی دروس و تکالیف پاک‌سازی شد.');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto text-right">
      <div className="mehestan-card p-4 space-y-1">
        <h2 className="text-sm font-black text-base-content flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span>تنظیمات مهستان</span>
        </h2>
        <p className="text-xs text-neutral">مدیریت حساب، ظاهر و یکپارچگی با اکوسیستم سروستان</p>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* حساب کاربری */}
      <div className="mehestan-card p-4 space-y-3">
        <h3 className="text-xs font-black text-base-content">مشخصات اتصال مودل</h3>
        <div className="space-y-1.5 text-xs text-neutral">
          <div className="flex justify-between">
            <span>دانشجو:</span>
            <span className="font-bold text-base-content">{siteInfo?.fullname || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>سرور مودل:</span>
            <span className="font-mono text-[11px] text-base-content" dir="ltr">{session?.siteUrl}</span>
          </div>
        </div>
      </div>

      {/* یکپارچگی با سروستان */}
      <div className="mehestan-card p-4 space-y-3">
        <h3 className="text-xs font-black text-base-content flex items-center gap-2">
          <Share2 className="w-4 h-4 text-emerald-500" />
          <span>پل ارتباطی با سروستان</span>
        </h3>
        <p className="text-xs text-neutral leading-relaxed">
          انتقال تمام تکالیف فعال به تقویم و کارهای مطالعه سروستان جهت نمایش در ویجت‌های صفحه اصلی گوشی.
        </p>
        <button
          type="button"
          onClick={handleExportAll}
          className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/25 transition cursor-pointer"
        >
          انتقال تمام تکالیف به سروستان
        </button>
      </div>

      {/* تم و پوسته */}
      <div className="mehestan-card p-4 space-y-3">
        <h3 className="text-xs font-black text-base-content">پوسته و تم بصری</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setTheme('persian-dark')}
            className={`p-3 rounded-xl border text-center font-bold transition cursor-pointer ${
              theme === 'persian-dark' ? 'border-primary bg-primary/10 text-primary' : 'border-base-500/30 text-neutral'
            }`}
          >
            تاریک اصیل (دارک)
          </button>
          <button
            type="button"
            onClick={() => setTheme('persian-light')}
            className={`p-3 rounded-xl border text-center font-bold transition cursor-pointer ${
              theme === 'persian-light' ? 'border-primary bg-primary/10 text-primary' : 'border-base-500/30 text-neutral'
            }`}
          >
            روشن ایرانی (لایت)
          </button>
        </div>
      </div>

      {/* پاک‌سازی حافظه و خروج */}
      <div className="mehestan-card p-4 space-y-2">
        <button
          type="button"
          onClick={handleClearCache}
          className="w-full py-2.5 rounded-xl border border-base-500/40 text-neutral hover:text-base-content text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>پاک‌سازی حافظه کش دروس</span>
        </button>

        <button
          type="button"
          onClick={logout}
          className="w-full py-2.5 rounded-xl bg-danger-soft text-danger text-xs font-bold hover:bg-danger hover:text-white transition cursor-pointer flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج از حساب کاربری</span>
        </button>
      </div>
    </div>
  );
}
