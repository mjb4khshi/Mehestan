import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { UNIVERSITY_MOODLE_PRESETS } from '../services/moodle/endpoints';
import { useMoodleAuth } from '../context/MoodleAuthContext';

export default function LoginScreen() {
  const { login, loading, error: authError } = useMoodleAuth();
  const [selectedPreset, setSelectedPreset] = useState(UNIVERSITY_MOODLE_PRESETS[0].id);
  const [customUrl, setCustomUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const activePreset = UNIVERSITY_MOODLE_PRESETS.find((p) => p.id === selectedPreset);

  const getEffectiveUrl = () => {
    if (selectedPreset === 'custom') {
      return customUrl.trim();
    }
    return activePreset?.url || '';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');

    const targetUrl = getEffectiveUrl();
    if (!targetUrl) {
      setLocalError('لطفاً آدرس سرور سامانه مودل را وارد فرمایید.');
      return;
    }
    if (!username.trim() || !password.trim()) {
      setLocalError('لطفاً شماره دانشجویی و رمز عبور را وارد فرمایید.');
      return;
    }

    try {
      await login(targetUrl, username, password);
    } catch (err) {
      setLocalError(err.message || 'خطا در ورود به سامانه مودل');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-base-900 via-base-900 to-base-950">
      <div className="w-full max-w-md space-y-6">
        {/* برندینگ مهستان */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 border border-primary/20 grid place-items-center shadow-lg shadow-primary/10">
            <img src="./mehestan-icon.svg" alt="مهستان" className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-base-content tracking-tight">مهستان</h2>
          <p className="text-xs text-neutral">کلاینت مدرن سامانه یادگیری الکترونیکی مودل (LMS)</p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-base-500/20 text-neutral text-[10px] font-bold">
            <span>همگام با اکوسیستم سروستان</span>
          </div>
        </div>

        {/* فرم ورود */}
        <form onSubmit={handleLogin} className="mehestan-card p-6 space-y-4 shadow-2xl">
          {/* انتخاب دانشگاه */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>دانشگاه / سامانه مودل:</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-bold text-base-content focus:outline-none focus:border-primary transition"
            >
              {UNIVERSITY_MOODLE_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-base-900 text-base-content">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPreset === 'custom' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral">آدرس سرور مودل (با https):</label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://lms.university.ac.ir"
                dir="ltr"
                className="w-full px-3 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-mono text-left focus:outline-none focus:border-primary transition"
              />
            </div>
          )}

          {/* نام کاربری / شماره دانشجویی */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>شماره دانشجویی / نام کاربری مودل:</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: 401123456"
              dir="ltr"
              required
              className="w-full px-3 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-mono text-left focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* رمز عبور */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>رمز عبور مودل:</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="کلمه عبور سامانه یادگیری"
                dir="ltr"
                required
                className="w-full px-3 py-2.5 pl-10 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-mono text-left focus:outline-none focus:border-primary transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* خطا */}
          {(localError || authError) && (
            <div className="p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="leading-relaxed">{localError || authError}</p>
            </div>
          )}

          {/* دکمه ورود */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال دریافت توکن از مودل...</span>
              </>
            ) : (
              <span>ورود به سامانه مهستان</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-neutral/70 text-center leading-relaxed">
          اتصال به صورت مستقیم و بدون واسطه به وب‌سرویس رسمی سامانه مودل دانشگاه شما انجام می‌پذیرد.
        </p>
      </div>
    </div>
  );
}
