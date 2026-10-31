import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMoodleAuth } from './context/MoodleAuthContext';
import { checkAndDispatchMoodleNotifications } from './services/moodleNotifications';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import AssignmentsScreen from './screens/AssignmentsScreen';
import CalendarScreen from './screens/CalendarScreen';
import SettingsScreen from './screens/SettingsScreen';
import MessagesScreen from './screens/MessagesScreen';
import { cleanCourseName } from './utils/persianUtils';

const TABS_ORDER = ['assignments', 'calendar', 'courses', 'messages', 'settings'];

const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
    scale: 0.99,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 },
      opacity: { duration: 0.16, ease: 'easeOut' },
      scale: { duration: 0.16, ease: 'easeOut' },
    },
  },
  exit: (direction) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
    scale: 0.99,
    transition: {
      x: { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 },
      opacity: { duration: 0.12, ease: 'easeIn' },
      scale: { duration: 0.12, ease: 'easeIn' },
    },
  }),
};

export default function App() {
  const { isAuthenticated, assignments, session, siteInfo } = useMoodleAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [slideDir, setSlideDir] = useState(0);

  // بررسی دوره‌ای اعلان‌های سیستمی مودل در پس‌زمینه
  useEffect(() => {
    if (!isAuthenticated || !session?.siteUrl || !session?.token) return;
    checkAndDispatchMoodleNotifications(session.siteUrl, session.token, siteInfo?.userid).catch(() => {});
    const interval = setInterval(() => {
      checkAndDispatchMoodleNotifications(session.siteUrl, session.token, siteInfo?.userid).catch(() => {});
    }, 180000);
    return () => clearInterval(interval);
  }, [isAuthenticated, session, siteInfo]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const pendingCount = assignments.filter((a) => a.duedate && a.duedate > nowSec).length;

  const handleSelectCourse = (course) => {
    setSlideDir(1);
    setSelectedCourse(course);
  };

  const handleBackToCourses = () => {
    setSlideDir(-1);
    setSelectedCourse(null);
  };

  const handleChangeTab = (nextTab) => {
    if (selectedCourse) {
      setSlideDir(-1);
      setSelectedCourse(null);
    } else {
      const prevIdx = TABS_ORDER.indexOf(activeTab);
      const nextIdx = TABS_ORDER.indexOf(nextTab);
      setSlideDir(nextIdx > prevIdx ? 1 : -1);
    }
    setActiveTab(nextTab);
  };

  // ژست حرکتی سوایپ بین تب‌ها و منوها (دقیقاً مشابه سروستان)
  const pointerStartRef = useRef(null);

  const isNoSwipeElement = (target) => {
    if (!target || typeof target.closest !== 'function') return false;
    return Boolean(
      target.closest(
        'input, textarea, select, [data-no-swipe], .no-swipe, .overflow-x-auto, table, [role="slider"], button, a'
      )
    );
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (isNoSwipeElement(e.target)) return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e) => {
    if (!pointerStartRef.current) return;
    const { x: startX, y: startY, time: startTime } = pointerStartRef.current;
    pointerStartRef.current = null;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const elapsed = Date.now() - startTime;

    if (elapsed > 450) return;
    if (Math.abs(dx) < 35 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;

    if (selectedCourse) return;

    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex < 0) return;

    // کشیدن انگشت به راست (dx > 0): رفتن به تب بعدی در منو
    // کشیدن انگشت به چپ (dx < 0): رفتن به تب قبلی در منو
    if (dx > 0 && currentIndex < TABS_ORDER.length - 1) {
      handleChangeTab(TABS_ORDER[currentIndex + 1]);
    } else if (dx < 0 && currentIndex > 0) {
      handleChangeTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
  };

  return (
    <div className="min-h-full bg-base text-base-content selection:bg-primary/30 selection:text-primary">
      <div className="lg:flex lg:justify-center lg:items-stretch lg:gap-4 lg:px-4">
        <div className="mobile-shell min-h-screen relative flex flex-col justify-between">
          <TopBar
            title={selectedCourse ? cleanCourseName(selectedCourse.fullname) : null}
            showBack={Boolean(selectedCourse)}
            onBack={handleBackToCourses}
          />

          <div
            className="flex-1 flex flex-col min-w-0 overflow-x-clip touch-pan-y select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {/* ترنزیشن روان و فنری صفحات بر اساس جهت حرکت سبک سروستان */}
            <AnimatePresence mode="wait" custom={slideDir}>
              <motion.main
                key={selectedCourse ? `course-${selectedCourse.id}` : activeTab}
                custom={slideDir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex-1 min-w-0 mobile-pad-bottom"
              >
                {selectedCourse ? (
                  <CourseDetailScreen course={selectedCourse} onBack={handleBackToCourses} />
                ) : activeTab === 'courses' ? (
                  <HomeScreen
                    onSelectCourse={handleSelectCourse}
                    onGoToAssignments={() => handleChangeTab('assignments')}
                  />
                ) : activeTab === 'assignments' ? (
                  <AssignmentsScreen />
                ) : activeTab === 'messages' ? (
                  <MessagesScreen />
                ) : activeTab === 'calendar' ? (
                  <CalendarScreen />
                ) : (
                  <SettingsScreen />
                )}
              </motion.main>
            </AnimatePresence>
          </div>

          <BottomNav
            activeTab={selectedCourse ? 'courses' : activeTab}
            onChangeTab={handleChangeTab}
            assignmentBadgeCount={pendingCount}
          />
        </div>
      </div>
    </div>
  );
}
