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

/**
 * دریافت کارنامه و ریزنمرات کامل درس (Gradebook)
 * مطابق ماژول رسمی gradereport_user_get_grade_items
 */
export async function getCourseGradeItems(baseUrl, token, courseId, userId) {
  if (token && token.startsWith('demo_')) {
    return {
      usergrades: [
        {
          courseid: courseId,
          userid: userId || 9999,
          gradeitems: [
            {
              id: 1,
              itemname: 'آزمون میان‌ترم کتبی (فصول ۱ تا ۴)',
              itemtype: 'mod',
              itemmodule: 'quiz',
              gradeformatted: '۱۷.۵۰',
              graderaw: 17.5,
              grademin: 0,
              grademax: 20,
              percentageformatted: '۸۷.۵۰٪',
              weightformatted: '۳۰.۰۰٪',
              feedback: 'پاسخ سوال‌های ۲ و ۴ بسیار دقیق و مرتب بود.',
            },
            {
              id: 2,
              itemname: 'کوییز اول: تحلیل پیچیدگی زمانی و مرتبه‌ها',
              itemtype: 'mod',
              itemmodule: 'quiz',
              gradeformatted: '۱۹.۰۰',
              graderaw: 19,
              grademin: 0,
              grademax: 20,
              percentageformatted: '۹۵.۰۰٪',
              weightformatted: '۱۰.۰۰٪',
              feedback: 'عالی',
            },
            {
              id: 3,
              itemname: 'کوییز دوم: پشته، صف و لیست‌های پیوندی',
              itemtype: 'mod',
              itemmodule: 'quiz',
              gradeformatted: '۱۶.۰۰',
              graderaw: 16,
              grademin: 0,
              grademax: 20,
              percentageformatted: '۸۰.۰۰٪',
              weightformatted: '۱۰.۰۰٪',
              feedback: 'در پیاده‌سازی صف حلقوی دقت فرمایید.',
            },
            {
              id: 4,
              itemname: 'تمرین سری اول: آنالیز مجانبی و روابط بازگشتی',
              itemtype: 'mod',
              itemmodule: 'assign',
              gradeformatted: '۲۰.۰۰',
              graderaw: 20,
              grademin: 0,
              grademax: 20,
              percentageformatted: '۱۰۰.۰۰٪',
              weightformatted: '۱۰.۰۰٪',
              feedback: 'ارسال به‌موقع با حل تشریحی تمیز.',
            },
            {
              id: 5,
              itemname: 'تمرین سری دوم: پیاده‌سازی ساختارهای پایه',
              itemtype: 'mod',
              itemmodule: 'assign',
              gradeformatted: '۱۸.۵۰',
              graderaw: 18.5,
              grademin: 0,
              grademax: 20,
              percentageformatted: '۹۲.۵۰٪',
              weightformatted: '۱۰.۰۰٪',
              feedback: 'تست‌کیس‌ها همگی با موفقیت پاس شدند.',
            },
            {
              id: 6,
              itemname: 'فعالیت و حضور در کلاس و تالار گفتگو',
              itemtype: 'manual',
              itemmodule: null,
              gradeformatted: '۱۰.۰۰',
              graderaw: 10,
              grademin: 0,
              grademax: 10,
              percentageformatted: '۱۰۰.۰۰٪',
              weightformatted: '۱۰.۰۰٪',
              feedback: 'مشارکت فعال و پیوسته',
            },
            {
              id: 99,
              itemname: 'مجموع نمرات کسب‌شده تاکنون (کل ترم)',
              itemtype: 'course',
              itemmodule: null,
              gradeformatted: '۱۸.۱۰',
              graderaw: 18.1,
              grademin: 0,
              grademax: 20,
              percentageformatted: '۹۰.۵۰٪',
              weightformatted: '۱۰۰.۰۰٪',
              lettergrade: 'A',
              feedback: 'وضعیت تحصیلی: ممتاز',
            },
          ],
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'gradereport_user_get_grade_items', {
    courseid: courseId,
    userid: userId,
  });
}

/**
 * دریافت فهرست اساتید، دستیاران و هم‌کلاسی‌ها (Class Participants)
 * مطابق وب‌سرویس core_enrol_get_enrolled_users
 */
export async function getEnrolledUsers(baseUrl, token, courseId) {
  if (token && token.startsWith('demo_')) {
    return [
      {
        id: 1001,
        fullname: 'دکتر محمدرضا صادقی',
        email: 'sadeghi@kntu.ac.ir',
        roleName: 'استاد درس',
        roleType: 'teacher',
        profileimageurl: null,
        department: 'دانشکده مهندسی کامپیوتر',
        lastaccess: Date.now() - 3600000,
      },
      {
        id: 1002,
        fullname: 'مهندس علی مرادی',
        email: 'a.moradi@email.kntu.ac.ir',
        roleName: 'دستیار آموزشی (TA)',
        roleType: 'ta',
        profileimageurl: null,
        department: 'دانشکده مهندسی کامپیوتر',
        lastaccess: Date.now() - 7200000,
      },
      {
        id: 1003,
        fullname: 'مهندس زهرا عباسی',
        email: 'z.abbasi@email.kntu.ac.ir',
        roleName: 'دستیار آموزشی (TA)',
        roleType: 'ta',
        profileimageurl: null,
        department: 'دانشکده مهندسی کامپیوتر',
        lastaccess: Date.now() - 86400000,
      },
      {
        id: 2001,
        fullname: 'سارا احمدی',
        email: 's.ahmadi@email.kntu.ac.ir',
        roleName: 'دانشجو',
        roleType: 'student',
        profileimageurl: null,
        department: 'مهندسی کامپیوتر (نرم‌افزار)',
        lastaccess: Date.now() - 14400000,
      },
      {
        id: 2002,
        fullname: 'نیما رضایی',
        email: 'n.rezaei@email.kntu.ac.ir',
        roleName: 'دانشجو',
        roleType: 'student',
        profileimageurl: null,
        department: 'مهندسی کامپیوتر (هوش مصنوعی)',
        lastaccess: Date.now() - 18000000,
      },
      {
        id: 2003,
        fullname: 'پارسا کریمی',
        email: 'p.karimi@email.kntu.ac.ir',
        roleName: 'دانشجو',
        roleType: 'student',
        profileimageurl: null,
        department: 'مهندسی کامپیوتر',
        lastaccess: Date.now() - 28800000,
      },
      {
        id: 2004,
        fullname: 'فاطمه حسینی',
        email: 'f.hosseini@email.kntu.ac.ir',
        roleName: 'دانشجو',
        roleType: 'student',
        profileimageurl: null,
        department: 'مهندسی کامپیوتر',
        lastaccess: Date.now() - 43200000,
      },
    ];
  }

  const raw = await callMoodleWs(baseUrl, token, 'core_enrol_get_enrolled_users', {
    courseid: courseId,
  });

  if (Array.isArray(raw)) {
    return raw.map((u) => {
      const isTeacher = (u.roles || []).some((r) => r.shortname?.includes('teacher') || r.roleid === 3 || r.roleid === 4);
      const isTa = (u.roles || []).some((r) => r.shortname?.includes('editingteacher') === false && r.shortname?.includes('ta'));
      let roleName = 'دانشجو';
      let roleType = 'student';
      if (isTeacher) {
        roleName = 'استاد درس';
        roleType = 'teacher';
      } else if (isTa) {
        roleName = 'دستیار آموزشی (TA)';
        roleType = 'ta';
      }
      return {
        id: u.id,
        fullname: u.fullname,
        email: u.email,
        roleName,
        roleType,
        profileimageurl: u.profileimageurl || null,
        department: u.department || '',
        lastaccess: u.lastaccess ? u.lastaccess * 1000 : null,
      };
    });
  }
  return [];
}

/**
 * دریافت تالارهای گفتگوی درس (Forums)
 * مطابق mod_forum_get_forums_by_courses
 */
export async function getCourseForums(baseUrl, token, courseId) {
  if (token && token.startsWith('demo_')) {
    return [
      {
        id: 501,
        course: courseId,
        name: 'تالار اعلانات و اخبار رسمی درس',
        intro: '<p>اطلاعیه‌های مهم امتحانات، مهلت‌ها و جلسات رفع‌اشکال در این تالار قرار می‌گیرد.</p>',
        numdiscussions: 3,
      },
      {
        id: 502,
        course: courseId,
        name: 'تالار پرسش و پاسخ و رفع اشکال تمرین‌ها',
        intro: '<p>محل بحث و هم‌فکری دانشجویان و پاسخ‌گویی دستیاران آموزشی به سوالات تکالیف.</p>',
        numdiscussions: 5,
      },
    ];
  }

  return await callMoodleWs(baseUrl, token, 'mod_forum_get_forums_by_courses', {
    'courseids[0]': courseId,
  });
}

/**
 * دریافت موضوعات یک تالار گفتگو (Forum Discussions)
 * مطابق mod_forum_get_forum_discussions_paginated
 */
export async function getForumDiscussions(baseUrl, token, forumId) {
  if (token && token.startsWith('demo_')) {
    return {
      discussions: [
        {
          id: 601,
          name: 'راهنمایی در مورد چرخش RL در درخت AVL (تمرین ۴)',
          userfullname: 'سارا احمدی',
          created: Math.floor(Date.now() / 1000) - 86400,
          timemodified: Math.floor(Date.now() / 1000) - 3600,
          numreplies: 4,
          message: '<p>سلام دوستان، در چرخش راست-چپ وقتی گره فرزند ضریب توازن منفی دارد، ترتیب به‌روزرسانی ارتفاع‌ها به چه صورت است؟</p>',
          pinned: true,
        },
        {
          id: 602,
          name: 'تمدید مهلت ارسال تمرین سری چهارم تا شنبه',
          userfullname: 'دکتر محمدرضا صادقی',
          created: Math.floor(Date.now() / 1000) - 172800,
          timemodified: Math.floor(Date.now() / 1000) - 172800,
          numreplies: 2,
          message: '<p>با توجه به درخواست دانشجویان، موعد تحویل تمرین ۴ تا ساعت ۲۳:۵۹ روز شنبه تمدید گردید.</p>',
          pinned: true,
        },
        {
          id: 603,
          name: 'فایل تست‌کیس‌های ورودی نمونه در گیت‌هاب',
          userfullname: 'مهندس علی مرادی',
          created: Math.floor(Date.now() / 1000) - 250000,
          timemodified: Math.floor(Date.now() / 1000) - 100000,
          numreplies: 6,
          message: '<p>تست‌کیس‌های ورودی برای آزمایش عملکرد هیپ بیشینه در پوشه مخزن کلاسی آپلود شد.</p>',
          pinned: false,
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'mod_forum_get_forum_discussions_paginated', {
    forumid: forumId,
    sortorder: 1,
  });
}

/**
 * ارسال پاسخ به یک گفتگوی تالار (Forum Reply)
 */
export async function addDiscussionPost(baseUrl, token, postId, subject, message) {
  if (token && token.startsWith('demo_')) {
    return { postid: Math.floor(Math.random() * 10000) + 700, status: true };
  }
  return await callMoodleWs(baseUrl, token, 'mod_forum_add_discussion_post', {
    postid: postId,
    subject: subject,
    message: message,
  });
}

/**
 * دریافت کوییزها و آزمون‌های آنلاین درس (Quizzes)
 * مطابق mod_quiz_get_quizzes_by_courses
 */
export async function getCourseQuizzes(baseUrl, token, courseId) {
  if (token && token.startsWith('demo_')) {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      quizzes: [
        {
          id: 301,
          course: courseId,
          name: 'کوییز تستی سری سوم: درخت‌های جستجوی دودویی و توازن',
          intro: '<p>آزمون شامل ۱۰ سوال چهارگزینه‌ای با نمره منفی است. زمان پاسخگویی: ۲۰ دقیقه.</p>',
          timelimit: 1200,
          timeopen: nowSec - 7 * 86400,
          timeclose: nowSec + 2 * 86400,
          grademethod: 1, // بالاترین نمره
          grade: 20,
          sumgrades: 10,
          attempts: [
            {
              id: 901,
              attempt: 1,
              state: 'finished',
              sumgrades: 9.5,
              timestart: nowSec - 2 * 86400,
              timefinish: nowSec - 2 * 86400 + 1100,
              gradeFormatted: '۱۹.۰۰ از ۲۰',
            },
          ],
        },
        {
          id: 302,
          course: courseId,
          name: 'آزمون تستی دوره‌ای میان‌ترم (شبیه‌ساز تستی)',
          intro: '<p>آزمون آزمایشی برای آمادگی امتحانات با مرور نکات کلیدی فصول ۱ تا ۴.</p>',
          timelimit: 1800,
          timeopen: nowSec - 14 * 86400,
          timeclose: nowSec - 3 * 86400,
          grademethod: 1,
          grade: 20,
          sumgrades: 15,
          attempts: [
            {
              id: 902,
              attempt: 1,
              state: 'finished',
              sumgrades: 13.5,
              timestart: nowSec - 5 * 86400,
              timefinish: nowSec - 5 * 86400 + 1750,
              gradeFormatted: '۱۸.۰۰ از ۲۰',
            },
          ],
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'mod_quiz_get_quizzes_by_courses', {
    'courseids[0]': courseId,
  });
}

/**
 * دریافت تاریخچه تلاش‌های کاربر در یک کوییز
 */
export async function getUserQuizAttempts(baseUrl, token, quizId) {
  if (token && token.startsWith('demo_')) {
    return {
      attempts: [
        {
          id: 901,
          quiz: quizId,
          attempt: 1,
          state: 'finished',
          sumgrades: 9.5,
          timestart: Math.floor(Date.now() / 1000) - 86400,
          timefinish: Math.floor(Date.now() / 1000) - 85300,
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'mod_quiz_get_user_attempts', {
    quizid: quizId,
  });
}

/**
 * دریافت مکالمات پیام‌رسان دانشگاه (Moodle Messages / Conversations)
 * مطابق core_message_get_conversations
 */
export async function getMoodleConversations(baseUrl, token, userId) {
  if (token && token.startsWith('demo_')) {
    return {
      conversations: [
        {
          id: 701,
          name: 'دکتر محمدرضا صادقی',
          subname: 'استاد درس ساختمان داده‌ها',
          imageurl: null,
          unreadcount: 0,
          isread: true,
          lastmessage: 'سلام، بله مهلت ارسال تمرین ۴ تا ساعت ۲۴ روز شنبه تمدید گردید.',
          lastmessagedate: Date.now() - 7200000,
          members: [
            { id: 1001, fullname: 'دکتر محمدرضا صادقی', canmessage: true },
          ],
        },
        {
          id: 702,
          name: 'مهندس علی مرادی',
          subname: 'دستیار آموزشی (TA)',
          imageurl: null,
          unreadcount: 1,
          isread: false,
          lastmessage: 'فایل تست‌کیس‌های تصادفی در تالار گفتگو قرار گرفت.',
          lastmessagedate: Date.now() - 14400000,
          members: [
            { id: 1002, fullname: 'مهندس علی مرادی', canmessage: true },
          ],
        },
        {
          id: 703,
          name: 'گروه پروژه کلاسی ساختمان داده‌ها',
          subname: 'سارا احمدی، نیما رضایی و شما',
          imageurl: null,
          unreadcount: 0,
          isread: true,
          lastmessage: 'پاورپوینت ارائه آماده شد، لطفاً بازبینی فرمایید.',
          lastmessagedate: Date.now() - 86400000,
          members: [
            { id: 2001, fullname: 'سارا احمدی', canmessage: true },
            { id: 2002, fullname: 'نیما رضایی', canmessage: true },
          ],
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'core_message_get_conversations', {
    userid: userId,
  });
}

/**
 * دریافت پیام‌های یک گفتگوی خاص در پیام‌رسان مودل
 */
export async function getConversationMessages(baseUrl, token, currentUserId, conversationId) {
  if (token && token.startsWith('demo_')) {
    return {
      messages: [
        {
          id: 801,
          useridfrom: currentUserId || 9999,
          text: 'سلام استاد، وقت بخیر. آیا امکان تمدید زمان ارسال تمرین سری چهارم تا شنبه وجود دارد؟',
          timecreated: Math.floor(Date.now() / 1000) - 10800,
        },
        {
          id: 802,
          useridfrom: 1001,
          text: 'سلام، بله مهلت ارسال تمرین ۴ تا ساعت ۲۴ روز شنبه تمدید گردید. موفق باشید.',
          timecreated: Math.floor(Date.now() / 1000) - 7200,
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'core_message_get_conversation_messages', {
    currentuserid: currentUserId,
    convid: conversationId,
  });
}

/**
 * ارسال پیام جدید در پیام‌رسان دانشگاه
 */
export async function sendMoodleMessage(baseUrl, token, toUserId, text) {
  if (token && token.startsWith('demo_')) {
    return [{ msgid: Math.floor(Math.random() * 10000) + 900 }];
  }

  return await callMoodleWs(baseUrl, token, 'core_message_send_instant_messages', {
    'messages[0][touserid]': toUserId,
    'messages[0][text]': text,
  });
}

/**
 * دریافت نشان‌ها و دستاوردهای گیمیفیکیشن دانشجو (Badges)
 * مطابق core_badges_get_user_badges
 */
export async function getUserBadges(baseUrl, token, userId) {
  if (token && token.startsWith('demo_')) {
    return {
      badges: [
        {
          id: 1,
          name: 'نشان حل مسئله برتر',
          description: 'کسب نمره کامل در تمرین‌های الگوریتمی ساختمان داده‌ها',
          issuername: 'دانشکده مهندسی کامپیوتر خواجه نصیر',
          dateissued: Math.floor(Date.now() / 1000) - 10 * 86400,
          badgeurl: null,
        },
        {
          id: 2,
          name: 'نشان مشارکت فعال در تالار گفتگو',
          description: 'پاسخ‌گویی به بیش از ۵ سوال هم‌کلاسی‌ها در مباحث درسی',
          issuername: 'سامانه آموزش الکترونیکی',
          dateissued: Math.floor(Date.now() / 1000) - 20 * 86400,
          badgeurl: null,
        },
        {
          id: 3,
          name: 'نشان تحویل به‌موقع تکالیف',
          description: 'ارسال تمامی تکالیف نیم‌سال پیش از موعد ددلاین بدون تاخیر',
          issuername: 'مدیریت آموزش الکترونیکی',
          dateissued: Math.floor(Date.now() / 1000) - 30 * 86400,
          badgeurl: null,
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'core_badges_get_user_badges', {
    userid: userId,
  });
}

/**
 * دریافت فایل‌های ذخیره‌سازی شخصی دانشجو در فضای ابری مودل (Private Files)
 * مطابق core_user_get_private_files
 */
export async function getPrivateFiles(baseUrl, token) {
  if (token && token.startsWith('demo_')) {
    return {
      files: [
        {
          filename: 'Project_Proposal_Draft.docx',
          filesize: 1250000,
          fileurl: 'https://vc.kntu.ac.ir/demo/Project_Proposal_Draft.docx',
          timemodified: Math.floor(Date.now() / 1000) - 3 * 86400,
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          filename: 'Cheatsheet_Data_Structures.pdf',
          filesize: 840000,
          fileurl: 'https://vc.kntu.ac.ir/demo/Cheatsheet_Data_Structures.pdf',
          timemodified: Math.floor(Date.now() / 1000) - 10 * 86400,
          mimetype: 'application/pdf',
        },
        {
          filename: 'AVL_Tree_Benchmark_Results.zip',
          filesize: 3450000,
          fileurl: 'https://vc.kntu.ac.ir/demo/AVL_Tree_Benchmark_Results.zip',
          timemodified: Math.floor(Date.now() / 1000) - 15 * 86400,
          mimetype: 'application/zip',
        },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'core_user_get_private_files');
}

/**
 * به‌روزرسانی دستی وضعیت تکمیل یک فعالیت توسط دانشجو (Activity Completion)
 * مطابق core_completion_update_activity_completion_status_manually
 */
export async function updateActivityCompletion(baseUrl, token, cmid, completed) {
  if (token && token.startsWith('demo_')) {
    return { status: true };
  }

  return await callMoodleWs(baseUrl, token, 'core_completion_update_activity_completion_status_manually', {
    cmid: cmid,
    completed: completed ? 1 : 0,
  });
}

/**
 * دریافت وضعیت تکمیل تمام فعالیت‌های یک درس
 */
export async function getCourseCompletion(baseUrl, token, courseId, userId) {
  if (token && token.startsWith('demo_')) {
    return {
      statuses: [
        { cmid: 1001, state: 1 },
        { cmid: 1002, state: 1 },
        { cmid: 1003, state: 0 },
        { cmid: 1004, state: 1 },
        { cmid: 1005, state: 0 },
        { cmid: 1006, state: 1 },
      ],
    };
  }

  return await callMoodleWs(baseUrl, token, 'core_completion_get_activities_completion_status', {
    courseid: courseId,
    userid: userId,
  });
}
