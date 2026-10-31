/**
 * سرویس اعلان‌های سیستمی مودل مهستان (Moodle Native Notifications Service)
 * ارسال مستقیم اطلاعیه‌ها، پیام‌های اساتید، بازخوردها و نمرات سامانه دانشگاه به اعلان‌های دستگاه
 * (ددلاین‌های تکالیف به سروستان واگذار می‌شوند)
 */

import { getNotifications } from './moodle/api';
import { stripHtml } from '../utils/persianUtils';

const STORAGE_KEY_ENABLED = 'mehestan_notif_enabled';
const STORAGE_KEY_DISPATCHED = 'mehestan_dispatched_notifs';

/**
 * بررسی پشتیبانی مرورگر از اعلان‌ها
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * وضعیت مجوز اعلان مرورگر
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * درخواست مجوز نمایش اعلان از کاربر
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch (err) {
    console.warn('Notification permission request failed:', err);
    return false;
  }
}

/**
 * وضعیت فعال بودن اعلان در تنظیمات برنامه
 */
export function isMoodleNotificationEnabled() {
  if (typeof localStorage === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEY_ENABLED);
  return val === null ? true : val === 'true';
}

/**
 * تغییر وضعیت فعال بودن اعلان
 */
export function setMoodleNotificationEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
}

/**
 * ارسال اعلان مستقیم سیستمی در دستگاه
 */
export function sendNativeNotification(title, body = '', tag = 'moodle-general') {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  const cleanTitle = stripHtml(title).slice(0, 80);
  const cleanBody = stripHtml(body).slice(0, 180);

  try {
    new Notification(cleanTitle, {
      body: cleanBody,
      tag: tag,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
    return true;
  } catch (err) {
    console.warn('Native notification dispatch failed:', err);
    return false;
  }
}

/**
 * آزمایش اعلان سیستمی جهت تست توسط کاربر در تنظیمات
 */
export async function testMoodleNotification() {
  if (!isNotificationSupported()) {
    throw new Error('مرورگر شما از اعلان‌های سیستمی پشتیبانی نمی‌کند.');
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      throw new Error('مجوز ارسال اعلان در مرورگر داده نشد.');
    }
  }

  return sendNativeNotification(
    'اعلان آزمایشی سامانه مودل مهستان',
    'ارتباط اعلان‌های دانشگاهی با موفقیت برقرار شد. اطلاعیه‌ها و پیام‌های جدید به همین شیوه ارسال خواهند شد.',
    'moodle-test'
  );
}

/**
 * دریافت اعلان‌های جدید از وب‌سرویس مودل و ارسال اعلان‌های خوانده‌نشده جدید
 */
export async function checkAndDispatchMoodleNotifications(siteUrl, token, userId) {
  if (!isMoodleNotificationEnabled()) return 0;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return 0;
  if (!siteUrl || !token) return 0;

  try {
    const res = await getNotifications(siteUrl, token, userId || 9999);
    if (!res || !Array.isArray(res.notifications)) return 0;

    const seenIds = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_DISPATCHED) || '[]'));
    let dispatchedCount = 0;

    res.notifications.forEach((n) => {
      const notifId = String(n.id);
      // فقط اعلان‌هایی که خوانده نشده‌اند و قبلاً اعلان داده نشده‌اند
      if (n.unread && !seenIds.has(notifId)) {
        const title = n.subject || 'اعلان جدید در سامانه مودل';
        const body = n.text || n.shortenedsubject || '';
        sendNativeNotification(title, body, `moodle-notif-${notifId}`);
        seenIds.add(notifId);
        dispatchedCount++;
      }
    });

    // ذخیره آخرین ۳۰ اعلان دیده‌شده جهت جلوگیری از تکرار
    const trimmed = Array.from(seenIds).slice(-30);
    localStorage.setItem(STORAGE_KEY_DISPATCHED, JSON.stringify(trimmed));

    return dispatchedCount;
  } catch (err) {
    console.warn('Failed to sync Moodle notifications:', err);
    return 0;
  }
}
