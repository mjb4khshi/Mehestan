/**
 * کلاینت رسمی و جامع ارتباط با وب‌سرویس‌های مودل (Moodle Mobile REST API)
 * سازگار با پروتکل Moodle 3.x و Moodle 4.x
 */

export async function loginWithMoodle(baseUrl, username, password, service = 'moodle_mobile_app') {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const tokenEndpoint = `${cleanUrl}/login/token.php`;

  const body = new URLSearchParams({
    username: username.trim(),
    password: password.trim(),
    service: service,
  });

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`خطای ارتباط با سرور مودل (${res.status})`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error || 'نام کاربری یا رمز عبور اشتباه است.');
  }

  if (!data.token) {
    throw new Error('توکن دسترسی از سرور مودل دریافت نشد. لطفاً از باز بودن سرویس موبایل اطمینان حاصل فرمایید.');
  }

  return {
    token: data.token,
    privateToken: data.privatetoken || null,
  };
}

export async function callMoodleWs(baseUrl, token, wsfunction, params = {}) {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const serverEndpoint = `${cleanUrl}/webservice/rest/server.php?moodlewsrestformat=json`;

  const bodyParams = new URLSearchParams({
    wstoken: token,
    wsfunction: wsfunction,
  });

  // تبدیل پارامترها و آبجکت‌های تودرتو به فرمت استاندارد x-www-form-urlencoded مودل
  function appendParam(prefix, value) {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v, index) => {
        appendParam(`${prefix}[${index}]`, v);
      });
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => {
        appendParam(`${prefix}[${k}]`, v);
      });
    } else {
      bodyParams.append(prefix, String(value));
    }
  }

  Object.entries(params).forEach(([k, v]) => {
    appendParam(k, v);
  });

  const res = await fetch(serverEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    throw new Error(`خطای وب‌سرویس مودل (${res.status})`);
  }

  const result = await res.json();

  if (result.exception || result.errorcode) {
    throw new Error(result.message || result.errorcode || 'خطای سرور مودل رخ داد.');
  }

  return result;
}

/**
 * دریافت اطلاعات هویت دانشجو، نام، آواتار و نسخه مودل
 */
export async function getSiteInfo(baseUrl, token) {
  return await callMoodleWs(baseUrl, token, 'core_webservice_get_site_info');
}

/**
 * دریافت فهرست تمامی دروسی که دانشجو در آن ثبت‌نام شده است
 */
export async function getUserCourses(baseUrl, token, userId) {
  return await callMoodleWs(baseUrl, token, 'core_enrol_get_users_courses', {
    userid: userId,
  });
}

/**
 * دریافت سرفصل‌ها، فایل‌ها، اسلایدها و جلسات درسی یک درس مشخص
 */
export async function getCourseContents(baseUrl, token, courseId) {
  return await callMoodleWs(baseUrl, token, 'core_course_get_contents', {
    courseid: courseId,
  });
}

/**
 * دریافت تکالیف ترم به همراه ددلاین‌ها و نمرات
 */
export async function getAssignments(baseUrl, token, courseIds = []) {
  const params = {};
  if (courseIds && courseIds.length > 0) {
    params.courseids = courseIds;
  }
  return await callMoodleWs(baseUrl, token, 'mod_assign_get_assignments', params);
}

/**
 * دریافت وضعیت تحویل یک تکلیف برای دانشجو
 */
export async function getSubmissionStatus(baseUrl, token, assignId, userId) {
  return await callMoodleWs(baseUrl, token, 'mod_assign_get_submission_status', {
    assignid: assignId,
    userid: userId,
  });
}

/**
 * دریافت رویدادهای تقویم، آزمون‌های کلاسی و موعدهای تحویل پیش‌رو
 */
export async function getCalendarEvents(baseUrl, token) {
  return await callMoodleWs(baseUrl, token, 'core_calendar_get_action_events_by_timesort');
}

/**
 * دریافت اعلان‌ها و پیام‌های رسمی اساتید و دانشگاه
 */
export async function getNotifications(baseUrl, token, userId) {
  return await callMoodleWs(baseUrl, token, 'message_popup_get_popup_notifications', {
    useridto: userId,
  });
}
