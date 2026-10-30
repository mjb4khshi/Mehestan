import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginWithMoodle,
  getSiteInfo,
  getUserCourses,
  getAssignments,
} from '../services/moodle/api';
import {
  saveMoodleSession,
  getMoodleSession,
  clearMoodleSession,
  cacheCourses,
  getCachedCourses,
  cacheAssignments,
  getCachedAssignments,
} from '../services/moodle/storage';
import { setupDeepLinkListener } from '../services/moodle/sso';

const MoodleAuthContext = createContext();

const DEMO_COURSES = [
  {
    id: 101,
    fullname: 'ساختمان داده‌ها و الگوریتم‌ها (گروه ۱)',
    shortname: 'DS-4031',
    categoryname: 'دانشکده مهندسی کامپیوتر',
    progress: 75,
    enrolledusercount: 64,
  },
  {
    id: 102,
    fullname: 'مدارهای منطقی و سیستم‌های دیجیتال',
    shortname: 'LOGIC-4031',
    categoryname: 'دانشکده مهندسی کامپیوتر',
    progress: 60,
    enrolledusercount: 58,
  },
  {
    id: 103,
    fullname: 'ریاضیات مهندسی',
    shortname: 'ENGMATH-4031',
    categoryname: 'دانشکده علوم پایه',
    progress: 40,
    enrolledusercount: 82,
  },
  {
    id: 104,
    fullname: 'فیزیک ۲ (الکتریسیته و مغناطیس)',
    shortname: 'PHYS2-4031',
    categoryname: 'دانشکده فیزیک',
    progress: 85,
    enrolledusercount: 90,
  },
];

const nowSec = Math.floor(Date.now() / 1000);
const DEMO_ASSIGNMENTS = [
  {
    id: 201,
    course: 101,
    courseName: 'ساختمان داده‌ها و الگوریتم‌ها (گروه ۱)',
    courseShortName: 'DS-4031',
    name: 'تمرین سری چهارم: پیاده‌سازی درخت AVL و هیپ بیشینه',
    intro: '<p>کدهای برنامه را در قالب یک فایل زیپ به همراه گزارش تست ارسال فرمایید.</p>',
    duedate: nowSec + 3 * 86400, // ۳ روز دیگر
    cutoffdate: nowSec + 4 * 86400,
    submissionStatus: { status: 'notsubmitted' },
  },
  {
    id: 202,
    course: 102,
    courseName: 'مدارهای منطقی و سیستم‌های دیجیتال',
    courseShortName: 'LOGIC-4031',
    name: 'گزارش کار آزمایشگاه: شمارنده‌های آسنکرون و سنکرون',
    intro: '<p>گزارش کار آزمایش ۵ شامل شبیه‌سازی در Proteus یا ModelSim</p>',
    duedate: nowSec + 5 * 86400, // ۵ روز دیگر
    cutoffdate: nowSec + 6 * 86400,
    submissionStatus: { status: 'submitted' },
  },
  {
    id: 203,
    course: 103,
    courseName: 'ریاضیات مهندسی',
    courseShortName: 'ENGMATH-4031',
    name: 'تمرین فصل سوم: سری فوریه و تبدیل فوریه',
    intro: '<p>پاسخ دست‌نویس اسکن‌شده به صورت یک فایل PDF خوانا بارگذاری شود.</p>',
    duedate: nowSec + 1 * 86400, // فردا
    cutoffdate: nowSec + 1 * 86400,
    submissionStatus: { status: 'notsubmitted' },
  },
];

export function MoodleAuthProvider({ children }) {
  const [session, setSession] = useState(getMoodleSession);
  const [siteInfo, setSiteInfo] = useState(null);
  const [courses, setCourses] = useState(getCachedCourses);
  const [assignments, setAssignments] = useState(getCachedAssignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(session && session.token);

  const loadUserDataWithToken = async (siteUrl, token, privateToken = null, usernameHint = null) => {
    // بارگذاری مشخصات دانشجو
    const info = await getSiteInfo(siteUrl, token);
    setSiteInfo(info);

    const fullSession = {
      siteUrl,
      username: info.username || usernameHint || 'دانشجو',
      token,
      privateToken,
    };
    setSession(fullSession);
    saveMoodleSession(fullSession);

    // بارگذاری دروس
    const userCourses = await getUserCourses(siteUrl, token, info.userid);
    setCourses(userCourses);
    cacheCourses(userCourses);

    // بارگذاری تکالیف
    const courseIds = userCourses.map((c) => c.id);
    if (courseIds.length > 0) {
      const assignsData = await getAssignments(siteUrl, token, courseIds);
      const flattened = [];
      if (assignsData && Array.isArray(assignsData.courses)) {
        assignsData.courses.forEach((c) => {
          if (Array.isArray(c.assignments)) {
            c.assignments.forEach((a) => {
              flattened.push({ ...a, courseName: c.fullname, courseShortName: c.shortname });
            });
          }
        });
      }
      setAssignments(flattened);
      cacheAssignments(flattened);
    }

    return true;
  };

  const login = async (siteUrl, username, password) => {
    setLoading(true);
    setError(null);
    try {
      const auth = await loginWithMoodle(siteUrl, username, password);
      await loadUserDataWithToken(siteUrl, auth.token, auth.privateToken, username);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'خطا در ورود به سامانه مودل');
      setLoading(false);
      throw err;
    }
  };

  const loginWithToken = async (siteUrl, token, privateToken = null) => {
    setLoading(true);
    setError(null);
    try {
      await loadUserDataWithToken(siteUrl, token, privateToken);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'خطا در برقراری ارتباط با توکن دریافت شده از مودل');
      setLoading(false);
      throw err;
    }
  };

  const loginWithDemo = () => {
    setLoading(true);
    setError(null);
    const demoSession = {
      siteUrl: 'https://vc.kntu.ac.ir',
      username: 'دانشجوی خواجه نصیر (دمو)',
      token: 'demo_token_mehestan_kntu',
      isDemo: true,
    };
    const demoInfo = {
      sitename: 'سامانه آموزش الکترونیکی و مجازی دانشگاه صنعتی خواجه نصیرالدین طوسی (vc.kntu.ac.ir)',
      username: 'kntu_demo_student',
      firstname: 'دانشجو',
      lastname: 'خواجه نصیر',
      fullname: 'دانشجوی خواجه نصیر',
      userpictureurl: null,
      userid: 9999,
    };
    setSession(demoSession);
    setSiteInfo(demoInfo);
    setCourses(DEMO_COURSES);
    setAssignments(DEMO_ASSIGNMENTS);
    saveMoodleSession(demoSession);
    cacheCourses(DEMO_COURSES);
    cacheAssignments(DEMO_ASSIGNMENTS);
    setLoading(false);
    return true;
  };

  const logout = () => {
    setSession(null);
    setSiteInfo(null);
    setCourses([]);
    setAssignments([]);
    clearMoodleSession();
  };

  const refreshData = async () => {
    if (!session || !session.token) return;
    if (session.isDemo) {
      setCourses(DEMO_COURSES);
      setAssignments(DEMO_ASSIGNMENTS);
      return;
    }
    setLoading(true);
    try {
      await loadUserDataWithToken(session.siteUrl, session.token, session.privateToken, session.username);
    } catch (e) {
      console.warn('Silent refresh failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // ثبت شنونده Deep Link برای احراز هویت مرکزی SSO در اندروید و وب
  useEffect(() => {
    const cleanup = setupDeepLinkListener((parsed) => {
      if (parsed && parsed.token) {
        const targetSiteUrl = parsed.siteUrl || session?.siteUrl || 'https://vc.kntu.ac.ir';
        loginWithToken(targetSiteUrl, parsed.token, parsed.privateToken).catch((err) => {
          console.error('SSO Login with token failed:', err);
        });
      }
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [session]);

  useEffect(() => {
    if (session && session.token && !session.isDemo) {
      refreshData();
    }
  }, []);

  return (
    <MoodleAuthContext.Provider
      value={{
        session,
        siteInfo,
        courses,
        assignments,
        loading,
        error,
        isAuthenticated,
        login,
        loginWithToken,
        loginWithDemo,
        logout,
        refreshData,
      }}
    >
      {children}
    </MoodleAuthContext.Provider>
  );
}

export function useMoodleAuth() {
  return useContext(MoodleAuthContext);
}
