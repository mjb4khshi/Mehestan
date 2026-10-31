import React from 'react';
import { BookOpen, CheckSquare, Calendar, Settings, MessageSquare } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { toFaDigits } from '../utils/persianUtils';

const NAV_ITEMS = [
  { id: 'assignments', label: 'تکالیف', Icon: CheckSquare, activeColor: 'text-primary' },
  { id: 'calendar', label: 'تقویم', Icon: Calendar, activeColor: 'text-info' },
  { id: 'courses', label: 'دروس', Icon: BookOpen, activeColor: 'text-secondary' },
  { id: 'messages', label: 'پیام‌ها', Icon: MessageSquare, activeColor: 'text-warning' },
  { id: 'settings', label: 'تنظیمات', Icon: Settings, activeColor: 'text-accent' },
];

export default function BottomNav({ activeTab, onChangeTab, assignmentBadgeCount = 0 }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="ناوبری اصلی مهستان"
    >
      {/* گرادینت محو همرنگ پس‌زمینه برای جلوه شناور مشابه سروستان */}
      <div
        className="absolute inset-x-0 bottom-0 h-28 pointer-events-none -z-10"
        style={{
          background: `linear-gradient(
            to top,
            var(--theme-color-base, #0a0a0c) 0%,
            color-mix(in oklab, var(--theme-color-base, #0a0a0c) 92%, transparent) 22%,
            color-mix(in oklab, var(--theme-color-base, #0a0a0c) 72%, transparent) 42%,
            color-mix(in oklab, var(--theme-color-base, #0a0a0c) 45%, transparent) 62%,
            color-mix(in oklab, var(--theme-color-base, #0a0a0c) 20%, transparent) 78%,
            transparent 100%
          )`,
        }}
      />

      <div className="relative mx-auto max-w-[440px] px-2.5 pb-2.5 pt-0 pointer-events-auto">
        <LayoutGroup id="mehestanBottomNav">
          <div className="relative rounded-[22px] bg-base/95 backdrop-blur-md border border-base-500/70 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.35)] px-1.5 py-1 grid grid-cols-5 gap-1 items-center">
            {NAV_ITEMS.map((item) => {
              const { id, label, Icon, activeColor } = item;
              const isActive = activeTab === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeTab(id)}
                  className={`relative flex-1 min-w-0 h-12 flex flex-col items-center justify-center rounded-2xl transition-colors duration-200 outline-none select-none active:scale-95 cursor-pointer ${
                    isActive ? 'font-bold' : 'text-neutral hover:text-base-content'
                  }`}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* پیل متحرک زیر تب فعال سبک سروستان */}
                  {isActive && (
                    <motion.span
                      layoutId="navTabActivePill"
                      className="absolute inset-1 rounded-2xl bg-base-500/35 border border-base-500/50 z-0 shadow-sm"
                      transition={{ type: 'tween', duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  )}

                  <span
                    className={`relative z-10 flex flex-col items-center justify-end h-8 transition-colors duration-200 ${
                      isActive ? activeColor : ''
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        className={`w-5 h-5 transition-all duration-200 ${
                          isActive ? 'stroke-[2.4] -translate-y-[1px]' : 'stroke-[1.8] translate-y-0'
                        }`}
                      />
                      {id === 'assignments' && assignmentBadgeCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[9px] font-black grid place-items-center shadow-sm">
                          {toFaDigits(assignmentBadgeCount)}
                        </span>
                      )}
                    </div>

                    {/* نقطه نشانگر تب فعال */}
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-current shadow-sm mt-[3px]"
                      animate={{
                        opacity: isActive ? 1 : 0,
                        scale: isActive ? 1 : 0.5,
                      }}
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </nav>
  );
}
