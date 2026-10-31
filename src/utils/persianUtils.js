/**
 * ابزارهای جامع فارسی‌سازی متن، ارقام، تاریخ و پردازش متون دانشگاهی (سبک سروستان)
 */

/**
 * تبدیل اعداد انگلیسی به اعداد اصیل فارسی
 */
export function toFaDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
    .replace(/\./g, '٫');
}

/**
 * فرمت‌بندی اعداد با جداکننده سه‌رقمی و ارقام فارسی
 */
export function toFaNumber(num) {
  if (num === null || num === undefined) return '۰';
  const val = Number(String(num).replace(/[^\d.-]/g, '') || 0);
  if (isNaN(val)) return toFaDigits(num);
  return val.toLocaleString('fa-IR');
}

/**
 * اصلاح حروف عربی (ي، ى، ك) به فارسی اصیل (ی، ک)، استانداردسازی ارقام و فاصله‌های نامتعارف
 */
export function cleanPersianText(str, preserveNewlines = false) {
  if (!str) return '';
  let res = String(str)
    .replace(/[\u064A\u0649\u06D2]/g, 'ی') // تبدیل تمام ی‌های عربی و الف مقصوره به ی استاندارد فارسی
    .replace(/\u0643/g, 'ک') // تبدیل ک عربی به ک فارسی
    .replace(/\u0629/g, 'ه') // تبدیل ة به ه
    .replace(/[\u0660-\u0669]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d.charCodeAt(0) - 0x0660]) // تبدیل ارقام عربی به ارقام فارسی
    .replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) // تبدیل ارقام انگلیسی به فارسی
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ');

  if (preserveNewlines) {
    return res
      .split('\n')
      .map((l) => l.replace(/[^\S\r\n]+/g, ' ').trim())
      .filter((l) => l.length > 0)
      .join('\n');
  }

  return res.replace(/\s+/g, ' ').trim();
}

/**
 * پاکسازی تگ‌های HTML مودل مانند <p> و <br> و تبدیل به متن خالص و خوانا
 */
export function stripHtml(input) {
  if (!input) return '';
  let str = String(input);
  str = str.replace(/&lt;\/?br\s*\/?&gt;/gi, '\n');
  str = str.replace(/<\/?br\s*\/?>/gi, '\n');
  str = str.replace(/<\/p>/gi, '\n');
  str = str.replace(/<\/div>/gi, '\n');
  str = str.replace(/<[^>]+>/g, '');
  str = str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&zwnj;/g, '\u200c');
  return cleanPersianText(str, true);
}

/**
 * پاکسازی متون نوتیفیکیشن‌های اتوماتیک مودل (حذف لینک‌های رهگیری طولانی insights و تگ‌ها)
 */
export function cleanNotificationText(raw) {
  if (!raw) return '';
  let str = String(raw);
  str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"');
  str = str.replace(/<\/?br\s*\/?>/gi, '\n');
  str = str.replace(/<\/p>/gi, '\n');
  str = str.replace(/<\/div>/gi, '\n');
  str = str.replace(/<[^>]+>/g, '');
  // حذف لینک‌های بلند سیستم بینش‌های مودل و پارامترهای رهگیری
  str = str.replace(/https?:\/\/[^\s]+report\/insights\/[^\s]*/gi, '');
  str = str.replace(/(?:Useful|مفید|غیرمفید|Not useful)\s*:?\s*https?:\/\/[^\s]*/gi, '');
  str = str.replace(/(?:Useful|مفید|غیرمفید|Not useful)\s*:?/gi, '');
  str = str.replace(/https?:\/\/[^\s]*/gi, '');
  return cleanPersianText(str, true);
}

/**
 * دریافت نام کوتاه و تمیز دانشگاه بدون پیشوندهای طولانی سامانه
 */
export function getShortUniversityName(sitename) {
  if (!sitename) return 'دانشگاه خواجه نصیر';
  let clean = cleanPersianText(sitename);
  if (clean.includes('خواجه نصیر')) return 'دانشگاه خواجه نصیر';
  if (clean.includes('تهران')) return 'دانشگاه تهران';
  if (clean.includes('بهشتی')) return 'دانشگاه شهید بهشتی';
  if (clean.includes('امیرکبیر')) return 'دانشگاه امیرکبیر';
  if (clean.includes('شریف')) return 'دانشگاه صنعتی شریف';
  if (clean.includes('علم و صنعت')) return 'دانشگاه علم و صنعت';
  if (clean.includes('فردوسی')) return 'دانشگاه فردوسی مشهد';
  if (clean.includes('شیراز')) return 'دانشگاه شیراز';
  if (clean.includes('اصفهان')) return 'دانشگاه اصفهان';
  if (clean.includes('تبریز')) return 'دانشگاه تبریز';

  clean = clean
    .replace(/سامانه\s*(آموزش\s*مجازی\s*و\s*الکترونیکی|آموزش\s*الکترونیکی|یادگیری\s*الکترونیکی|آموزش\s*مجازی|مودل)?/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  return clean.slice(0, 24) || 'دانشگاه خواجه نصیر';
}

/**
 * پاکسازی و استانداردسازی کد درس دانشگاهی
 * حذف کامل براکت‌ها، استخراج شناسه عددی، اصلاح حروف و تبدیل به ارقام فارسی
 */
export function cleanCourseCode(code) {
  if (!code) return '';
  let str = cleanPersianText(String(code));
  
  // اگر درون براکت قرار دارد، محتوای درون براکت اولویت دارد
  const bracketMatch = str.match(/\[\s*([\d\u06F0-\u06F9\w_\/.-]+)\s*\]/);
  if (bracketMatch) {
    str = bracketMatch[1];
  } else {
    str = str.replace(/[\[\]\(\)]/g, '').trim();
    // اگر همراه نام درس چسبیده است، بخش عددی-شناسه‌ای را استخراج کن
    const match = str.match(/[\d\u06F0-\u06F9]{2,}[-\d\u06F0-\u06F9]*/);
    if (match) {
      str = match[0];
    }
  }

  str = str.replace(/[\[\]\(\)]/g, '').trim();
  return toFaDigits(str);
}

/**
 * پاکسازی و استانداردسازی عناوین دروس دانشگاهی
 * حذف کامل کدهای داخل براکت و شناسه‌های زاید، اصلاح ی و ک، فاصله‌گذاری اصیل و تبدیل ارقام
 */
export function cleanCourseName(name) {
  if (!name) return '';
  let clean = cleanPersianText(name);
  
  // حذف کامل شناسه‌های داخل براکت از عنوان درس مانند [60-6660102-4051] یا [4051]
  clean = clean.replace(/\[\s*[\d\u06F0-\u06F9\w_\/.-]+\s*\]/g, '');

  // حذف شناسه‌های رقمی طولانی ابتدای عنوان در صورت وجود
  clean = clean.replace(/^[\d\u06F0-\u06F9_-]{5,}\s*[-–:]?\s*/, '');

  // حذف هرگونه براکت باقیمانده
  clean = clean.replace(/[\[\]]/g, '');

  // اصلاح اتصال نادرست حرف ربط «و» در کلمات درسی دانشگاهی مانند «ومقاومت» به «و مقاومت»
  clean = clean.replace(/([\u0600-\u06FF])\s*و([\u0600-\u06FF]{3,})/g, '$1 و $2');

  // تبدیل تمام ارقام لاتین موجود به فارسی
  clean = toFaDigits(clean);

  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * فرمت‌بندی تاریخ میلادی به تاریخ شمسی با ترتیب استاندارد و اعداد فارسی
 * مثال: «سه‌شنبه، ۲۴ مهر ساعت ۱۲:۰۰»
 */
export function formatPersianDate(timestamp, includeTime = true) {
  if (!timestamp) return 'بدون موعد مشخص';
  const tsMs = typeof timestamp === 'number' && timestamp < 1e11 ? timestamp * 1000 : Number(timestamp);
  const d = new Date(tsMs);
  if (isNaN(d.getTime())) return 'تاریخ نامعتبر';

  let weekday = '';
  let day = '';
  let month = '';
  let year = '';

  try {
    const parts = new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(d);

    parts.forEach((p) => {
      if (p.type === 'weekday') weekday = p.value;
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
    });
  } catch {
    weekday = d.toLocaleDateString('fa-IR', { weekday: 'long' });
    day = d.toLocaleDateString('fa-IR', { day: 'numeric' });
    month = d.toLocaleDateString('fa-IR', { month: 'long' });
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timePart = toFaDigits(`${hours}:${minutes}`);

  const dateText = weekday ? `${weekday}، ${day} ${month}` : `${day} ${month}`;

  if (!includeTime) {
    return dateText;
  }

  return `${dateText} ساعت ${timePart}`;
}

/**
 * محاسبه وضعیت زمانی دقیق تکلیف، تاخیر، تعجیل یا زمان باقی‌مانده (سبک مودل و سروستان)
 * خروجی: { text, isLate, isEarly, isExpired, isPending, colorClass, badgeBg }
 */
export function formatAssignmentTiming(dueTimestamp, submissionTimestamp = null, isSubmitted = null) {
  if (!dueTimestamp) {
    return {
      text: 'بدون مهلت تحویل',
      isLate: false,
      isEarly: false,
      isExpired: false,
      isPending: false,
      colorClass: 'text-neutral',
      badgeBg: 'bg-base-500/20 text-neutral border-base-500/30',
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const dueSec = Math.floor(dueTimestamp);

  // شرط قطعی تحویل: تنها در صورتی که تکلیف واقعاً ثبت نهایی شده باشد (isSubmitted === true یا عدم رد شدن آن به همراه تایم‌استمپ)
  const actuallySubmitted = isSubmitted !== null ? Boolean(isSubmitted && submissionTimestamp) : Boolean(submissionTimestamp);

  // اگر دانشجو تکلیف را تحویل داده باشد
  if (actuallySubmitted && submissionTimestamp) {
    const subSec = Math.floor(submissionTimestamp);
    const diff = subSec - dueSec;

    if (diff > 60) {
      // تحویل با تاخیر
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);

      let delayStr = '';
      if (days > 0) delayStr += `${toFaDigits(days)} روز و `;
      if (hours > 0 || days > 0) delayStr += `${toFaDigits(hours)} ساعت و `;
      delayStr += `${toFaDigits(mins)} دقیقه تاخیر`;

      return {
        text: `تحویل داده شده با ${delayStr}`,
        isLate: true,
        isEarly: false,
        isExpired: false,
        isPending: false,
        colorClass: 'text-error',
        badgeBg: 'bg-error/15 text-error border-error/30',
      };
    } else {
      // تحویل به‌موقع
      const earlyDiff = dueSec - subSec;
      const days = Math.floor(earlyDiff / 86400);
      const hours = Math.floor((earlyDiff % 86400) / 3600);

      let earlyStr = 'به‌موقع';
      if (days > 0) {
        earlyStr = `${toFaDigits(days)} روز قبل از مهلت`;
      } else if (hours > 0) {
        earlyStr = `${toFaDigits(hours)} ساعت قبل از مهلت`;
      }

      return {
        text: `تحویل داده شده (${earlyStr})`,
        isLate: false,
        isEarly: true,
        isExpired: false,
        isPending: false,
        colorClass: 'text-success',
        badgeBg: 'bg-success/15 text-success border-success/30',
      };
    }
  }

  // اگر هنوز تحویل داده نشده است
  const remaining = dueSec - nowSec;

  if (remaining < 0) {
    const overdue = Math.abs(remaining);
    const days = Math.floor(overdue / 86400);
    const hours = Math.floor((overdue % 86400) / 3600);
    const mins = Math.floor((overdue % 3600) / 60);

    let overdueStr = '';
    if (days > 0) {
      overdueStr = `${toFaDigits(days)} روز پیش`;
    } else if (hours > 0) {
      overdueStr = `${toFaDigits(hours)} ساعت پیش`;
    } else {
      overdueStr = `${toFaDigits(Math.max(mins, 1))} دقیقه پیش`;
    }

    return {
      text: `مهلت گذشته (${overdueStr})`,
      isLate: true,
      isEarly: false,
      isExpired: true,
      isPending: false,
      colorClass: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    };
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  let remStr = '';
  if (days > 0) {
    remStr = `${toFaDigits(days)} روز باقی‌مانده`;
  } else if (hours > 0) {
    remStr = `${toFaDigits(hours)} ساعت باقی‌مانده`;
  } else {
    remStr = `${toFaDigits(Math.max(mins, 1))} دقیقه باقی‌مانده`;
  }

  const isDueSoon = remaining < 86400 * 2; // کمتر از ۲ روز

  return {
    text: remStr,
    isLate: false,
    isEarly: false,
    isExpired: false,
    isPending: true,
    colorClass: isDueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
    badgeBg: isDueSoon
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-primary/15 text-primary border-primary/30',
  };
}

/**
 * فرمت‌بندی فارسی و ارقام فارسی حجم فایل
 */
export function formatFileSizeFa(bytes) {
  if (!bytes || bytes === 0) return '۰ بایت';
  const k = 1024;
  const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formatted = (bytes / Math.pow(k, i)).toFixed(1);
  return `${toFaDigits(formatted)} ${sizes[i]}`;
}
