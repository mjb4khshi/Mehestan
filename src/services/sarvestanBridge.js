/**
 * پل ارتباطی مهستان و سروستان (Sarvestan Cross-App Bridge)
 * انتقال خودکار تکالیف، آزمون‌ها و ددلاین‌های مودل به تقویم و برنامه مطالعه سروستان
 */

export function exportAssignmentToSarvestan(assignment, courseName = '') {
  const payload = {
    title: assignment.name || 'تکلیف کلاسی',
    courseName: courseName,
    dueDate: assignment.duedate ? new Date(assignment.duedate * 1000).toISOString() : null,
    source: 'mehestan',
    externalId: String(assignment.id),
  };

  const encoded = encodeURIComponent(JSON.stringify(payload));
  const deepLink = `sarvestan://import-task?data=${encoded}`;

  // تلاش برای باز کردن با دیپ‌لینک اختصاصی
  if (typeof window !== 'undefined') {
    try {
      window.location.href = deepLink;
      return true;
    } catch (e) {
      console.warn('Failed to launch Sarvestan app via deep link:', e);
    }
  }

  return false;
}

export function exportAllAssignmentsToSarvestan(assignments = []) {
  const payload = assignments.map((a) => ({
    title: a.name,
    courseName: a.courseName || '',
    dueDate: a.duedate ? new Date(a.duedate * 1000).toISOString() : null,
    source: 'mehestan',
    externalId: String(a.id),
  }));

  const encoded = encodeURIComponent(JSON.stringify(payload));
  const deepLink = `sarvestan://import-batch-tasks?data=${encoded}`;

  if (typeof window !== 'undefined') {
    window.location.href = deepLink;
  }
}
