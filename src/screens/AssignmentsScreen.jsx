import React, { useState } from 'react';
import { CheckSquare, Clock, AlertCircle, Share2, Filter, CheckCircle2 } from 'lucide-react';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import { exportAssignmentToSarvestan, exportAllAssignmentsToSarvestan } from '../services/sarvestanBridge';

export default function AssignmentsScreen() {
  const { assignments } = useMoodleAuth();
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'past'
  const [exportedMsg, setExportedMsg] = useState('');

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

  const handleExport = (assignment) => {
    exportAssignmentToSarvestan(assignment, assignment.courseName);
    setExportedMsg(`تکلیف «${assignment.name}» به سروستان منتقل شد.`);
    setTimeout(() => setExportedMsg(''), 3000);
  };

  const formatDueDate = (timestamp) => {
    if (!timestamp) return 'بدون موعد مشخص';
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString('fa-IR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      {/* فیلترها و دکمه انتقال کلی */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-base-500/20 border border-base-500/30 text-xs">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filter === 'pending' ? 'bg-primary text-primary-content shadow-sm' : 'text-neutral hover:text-base-content'
            }`}
          >
            در انتظار انجام ({assignments.filter((a) => a.duedate && a.duedate > nowSec).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filter === 'all' ? 'bg-primary text-primary-content shadow-sm' : 'text-neutral hover:text-base-content'
            }`}
          >
            همه ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('past')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filter === 'past' ? 'bg-primary text-primary-content shadow-sm' : 'text-neutral hover:text-base-content'
            }`}
          >
            گذشته
          </button>
        </div>

        {assignments.length > 0 && (
          <button
            type="button"
            onClick={() => exportAllAssignmentsToSarvestan(filteredAssignments)}
            className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>انتقال به سروستان</span>
          </button>
        )}
      </div>

      {exportedMsg && (
        <div className="p-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportedMsg}</span>
        </div>
      )}

      {/* لیست تکالیف */}
      {filteredAssignments.length === 0 ? (
        <div className="mehestan-card p-12 text-center space-y-2">
          <CheckSquare className="w-8 h-8 text-neutral/40 mx-auto" />
          <p className="text-xs font-bold text-neutral">تکلیفی در این بخش یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => {
            const isDueSoon = a.duedate && a.duedate > nowSec && a.duedate - nowSec < 86400 * 2;
            return (
              <div
                key={a.id}
                className={`mehestan-card p-4 space-y-3 transition ${
                  isDueSoon ? 'border-amber-500/50 bg-amber-500/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-base-500/20 text-neutral">
                      {a.courseName || a.courseShortName}
                    </span>
                    <h4 className="text-xs font-black text-base-content leading-relaxed">{a.name}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExport(a)}
                    className="p-2 rounded-xl bg-base-500/20 text-neutral hover:text-emerald-500 hover:bg-emerald-500/15 transition cursor-pointer shrink-0"
                    title="افزودن به برنامه سروستان"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-base-500/20 flex items-center justify-between text-[11px] text-neutral">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>موعد: {formatDueDate(a.duedate)}</span>
                  </span>
                  {isDueSoon && (
                    <span className="text-amber-500 font-bold">مهلت محدود</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
