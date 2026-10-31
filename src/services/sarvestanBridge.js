/**
 * پل ارتباطی رسمی مهستان و سروستان (Sarvestan Cross-App Bridge)
 * همگام‌سازی دروس، اساتید، رنگ‌ها، برنامه هفتگی و انتقال تکالیف به تقویم و پلنر
 */
import { cleanCourseCode, cleanCourseName, cleanPersianText } from '../utils/persianUtils';

export const COURSE_TONES = ['primary', 'info', 'success', 'secondary', 'accent', 'warn', 'danger'];

export const TONE_STYLES = {
  primary: {
    borderRight: 'border-r-primary',
    bgSoft: 'bg-primary-soft',
    text: 'text-primary',
    border: 'border-primary',
  },
  info: {
    borderRight: 'border-r-info',
    bgSoft: 'bg-info-soft',
    text: 'text-info',
    border: 'border-info',
  },
  success: {
    borderRight: 'border-r-success',
    bgSoft: 'bg-success-soft',
    text: 'text-success',
    border: 'border-success',
  },
  secondary: {
    borderRight: 'border-r-secondary',
    bgSoft: 'bg-secondary-soft',
    text: 'text-secondary',
    border: 'border-secondary',
  },
  accent: {
    borderRight: 'border-r-accent',
    bgSoft: 'bg-accent-soft',
    text: 'text-accent',
    border: 'border-accent',
  },
  warn: {
    borderRight: 'border-r-warn',
    bgSoft: 'bg-warn-soft',
    text: 'text-warn',
    border: 'border-warn',
  },
  danger: {
    borderRight: 'border-r-danger',
    bgSoft: 'bg-danger-soft',
    text: 'text-danger',
    border: 'border-danger',
  },
};

/**
 * خواندن امن داده‌های ذخیره‌شده سروستان از حافظه محلی
 */
function readJsonSafe(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * دریافت کلیه دروس موجود در سروستان (برنامه هفتگی + کارنامه + داده‌های همگام‌شده)
 */
export function getSarvestanCourses() {
  const result = [];
  const seen = new Set();

  const addCourse = (c) => {
    if (!c) return;
    const key = (c.code || c.id || '') + '::' + (c.name || c.title || '');
    if (!key.trim() || seen.has(key)) return;
    seen.add(key);
    result.push({
      code: c.code || c.id || '',
      name: c.name || c.title || '',
      title: c.title || c.name || '',
      group: c.group || '',
      professor: c.professor || '',
      units: c.units || '',
      classTime: c.classTime || '',
      room: c.room || '',
      color: c.color || '',
    });
  };

  // ۱. بررسی داده‌های مستقیم برنامه هفتگی سروستان در LocalStorage
  const schedule = readJsonSafe('sarvestan_live_schedule', {});
  if (typeof schedule === 'object' && schedule !== null) {
    Object.values(schedule).forEach((list) => {
      if (Array.isArray(list)) list.forEach(addCourse);
    });
  }

  // ۲. بررسی دیتای دروس جاری سروستان
  const liveCourses = readJsonSafe('sarvestan_live_courses', []);
  if (Array.isArray(liveCourses)) {
    liveCourses.forEach(addCourse);
  }

  // ۳. بررسی بسته اختصاصی همگام‌سازی شده بین دو اپلیکیشن
  const syncedData = readJsonSafe('mehestan_sarvestan_synced_data', null);
  if (syncedData) {
    if (Array.isArray(syncedData.schedule)) syncedData.schedule.forEach(addCourse);
    if (Array.isArray(syncedData.courses)) syncedData.courses.forEach(addCourse);
  }

  return result;
}

/**
 * استخراج اعداد خالص از کد درس جهت تطبیق هوشمند
 * مثال: «60-6660102-4051» -> «6660102»
 */
function extractCoreDigits(code) {
  if (!code) return '';
  const digits = String(code).replace(/\D/g, '');
  if (!digits) return '';
  const matches = String(code).match(/\d{5,8}/g);
  if (matches && matches.length > 0) {
    return matches[0];
  }
  return digits;
}

/**
 * تطبیق درس مودل با درس‌های سروستان
 */
export function matchCourseWithSarvestan(moodleCourse, sarvCourses = null) {
  if (!moodleCourse) return null;
  const list = Array.isArray(sarvCourses) && sarvCourses.length > 0 ? sarvCourses : getSarvestanCourses();
  if (!list.length) return null;

  const mCode = cleanCourseCode(moodleCourse.shortname || moodleCourse.id || '');
  const mCoreDigits = extractCoreDigits(moodleCourse.shortname || moodleCourse.fullname || '');
  const mName = cleanCourseName(moodleCourse.fullname || moodleCourse.name || '');

  // ۱. تطبیق بر اساس هسته ارقام کد درس
  if (mCoreDigits) {
    const byCode = list.find((sc) => {
      const sCore = extractCoreDigits(sc.code || sc.id || '');
      return sCore && (sCore === mCoreDigits || sCore.includes(mCoreDigits) || mCoreDigits.includes(sCore));
    });
    if (byCode) return byCode;
  }

  // ۲. تطبیق بر اساس کد کامل پاکسازی‌شده
  if (mCode) {
    const byFullCode = list.find((sc) => {
      const sCode = cleanCourseCode(sc.code || sc.id || '');
      return sCode && sCode === mCode;
    });
    if (byFullCode) return byFullCode;
  }

  // ۳. تطبیق بر اساس نام تمیز شده درس
  if (mName) {
    const byName = list.find((sc) => {
      const sName = cleanCourseName(sc.name || sc.title || '');
      if (!sName) return false;
      return sName === mName || sName.includes(mName) || mName.includes(sName);
    });
    if (byName) return byName;
  }

  return null;
}

/**
 * دریافت اطلاعات تکمیلی درس از سروستان (اسم استاد، واحد، گروه، زمان)
 */
export function getCourseSarvestanInfo(moodleCourse, sarvCourses = null) {
  const matched = matchCourseWithSarvestan(moodleCourse, sarvCourses);
  if (!matched) {
    return {
      professor: '',
      units: '',
      group: '',
      classTime: '',
      room: '',
      color: '',
    };
  }

  return {
    professor: matched.professor && matched.professor !== 'ـ' ? matched.professor : '',
    units: matched.units && matched.units !== 'ـ' ? matched.units : '',
    group: matched.group && matched.group !== 'ـ' ? matched.group : '',
    classTime: matched.classTime && matched.classTime !== 'ـ' ? matched.classTime : '',
    room: matched.room && matched.room !== 'ـ' ? matched.room : '',
    color: matched.color || '',
  };
}

/**
 * تشخیص یا تخصیص رنگ درس مطابق الگوریتم رسمی سروستان
 */
export function getToneForCourse(courseOrNameOrCode, allSarvCourses = null) {
  if (!courseOrNameOrCode) return COURSE_TONES[0];
  const list = Array.isArray(allSarvCourses) && allSarvCourses.length > 0 ? allSarvCourses : getSarvestanCourses();

  const matched = matchCourseWithSarvestan(courseOrNameOrCode, list);
  if (matched?.color && COURSE_TONES.includes(matched.color)) {
    return matched.color;
  }

  if (matched && list.length > 0) {
    const idx = list.indexOf(matched);
    if (idx >= 0) {
      return COURSE_TONES[idx % COURSE_TONES.length];
    }
  }

  const raw = typeof courseOrNameOrCode === 'object' ? courseOrNameOrCode : { name: courseOrNameOrCode };
  const cCode = cleanCourseCode(raw.code || raw.shortname || '');
  const cName = cleanCourseName(raw.fullname || raw.name || raw.title || '');
  const s = cCode || cName || String(courseOrNameOrCode);

  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return COURSE_TONES[Math.abs(hash) % COURSE_TONES.length];
}

/**
 * گوش‌دادن و تبادل داده با سروستان از طریق BroadcastChannel
 */
export function initSarvestanBridgeListener(onDataReceived) {
  if (typeof window === 'undefined') return () => {};

  let bc = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('sarvestan_mehestan_channel');
      
      bc.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'SARVESTAN_DATA_RESPONSE' && payload) {
          try {
            localStorage.setItem('mehestan_sarvestan_synced_data', JSON.stringify(payload));
          } catch {}
          if (typeof onDataReceived === 'function') {
            onDataReceived(payload);
          }
        }
      };

      bc.postMessage({ type: 'REQUEST_SARVESTAN_DATA', sentAt: Date.now() });
    }
  } catch (err) {
    console.warn('BroadcastChannel init error:', err);
  }

  return () => {
    if (bc) bc.close();
  };
}

/**
 * همگام‌سازی یک تکلیف با سروستان
 */
export function exportAssignmentToSarvestan(assignment, courseName = '') {
  const payload = {
    title: assignment.name || 'تکلیف کلاسی',
    courseName: courseName,
    dueDate: assignment.duedate ? new Date(assignment.duedate * 1000).toISOString() : null,
    source: 'mehestan',
    externalId: String(assignment.id),
    syncTimestamp: Date.now(),
  };

  dispatchToSarvestan('single_task', payload);

  const encoded = encodeURIComponent(JSON.stringify(payload));
  const deepLink = `sarvestan://import-task?data=${encoded}`;

  if (typeof window !== 'undefined') {
    try {
      window.location.href = deepLink;
      return true;
    } catch (e) {
      console.warn('Deep link launch skipped:', e);
    }
  }

  return true;
}

/**
 * انتقال دسته‌جمعی تکالیف به سروستان
 */
export function exportAllAssignmentsToSarvestan(assignments = []) {
  const payload = assignments.map((a) => ({
    title: a.name,
    courseName: a.courseName || '',
    dueDate: a.duedate ? new Date(a.duedate * 1000).toISOString() : null,
    source: 'mehestan',
    externalId: String(a.id),
    syncTimestamp: Date.now(),
  }));

  dispatchToSarvestan('batch_tasks', payload);

  const encoded = encodeURIComponent(JSON.stringify(payload));
  const deepLink = `sarvestan://import-batch-tasks?data=${encoded}`;

  if (typeof window !== 'undefined') {
    try {
      window.location.href = deepLink;
    } catch (e) {
      console.warn('Batch deep link launch skipped:', e);
    }
  }

  return true;
}

/**
 * همگام‌سازی فراگیر و کامل با ذخیره‌سازی در صف محلی و کانال همگام‌سازی مرورگر
 */
export function syncAllWithSarvestan({ assignments = [], courses = [], user = null }) {
  const syncData = {
    version: '1.0',
    source: 'mehestan_moodle',
    user: user ? { id: user.id || user.userid, fullname: user.fullname } : null,
    syncedAt: new Date().toISOString(),
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.name,
      courseId: a.course,
      courseName: a.courseName || '',
      dueDate: a.duedate ? new Date(a.duedate * 1000).toISOString() : null,
      cutoffDate: a.cutoffdate ? new Date(a.cutoffdate * 1000).toISOString() : null,
      status: a.isSubmitted ? 'submitted' : 'pending',
    })),
    courses: courses.map((c) => ({
      id: c.id,
      name: c.fullname,
      shortname: c.shortname,
    })),
  };

  dispatchToSarvestan('full_sync', syncData);

  return {
    success: true,
    count: assignments.length,
    timestamp: Date.now(),
  };
}

/**
 * ارسال بسته‌های همگام‌سازی از طریق BroadcastChannel و حافظه محلی
 */
function dispatchToSarvestan(type, payload) {
  if (typeof window === 'undefined') return;

  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('sarvestan_mehestan_channel');
      bc.postMessage({ type, payload, sentAt: Date.now() });
      setTimeout(() => bc.close(), 1000);
    }
  } catch (err) {
    console.warn('BroadcastChannel sync failed:', err);
  }

  try {
    const queueKey = 'sarvestan_mehestan_sync_queue';
    const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
    existing.push({ type, payload, timestamp: Date.now() });
    const trimmed = existing.slice(-20);
    localStorage.setItem(queueKey, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('LocalStorage queue sync failed:', err);
  }
}

/**
 * تولید و دانلود فایل استاندارد تقویم (.ics iCalendar) جهت وارد کردن مستقیم به تقویم سروستان یا گوشی
 */
export function exportAssignmentsAsIcs(assignments = []) {
  if (!assignments || assignments.length === 0) {
    throw new Error('تکلیفی برای خروجی تقویم یافت نشد.');
  }

  function formatIcsDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mehestan//Moodle Sync//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:موعد تکالیف مهستان',
    'X-WR-TIMEZONE:Asia/Tehran',
  ];

  assignments.forEach((a) => {
    if (!a.duedate) return;
    const dueDate = new Date(a.duedate * 1000);
    const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:mehestan-assign-${a.id}@kntu.ac.ir`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${formatIcsDate(startDate)}`);
    lines.push(`DTEND:${formatIcsDate(dueDate)}`);
    lines.push(`SUMMARY:${a.name || 'تکلیف کلاسی'}`);
    lines.push(`DESCRIPTION:موعد تحویل تکلیف درس ${a.courseName || ''}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT3H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:یادآور ددلاین تکلیف ${a.name || ''}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const icsBlob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(icsBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mehestan_deadlines.ics';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);

  return true;
}
