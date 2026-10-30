import React, { useState } from 'react';
import { useMoodleAuth } from './context/MoodleAuthContext';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import AssignmentsScreen from './screens/AssignmentsScreen';
import CalendarScreen from './screens/CalendarScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const { isAuthenticated, assignments } = useMoodleAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState(null);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const pendingCount = assignments.filter((a) => a.duedate && a.duedate > nowSec).length;

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
  };

  const handleChangeTab = (tab) => {
    setSelectedCourse(null);
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (selectedCourse) {
      return <CourseDetailScreen course={selectedCourse} onBack={handleBackToCourses} />;
    }

    switch (activeTab) {
      case 'courses':
        return (
          <HomeScreen
            onSelectCourse={handleSelectCourse}
            onGoToAssignments={() => handleChangeTab('assignments')}
          />
        );
      case 'assignments':
        return <AssignmentsScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onSelectCourse={handleSelectCourse} />;
    }
  };

  return (
    <div className="min-h-screen bg-base-900 text-base-content font-sans flex flex-col">
      <TopBar
        title={selectedCourse ? selectedCourse.fullname : 'مهستان'}
        showBack={Boolean(selectedCourse)}
        onBack={handleBackToCourses}
      />
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      <BottomNav
        activeTab={selectedCourse ? 'courses' : activeTab}
        onChangeTab={handleChangeTab}
        assignmentBadgeCount={pendingCount}
      />
    </div>
  );
}
