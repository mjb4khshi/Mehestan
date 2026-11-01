/**
 * مدیریت ذخیره‌سازی محلی و کش اطلاعات درسی مهستان
 */

const STORAGE_KEYS = {
  AUTH: 'mehestan_moodle_auth_v1',
  SITE_INFO: 'mehestan_moodle_site_info_v1',
  COURSES: 'mehestan_moodle_courses_v1',
  ASSIGNMENTS: 'mehestan_moodle_assignments_v1',
  QUIZZES: 'mehestan_moodle_quizzes_v1',
  COURSE_CONTENTS_PREFIX: 'mehestan_course_contents_',
};

export function saveMoodleSession(authData) {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authData));
  } catch (e) {
    console.error('Failed to save Moodle auth:', e);
  }
}

export function getMoodleSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearMoodleSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.SITE_INFO);
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
    localStorage.removeItem(STORAGE_KEYS.QUIZZES);
  } catch (e) {
    console.error('Failed to clear Moodle auth:', e);
  }
}

export function cacheSiteInfo(siteInfo) {
  try {
    localStorage.setItem(STORAGE_KEYS.SITE_INFO, JSON.stringify(siteInfo));
  } catch (e) {
    console.error('Failed to cache site info:', e);
  }
}

export function getCachedSiteInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SITE_INFO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheQuizzes(quizzes) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  } catch (e) {
    console.error('Failed to cache quizzes:', e);
  }
}

export function getCachedQuizzes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheCourses(courses) {
  try {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  } catch (e) {
    console.error('Failed to cache courses:', e);
  }
}

export function getCachedCourses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COURSES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheAssignments(assignments) {
  try {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  } catch (e) {
    console.error('Failed to cache assignments:', e);
  }
}

export function getCachedAssignments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
