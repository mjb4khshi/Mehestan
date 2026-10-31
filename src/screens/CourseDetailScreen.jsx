import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckSquare,
  Folder,
  Link as LinkIcon,
  HelpCircle,
  MessageSquare,
  FileArchive,
  FileCode,
  Video,
  Music,
  ArrowRight,
  Upload,
  Award,
  Users,
  CheckCircle2,
  Circle,
  Mail,
  Send,
  Plus,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCourseContents,
  getMoodleFileUrl,
  getCourseGradeItems,
  getEnrolledUsers,
  getCourseForums,
  getForumDiscussions,
  addDiscussionPost,
  updateActivityCompletion,
  getCourseCompletion,
} from '../services/moodle/api';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import QuizDetailModal from '../components/QuizDetailModal';
import { cleanCourseName, cleanPersianText, toFaDigits, formatFileSizeFa } from '../utils/persianUtils';

const COURSE_TABS = [
  { id: 'content', label: 'سرفصل‌ها و محتوا', Icon: BookOpen },
  { id: 'grades', label: 'کارنامه و ریزنمرات', Icon: Award },
  { id: 'participants', label: 'هم‌کلاسی‌ها و اساتید', Icon: Users },
  { id: 'forum', label: 'تالار گفتگو', Icon: MessageSquare },
];

export default function CourseDetailScreen({ course, onBack }) {
  const { session, siteInfo, assignments } = useMoodleAuth();
  const [activeTab, setActiveTab] = useState('content');

  // داده‌های محتوای درس
  const [contents, setContents] = useState([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [completionStatuses, setCompletionStatuses] = useState({});

  // داده‌های کارنامه و نمرات
  const [gradeItems, setGradeItems] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // داده‌های اساتید و هم‌کلاسی‌ها
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantRoleFilter, setParticipantRoleFilter] = useState('all');

  // داده‌های تالارهای گفتگو
  const [forums, setForums] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [activeForum, setActiveForum] = useState(null);
  const [loadingForums, setLoadingForums] = useState(false);
  const [newDiscussionSubject, setNewDiscussionSubject] = useState('');
  const [newDiscussionMessage, setNewDiscussionMessage] = useState('');
  const [showNewDiscussionForm, setShowNewDiscussionForm] = useState(false);
  const [submittingDiscussion, setSubmittingDiscussion] = useState(false);

  // مودال‌های جزئیات تکلیف و کوییز
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // بارگذاری سرفصل‌ها و محتوای درس
  useEffect(() => {
    async function loadContents() {
      if (!session || !course) return;
      setLoadingContents(true);
      try {
        const [contentsData, completionData] = await Promise.all([
          getCourseContents(session.siteUrl, session.token, course.id),
          getCourseCompletion(session.siteUrl, session.token, course.id, siteInfo?.userid || 9999).catch(() => null),
        ]);

        setContents(contentsData || []);
        const initialExpanded = {};
        (contentsData || []).forEach((sec) => {
          initialExpanded[sec.id] = true;
        });
        setExpandedSections(initialExpanded);

        if (completionData && Array.isArray(completionData.statuses)) {
          const statusMap = {};
          completionData.statuses.forEach((s) => {
            statusMap[s.cmid] = s.state === 1;
          });
          setCompletionStatuses(statusMap);
        }
      } catch (err) {
        console.error('Failed to load course contents:', err);
      } finally {
        setLoadingContents(false);
      }
    }
    loadContents();
  }, [course, session, siteInfo]);

  // بارگذاری کارنامه ریزنمرات درس
  useEffect(() => {
    if (activeTab !== 'grades' || !session || !course) return;
    async function loadGrades() {
      setLoadingGrades(true);
      try {
        const res = await getCourseGradeItems(
          session.siteUrl,
          session.token,
          course.id,
          siteInfo?.userid || 9999
        );
        const grades = res?.usergrades?.[0]?.gradeitems || [];
        setGradeItems(grades);
      } catch (err) {
        console.error('Failed to load grades:', err);
      } finally {
        setLoadingGrades(false);
      }
    }
    loadGrades();
  }, [activeTab, course, session, siteInfo]);

  // بارگذاری هم‌کلاسی‌ها و اساتید
  useEffect(() => {
    if (activeTab !== 'participants' || !session || !course) return;
    async function loadParticipants() {
      setLoadingParticipants(true);
      try {
        const res = await getEnrolledUsers(session.siteUrl, session.token, course.id);
        setParticipants(res || []);
      } catch (err) {
        console.error('Failed to load participants:', err);
      } finally {
        setLoadingParticipants(false);
      }
    }
    loadParticipants();
  }, [activeTab, course, session]);

  // بارگذاری تالار گفتگو
  useEffect(() => {
    if (activeTab !== 'forum' || !session || !course) return;
    async function loadForums() {
      setLoadingForums(true);
      try {
        const forumList = await getCourseForums(session.siteUrl, session.token, course.id);
        setForums(forumList || []);
        if (forumList && forumList.length > 0) {
          const firstForum = forumList[0];
          setActiveForum(firstForum);
          const discRes = await getForumDiscussions(session.siteUrl, session.token, firstForum.id);
          setDiscussions(discRes?.discussions || []);
        }
      } catch (err) {
        console.error('Failed to load forums:', err);
      } finally {
        setLoadingForums(false);
      }
    }
    loadForums();
  }, [activeTab, course, session]);

  const toggleSection = (secId) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleToggleCompletion = async (cmid) => {
    const nextVal = !completionStatuses[cmid];
    setCompletionStatuses((prev) => ({ ...prev, [cmid]: nextVal }));
    try {
      await updateActivityCompletion(session.siteUrl, session.token, cmid, nextVal);
    } catch (err) {
      console.warn('Failed to update completion on server', err);
    }
  };

  const handleOpenAssign = (mod) => {
    const found = (assignments || []).find(
      (a) => a.id === mod.instance || a.id === mod.id || a.name === mod.name
    );

    const assignObj = found || {
      id: mod.instance || mod.id,
      name: mod.name,
      course: course.id,
      courseName: course.fullname,
      courseShortName: course.shortname,
      intro: mod.description || '<p>برای مشاهده و ارسال پاسخ تکلیف، جزئیات زیر را بررسی فرمایید.</p>',
      duedate: null,
    };

    setSelectedAssignment(assignObj);
  };

  const handleOpenQuiz = (mod) => {
    const quizObj = {
      id: mod.instance || mod.id,
      name: mod.name,
      course: course.id,
      intro: mod.description || '<p>آزمون آنلاین کلاسی در سامانه مودل.</p>',
      timelimit: 1200,
      grademethod: 1,
      grade: 20,
    };
    setSelectedQuiz(quizObj);
  };

  const handleSelectForum = async (forum) => {
    setActiveForum(forum);
    setLoadingForums(true);
    try {
      const discRes = await getForumDiscussions(session.siteUrl, session.token, forum.id);
      setDiscussions(discRes?.discussions || []);
    } catch (err) {
      console.error('Failed to load discussions for forum:', err);
    } finally {
      setLoadingForums(false);
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (!newDiscussionSubject.trim() || !newDiscussionMessage.trim() || submittingDiscussion) return;

    setSubmittingDiscussion(true);
    try {
      await addDiscussionPost(
        session.siteUrl,
        session.token,
        activeForum?.id || 501,
        newDiscussionSubject.trim(),
        newDiscussionMessage.trim()
      );

      const optimisticPost = {
        id: Date.now(),
        name: newDiscussionSubject.trim(),
        userfullname: siteInfo?.fullname || 'شما',
        created: Math.floor(Date.now() / 1000),
        numreplies: 0,
        message: `<p>${newDiscussionMessage.trim()}</p>`,
      };
      setDiscussions((prev) => [optimisticPost, ...prev]);
      setNewDiscussionSubject('');
      setNewDiscussionMessage('');
      setShowNewDiscussionForm(false);
    } catch (err) {
      console.error('Failed to post discussion:', err);
    } finally {
      setSubmittingDiscussion(false);
    }
  };

  const getFileIcon = (filename = '', mimetype = '') => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf') || mimetype.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
    }
    if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z') || mimetype.includes('zip') || mimetype.includes('compressed')) {
      return <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (lower.endsWith('.py') || lower.endsWith('.cpp') || lower.endsWith('.c') || lower.endsWith('.java') || lower.endsWith('.js') || lower.endsWith('.html')) {
      return <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || mimetype.includes('video')) {
      return <Video className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    if (lower.endsWith('.mp3') || mimetype.includes('audio')) {
      return <Music className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-primary shrink-0" />;
  };

  const getModuleTypeIcon = (modname) => {
    switch (modname) {
      case 'assign':
        return <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-purple-500 shrink-0" />;
      case 'folder':
        return <Folder className="w-4 h-4 text-primary shrink-0" />;
      case 'url':
        return <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />;
      case 'forum':
        return <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'resource':
      default:
        return <FileText className="w-4 h-4 text-primary shrink-0" />;
    }
  };

  const filteredParticipants = participants.filter((p) => {
    if (participantRoleFilter === 'all') return true;
    return p.roleType === participantRoleFilter;
  });

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto min-w-0">
      {/* سربرگ درس با نشان و عنوان */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sarv-card p-4 space-y-2.5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onBack}
            className="text-xs text-neutral hover:text-primary transition flex items-center gap-1 font-bold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            <span>بازگشت به فهرست دروس</span>
          </motion.button>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
            {cleanPersianText(course.shortname)}
          </span>
        </div>
        <h2 className="text-sm font-black text-base-content leading-relaxed">
          {cleanCourseName(course.fullname)}
        </h2>
      </motion.div>

      {/* تب‌های رسمی ۴گانه درس در اپ مودل — سبک کنترل تقسیم‌شده سروستان */}
      <div className="sarv-seg">
        {COURSE_TABS.map((tab) => {
          const { id, label, Icon } = tab;
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-neutral hover:text-base-content hover:bg-base-500/20'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>

      {/* تب ۱: سرفصل‌ها و محتوای درس */}
      {activeTab === 'content' && (
        <div className="space-y-3">
          {loadingContents ? (
            <div className="sarv-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>در حال دریافت سرفصل‌ها و فایل‌های درسی از مودل...</span>
            </div>
          ) : contents.length === 0 ? (
            <div className="sarv-card p-8 text-center text-xs text-neutral">
              سرفصلی برای این درس ثبت نشده است.
            </div>
          ) : (
            contents.map((section, sIdx) => {
              const isExpanded = expandedSections[section.id];
              const modules = section.modules || [];
              if (!section.name && modules.length === 0) return null;

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sIdx * 0.04 }}
                  className="sarv-card overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-3.5 flex items-center justify-between text-right bg-base-500/10 hover:bg-base-500/20 transition cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-black text-base-content truncate">
                        {cleanPersianText(section.name || 'بخش عمومی')}
                      </h3>
                      {section.summary && (
                        <div
                          className="text-[10px] text-neutral mt-0.5 truncate"
                          dangerouslySetInnerHTML={{ __html: cleanPersianText(section.summary) }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      <span className="text-[10px] text-neutral font-bold">{toFaDigits(modules.length)} مورد</span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-neutral" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && modules.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden divide-y divide-base-500/15 p-2"
                      >
                        {modules.map((mod) => {
                          const isAssign = mod.modname === 'assign';
                          const isQuiz = mod.modname === 'quiz';
                          const isResource = mod.modname === 'resource';
                          const isFolder = mod.modname === 'folder';
                          const isUrl = mod.modname === 'url';
                          const contentsList = mod.contents || [];
                          const isCompleted = Boolean(completionStatuses[mod.id]);

                          return (
                            <div key={mod.id} className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-3 text-xs">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  {/* چک‌باکس تعاملی انجام فعالیت مطابق مودل */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCompletion(mod.id)}
                                    className="mt-0.5 text-neutral hover:text-success transition cursor-pointer shrink-0"
                                    title={isCompleted ? 'تکمیل شده (کلیک برای لغو)' : 'علامت‌گذاری به عنوان تکمیل شده'}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-success" />
                                    ) : (
                                      <Circle className="w-4 h-4 opacity-40 hover:opacity-100" />
                                    )}
                                  </button>

                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <span
                                      className={`font-bold leading-relaxed block ${
                                        isCompleted ? 'text-neutral/75 line-through' : 'text-base-content'
                                      }`}
                                    >
                                      {cleanPersianText(mod.name)}
                                    </span>
                                    {mod.description && (
                                      <div
                                        className="text-[11px] text-neutral leading-relaxed line-clamp-2"
                                        dangerouslySetInnerHTML={{ __html: cleanPersianText(mod.description) }}
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5">
                                  {isAssign ? (
                                    <motion.button
                                      whileTap={{ scale: 0.94 }}
                                      type="button"
                                      onClick={() => handleOpenAssign(mod)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      <span>مشاهده و ارسال تکلیف</span>
                                    </motion.button>
                                  ) : isQuiz ? (
                                    <motion.button
                                      whileTap={{ scale: 0.94 }}
                                      type="button"
                                      onClick={() => handleOpenQuiz(mod)}
                                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-500 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" />
                                      <span>ورود به آزمون (کوییز)</span>
                                    </motion.button>
                                  ) : isUrl && mod.url ? (
                                    <a
                                      href={mod.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg text-neutral hover:text-primary hover:bg-base-500/20 transition"
                                      title="باز کردن پیوند خارجی"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  ) : null}
                                </div>
                              </div>

                              {/* لیست فایل‌های داخل ماژول */}
                              {(isResource || isFolder) && contentsList.length > 0 && (
                                <div className="mr-6 space-y-1.5 pt-1">
                                  {contentsList.map((file, fIdx) => {
                                    const downloadUrl = getMoodleFileUrl(file.fileurl, session.token);
                                    return (
                                      <div
                                        key={fIdx}
                                        className="p-2 rounded-lg bg-base-500/15 border border-base-500/25 flex items-center justify-between text-[11px] hover:border-primary/40 transition"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          {getFileIcon(file.filename, file.mimetype)}
                                          <span className="font-bold text-base-content truncate" title={file.filename}>
                                            {cleanPersianText(file.filename)}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 mr-2">
                                          <span className="text-[10px] text-neutral font-mono">
                                            {formatFileSizeFa(file.filesize)}
                                          </span>
                                          <a
                                            href={downloadUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            download={file.filename}
                                            className="p-1 rounded text-primary hover:bg-primary/10 transition flex items-center gap-1 font-bold"
                                            title="دریافت فایل"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">دانلود</span>
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* تب ۲: کارنامه و ریزنمرات درس (Gradebook) */}
      {activeTab === 'grades' && (
        <div className="space-y-3">
          {loadingGrades ? (
            <div className="sarv-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>در حال دریافت ریزنمرات و کارنامه از سامانه مودل...</span>
            </div>
          ) : gradeItems.length === 0 ? (
            <div className="sarv-card p-8 text-center text-xs text-neutral">
              نمره‌ای برای این درس تاکنون در سامانه ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2.5">
              {gradeItems.map((item) => {
                const isCourseTotal = item.itemtype === 'course';
                return (
                  <div
                    key={item.id}
                    className={`sarv-card p-4 transition ${
                      isCourseTotal
                        ? 'border-primary/50 bg-primary/5 shadow-md'
                        : 'border-base-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCourseTotal
                                ? 'bg-primary text-primary-content'
                                : 'bg-base-500/25 text-neutral'
                            }`}
                          >
                            {isCourseTotal ? 'نمره نهایی کل' : item.itemmodule === 'quiz' ? 'کوییز' : item.itemmodule === 'assign' ? 'تکلیف' : 'کلاسی'}
                          </span>
                          <h4 className="text-xs font-black text-base-content truncate">
                            {cleanPersianText(item.itemname || 'آیتم ارزیابی')}
                          </h4>
                        </div>

                        {item.feedback && (
                          <p className="text-[11px] text-neutral/80 bg-base-500/10 p-2 rounded-lg leading-relaxed">
                            بازخورد استاد: {cleanPersianText(item.feedback)}
                          </p>
                        )}
                      </div>

                      <div className="text-left shrink-0 space-y-0.5">
                        <div className="text-sm font-black text-primary">
                          {toFaDigits(item.gradeformatted || item.graderaw || '—')}
                          {item.grademax && (
                            <span className="text-[10px] text-neutral font-medium mr-1">
                              / {toFaDigits(item.grademax)}
                            </span>
                          )}
                        </div>
                        {item.percentageformatted && (
                          <div className="text-[10px] text-neutral font-mono">
                            {toFaDigits(item.percentageformatted)}
                          </div>
                        )}
                        {item.weightformatted && (
                          <div className="text-[9px] text-neutral/70">
                            وزن: {toFaDigits(item.weightformatted)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* تب ۳: هم‌کلاسی‌ها و اساتید (Participants) */}
      {activeTab === 'participants' && (
        <div className="space-y-3">
          {/* فیلتر نقش‌ها */}
          <div className="sarv-card p-2 flex items-center justify-between text-xs gap-1">
            <span className="text-neutral font-bold text-[11px] mr-1">فیلتر:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'همه' },
                { id: 'teacher', label: 'اساتید' },
                { id: 'ta', label: 'دستیاران (TA)' },
                { id: 'student', label: 'دانشجویان' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setParticipantRoleFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    participantRoleFilter === f.id
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-neutral hover:bg-base-500/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loadingParticipants ? (
            <div className="sarv-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>در حال دریافت مشخصات هم‌کلاسی‌ها و اساتید...</span>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="sarv-card p-8 text-center text-xs text-neutral">
              فردی در این دسته‌بندی یافت نشد.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParticipants.map((user) => {
                const isTeacher = user.roleType === 'teacher';
                const isTa = user.roleType === 'ta';
                return (
                  <div
                    key={user.id}
                    className="sarv-card p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl grid place-items-center font-black text-xs shrink-0 ${
                          isTeacher
                            ? 'bg-primary/15 text-primary border border-primary/25'
                            : isTa
                            ? 'bg-secondary/15 text-secondary border border-secondary/25'
                            : 'bg-base-500/20 text-neutral border border-base-500/30'
                        }`}
                      >
                        {cleanPersianText(user.fullname).charAt(0)}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-base-content truncate">
                            {cleanPersianText(user.fullname)}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              isTeacher
                                ? 'bg-primary/15 text-primary'
                                : isTa
                                ? 'bg-secondary/15 text-secondary'
                                : 'bg-base-500/20 text-neutral'
                            }`}
                          >
                            {user.roleName}
                          </span>
                        </div>
                        {user.department && (
                          <p className="text-[10px] text-neutral truncate">
                            {cleanPersianText(user.department)}
                          </p>
                        )}
                      </div>
                    </div>

                    {user.email && (
                      <a
                        href={`mailto:${user.email}`}
                        className="p-2 rounded-xl text-neutral hover:text-primary hover:bg-base-500/20 transition cursor-pointer shrink-0"
                        title={`ارسال ایمیل به ${user.fullname}`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* تب ۴: تالار گفتگو و مباحثات (Forums) */}
      {activeTab === 'forum' && (
        <div className="space-y-3">
          {/* انتخاب تالار گفتگو */}
          {forums.length > 1 && (
            <div className="sarv-card p-2 flex items-center gap-2 overflow-x-auto">
              {forums.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectForum(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeForum?.id === f.id
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-neutral hover:bg-base-500/20'
                  }`}
                >
                  {cleanPersianText(f.name)}
                </button>
              ))}
            </div>
          )}

          {/* نوار ایجاد گفتگوی جدید */}
          <div className="sarv-card p-3.5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-base-content">
                {cleanPersianText(activeForum?.name || 'تالار گفتگو')}
              </h3>
              <p className="text-[10px] text-neutral">
                {toFaDigits(discussions.length)} موضوع فعال در این تالار
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewDiscussionForm(!showNewDiscussionForm)}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-content text-xs font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>موضوع جدید</span>
            </button>
          </div>

          {/* فرم ایجاد موضوع جدید */}
          {showNewDiscussionForm && (
            <form onSubmit={handleCreateDiscussion} className="sarv-card p-4 space-y-3 shadow-md">
              <h4 className="text-xs font-black text-base-content">ارسال پرسش یا موضوع جدید به تالار:</h4>
              <input
                type="text"
                value={newDiscussionSubject}
                onChange={(e) => setNewDiscussionSubject(e.target.value)}
                placeholder="عنوان موضوع..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs text-base-content focus:outline-none focus:border-primary transition"
              />
              <textarea
                value={newDiscussionMessage}
                onChange={(e) => setNewDiscussionMessage(e.target.value)}
                placeholder="متن پیام و توضیحات کامل..."
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-base-500/20 border border-base-500/40 text-xs text-base-content focus:outline-none focus:border-primary transition resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDiscussionForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral hover:bg-base-500/20 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingDiscussion}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingDiscussion ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>ارسال به تالار</span>
                </button>
              </div>
            </form>
          )}

          {/* لیست موضوعات تالار */}
          {loadingForums ? (
            <div className="sarv-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>در حال دریافت گفتگوهای تالار از مودل...</span>
            </div>
          ) : discussions.length === 0 ? (
            <div className="sarv-card p-8 text-center text-xs text-neutral">
              موضوعی در این تالار گفتگو ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2.5">
              {discussions.map((disc) => (
                <div key={disc.id} className="sarv-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {disc.pinned && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">
                            سنجاق‌شده
                          </span>
                        )}
                        <h4 className="text-xs font-black text-base-content leading-relaxed">
                          {cleanPersianText(disc.name)}
                        </h4>
                      </div>
                      <p className="text-[10px] text-neutral">
                        ارسال‌شده توسط: {cleanPersianText(disc.userfullname)}
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{toFaDigits(disc.numreplies || 0)} پاسخ</span>
                      </span>
                    </div>
                  </div>

                  {disc.message && (
                    <div
                      className="p-3 rounded-xl bg-base-500/10 text-xs text-base-content leading-relaxed border border-base-500/20"
                      dangerouslySetInnerHTML={{ __html: cleanPersianText(disc.message) }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* مودال جزئیات تکلیف */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onSubmitted={() => {}}
        />
      )}

      {/* مودال جزئیات کوییز و آزمون */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          courseName={course.fullname}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </div>
  );
}