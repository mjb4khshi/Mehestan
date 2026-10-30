import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  Globe,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { UNIVERSITY_MOODLE_PRESETS } from '../services/moodle/endpoints';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { buildMoodleSSOLaunchUrl, parseMoodleSSOResponse } from '../services/moodle/sso';

export default function LoginScreen() {
  const { login, loginWithToken, loginWithDemo, loading, error: authError } = useMoodleAuth();
  const [selectedPreset, setSelectedPreset] = useState(UNIVERSITY_MOODLE_PRESETS[0].id);
  const [customUrl, setCustomUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showDirectForm, setShowDirectForm] = useState(false);

  // وضعیت لاگین مرکزی و ورود دستی توکن در وب
  const [waitingForSSO, setWaitingForSSO] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');

  const activePreset = UNIVERSITY_MOODLE_PRESETS.find((p) => p.id === selectedPreset);
  const isSSO = activePreset?.authType === 'sso';

  const getEffectiveUrl = () => {
    if (selectedPreset === 'custom') {
      return customUrl.trim();
    }
    return activePreset?.url || '';
  };

  // آغاز فرآیند لاگین مرکزی بر اساس سورس رسمی مودل (launch.php)
  const handleSSOLaunch = async () => {
    setLocalError('');
    const targetUrl = getEffectiveUrl();
    if (!targetUrl) {
      setLocalError('لطفاً آدرس سرور سامانه مودل را مشخص فرمایید.');
      return;
    }

    try {
      const { launchUrl } = buildMoodleSSOLaunchUrl(targetUrl, {
        service: activePreset?.mobileService || 'moodle_mobile_app',
        urlScheme: 'moodlemobile',
      });

      setWaitingForSSO(true);

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: launchUrl });
      } else {
        window.open(launchUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setLocalError(err.message || 'خطا در باز کردن صفحه احراز هویت مرکزی');
      setWaitingForSSO(false);
    }
  };

  // پردازش پیست کردن دستی لینک بازگشتی یا توکن در محیط مرورگر وب
  const handleManualTokenSubmit = async (e) => {
    e?.preventDefault();
    if (!manualTokenInput.trim()) return;

    setLocalError('');
    const targetUrl = getEffectiveUrl();

    try {
      const parsed = parseMoodleSSOResponse(manualTokenInput, targetUrl);
      if (!parsed.token) {
        throw new Error('توکن دسترسی در ورودی یافت نشد.');
      }
      await loginWithToken(targetUrl, parsed.token, parsed.privateToken);
    } catch (err) {
      setLocalError(err.message || 'اعتبارسنجی توکن با خطا مواجه شد.');
    }
  };

  // پیست خودکار از کلیپ‌بورد در وب
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualTokenInput(text);
        const targetUrl = getEffectiveUrl();
        const parsed = parseMoodleSSOResponse(text, targetUrl);
        if (parsed.token) {
          await loginWithToken(targetUrl, parsed.token, parsed.privateToken);
        }
      }
    } catch (err) {
      // اگر دسترسی کلیپ‌بورد داده نشد
    }
  };

  // ورود مستقیم با نام کاربری و رمز
  const handleDirectLogin = async (e) => {
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
          <p className="text-xs text-neutral">کلاینت یکپارچه سامانه یادگیری الکترونیکی مودل (LMS)</p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-base-500/20 text-neutral text-[10px] font-bold">
            <span>همگام با اکوسیستم سروستان</span>
          </div>
        </div>

        {/* کارت ورود */}
        <div className="mehestan-card p-6 space-y-5 shadow-2xl">
          {/* انتخاب دانشگاه */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>دانشگاه / سامانه مودل:</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                setWaitingForSSO(false);
                setLocalError('');
              }}
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

          {/* در صورت وجود احراز هویت مرکزی (مانند خواجه نصیر یا دانشگاه تهران) */}
          {isSSO && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>سامانه احراز هویت مرکزی ({activePreset?.badge})</span>
                </div>
                <p className="text-[11px] text-neutral leading-relaxed">
                  سامانه یادگیری این دانشگاه تنها از طریق درگاه مرکزی یکپارچه احراز هویت می‌پذیرد.
                </p>
              </div>

              {/* دکمه اصلی ورود با احراز هویت مرکزی */}
              <button
                type="button"
                onClick={handleSSOLaunch}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال بارگذاری اطلاعات از مودل...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    <span>{activePreset?.ssoButtonText}</span>
                  </>
                )}
              </button>

              {/* پنل راهنما و دریافت توکن در صورت انتظار در مرورگر */}
              {waitingForSSO && (
                <div className="p-4 rounded-xl bg-base-500/15 border border-base-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-warning text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>صفحه احراز هویت در مرورگر باز شد</span>
                  </div>
                  <p className="text-[11px] text-neutral leading-relaxed">
                    پس از ورود موفق در سامانه دانشگاه، در صورت استفاده از اپلیکیشن اندروید به صورت خودکار به مهستان بازمی‌گردید.
                    در مرورگر وب، لینک نهایی یا توکن بازگشتی را در کادر زیر قرار دهید:
                  </p>

                  <form onSubmit={handleManualTokenSubmit} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        placeholder="جای‌گذاری لینک بازگشتی یا توکن مودل..."
                        dir="ltr"
                        className="w-full px-3 py-2 pl-9 rounded-lg bg-base-500/20 border border-base-500/40 text-[11px] font-mono text-left focus:outline-none focus:border-primary transition"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        title="پیست از کلیپ‌بورد"
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content transition"
                      >
                        <ClipboardPaste className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!manualTokenInput.trim() || loading}
                      className="w-full py-2 rounded-lg bg-base-500/30 hover:bg-base-500/50 text-xs font-bold text-base-content transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      <span>تایید و ورود با توکن</span>
                    </button>
                  </form>
                </div>
              )}

              {/* گزینه کشویی برای فرم مستقیم سنتی */}
              <div className="pt-2 border-t border-base-500/20">
                <button
                  type="button"
                  onClick={() => setShowDirectForm(!showDirectForm)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-neutral hover:text-base-content transition py-1 cursor-pointer"
                >
                  <span>ورود با نام کاربری و رمز دستی (حساب‌های مستقیم یا مهمان)</span>
                  {showDirectForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* فرم ورود سنتی (همیشه برای دانشگاه‌های مستقیم، یا در صورت باز کردن کشویی برای SSO) */}
          {(!isSSO || showDirectForm) && (
            <form onSubmit={handleDirectLogin} className="space-y-4">
              {/* نام کاربری / شماره دانشجویی */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>شماره دانشجویی / نام کاربری:</span>
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
                  <span>رمز عبور:</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="کلمه عبور"
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

              {/* دکمه ورود فرم سنتی */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-base-500/30 hover:bg-base-500/50 text-base-content text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ارتباط با مودل...</span>
                  </>
                ) : (
                  <span>ورود مستقیم با نام کاربری و رمز</span>
                )}
              </button>
            </form>
          )}

          {/* خطا */}
          {(localError || authError) && (
            <div className="p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="leading-relaxed">{localError || authError}</p>
            </div>
          )}

          {/* حالت دمو و آزمایشی */}
          <div className="pt-2 border-t border-base-500/20">
            <button
              type="button"
              onClick={loginWithDemo}
              className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>پیش‌نمایش سریع مهستان (حالت دمو دانشگاه خواجه نصیر)</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-neutral/70 text-center leading-relaxed">
          ارتباط مستقیم با وب‌سرویس رسمی سامانه مودل دانشگاه شما و پروتکل امن Moodle Mobile
        </p>
      </div>
    </div>
  );
}
