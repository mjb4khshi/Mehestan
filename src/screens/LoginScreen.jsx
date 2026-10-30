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

const DEFAULT_LMS_URL = 'https://vc.kntu.ac.ir/';

export default function LoginScreen() {
  const { login, loginWithToken, loginWithDemo, loading, error: authError } = useMoodleAuth();
  const [lmsUrl, setLmsUrl] = useState(DEFAULT_LMS_URL);
  const [siteConfig, setSiteConfig] = useState(null);
  const [siteChecking, setSiteChecking] = useState(false);
  const [siteError, setSiteError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  // وضعیت لاگین مرکزی و دریافت خودکار توکن
  const [waitingForSSO, setWaitingForSSO] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [activeLaunchUrl, setActiveLaunchUrl] = useState('');
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
          // در صورت بروز خطا در استعلام، خطا را ملایم نشان داده و فرم دستی را باز می‌گذاریم
          setSiteError('امکان دریافت خودکار مشخصات سامانه وجود نداشت؛ می‌توانید از فرم مستقیم یا ورود SSO استفاده نمایید.');
        }
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cleanUrl]);

  // شروع فرآیند احراز هویت برای یک Identity Provider خاص یا کل سیستم دانشگاه
  const handleLaunchSSO = async (oauthssoId = null) => {
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
        oauthsso: oauthssoId !== null ? oauthssoId : (cleanUrl.includes('kntu') ? 1 : null),
        confirmed: 1,
      });

      setActiveLaunchUrl(launchUrl);
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

  // ورود مستقیم با نام کاربری و رمز در داخل اپلیکیشن
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
      setLocalError(err.message || 'خطا در ورود به سامانه مودل');
    }
  };

  const hasIdentityProviders = siteConfig?.identityProviders && siteConfig.identityProviders.length > 0;
  const isKntuDefault = cleanUrl.includes('kntu');

  return (
    <div className="min-h-screen bg-base text-base-content flex items-center justify-center p-4 relative overflow-hidden">
      {/* نور پس‌زمینه لطیف سبک سروستان */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-5 relative z-10">
        {/* نشان و هویت مهستان */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/25 grid place-items-center shadow-lg shadow-primary/15 sarv-glow-primary">
            <img src="./mehestan-icon.svg" alt="مهستان" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-base-content tracking-tight">مهستان</h1>
          <p className="text-xs text-neutral font-medium">کلاینت بومی و همگام سامانه آموزش الکترونیکی و مجازی (Moodle LMS)</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-base-500/25 border border-base-500/40 text-neutral text-[11px] font-bold">
            <span>همگام با سروستان</span>
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
                  {siteConfig.siteName}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-neutral">
                  <span className="flex items-center gap-1 text-success font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>
                    وب‌سرویس همراه فعال است
                  </span>
                  <span>•</span>
                  <span>نسخه اختصاصی</span>
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

          {/* بخش اول: درگاه‌های ورود مرکزی و احراز هویت یکپارچه (SSO) */}
          <div className="space-y-2.5">
            {hasIdentityProviders ? (
              /* رندر ارائه‌دهندگان هویت اختصاصی دانشگاه (مانند حساب دانشگاهی خواجه نصیر) */
              siteConfig.identityProviders.map((provider) => (
                <button
                  key={provider.name}
                  type="button"
                  onClick={() => handleLaunchSSO(provider.id)}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {provider.iconUrl ? (
                    <img src={provider.iconUrl} alt="" className="w-4 h-4 rounded-sm object-contain" />
                  ) : (
                    <KeyRound className="w-4 h-4 shrink-0" />
                  )}
                  <span>ورود با {provider.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 mr-auto" />
                </button>
              ))
            ) : isKntuDefault ? (
              /* دکمه اختصاصی خواجه نصیر حتی پیش از پایان بارگذاری کانفیگ */
              <button
                type="button"
                onClick={() => handleLaunchSSO(1)}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>ورود با حساب دانشگاهی (SSO مرکزی)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 mr-auto" />
              </button>
            ) : siteConfig?.typeOfLogin === 1 ? (
              /* سامانه دارای SSO عمومی بدون ارائه‌دهنده نام‌دار */
              <button
                type="button"
                onClick={() => handleLaunchSSO(null)}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>ورود از طریق درگاه دانشگاه (SSO)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 mr-auto" />
              </button>
            ) : null}

            {/* پنل بازخورد ورود SSO در نسخه وب / راهنما */}
            {waitingForSSO && (
              <div className="p-3.5 rounded-xl bg-base-500/15 border border-base-500/30 space-y-3">
                <div className="flex items-center gap-2 text-warning text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>درگاه دانشگاه در مرورگر باز شد</span>
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
                  در اپلیکیشن اندروید پس از ورود در دانشگاه به‌صورت خودکار وارد می‌شوید. در رایانه، مرورگر شما صفحه تاییدیه را نمایش می‌دهد؛ لینک «برای راه‌اندازی برنامه اینجا کلیک کنید» را کپی و در کادر زیر قرار دهید:
                </p>

                <form onSubmit={handleManualTokenSubmit} className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="جای‌گذاری پیوند moodlemobile://token=... یا کلید ۳۲ حرفی"
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
                    <span>تایید و ورود به مهستان</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* جداکننده ظریف */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-base-500/30"></div>
            <span className="flex-shrink mx-3 text-[11px] text-neutral font-bold">یا ورود با نام کاربری و رمز مودل</span>
            <div className="flex-grow border-t border-base-500/30"></div>
          </div>

          {/* بخش دوم: فرم نام کاربری و رمز دستی داخل اپلیکیشن */}
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
              className="w-full py-3 px-4 rounded-xl bg-base-500/30 hover:bg-base-500/50 border border-base-500/40 text-xs font-black text-base-content transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال اعتبارسنجی...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>ورود مستقیم به سامانه</span>
                </>
              )}
            </button>
          </form>

          {/* پیام‌های خطا */}
          {(localError || authError) && (
            <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-xs text-error flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* بخش دسترسی سریع به کلیدهای کاربری (managetoken.php) */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowAdvancedToken(!showAdvancedToken)}
              className="text-[11px] text-neutral/80 hover:text-primary transition flex items-center justify-center gap-1 mx-auto cursor-pointer font-bold"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{showAdvancedToken ? 'بستن راهنمای پیشرفته توکن' : 'دریافت مستقیم کلید وب‌سرویس از حساب مودل'}</span>
            </button>

            {showAdvancedToken && (
              <div className="mt-2.5 p-3 rounded-xl bg-base-500/15 border border-base-500/30 text-right space-y-2 text-[11px] text-neutral leading-relaxed">
                <p>
                  اگر هم‌اکنون در این مرورگر وارد سامانه مودل شده‌اید، می‌توانید مستقیماً به صفحه کلیدهای امنیتی خود بروید:
                </p>
                <a
                  href={`${siteConfig?.siteUrl || cleanUrl}/user/managetoken.php`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/25 font-bold hover:bg-primary/20 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>باز کردن صفحه کلیدهای من (managetoken.php)</span>
                </a>
                <p className="text-[10px] text-neutral/70">
                  توکن ۳۲ حرفی ستون Moodle mobile web service را کپی کرده و در کادر بالا تایید نمایید.
                </p>
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
