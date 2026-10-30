import React from 'react';
import { Moon, Sun, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMoodleAuth } from '../context/MoodleAuthContext';

export default function TopBar({ title, onBack, showBack = false }) {
  const { isDark, toggleTheme } = useTheme();
  const { siteInfo, refreshData, loading, logout, isAuthenticated } = useMoodleAuth();

  return (
    <header className="sticky top-0 z-40 bg-base/80 backdrop-blur-xl border-b border-base-500/30 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center">
            <img src="./mehestan-icon.svg" alt="مهستان" className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-black text-base-content truncate">{title || 'مهستان'}</h1>
          {isAuthenticated && siteInfo?.fullname && (
            <p className="text-[10px] text-neutral truncate">{siteInfo.fullname}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isAuthenticated && (
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="p-2 rounded-xl text-neutral hover:text-primary hover:bg-base-500/20 transition cursor-pointer"
            title="به‌روزرسانی اطلاعات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer"
          title="تغییر تم"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
        </button>

        {isAuthenticated && (
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-neutral hover:text-danger hover:bg-danger-soft transition cursor-pointer"
            title="خروج از حساب"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
