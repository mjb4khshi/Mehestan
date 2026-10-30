import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * بررسی و دریافت تنظیمات عمومی هر سامانه مودل (Moodle Public Config)
 * طبق مشخصات استاندارد اپلیکیشن رسمی مودل (tool_mobile_get_public_config)
 * این متد به مهستان اجازه می‌دهد به‌صورت یونیک و سراسری برای هر دانشگاهی،
 * نام سامانه، وضعیت وب‌سرویس، درگاه‌های احراز هویت مرکزی (Identity Providers)
 * و فرم ورود را استخراج و در برنامه ارائه دهد.
 */
export async function fetchMoodlePublicConfig(rawSiteUrl) {
  if (!rawSiteUrl || !rawSiteUrl.trim()) {
    throw new Error('آدرس سامانه نامعتبر است.');
  }

  let cleanUrl = rawSiteUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }
  cleanUrl = cleanUrl.replace(/\/+$/, '');

  const targetUrl = `${cleanUrl}/lib/ajax/service-nologin.php?info=tool_mobile_get_public_config`;
  const payload = [{ index: 0, methodname: 'tool_mobile_get_public_config', args: {} }];

  let data;
  if (Capacitor.isNativePlatform()) {
    // در اندروید و iOS: درخواست مستقیم از طریق کلاینت نیتیو بدون محدودیت CORS
    const response = await CapacitorHttp.post({
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MoodleMobile/4.4.0',
      },
      data: payload,
    });
    data = response.data;
  } else {
    // در محیط وب / دسکتاپ لوکال: عبور از پراکسی توسعه دهنده جهت حل CORS
    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const fetchUrl = isLocal ? `/api/moodle-proxy?url=${encodeURIComponent(targetUrl)}` : targetUrl;

    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`پاسخی از وب‌سرویس دانشگاه دریافت نشد (${res.status})`);
    }

    data = await res.json();
  }

  // داده‌های برگشتی سرویس مودل به‌صورت آرایه است
  const config = Array.isArray(data) && data[0]?.data ? data[0].data : data;

  if (!config) {
    throw new Error('قالب پاسخ تنظیمات عمومی مودل معتبر نیست.');
  }

  // استخراج ارائه‌دهندگان هویت مرکزی (مانند حساب دانشگاهی، CAS، SAML، OAuth2)
  const identityProviders = (config.identityproviders || []).map((idp) => {
    let id = null;
    if (idp.url) {
      const match = idp.url.match(/[?&]id=([^&#]+)/);
      if (match) id = match[1];
    }
    return {
      name: idp.name,
      iconUrl: idp.iconurl || null,
      url: idp.url,
      id,
    };
  });

  return {
    rawUrl: rawSiteUrl,
    siteUrl: cleanUrl,
    siteName: config.sitename || cleanUrl,
    typeOfLogin: Number(config.typeoflogin ?? 0), // 0: فرم دستی، 1: SSO در مرورگر، 2: Embedded
    showLoginForm: config.showloginform !== undefined ? Boolean(config.showloginform) : true,
    enableWebServices: Boolean(config.enablewebservices),
    enableMobileWebService: Boolean(config.enablemobilewebservice),
    identityProviders,
    forgottenPasswordUrl: config.forgottenpasswordurl || `${cleanUrl}/login/forgot_password.php`,
    guestLogin: Boolean(config.guestlogin),
    launchUrl: config.launchurl || `${cleanUrl}/admin/tool/mobile/launch.php`,
    rawConfig: config,
  };
}

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
