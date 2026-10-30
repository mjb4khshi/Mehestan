import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMoodleAuth } from './context/MoodleAuthContext';
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

const TABS_ORDER = ['courses', 'assignments', 'messages', 'calendar', 'settings'];

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
  const { isAuthenticated, assignments } = useMoodleAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [slideDir, setSlideDir] = useState(0);

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

  return (
    <div className="min-h-screen bg-base text-base-content flex flex-col pb-24 selection:bg-primary/20">
      <TopBar
        title={selectedCourse ? cleanCourseName(selectedCourse.fullname) : 'مهستان'}
        showBack={Boolean(selectedCourse)}
        onBack={handleBackToCourses}
      />

      {/* ترنزیشن روان و فنری صفحات بر اساس جهت حرکت سبک سروستان */}
      <AnimatePresence mode="wait" custom={slideDir}>
        <motion.main
          key={selectedCourse ? `course-${selectedCourse.id}` : activeTab}
          custom={slideDir}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex-1 overflow-x-hidden"
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

      <BottomNav
        activeTab={selectedCourse ? 'courses' : activeTab}
        onChangeTab={handleChangeTab}
        assignmentBadgeCount={pendingCount}
      />
    </div>
  );
}
