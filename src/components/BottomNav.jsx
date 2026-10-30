import React from 'react';
import { BookOpen, CheckSquare, Calendar, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'courses', label: 'دروس', icon: BookOpen },
  { id: 'assignments', label: 'تکالیف', icon: CheckSquare },
  { id: 'calendar', label: 'تقویم', icon: Calendar },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
];

export default function BottomNav({ activeTab, onChangeTab, assignmentBadgeCount = 0 }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass-nav px-3 py-2 flex items-center justify-around safe-bottom">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChangeTab(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
              isActive ? 'text-primary scale-105' : 'text-neutral hover:text-base-content'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.id === 'assignments' && assignmentBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold grid place-items-center">
                  {assignmentBadgeCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold mt-1 ${isActive ? 'font-black' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
