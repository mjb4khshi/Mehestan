import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Share2,
  Filter,
  CheckCircle2,
  ChevronLeft,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAssignmentToSarvestan, exportAllAssignmentsToSarvestan } from '../services/sarvestanBridge';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import {
  cleanCourseName,
  cleanPersianText,
  toFaDigits,
  formatPersianDate,
  formatAssignmentTiming,
} from '../utils/persianUtils';

export default function AssignmentsScreen() {
  const { assignments } = useMoodleAuth();
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'past'
  const [exportedMsg, setExportedMsg] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const nowSec = Math.floor(Date.now() / 1000);

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'pending') {
      return a.duedate && a.duedate > nowSec;
    }
    if (filter === 'past') {
      return a.duedate && a.duedate <= nowSec;
    }
    return true;
  });

  const handleExport = (e, assignment) => {
    e.stopPropagation();
    exportAssignmentToSarvestan(assignment, assignment.courseName);
    setExportedMsg(`تکلیف «${cleanPersianText(assignment.name)}» به سروستان منتقل شد.`);
    setTimeout(() => setExportedMsg(''), 3000);
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      {/* فیلترها و دکمه انتقال کلی به سروستان */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-base-500/20 border border-base-500/30 text-xs">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filter === 'pending'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-neutral hover:text-base-content'
            }`}
          >
            در انتظار انجام ({toFaDigits(assignments.filter((a) => a.duedate && a.duedate > nowSec).length)})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-neutral hover:text-base-content'
            }`}
          >
            همه ({toFaDigits(assignments.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilter('past')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filter === 'past'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-neutral hover:text-base-content'
            }`}
          >
            گذشته
          </button>
        </div>

        {assignments.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => exportAllAssignmentsToSarvestan(filteredAssignments)}
            className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>انتقال به سروستان</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {exportedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{exportedMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* لیست تکالیف با کارت‌های انیمیشنی سبک سروستان */}
      {filteredAssignments.length === 0 ? (
        <div className="sarv-card p-12 text-center space-y-2">
          <CheckSquare className="w-8 h-8 text-neutral/40 mx-auto" />
          <p className="text-xs font-bold text-neutral">تکلیفی در این بخش یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a, idx) => {
            const isSubmitted = a.submissionStatus?.status === 'submitted';
            const timing = formatAssignmentTiming(a.duedate);

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedAssignment(a)}
                className={`sarv-card p-4 space-y-3 transition cursor-pointer hover:border-primary/50 group shadow-sm ${
                  timing.isLate ? 'border-error/40' : timing.isPending && a.duedate - nowSec < 86400 * 2 ? 'border-amber-500/50 bg-amber-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-base-500/20 text-neutral">
                        {cleanCourseName(a.courseName || a.courseShortName)}
                      </span>
                      {isSubmitted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/20 text-success border border-success/30">
                          تحویل داده شده
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-base-500/30 text-neutral">
                          تحویل داده نشده
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-base-content leading-relaxed group-hover:text-primary transition">
                      {cleanPersianText(a.name)}
                    </h4>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={(e) => handleExport(e, a)}
                    className="p-2 rounded-xl bg-base-500/20 text-neutral hover:text-emerald-500 hover:bg-emerald-500/15 transition cursor-pointer shrink-0"
                    title="افزودن به برنامه سروستان"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="pt-2 border-t border-base-500/20 flex items-center justify-between text-[11px] text-neutral flex-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>موعد: {formatPersianDate(a.duedate)}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${timing.badgeBg}`}>
                      {timing.text}
                    </span>
                    <div className="flex items-center gap-1 text-primary font-bold text-[11px] group-hover:translate-x-[-2px] transition-transform">
                      <span>مشاهده و ارسال</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* پنجره تعاملی جزئیات و ارسال تکلیف */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onSubmitted={() => {}}
        />
      )}
    </div>
  );
}
