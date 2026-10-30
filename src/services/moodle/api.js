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

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const fetchUrl = isLocal ? `/api/moodle-proxy?url=${encodeURIComponent(tokenEndpoint)}` : tokenEndpoint;

  const body = new URLSearchParams({
    username: username.trim(),
    password: password.trim(),
    service: service,
  });

  const res = await fetch(fetchUrl, {
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

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const fetchUrl = isLocal ? `/api/moodle-proxy?url=${encodeURIComponent(serverEndpoint)}` : serverEndpoint;

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

  const res = await fetch(fetchUrl, {
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
 * تولید پیوند امن و احرازهویت‌شده فایل‌های مودل با الحاق wstoken
 */
export function getMoodleFileUrl(fileUrl, token) {
  if (!fileUrl) return '';
  if (!token || token.startsWith('demo_')) return fileUrl;
  const separator = fileUrl.includes('?') ? '&' : '?';
  return `${fileUrl}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * فرمت‌بندی خوانا و استاندارد حجم فایل‌ها
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 بایت';
  const k = 1024;
  const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * آپلود فایل دانشجو در سرور مودل (webservice/upload.php) جهت ارسال تکالیف
 */
export async function uploadMoodleFile(baseUrl, token, file, itemId = 0) {
  if (token === 'demo_token_mehestan_kntu' || token.startsWith('demo_')) {
    // نمونه شبیه‌سازی‌شده در حالت دمو
    return {
      itemid: itemId || Math.floor(Math.random() * 900000) + 100000,
      filename: file.name || 'assignment_submission.pdf',
      filepath: '/',
      filesize: file.size || 102400,
      url: 'https://vc.kntu.ac.ir/demo/file',
    };
  }

  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const targetUrl = `${cleanUrl}/webservice/upload.php`;

  const formData = new FormData();
  formData.append('token', token);
  formData.append('filearea', 'draft');
  formData.append('itemid', String(itemId || 0));
  formData.append('file', file);

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const fetchUrl = isLocal
    ? `/api/moodle-proxy?url=${encodeURIComponent(targetUrl)}`
    : targetUrl;

  const res = await fetch(fetchUrl, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`خطای آپلود فایل در مودل (${res.status})`);
  }

  const data = await res.json();
  if (data.error || data.errorcode) {
    throw new Error(data.error || data.message || 'خطا در بارگذاری فایل در سرور مودل');
  }

  const uploaded = Array.isArray(data) ? data[0] : data;
  return uploaded;
}

/**
 * ذخیره پیش‌نویس یا پاسخ تکلیف در سرور مودل (mod_assign_save_submission)
 */
export async function saveAssignmentSubmission(baseUrl, token, assignId, { fileItemId, onlineText } = {}) {
  if (token === 'demo_token_mehestan_kntu' || token.startsWith('demo_')) {
    return { success: true, message: 'تکلیف با موفقیت در حالت دمو ذخیره شد.' };
  }

  const params = {
    assignmentid: assignId,
  };

  if (fileItemId) {
    params['plugindata[files_filemanager]'] = fileItemId;
  }

  if (onlineText !== undefined && onlineText !== null) {
    params['plugindata[onlinetext_editor][text]'] = onlineText;
    params['plugindata[onlinetext_editor][format]'] = 1;
    params['plugindata[onlinetext_editor][itemid]'] = 0;
  }

  return await callMoodleWs(baseUrl, token, 'mod_assign_save_submission', params);
}

/**
 * تایید و ارسال نهایی تکلیف جهت نمره‌دهی استاد (mod_assign_submit_for_grading)
 */
export async function submitAssignmentForGrading(baseUrl, token, assignId) {
  if (token === 'demo_token_mehestan_kntu' || token.startsWith('demo_')) {
    return { success: true, message: 'تکلیف با موفقیت جهت نمره‌دهی نهایی شد.' };
  }

  return await callMoodleWs(baseUrl, token, 'mod_assign_submit_for_grading', {
    assignmentid: assignId,
    acceptsubmissionstatement: 1,
  });
}

/**
 * دریافت وضعیت تحویل یک تکلیف برای دانشجو (mod_assign_get_submission_status)
 */
export async function getAssignmentSubmissionStatus(baseUrl, token, assignId, userId = null) {
  if (token === 'demo_token_mehestan_kntu' || token.startsWith('demo_')) {
    const isSubmitted = assignId === 202;
    return {
      lastattempt: {
        submission: {
          status: isSubmitted ? 'submitted' : 'new',
          timemodified: Math.floor(Date.now() / 1000) - 86400,
          plugins: [
            {
              type: 'file',
              name: 'فایل ارسالی',
              fileareas: [
                {
                  area: 'submission_files',
                  files: isSubmitted
                    ? [
                        {
                          filename: 'Logic_Lab5_Async_Sync_Counters.pdf',
                          filesize: 2548200,
                          fileurl: 'https://vc.kntu.ac.ir/demo/Logic_Lab5.pdf',
                          mimetype: 'application/pdf',
                        },
                      ]
                    : [],
                },
              ],
            },
          ],
        },
        graded: isSubmitted,
        feedback: isSubmitted
          ? {
              grade: {
                grade: '19.50',
                gradefordisplay: '19.50 / 20.00',
              },
              plugins: [
                {
                  type: 'comments',
                  name: 'نظر استاد',
                  editorfields: [
                    {
                      text: '<p>گزارش و شبیه‌سازی بسیار کامل و منسجم بود. تحلیل خطاها دقیق است. خسته نباشید.</p>',
                    },
                  ],
                },
              ],
            }
          : null,
        canedit: !isSubmitted,
        cansubmit: !isSubmitted,
      },
    };
  }

  const params = { assignid: assignId };
  if (userId) params.userid = userId;
  return await callMoodleWs(baseUrl, token, 'mod_assign_get_submission_status', params);
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
  if (token === 'demo_token_mehestan_kntu' || token.startsWith('demo_')) {
    return [
      {
        id: 1,
        name: 'معرفی درس و سرفصل‌ها',
        summary: '<p>طرح درس، مراجع پیشنهادی و نحوه بارم‌بندی نمرات ترم</p>',
        modules: [
          {
            id: 1001,
            name: 'طرح درس و تقویم آموزشی نیم‌سال (PDF)',
            modname: 'resource',
            contents: [
              {
                filename: 'Syllabus_Fall403.pdf',
                filesize: 1258291,
                fileurl: 'https://vc.kntu.ac.ir/demo/Syllabus.pdf',
                mimetype: 'application/pdf',
              },
            ],
          },
        ],
      },
      {
        id: 2,
        name: 'فصل اول: تحلیل الگوریتم‌ها و مرتبه اجرایی',
        summary: '<p>مفاهیم پیچیدگی زمانی، تحلیل حالت بدترین و نمادهای Big-O</p>',
        modules: [
          {
            id: 1002,
            name: 'اسلایدهای جلسه ۱ و ۲: تحلیل مجانبی و پیچیدگی',
            modname: 'resource',
            contents: [
              {
                filename: 'Chapter01_Asymptotic_Analysis.pdf',
                filesize: 3565158,
                fileurl: 'https://vc.kntu.ac.ir/demo/Chapter01.pdf',
                mimetype: 'application/pdf',
              },
            ],
          },
          {
            id: 1003,
            name: 'نمونه کدهای پیاده‌سازی پایتون و بنچمارک',
            modname: 'resource',
            contents: [
              {
                filename: 'BigO_Benchmark_Codes.zip',
                filesize: 498176,
                fileurl: 'https://vc.kntu.ac.ir/demo/Codes.zip',
                mimetype: 'application/zip',
              },
            ],
          },
        ],
      },
      {
        id: 3,
        name: 'فصل دوم: درخت‌های جستجوی دودویی و خودمتوازن',
        summary: '<p>ساختار داده درخت، عملیات درج، حذف و تعادل در درخت‌های AVL</p>',
        modules: [
          {
            id: 1004,
            name: 'جزوه کلاسی درخت‌های AVL و چرخش‌ها (PDF)',
            modname: 'resource',
            contents: [
              {
                filename: 'AVL_Trees_LectureNotes.pdf',
                filesize: 4210000,
                fileurl: 'https://vc.kntu.ac.ir/demo/AVL_Notes.pdf',
                mimetype: 'application/pdf',
              },
            ],
          },
          {
            id: 1005,
            name: 'تمرین سری چهارم: پیاده‌سازی درخت AVL و هیپ بیشینه',
            modname: 'assign',
            instance: 201,
            url: 'https://vc.kntu.ac.ir/mod/assign/view.php?id=201',
          },
        ],
      },
      {
        id: 4,
        name: 'کلاس‌های آنلاین و جلسات ضبط‌شده',
        modules: [
          {
            id: 1006,
            name: 'لینک ورود به کلاس برخط دانشگاه (Adobe Connect / BBB)',
            modname: 'url',
            url: 'https://vc.kntu.ac.ir/class/ds-4031',
          },
        ],
      },
    ];
  }

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
