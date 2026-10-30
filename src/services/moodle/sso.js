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

  // شناسه ارائه‌دهنده احراز هویت یکپارچه (OAuth2 / CAS Identity Provider ID)
  // در سامانه مجازی خواجه‌نصیر (vc.kntu.ac.ir) شناسه ارائه‌دهنده 1 است (oauthsso=1)
  const oauthsso =
    options.oauthsso !== undefined
      ? options.oauthsso
      : cleanSiteUrl.includes('kntu') || !options.disableOAuthSso
      ? '1'
      : null;

  let query = '';
  if (oauthsso) {
    query += `oauthsso=${encodeURIComponent(oauthsso)}&`;
  }
  query += `service=${encodeURIComponent(service)}&passport=${passport}&urlscheme=${encodeURIComponent(urlScheme)}`;

  const launchUrl = `${cleanSiteUrl}/admin/tool/mobile/launch.php?${query}`;

  const pendingData = {
    siteUrl: cleanSiteUrl,
    passport,
    service,
    urlScheme,
    oauthsso,
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

  const trimmed = rawInput.trim();

  // ۱. بررسی اینکه آیا مستقیماً توکن ۳۲ کاراکتری هگزادسیمال وب‌سرویس است
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return {
      success: true,
      token: trimmed,
      privateToken: null,
      isSSO: false,
    };
  }

  // ۲. استخراج بخش Base64 از URL یا Schema
  let payloadStr = trimmed;

  if (payloadStr.includes('token=')) {
    payloadStr = payloadStr.split('token=')[1] || '';
  }

  // حذف اسلش یا کاراکترهای اضافه انتهای لینک
  payloadStr = payloadStr.replace(/\/?#?\/?$/, '');

  if (!payloadStr) {
    throw new Error('محتوای توکن در ورودی یافت نشد.');
  }

  // ۳. دیکود Base64 بر اساس سورس Moodle Mobile (atob)
  let decodedText = '';
  try {
    decodedText = atob(payloadStr);
  } catch (e) {
    // اگر نتوانست Base64 دیکود کند و ۳۲ حرفی بود
    if (/^[a-f0-9]{32}$/i.test(payloadStr)) {
      return {
        success: true,
        token: payloadStr,
        privateToken: null,
        isSSO: false,
      };
    }
    throw new Error('قالب داده بازگشتی از مودل معتبر نیست (خطا در دیکود Base64).');
  }

  // ۴. تفکیک فرمت رسمی مودل: signature:::token:::privateToken
  const parts = decodedText.split(':::');
  if (parts.length < 2) {
    // اگر فرمت متفاوتی بود ولی بخش اول یا دوم توکن ۳۲ حرفی است
    const match = decodedText.match(/[a-f0-9]{32}/i);
    if (match) {
      return {
        success: true,
        token: match[0],
        privateToken: null,
        isSSO: true,
      };
    }
    throw new Error('فرمت داده بازگشتی از مودل مطابقت ندارد.');
  }

  const receivedSignature = parts[0];
  const token = parts[1];
  const privateToken = parts[2] || null;

  // ۵. اعتبارسنجی امضای امنیتی با passport در صورت موجود بودن
  const pending = getPendingSSOData();
  const siteUrlToCheck = expectedSiteUrl || pending?.siteUrl;
  const passportToCheck = pending?.passport;

  let signatureValid = true;
  if (siteUrlToCheck && passportToCheck !== undefined) {
    const cleanUrl = siteUrlToCheck.replace(/\/+$/, '');
    let expectedSig = Md5.hashAsciiStr(cleanUrl + passportToCheck);

    if (expectedSig !== receivedSignature) {
      // آزمایش پروتکل معکوس http/https مشابه کلاینت رسمی مودل
      const altUrl = cleanUrl.startsWith('https://')
        ? cleanUrl.replace('https://', 'http://')
        : cleanUrl.replace('http://', 'https://');
      expectedSig = Md5.hashAsciiStr(altUrl + passportToCheck);
    }

    signatureValid = expectedSig === receivedSignature;
    if (!signatureValid) {
      console.warn('SSO signature mismatch (expected vs received)', {
        receivedSignature,
        expectedSig,
      });
    }
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
    // در محیط وب: بررسی وجود توکن یا webAppDeepLink در Query Params
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const deepLink = searchParams.get('webAppDeepLink') || searchParams.get('token');
      if (deepLink) {
        const parsed = parseMoodleSSOResponse(decodeURIComponent(deepLink));
        if (parsed.success && parsed.token) {
          onTokenReceived(parsed);
        }
      }

      // تعریف handleOpenURL روی window برای ارتباط تستی
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
    } catch (e) {
      // Ignore
    }
  }

  return () => {
    if (removeCapacitorListener && typeof removeCapacitorListener.remove === 'function') {
      removeCapacitorListener.remove();
    }
  };
}
