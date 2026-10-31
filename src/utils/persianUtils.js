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
 * اصلاح حروف عربی (ي و ك) به فارسی (ی و ک) و پاکسازی کاراکترهای مخفی و فاصله‌های نامتعارف
 */
export function cleanPersianText(str) {
  if (!str) return '';
  return String(str)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * پاکسازی تگ‌های HTML مودل مانند <p> و <br> و تبدیل به متن خالص و خوانا
 */
export function stripHtml(input) {
  if (!input) return '';
  let str = String(input);
  str = str.replace(/<br\s*\/?>/gi, '\n');
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
  str = str.replace(/\n\s*\n/g, '\n').trim();
  return cleanPersianText(str);
}

/**
 * پاکسازی و استانداردسازی عناوین دروس دانشگاهی
 * اصلاح ی و ک، تبدیل ارقام به فارسی و بهینه‌سازی فاصله‌ها
 */
export function cleanCourseName(name) {
  if (!name) return '';
  let clean = cleanPersianText(name);
  // تبدیل ارقام لاتین موجود در نام درس به فارسی
  clean = clean.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  return clean;
}

/**
 * فرمت‌بندی تاریخ میلادی به تاریخ شمسی کامل با اعداد فارسی
 * مثال: «دوشنبه، ۱۲ آبان ۱۴۰۳ ساعت ۱۴:۳۰»
 */
export function formatPersianDate(timestamp, includeTime = true) {
  if (!timestamp) return 'بدون موعد مشخص';
  const tsMs = typeof timestamp === 'number' && timestamp < 1e11 ? timestamp * 1000 : Number(timestamp);
  const d = new Date(tsMs);
  if (isNaN(d.getTime())) return 'تاریخ نامعتبر';

  const datePart = d.toLocaleDateString('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!includeTime) {
    return datePart;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timePart = toFaDigits(`${hours}:${minutes}`);

  return `${datePart} ساعت ${timePart}`;
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

    let overdueStr = '';
    if (days > 0) overdueStr += `${toFaDigits(days)} روز و `;
    overdueStr += `${toFaDigits(hours)} ساعت`;

    return {
      text: `مهلت منقضی شده (${overdueStr} معوقه)`,
      isLate: true,
      isEarly: false,
      isExpired: true,
      isPending: false,
      colorClass: 'text-error',
      badgeBg: 'bg-error/15 text-error border-error/30',
    };
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  let remStr = '';
  if (days > 0) {
    remStr = `${toFaDigits(days)} روز و ${toFaDigits(hours)} ساعت باقی‌مانده`;
  } else if (hours > 0) {
    remStr = `${toFaDigits(hours)} ساعت و ${toFaDigits(mins)} دقیقه باقی‌مانده`;
  } else {
    remStr = `${toFaDigits(mins)} دقیقه باقی‌مانده`;
  }

  const isDueSoon = remaining < 86400 * 2; // کمتر از ۲ روز

  return {
    text: remStr,
    isLate: false,
    isEarly: false,
    isExpired: false,
    isPending: true,
    colorClass: isDueSoon ? 'text-amber-500' : 'text-primary',
    badgeBg: isDueSoon
      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
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
