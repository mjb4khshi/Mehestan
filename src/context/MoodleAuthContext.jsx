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

const MoodleAuthContext = createContext();

export function MoodleAuthProvider({ children }) {
  const [session, setSession] = useState(getMoodleSession);
  const [siteInfo, setSiteInfo] = useState(null);
  const [courses, setCourses] = useState(getCachedCourses);
  const [assignments, setAssignments] = useState(getCachedAssignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(session && session.token);

  const login = async (siteUrl, username, password) => {
    setLoading(true);
    setError(null);
    try {
      const auth = await loginWithMoodle(siteUrl, username, password);
      const fullSession = {
        siteUrl,
        username,
        token: auth.token,
        privateToken: auth.privateToken,
      };
      setSession(fullSession);
      saveMoodleSession(fullSession);

      // بارگذاری مشخصات دانشجو
      const info = await getSiteInfo(siteUrl, auth.token);
      setSiteInfo(info);

      // بارگذاری دروس
      const userCourses = await getUserCourses(siteUrl, auth.token, info.userid);
      setCourses(userCourses);
      cacheCourses(userCourses);

      // بارگذاری تکالیف
      const courseIds = userCourses.map((c) => c.id);
      if (courseIds.length > 0) {
        const assignsData = await getAssignments(siteUrl, auth.token, courseIds);
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

      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || 'خطا در ورود به سامانه مودل');
      setLoading(false);
      throw err;
    }
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
    setLoading(true);
    try {
      const info = await getSiteInfo(session.siteUrl, session.token);
      setSiteInfo(info);
      const userCourses = await getUserCourses(session.siteUrl, session.token, info.userid);
      setCourses(userCourses);
      cacheCourses(userCourses);

      const courseIds = userCourses.map((c) => c.id);
      if (courseIds.length > 0) {
        const assignsData = await getAssignments(session.siteUrl, session.token, courseIds);
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
    } catch (e) {
      console.warn('Silent refresh failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && session.token) {
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
