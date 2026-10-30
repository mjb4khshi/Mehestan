import { Md5 } from 'ts-md5';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const SSO_STORAGE_KEY = 'mehestan_sso_pending';

/**
 * ایجاد آدرس استاندارد Moodle Mobile SSO Launch با استفاده از مشخصات مودل
 * Moodle Mobile SSO Handshake Spec (tool_mobile / launch.php)
 */
export function buildMoodleSSOLaunchUrl(siteUrl, options = {}) {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const service = options.service || 'moodle_mobile_app';
  // سامانه مودل به‌صورت پیش‌فرض پروتکل moodlemobile را در تنظیمات tool_mobile مجاز می‌داند
  const urlScheme = options.urlScheme || 'moodlemobile';
  const passport = options.passport ?? Math.random() * 1000;
  // برای خواجه نصیر و سامانه‌های SSO، پارامتر oauthsso=1 هدایت مستقیم به ورود مرکزی دانشگاه را آغاز می‌کند
  const oauthsso = options.oauthsso !== undefined ? options.oauthsso : (cleanSiteUrl.includes('kntu') ? 1 : null);
  // ارسال confirmed=1 مانع از ریدایرکت خالی و صفحه سیاه در مرورگرهای دسکتاپ می‌شود
  const confirmed = options.confirmed !== undefined ? options.confirmed : 1;

  let query = '';
  if (oauthsso) {
    query += `oauthsso=${encodeURIComponent(oauthsso)}&`;
  }
  query += `service=${encodeURIComponent(service)}&passport=${passport}&urlscheme=${encodeURIComponent(urlScheme)}`;
  if (confirmed) {
    query += `&confirmed=1`;
  }

  const launchUrl = `${cleanSiteUrl}/admin/tool/mobile/launch.php?${query}`;

  const pendingData = {
    siteUrl: cleanSiteUrl,
    passport,
    service,
    urlScheme,
    oauthsso: oauthsso || null,
    confirmed,
    createdAt: Date.now(),
  };

  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SSO_STORAGE_KEY, JSON.stringify(pendingData));
      localStorage.setItem(SSO_STORAGE_KEY, JSON.stringify(pendingData));
    }
  } catch (e) {
    console.warn('Failed to persist SSO pending state', e);
  }

  return {
    launchUrl,
    passport,
    cleanSiteUrl,
    urlScheme,
    service,
    oauthsso,
    confirmed,
  };
}

/**
 * دریافت اطلاعات نشست در انتظار تایید SSO
 */
export function getPendingSSOData() {
  try {
    const raw = sessionStorage.getItem(SSO_STORAGE_KEY) || localStorage.getItem(SSO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * پاکسازی وضعیت در انتظار SSO
 */
export function clearPendingSSOData() {
  try {
    sessionStorage.removeItem(SSO_STORAGE_KEY);
    localStorage.removeItem(SSO_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * اعتبارسنجی و استخراج توکن از خروجی لاگین مرکزی مودل
 * ورودی می‌تواند شامل:
 * ۱. لینک بازگشتی کامل: moodlemobile://token=... یا mehestan://token=...
 * ۲. فقط پارامتر توکن: token=...
 * ۳. رشته کدگذاری‌شده Base64 حاوی امضا و توکن (signature:::token:::privatetoken)
 * ۴. توکن خام ۳۲ حرفی مودل (Web Service Token)
 */
export function parseMoodleSSOResponse(rawInput, expectedSiteUrl = null) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('رشته توکن یا لینک بازگشتی نامعتبر است.');
  }

  let str = rawInput.trim();
  // حذف کوتیشن‌های احتمالی ابتدا و انتهای ورودی
  str = str.replace(/^["']|["']$/g, '').trim();

  // ۱. بررسی اشتباه رایج: کاربر آدرس صفحه شروع (launch.php) را بدون توکن پیست کرده باشد
  if (str.includes('/launch.php') && !str.includes('token=')) {
    throw new Error(
      'این آدرس صفحه شروع لاگین است، نه توکن نهایی. لطفاً ابتدا در صفحه بازشده با شماره دانشجویی و رمز دانشگاه لاگین کنید. پس از ورود، لینکی که با //:moodlemobile آغاز می‌شود یا توکن ۳۲ حرفی مودل را در این کادر قرار دهید.'
    );
  }

  // ۲. دیکود اولیه کاراکترهای URL Encoded
  try {
    str = decodeURIComponent(str);
  } catch (e) {
    // Ignore
  }

  // ۳. بررسی مستقیم توکن ۳۲ حرفی هگزادسیمال وب‌سرویس
  if (/^[a-f0-9]{32}$/i.test(str)) {
    return {
      success: true,
      token: str,
      privateToken: null,
      isSSO: false,
    };
  }

  // ۴. استخراج مقدار توکن در صورت وجود در URL
  let candidate = str;
  if (candidate.includes('token=')) {
    candidate = candidate.split('token=')[1] || '';
    candidate = candidate.split('&')[0];
    candidate = candidate.split('#')[0];
  }

  // حذف اسلش یا کاراکترهای نامعتبر انتهای مقدار
  candidate = candidate.replace(/[\/#?]+$/, '').trim();

  if (/^[a-f0-9]{32}$/i.test(candidate)) {
    return {
      success: true,
      token: candidate,
      privateToken: null,
      isSSO: false,
    };
  }

  // ۵. آماده‌سازی برای دیکود Base64 و تبدیل Base64URL
  let b64 = candidate.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }

  let decodedText = '';
  try {
    decodedText = atob(b64);
  } catch (e) {
    // اگر دیکود Base64 با خطا مواجه شد، جستجوی هرگونه توکن ۳۲ حرفی موجود در ورودی
    const hexMatch = rawInput.match(/[a-f0-9]{32}/i);
    if (hexMatch) {
      return {
        success: true,
        token: hexMatch[0],
        privateToken: null,
        isSSO: true,
      };
    }
    throw new Error(
      'قالب توکن یا لینک بازگشتی شناخته نشد. لطفاً لینک کامل moodlemobile://token=... یا توکن ۳۲ حرفی وب‌سرویس مودل را وارد فرمایید.'
    );
  }

  // ۶. تفکیک فرمت رسمی مودل: signature:::token:::privateToken
  if (decodedText.includes(':::')) {
    const parts = decodedText.split(':::');
    const receivedSignature = parts[0];
    const token = parts[1];
    const privateToken = parts[2] || null;

    const pending = getPendingSSOData();
    const siteUrlToCheck = expectedSiteUrl || pending?.siteUrl;
    const passportToCheck = pending?.passport;

    let signatureValid = true;
    if (siteUrlToCheck && passportToCheck !== undefined) {
      const cleanUrl = siteUrlToCheck.replace(/\/+$/, '');
      let expectedSig = Md5.hashAsciiStr(cleanUrl + passportToCheck);

      if (expectedSig !== receivedSignature) {
        const altUrl = cleanUrl.startsWith('https://')
          ? cleanUrl.replace('https://', 'http://')
          : cleanUrl.replace('http://', 'https://');
        expectedSig = Md5.hashAsciiStr(altUrl + passportToCheck);
      }

      signatureValid = expectedSig === receivedSignature;
    }

    return {
      success: true,
      token,
      privateToken,
      signature: receivedSignature,
      signatureValid,
      isSSO: true,
      siteUrl: siteUrlToCheck,
    };
  }

  // ۷. اگر پس از دیکود فرمت ::: نبود، بررسی وجود توکن ۳۲ حرفی در متن دیکود شده
  const embeddedHex = decodedText.match(/[a-f0-9]{32}/i);
  if (embeddedHex) {
    return {
      success: true,
      token: embeddedHex[0],
      privateToken: null,
      isSSO: true,
    };
  }

  // در نهایت اگر توکنی یافت نشد
  const anyHex = rawInput.match(/[a-f0-9]{32}/i);
  if (anyHex) {
    return {
      success: true,
      token: anyHex[0],
      privateToken: null,
      isSSO: true,
    };
  }

  throw new Error('توکن معتبری در ورودی یافت نشد.');
}

/**
 * راه‌اندازی شنونده Deep Link برای کلاینت Capacitor و محیط وب
 */
export function setupDeepLinkListener(onTokenReceived) {
  let removeCapacitorListener = null;

  if (Capacitor.isNativePlatform()) {
    // شنود باز شدن اپلیکیشن با custom url scheme در اندروید
    App.addListener('appUrlOpen', (event) => {
      try {
        if (event?.url && (event.url.includes('moodlemobile://') || event.url.includes('mehestan://'))) {
          const parsed = parseMoodleSSOResponse(event.url);
          if (parsed.success && parsed.token) {
            onTokenReceived(parsed);
          }
        }
      } catch (err) {
        console.error('Error handling deep link URL:', err);
      }
    }).then((handle) => {
      removeCapacitorListener = handle;
    });
  } else {
    // در محیط وب: بررسی وجود توکن یا deepLink در Query Params و Hash
    const checkIncomingWebToken = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        let deepLink =
          searchParams.get('webAppDeepLink') ||
          searchParams.get('token') ||
          searchParams.get('deepLink') ||
          searchParams.get('url');

        // بررسی Hash در صورت ارسال در فرگمنت
        if (!deepLink && window.location.hash) {
          const hashStr = window.location.hash.replace(/^#/, '');
          if (hashStr.includes('token=') || hashStr.includes('moodlemobile://')) {
            deepLink = hashStr;
          } else {
            const hashParams = new URLSearchParams(hashStr);
            deepLink = hashParams.get('deepLink') || hashParams.get('token');
          }
        }

        if (deepLink) {
          const parsed = parseMoodleSSOResponse(decodeURIComponent(deepLink));
          if (parsed.success && parsed.token) {
            onTokenReceived(parsed);
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.error('Error handling incoming web deepLink:', err);
      }
    };

    checkIncomingWebToken();

    // شنود پیام‌های پنجره فرزند (در صورت باز شدن در Popup یا Window)
    const onWindowMessage = (event) => {
      if (typeof event.data === 'string' && (event.data.includes('moodlemobile://') || event.data.includes('token='))) {
        try {
          const parsed = parseMoodleSSOResponse(event.data);
          if (parsed.success && parsed.token) {
            onTokenReceived(parsed);
          }
        } catch (err) {
          // Ignore
        }
      }
    };
    window.addEventListener('message', onWindowMessage);

    // تعریف handleOpenURL روی window برای ارتباط تستی یا اجرای اسکریپت
    window.handleOpenURL = (url) => {
      try {
        const parsed = parseMoodleSSOResponse(url);
        if (parsed.success && parsed.token) {
          onTokenReceived(parsed);
        }
      } catch (err) {
        console.error('Error in window.handleOpenURL:', err);
      }
    };

    return () => {
      window.removeEventListener('message', onWindowMessage);
    };
  }

  return () => {
    if (removeCapacitorListener && typeof removeCapacitorListener.remove === 'function') {
      removeCapacitorListener.remove();
    }
  };
}
