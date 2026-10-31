/**
 * پل ارتباطی مهستان و سروستان (Sarvestan Cross-App Bridge)
 * انتقال خودکار تکالیف، آزمون‌ها و ددلاین‌های مودل به تقویم و برنامه مطالعه سروستان
 * بدون ایجاد تغییر در کدهای سمت سروستان
 */

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

  // ۱. ارسال از طریق BroadcastChannel برای تب‌ها و پنجره‌های باز سروستان
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('sarvestan_mehestan_channel');
      bc.postMessage({ type, payload, sentAt: Date.now() });
      setTimeout(() => bc.close(), 1000);
    }
  } catch (err) {
    console.warn('BroadcastChannel sync failed:', err);
  }

  // ۲. ذخیره‌سازی در صف LocalStorage تا سروستان در زمان اجرا آن را بخواند
  try {
    const queueKey = 'sarvestan_mehestan_sync_queue';
    const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
    existing.push({ type, payload, timestamp: Date.now() });
    // نگه داشتن حداکثر ۲۰ رویداد اخیر
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
    const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // یک ساعت قبل

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:mehestan-assign-${a.id}@kntu.ac.ir`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
    lines.push(`DTSTART:${formatIcsDate(startDate)}`);
    lines.push(`DTEND:${formatIcsDate(dueDate)}`);
    lines.push(`SUMMARY:${a.name || 'تکلیف کلاسی'}`);
    lines.push(`DESCRIPTION:موعد تحویل تکلیف درس ${a.courseName || ''}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT3H'); // هشدار ۳ ساعت قبل
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
