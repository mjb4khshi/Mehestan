import React, { useState, useEffect } from 'react';
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
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { buildMoodleSSOLaunchUrl, parseMoodleSSOResponse } from '../services/moodle/sso';
import { fetchMoodlePublicConfig } from '../services/moodle/api';
import { cleanPersianText } from '../utils/persianUtils';

const DEFAULT_LMS_URL = 'https://vc.kntu.ac.ir/';

export default function LoginScreen() {
  const { login, loginWithToken, loginWithDemo, loading, error: authError } = useMoodleAuth();
  const [lmsUrl, setLmsUrl] = useState(DEFAULT_LMS_URL);
  const [siteConfig, setSiteConfig] = useState(null);
  const [siteChecking, setSiteChecking] = useState(false);
  const [siteError, setSiteError] = useState('');

  // حالت ورود: 'sso' (پیش‌فرض و پیشنهادی) یا 'direct' (نام کاربری و رمز)
  const [loginMethod, setLoginMethod] = useState('sso');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  // حالت‌های درگاه ورود مرکزی (SSO) و کلید دسترسی
  const [waitingForSSO, setWaitingForSSO] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showAdvancedToken, setShowAdvancedToken] = useState(false);

  const cleanUrl = lmsUrl.trim();

  // استعلام اطلاعات و ساختار لاگین هر دانشگاه به‌صورت سراسری و داینامیک
  useEffect(() => {
    let isMounted = true;
    if (!cleanUrl) {
      setSiteConfig(null);
      setSiteError('');
      return;
    }

    const timer = setTimeout(async () => {
      setSiteChecking(true);
      setSiteError('');
      try {
        const config = await fetchMoodlePublicConfig(cleanUrl);
        if (isMounted) {
          setSiteConfig(config);
          setSiteChecking(false);
        }
      } catch (err) {
        if (isMounted) {
          setSiteConfig(null);
          setSiteChecking(false);
          setSiteError('امکان دریافت خودکار مشخصات سامانه وجود نداشت؛ می‌توانید از فرم مستقیم یا ورود SSO استفاده نمایید.');
        }
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanUrl]);

  // ورود مستقیم با شماره دانشجویی و رمز داخل خود اپلیکیشن
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
      await login(siteConfig?.siteUrl || cleanUrl, username, password);
    } catch (err) {
      setLocalError(err.message || 'خطا در برقراری ارتباط با وب‌سرویس سامانه');
    }
  };

  // شروع فرآیند احراز هویت برای SSO
  const handleLaunchSSO = async () => {
    setLocalError('');
    if (!cleanUrl) {
      setLocalError('لطفاً آدرس سامانه مودل دانشگاه را وارد نمایید.');
      return;
    }

    try {
      const targetUrl = siteConfig?.siteUrl || cleanUrl;
      const { launchUrl } = buildMoodleSSOLaunchUrl(targetUrl, {
        service: 'moodle_mobile_app',
        urlScheme: 'moodlemobile',
        confirmed: 1,
      });

      setWaitingForSSO(true);

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: launchUrl });
      } else {
        window.open(launchUrl, '_blank');
      }
    } catch (err) {
      setLocalError(err.message || 'خطا در باز کردن درگاه احراز هویت مرکزی');
      setWaitingForSSO(false);
    }
  };

  // پردازش پیست کردن دستی لینک بازگشتی یا توکن در وب
  const handleManualTokenSubmit = async (e) => {
    e?.preventDefault();
    if (!manualTokenInput.trim()) return;

    setLocalError('');
    try {
      const parsed = parseMoodleSSOResponse(manualTokenInput, siteConfig?.siteUrl || cleanUrl);
      if (!parsed.token) {
        throw new Error('توکن دسترسی در ورودی یافت نشد.');
      }
      await loginWithToken(siteConfig?.siteUrl || cleanUrl, parsed.token, parsed.privateToken);
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
        const parsed = parseMoodleSSOResponse(text, siteConfig?.siteUrl || cleanUrl);
        if (parsed.token) {
          await loginWithToken(siteConfig?.siteUrl || cleanUrl, parsed.token, parsed.privateToken);
        }
      }
    } catch (err) {
      // عدم دسترسی به کلیپ‌بورد
    }
  };

  return (
    <div className="min-h-screen bg-base text-base-content flex items-center justify-center p-4 relative overflow-hidden">
      {/* نور پس‌زمینه لطیف سبک سروستان */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-5 relative z-10">
        {/* نشان و هویت مهستان */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 transition-transform hover:scale-105">
            <svg
              viewBox="0 0 261.778 284.888"
              className="w-9 h-9 drop-shadow-sm"
              style={{ fill: 'var(--color-primary, #0066a4)' }}
              aria-label="مهستان"
            >
              <path
                d="M249.915,219.637A142.574,142.574,0,0,1,9.144,229.3a10.687,10.687,0,0,1,5.2-16.123c53.684-19.214,82.435-41.48,99.12-73.329,17.565-33.528,22.1-70.255,9.816-120.6A10.687,10.687,0,0,1,134.236,6.046,142.566,142.566,0,0,1,249.915,219.637Z"
                transform="translate(-7.254 -6.03)"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-base-content tracking-tight">مهستان</h1>
          <p className="text-xs text-neutral font-medium">کلاینت مدرن سامانه آموزش الکترونیکی و مجازی مودل (LMS)</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-base-500/25 border border-base-500/40 text-neutral text-[11px] font-bold">
            <span>همگام با اکوسیستم سروستان</span>
          </div>
        </div>

        {/* کارت اصلی ورود */}
        <div className="sarv-card p-6 space-y-5 shadow-2xl">
          {/* ورودی آدرس سامانه مودل */}
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

            <div className="relative">
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
              {siteChecking && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral" title="در حال بررسی وب‌سرویس دانشگاه">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* نوار وضعیت سامانه شناسایی‌شده */}
          {siteConfig && (
            <div className="p-3 rounded-xl bg-primary-soft border border-primary-soft flex items-start gap-2.5 transition-all">
              <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-xs font-black text-base-content truncate" title={siteConfig.siteName}>
                  {cleanPersianText(siteConfig.siteName)}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-neutral">
                  <span className="flex items-center gap-1 text-success font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>
                    وب‌سرویس همراه فعال است
                  </span>
                  <span>•</span>
                  <span>اتصال مستقیم وب‌سرویس</span>
                </div>
              </div>
            </div>
          )}

          {siteError && (
            <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/25 text-[11px] text-warning flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{siteError}</span>
            </div>
          )}

          {/* تب‌بار انتخاب شیوه ورود — ورود مرکزی SSO کاملاً در دید و پیش‌فرض */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-base-500/20 border border-base-500/30">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('sso');
                setLocalError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === 'sso'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>حساب یکپارچه (SSO)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('direct');
                setLocalError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === 'direct'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              <User className="w-4 h-4" />
              <span>نام کاربری و رمز</span>
            </button>
          </div>

          {/* روش اول: درگاه احراز هویت مرکزی دانشگاه (پیش‌فرض و کاملاً برجسته) */}
          {loginMethod === 'sso' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-base-500/15 border border-primary/20 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-base-content">
                        درگاه یکپارچه احراز هویت (SSO)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        پیشنهادی
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral leading-relaxed">
                      ورود امن دانشجویان دانشگاه صنعتی خواجه نصیر از طریق درگاه رسمی دانشگاه، بدون نیاز به درج رمز در برنامه.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchSSO}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>ورود از طریق درگاه مرکزی دانشگاه (SSO)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80 mr-auto" />
                </button>
              </div>

              {waitingForSSO && (
                <div className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-warning text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>در انتظار ورود و تایید هویت در مرورگر...</span>
                  </div>
                  <p className="text-[11px] text-neutral leading-relaxed">
                    در اپلیکیشن اندروید پس از لاگین در مرورگر، بازگشت به مهستان به صورت خودکار انجام می‌شود. همچنین می‌توانید پیوند تاییدیه یا کلید توکن را در کادر زیر قرار دهید:
                  </p>
                  <form onSubmit={handleManualTokenSubmit} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        placeholder="جای‌گذاری پیوند moodlemobile://token=... یا توکن ۳۲ حرفی"
                        dir="ltr"
                        className="w-full px-3 py-2.5 pl-10 rounded-xl bg-base-500/20 border border-base-500/40 text-[11px] font-mono text-left focus:outline-none focus:border-primary transition"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        title="پیست از کلیپ‌بورد"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content transition cursor-pointer"
                      >
                        <ClipboardPaste className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!manualTokenInput.trim() || loading}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-content text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تایید و تکمیل ورود با توکن</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* روش دوم: فرم مستقیم ورود با شماره دانشجویی و رمز */}
          {loginMethod === 'direct' && (
            <form onSubmit={handleDirectLogin} className="space-y-3.5">
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>رمز عبور:</span>
                  </label>
                  {siteConfig?.forgottenPasswordUrl && (
                    <a
                      href={siteConfig.forgottenPasswordUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-neutral hover:text-primary transition font-bold"
                    >
                      فراموشی رمز؟
                    </a>
                  )}
                </div>
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال اعتبارسنجی و ورود...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>ورود مستقیم به مهستان</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* پیام‌های خطا */}
          {(localError || authError) && (
            <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-xs text-error flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* بخش دریافت مستقیم کلید از managetoken.php */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedToken(!showAdvancedToken)}
              className="text-[11px] text-neutral/80 hover:text-primary transition flex items-center justify-center gap-1 mx-auto cursor-pointer font-bold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showAdvancedToken ? 'بستن راهنمای توکن' : 'راهنمای دریافت مستقیم کلید وب‌سرویس'}</span>
            </button>

            {showAdvancedToken && (
              <div className="mt-2.5 p-3 rounded-xl bg-base-500/15 border border-base-500/30 text-right space-y-2 text-[11px] text-neutral leading-relaxed">
                <p>
                  در صورت تمایل می‌توانید با ورود به صفحه کلیدهای امنیتی حساب خود در مودل، کلید وب‌سرویس را مستقیماً بردارید:
                </p>
                <a
                  href={`${siteConfig?.siteUrl || cleanUrl}/user/managetoken.php`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/25 font-bold hover:bg-primary/20 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>صفحه کلیدهای امنیتی (managetoken.php)</span>
                </a>
              </div>
            )}
          </div>

          {/* دکمه پیش‌نمایش سریع مهستان (حالت دمو خواجه نصیر) */}
          <button
            type="button"
            onClick={loginWithDemo}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-primary/40 hover:border-primary/80 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>پیش‌نمایش سریع مهستان (حالت دمو خواجه نصیر)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
