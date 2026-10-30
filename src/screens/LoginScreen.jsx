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
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { buildMoodleSSOLaunchUrl, parseMoodleSSOResponse } from '../services/moodle/sso';

const DEFAULT_LMS_URL = 'https://vc.kntu.ac.ir/';

export default function LoginScreen() {
  const { login, loginWithToken, loginWithDemo, loading, error: authError } = useMoodleAuth();
  const [lmsUrl, setLmsUrl] = useState(DEFAULT_LMS_URL);
  const [authMode, setAuthMode] = useState('sso'); // 'sso' | 'direct'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  // وضعیت لاگین مرکزی و ورود دستی توکن در وب
  const [waitingForSSO, setWaitingForSSO] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [activeLaunchUrl, setActiveLaunchUrl] = useState('');

  const cleanUrl = lmsUrl.trim();

  // آغاز فرآیند لاگین مرکزی بر اساس پروتکل استاندارد مودل (launch.php)
  const handleSSOLaunch = async () => {
    setLocalError('');
    if (!cleanUrl) {
      setLocalError('لطفاً آدرس سامانه مودل دانشگاه را وارد نمایید.');
      return;
    }

    try {
      const { launchUrl } = buildMoodleSSOLaunchUrl(cleanUrl, {
        service: 'moodle_mobile_app',
        urlScheme: 'moodlemobile',
        oauthsso: '1',
      });

      setActiveLaunchUrl(launchUrl);
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

  // پردازش پیست کردن دستی لینک بازگشتی یا توکن در وب
  const handleManualTokenSubmit = async (e) => {
    e?.preventDefault();
    if (!manualTokenInput.trim()) return;

    setLocalError('');
    try {
      const parsed = parseMoodleSSOResponse(manualTokenInput, cleanUrl);
      if (!parsed.token) {
        throw new Error('توکن دسترسی در ورودی یافت نشد.');
      }
      await loginWithToken(cleanUrl, parsed.token, parsed.privateToken);
    } catch (err) {
      setLocalError(err.message || 'اعتبارسنجی توکن با خطا مواجه شد.');
    }
  };

  // پیست خودکار از حافظه کلیپ‌بورد در وب
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualTokenInput(text);
        const parsed = parseMoodleSSOResponse(text, cleanUrl);
        if (parsed.token) {
          await loginWithToken(cleanUrl, parsed.token, parsed.privateToken);
        }
      }
    } catch (err) {
      // عدم دسترسی به کلیپ‌بورد
    }
  };

  // ورود مستقیم با نام کاربری و رمز سنتی
  const handleDirectLogin = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!cleanUrl) {
      setLocalError('لطفاً آدرس سامانه مودل را وارد فرمایید.');
      return;
    }
    if (!username.trim() || !password.trim()) {
      setLocalError('لطفاً شماره دانشجویی و رمز عبور را وارد فرمایید.');
      return;
    }

    try {
      await login(cleanUrl, username, password);
    } catch (err) {
      setLocalError(err.message || 'خطا در ورود به سامانه مودل');
    }
  };

  return (
    <div className="min-h-screen bg-base text-base-content flex items-center justify-center p-4 relative overflow-hidden">
      {/* نور پس‌زمینه لطیف سبک سروستان */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* نشان و هویت مهستان */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/25 grid place-items-center shadow-lg shadow-primary/15 sarv-glow-primary">
            <img src="./mehestan-icon.svg" alt="مهستان" className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-base-content tracking-tight">مهستان</h2>
          <p className="text-xs text-neutral font-medium">کلاینت سامانه آموزش الکترونیکی و مجازی مودل (LMS)</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-base-500/25 border border-base-500/40 text-neutral text-[11px] font-bold">
            <span>همگام با سروستان</span>
          </div>
        </div>

        {/* کارت ورود سبک سروستان */}
        <div className="sarv-card p-6 space-y-5 shadow-2xl">
          {/* ورودی مستقیم آدرس سرور مودل (بدون لیست کشویی) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span>آدرس سامانه آموزش الکترونیکی (LMS):</span>
              </label>
              {cleanUrl !== DEFAULT_LMS_URL && (
                <button
                  type="button"
                  onClick={() => setLmsUrl(DEFAULT_LMS_URL)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  title="بازنشانی به خواجه نصیر"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>خواجه نصیر</span>
                </button>
              )}
            </div>

            <input
              type="url"
              value={lmsUrl}
              onChange={(e) => {
                setLmsUrl(e.target.value);
                setWaitingForSSO(false);
                setLocalError('');
              }}
              placeholder="https://vc.kntu.ac.ir/"
              dir="ltr"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-mono text-left focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* تب انتخاب روش ورود سبک کنترل سگمنت سروستان */}
          <div className="sarv-seg">
            <button
              type="button"
              onClick={() => {
                setAuthMode('sso');
                setLocalError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'sso'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ورود مرکزی (SSO)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('direct');
                setLocalError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'direct'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>نام کاربری و رمز دستی</span>
            </button>
          </div>

          {/* حالت اول: ورود مرکزی (SSO) */}
          {authMode === 'sso' ? (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-primary-soft border border-primary-soft space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>احراز هویت یکپارچه دانشگاه</span>
                </div>
                <p className="text-[11px] text-neutral leading-relaxed">
                  ورود مستقیم از طریق درگاه احراز هویت مرکزی دانشگاه و دریافت توکن امن وب‌سرویس بر اساس پروتکل Moodle Mobile انجام می‌پذیرد.
                </p>
              </div>

              {/* دکمه اصلی ورود مرکزی */}
              <button
                type="button"
                onClick={handleSSOLaunch}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال بارگذاری اطلاعات از مودل...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    <span>ورود با سامانه احراز هویت مرکزی دانشگاه (SSO)</span>
                  </>
                )}
              </button>

              {/* پنل انتظار و پیست توکن برای وب */}
              {waitingForSSO && (
                <div className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-warning text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>صفحه احراز هویت در مرورگر باز شد</span>
                  </div>
                  {activeLaunchUrl && (
                    <div className="flex items-center justify-between text-[10px] text-neutral bg-base-500/20 px-2.5 py-1.5 rounded-lg font-mono">
                      <span className="truncate max-w-[220px]" dir="ltr">{activeLaunchUrl}</span>
                      <a
                        href={activeLaunchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-sans font-bold shrink-0 mr-2"
                      >
                        باز کردن مجدد
                      </a>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral leading-relaxed">
                    پس از ورود موفق در درگاه دانشگاه، در اپلیکیشن اندروید به صورت خودکار وارد می‌شوید. در نسخه وب، لینک یا توکن بازگشتی (moodlemobile://token=...) را در کادر زیر قرار دهید:
                  </p>

                  <form onSubmit={handleManualTokenSubmit} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        placeholder="جای‌گذاری لینک بازگشتی moodlemobile://token=... یا توکن"
                        dir="ltr"
                        className="w-full px-3 py-2 pl-9 rounded-lg bg-base-500/20 border border-base-500/40 text-[11px] font-mono text-left focus:outline-none focus:border-primary transition"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        title="پیست از کلیپ‌بورد"
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content transition cursor-pointer"
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

                    <div className="pt-1.5 text-[10px] text-neutral/80 space-y-1 leading-relaxed">
                      <p>راهنمای نسخه وب: پس از ورود در سامانه دانشگاه، مرورگر لینکی با پیشوند //:moodlemobile می‌سازد؛ آن لینک را کپی کنید.</p>
                      <p>
                        همچنین می‌توانید توکن وب‌سرویس ۳۲ حرفی خود را از مسیر «پروفایل » کلیدهای امنیتی» در سامانه مودل (
                        <a
                          href="https://vc.kntu.ac.ir/user/managetoken.php"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-bold"
                        >
                          managetoken.php
                        </a>
                        ) کپی و مستقیماً اینجا پیست کنید.
                      </p>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* حالت دوم: ورود با نام کاربری و رمز مستقیم */
            <form onSubmit={handleDirectLogin} className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-mono text-left focus:outline-none focus:border-primary transition"
                />
              </div>

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
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-base-500/20 border border-base-500/40 text-xs font-mono text-left focus:outline-none focus:border-primary transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ارتباط با سرور مودل...</span>
                  </>
                ) : (
                  <span>ورود به سامانه یادگیری</span>
                )}
              </button>
            </form>
          )}

          {/* پیام خطا */}
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
              <span>پیش‌نمایش سریع مهستان (حالت دمو خواجه نصیر)</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-neutral/70 text-center leading-relaxed font-medium">
          اتصال مستقیم به وب‌سرویس رسمی سامانه مودل دانشگاه شما و پروتکل امن Moodle Mobile
        </p>
      </div>
    </div>
  );
}
