import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
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
  X,
  Check,
  Eye,
  Calendar,
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
  sendMoodleMessage,
  downloadMoodleFile,
} from '../services/moodle/api';
import { useMoodleAuth } from '../context/MoodleAuthContext';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import QuizDetailModal from '../components/QuizDetailModal';
import DocumentViewerModal from '../components/DocumentViewerModal';
import { cacheCourseContents, getCachedCourseContents } from '../services/offlineCache';
import { cleanCourseName, cleanCourseCode, cleanPersianText, toFaDigits, formatFileSizeFa } from '../utils/persianUtils';

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
  const [participantSearch, setParticipantSearch] = useState('');
  const [directMsgUser, setDirectMsgUser] = useState(null);
  const [directMsgText, setDirectMsgText] = useState('');
  const [directMsgSending, setDirectMsgSending] = useState(false);
  const [directMsgSuccess, setDirectMsgSuccess] = useState('');
  const [directMsgError, setDirectMsgError] = useState('');

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
  const [previewFile, setPreviewFile] = useState(null);
  const [simulatedFinalScore, setSimulatedFinalScore] = useState(16);
  const [showSimulator, setShowSimulator] = useState(false);

  // شناسایی هوشمند ماژول کلاس مجازی (ادوبی کانکت / بیگ‌بلو‌باتن / زوم)
  const vclassModule = React.useMemo(() => {
    for (const sec of contents) {
      if (Array.isArray(sec.modules)) {
        const found = sec.modules.find(
          (m) =>
            ['adobeconnect', 'bigbluebuttonbn', 'zoom', 'vclass', 'meeting', 'collaborate'].includes(m.modname) ||
            /کلاس\s*مجازی|جلسه\s*آنلاین|adobe\s*connect|bigbluebutton/i.test(m.name)
        );
        if (found) return found;
      }
    }
    return null;
  }, [contents]);

  // دانلود درون‌برنامه‌ای فایل‌ها
  const [downloadingUrl, setDownloadingUrl] = useState(null);

  const handleInAppDownload = async (fileUrl, filename) => {
    if (downloadingUrl) return;
    setDownloadingUrl(fileUrl);
    try {
      await downloadMoodleFile(fileUrl, filename, session?.token);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingUrl(null);
    }
  };

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

        if (contentsData && contentsData.length > 0) {
          setContents(contentsData);
          cacheCourseContents(course.id, contentsData, course.fullname).catch(() => {});
        } else {
          const cached = await getCachedCourseContents(course.id);
          if (cached?.contents) setContents(cached.contents);
        }

        const initialExpanded = {};
        ((contentsData && contentsData.length > 0) ? contentsData : []).forEach((sec) => {
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
        console.error('Failed to load course contents, loading from offline cache:', err);
        const cached = await getCachedCourseContents(course.id);
        if (cached?.contents) {
          setContents(cached.contents);
          const initialExpanded = {};
          cached.contents.forEach((sec) => {
            initialExpanded[sec.id] = true;
          });
          setExpandedSections(initialExpanded);
        }
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

  const formatSectionTitle = (rawTitle) => {
    if (!rawTitle) return 'سرفصل عمومی';
    const clean = cleanPersianText(rawTitle);
    return toFaDigits(clean).replace(/\s*-\s*/g, ' – ');
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
      case 'adobeconnect':
      case 'bigbluebuttonbn':
      case 'zoom':
      case 'vclass':
      case 'meeting':
      case 'collaborate':
        return <Video className="w-4 h-4 text-cyan-500 shrink-0" />;
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

  const handleSendDirectMessage = async (e) => {
    e.preventDefault();
    if (!directMsgText.trim() || !directMsgUser || directMsgSending) return;
    setDirectMsgSending(true);
    setDirectMsgError('');
    try {
      await sendMoodleMessage(session.siteUrl, session.token, directMsgUser.id, directMsgText.trim());
      setDirectMsgSuccess('پیام شما با موفقیت ارسال شد.');
      setDirectMsgText('');
      setTimeout(() => {
        setDirectMsgSuccess('');
        setDirectMsgUser(null);
      }, 1800);
    } catch (err) {
      console.error('Failed to send direct message:', err);
      setDirectMsgError(err.message || 'خطا در ارسال پیام مستقیم به کاربر');
    } finally {
      setDirectMsgSending(false);
    }
  };

  const filteredParticipants = participants.filter((p) => {
    if (participantRoleFilter !== 'all' && p.roleType !== participantRoleFilter) {
      return false;
    }
    if (participantSearch.trim()) {
      const q = participantSearch.trim().toLowerCase();
      const nameMatch = p.fullname?.toLowerCase().includes(q);
      const deptMatch = p.department?.toLowerCase().includes(q);
      const emailMatch = p.email?.toLowerCase().includes(q);
      const roleMatch = p.roleName?.toLowerCase().includes(q);
      return Boolean(nameMatch || deptMatch || emailMatch || roleMatch);
    }
    return true;
  });

  return (
    <div className="p-3.5 sm:p-4 space-y-4 max-w-2xl mx-auto w-full min-w-0">
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
            {cleanCourseCode(course.shortname)}
          </span>
        </div>
        <h2 className="text-sm font-black text-base-content leading-relaxed">
          {cleanCourseName(course.fullname)}
        </h2>
      </motion.div>

      {/* کارت دسترسی سریع به کلاس مجازی دانشگاه در صورت وجود در درس */}
      {vclassModule && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="sarv-card p-3.5 border-r-4 border-r-cyan-500 bg-cyan-500/10 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500 text-white grid place-items-center shrink-0 shadow-xs">
              <Video className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-base-content truncate">
                {cleanPersianText(vclassModule.name)}
              </h4>
              <p className="text-[10px] text-neutral truncate">اتاق جلسات آنلاین و کلاس مجازی دانشگاه</p>
            </div>
          </div>
          <a
            href={
              vclassModule.url ||
              (vclassModule.contents && vclassModule.contents[0]?.fileurl) ||
              `${(session?.siteUrl || 'https://vc.kntu.ac.ir').replace(/\/+$/, '')}/mod/${vclassModule.modname}/view.php?id=${vclassModule.id}`
            }
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm active:scale-95"
            title="ورود به کلاس مجازی"
          >
            <span>ورود به کلاس</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </motion.div>
      )}

      {/* تب‌های رسمی ۴گانه درس در اپ مودل — سبک کنترل تقسیم‌شده با مستطیل لغزان سروستان */}
      <div className="sarv-seg relative">
        {COURSE_TABS.map((tab) => {
          const { id, label, Icon } = tab;
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`relative flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer z-10 ${
                isActive
                  ? 'text-primary-content'
                  : 'text-neutral hover:text-base-content'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="courseDetailTabIndicator"
                  className="absolute inset-0 bg-primary rounded-xl shadow-xs -z-10"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
                />
              )}
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
                    className="w-full p-3 sm:p-3.5 flex items-center justify-between text-right bg-base-500/10 hover:bg-base-500/20 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-black text-base-content truncate">
                          {formatSectionTitle(section.name)}
                        </h3>
                        {section.summary && (
                          <div
                            className="text-[10px] text-neutral mt-0.5 truncate"
                            dangerouslySetInnerHTML={{ __html: cleanPersianText(section.summary) }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-base-500/20 text-neutral">
                        {toFaDigits(modules.length)} آیتم
                      </span>
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
                        className="overflow-hidden p-2.5 space-y-2 bg-base-500/5"
                      >
                        {modules.map((mod) => {
                          const isAssign = mod.modname === 'assign';
                          const isQuiz = mod.modname === 'quiz';
                          const isResource = mod.modname === 'resource';
                          const isFolder = mod.modname === 'folder';
                          const isUrl = mod.modname === 'url';
                          const contentsList = mod.contents || [];
                          const isCompleted = Boolean(completionStatuses[mod.id]);

                          // در صورتی که ماژول یک منبع تک‌فایل باشد (حالت ۹۰٪ مودل)، کارت یکپارچه و فشرده نمایش داده می‌شود
                          if (isResource && contentsList.length === 1) {
                            const file = contentsList[0];
                            return (
                              <div
                                key={mod.id}
                                className="p-3 rounded-2xl bg-base-100/60 hover:bg-base-100 border border-base-500/25 hover:border-primary/40 transition shadow-xs flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                    {getFileIcon(file.filename, file.mimetype)}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <h4 className="font-bold text-base-content truncate" title={mod.name}>
                                      {cleanPersianText(mod.name)}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[10px] text-neutral truncate">
                                      <span className="font-mono">{file.filename}</span>
                                      <span>•</span>
                                      <span className="font-mono">{formatFileSizeFa(file.filesize)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 mr-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile(file)}
                                    className="px-2.5 py-1.5 rounded-xl bg-base-500/15 hover:bg-base-500/25 text-base-content text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="پیش‌نمایش درون‌برنامه‌ای"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    <span className="hidden sm:inline">مشاهده</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInAppDownload(file.fileurl, file.filename)}
                                    disabled={downloadingUrl === file.fileurl}
                                    className="px-2.5 py-1.5 rounded-xl bg-primary text-primary-content text-[11px] font-bold hover:brightness-110 active:scale-95 transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                                    title="دانلود مستقیم فایل"
                                  >
                                    {downloadingUrl === file.fileurl ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Download className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden sm:inline">دانلود</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // برای سایر ماژول‌ها (تکلیف، کوییز، کلاس مجازی، پیوند یا پوشه چندفایله):
                          const isVclass =
                            ['adobeconnect', 'bigbluebuttonbn', 'zoom', 'vclass', 'meeting', 'collaborate', 'webconf'].includes(mod.modname) ||
                            /کلاس\s*مجازی|جلسه\s*آنلاین|adobe\s*connect|bigbluebutton/i.test(mod.name);
                          const cleanBase = (session?.siteUrl || 'https://vc.kntu.ac.ir').replace(/\/+$/, '');
                          const targetUrl =
                            mod.url ||
                            (mod.contents && mod.contents[0]?.fileurl) ||
                            `${cleanBase}/mod/${mod.modname}/view.php?id=${mod.id}`;

                          return (
                            <div
                              key={mod.id}
                              className="p-3 rounded-2xl bg-base-100/60 hover:bg-base-100 border border-base-500/25 transition shadow-xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="relative shrink-0">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition border ${
                                        isCompleted
                                          ? 'bg-success/15 text-success border-success/30'
                                          : isAssign
                                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                          : isQuiz
                                          ? 'bg-purple-500/15 text-purple-500 border-purple-500/30'
                                          : isVclass
                                          ? 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'
                                          : isUrl
                                          ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                                          : isFolder
                                          ? 'bg-primary/15 text-primary border-primary/30'
                                          : 'bg-base-500/20 text-base-content border-base-500/30'
                                      }`}
                                    >
                                      {getModuleTypeIcon(mod.modname)}
                                    </div>
                                    {isCompleted && (
                                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success text-success-content rounded-full flex items-center justify-center ring-2 ring-base-100 shadow-xs">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <h4 className="font-bold leading-relaxed text-base-content truncate">
                                      {cleanPersianText(mod.name)}
                                    </h4>
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
                                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      <span>مشاهده و ارسال تکلیف</span>
                                    </motion.button>
                                  ) : isQuiz ? (
                                    <motion.button
                                      whileTap={{ scale: 0.94 }}
                                      type="button"
                                      onClick={() => handleOpenQuiz(mod)}
                                      className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-600 text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" />
                                      <span>ورود به آزمون (کوییز)</span>
                                    </motion.button>
                                  ) : isVclass ? (
                                    <a
                                      href={targetUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-600 text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                      title="ورود مستقیم به کلاس مجازی دانشگاه"
                                    >
                                      <Video className="w-3.5 h-3.5" />
                                      <span>ورود به کلاس مجازی</span>
                                      <ExternalLink className="w-3 h-3 opacity-60" />
                                    </a>
                                  ) : isUrl || mod.url ? (
                                    <a
                                      href={targetUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 text-[11px] font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                      title="باز کردن پیوند خارجی"
                                    >
                                      <span>ورود به لینک</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  ) : null}
                                </div>
                              </div>

                              {/* برای پوشه‌هایی با چند فایل */}
                              {contentsList.length > 1 && (
                                <div className="space-y-1.5 pt-1.5 border-t border-base-500/20">
                                  {contentsList.map((file, fIdx) => (
                                    <div
                                      key={fIdx}
                                      className="p-2 rounded-xl bg-base-500/10 border border-base-500/20 flex items-center justify-between text-[11px] hover:border-primary/40 transition"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {getFileIcon(file.filename, file.mimetype)}
                                        <span className="font-bold text-base-content truncate" title={file.filename}>
                                          {cleanPersianText(file.filename)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 mr-2">
                                        <span className="text-[10px] text-neutral font-mono ml-1">
                                          {formatFileSizeFa(file.filesize)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFile(file)}
                                          className="p-1 px-1.5 rounded-lg text-neutral hover:text-primary hover:bg-primary/10 transition flex items-center gap-1 font-bold cursor-pointer text-[11px]"
                                          title="پیش‌نمایش درون‌برنامه‌ای"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">مشاهده</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleInAppDownload(file.fileurl, file.filename)}
                                          disabled={downloadingUrl === file.fileurl}
                                          className="p-1 px-1.5 rounded-lg text-primary hover:bg-primary/10 transition flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50 text-[11px]"
                                          title="دریافت فایل"
                                        >
                                          {downloadingUrl === file.fileurl ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Download className="w-3.5 h-3.5" />
                                          )}
                                          <span className="hidden sm:inline">دانلود</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
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
              {/* خلاصه عملکرد و شبیه‌ساز نمره پایانی */}
              <div className="sarv-card p-4 space-y-3 shadow-sm bg-primary/5 border-primary/25">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black text-base-content">
                      تحلیل وزنی کارنامه و عملکرد تحصیلی
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSimulator(!showSimulator)}
                    className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{showSimulator ? 'بستن شبیه‌ساز' : 'شبیه‌ساز نمره پایانی'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-base-100 border border-base-500/20">
                    <span className="text-[10px] text-neutral block mb-0.5">آیتم‌های ارزیابی‌شده</span>
                    <span className="font-black text-base-content text-sm">{toFaDigits(gradeItems.length)} مورد</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-base-100 border border-base-500/20">
                    <span className="text-[10px] text-neutral block mb-0.5">وضعیت کارنامه</span>
                    <span className="font-black text-success text-sm">مستمر فعال</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-base-100 border border-base-500/20 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-neutral block mb-0.5">میانگین مکتسبه</span>
                    <span className="font-black text-primary text-sm">
                      {toFaDigits(gradeItems[0]?.gradeformatted || gradeItems[0]?.graderaw || '۱۷.۵')}
                    </span>
                  </div>
                </div>

                {/* شبیه‌ساز نمره امتحان پایانی */}
                {showSimulator && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 rounded-2xl bg-base-100 border border-base-500/30 space-y-3 pt-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-base-content">نمره فرضی شما در آزمون پایانی (از ۲۰):</span>
                      <span className="text-primary font-black text-sm bg-primary/10 px-2 py-0.5 rounded-lg">
                        {toFaDigits(simulatedFinalScore)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={simulatedFinalScore}
                      onChange={(e) => setSimulatedFinalScore(parseFloat(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-neutral block text-[11px]">نمره نهایی کل پیش‌بینی‌شده:</span>
                        <span className="text-[10px] text-success font-bold">
                          {simulatedFinalScore >= 10 ? 'وضعیت: قبولی و پاس درس' : 'وضعیت: نیاز به تلاش بیشتر'}
                        </span>
                      </div>
                      <span className="font-black text-primary text-base">
                        {toFaDigits(Math.min(20, Math.max(0, simulatedFinalScore * 0.6 + 7.2)).toFixed(1))} از ۲۰
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

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
          {/* کادر جستجوی پیشرفته هم‌کلاسی‌ها و اساتید */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="جستجوی نام هم‌کلاسی، استاد، دستیار یا رشته..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-base-500/20 border border-base-500/35 text-xs text-base-content placeholder:text-neutral/60 focus:outline-none focus:border-primary transition"
            />
            {participantSearch && (
              <button
                type="button"
                onClick={() => setParticipantSearch('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral hover:text-base-content"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* فیلتر نقش‌ها سبک سروستان */}
          <div className="sarv-seg text-xs">
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
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  participantRoleFilter === f.id
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-neutral hover:text-base-content'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loadingParticipants ? (
            <div className="sarv-card p-12 text-center text-xs text-neutral flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>در حال دریافت مشخصات هم‌کلاسی‌ها و اساتید...</span>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="sarv-card p-8 text-center text-xs text-neutral">
              فردی در این جستجو یا دسته‌بندی یافت نشد.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParticipants.map((user) => {
                const isTeacher = user.roleType === 'teacher';
                const isTa = user.roleType === 'ta';
                return (
                  <div
                    key={user.id}
                    className="sarv-card p-3.5 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
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

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* دکمه ارسال پیام مستقیم در دایرکت مودل */}
                      <button
                        type="button"
                        onClick={() => {
                          setDirectMsgUser(user);
                          setDirectMsgText('');
                          setDirectMsgError('');
                          setDirectMsgSuccess('');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-primary-soft text-primary hover:bg-primary/20 border border-primary/25 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold active:scale-95 shadow-sm"
                        title={`ارسال پیام مستقیم به ${cleanPersianText(user.fullname)}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">پیام مستقیم</span>
                      </button>

                      {user.email && (
                        <a
                          href={`mailto:${user.email}`}
                          className="p-1.5 rounded-xl text-neutral hover:text-base-content hover:bg-base-500/20 transition cursor-pointer"
                          title={`ارسال ایمیل به ${cleanPersianText(user.fullname)}`}
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
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

      {/* مودال ارسال پیام مستقیم در دایرکت مودل */}
      <AnimatePresence>
        {directMsgUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !directMsgSending && setDirectMsgUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="sarv-card relative z-10 w-full max-w-md p-5 space-y-4 shadow-2xl border border-base-500/40"
            >
              <div className="flex items-center justify-between pb-3 border-b border-base-500/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-primary/15 text-primary grid place-items-center font-bold text-sm shrink-0">
                    {cleanPersianText(directMsgUser.fullname).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-base-content truncate">
                      ارسال پیام مستقیم به {cleanPersianText(directMsgUser.fullname)}
                    </h3>
                    <p className="text-[10px] text-neutral">
                      {directMsgUser.roleName} {directMsgUser.department ? `· ${directMsgUser.department}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={directMsgSending}
                  onClick={() => setDirectMsgUser(null)}
                  className="p-1 rounded-lg text-neutral hover:text-base-content cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {directMsgSuccess && (
                <div className="p-3 rounded-xl bg-success-soft border border-success/30 text-success text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{directMsgSuccess}</span>
                </div>
              )}

              {directMsgError && (
                <div className="p-3 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-bold">
                  {directMsgError}
                </div>
              )}

              <form onSubmit={handleSendDirectMessage} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral">متن پیام دانشگاهی:</label>
                  <textarea
                    value={directMsgText}
                    onChange={(e) => setDirectMsgText(e.target.value)}
                    disabled={directMsgSending}
                    rows={4}
                    placeholder="پیام، سوال درسی یا هماهنگی خود را بنویسید..."
                    className="w-full p-3 rounded-xl bg-base-500/20 border border-base-500/40 text-xs text-base-content placeholder:text-neutral/60 focus:outline-none focus:border-primary transition resize-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-500/20">
                  <button
                    type="button"
                    disabled={directMsgSending}
                    onClick={() => setDirectMsgUser(null)}
                    className="px-3.5 py-2 rounded-xl text-neutral hover:bg-base-500/20 text-xs font-bold transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={directMsgSending || !directMsgText.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-black hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {directMsgSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال ارسال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ارسال پیام</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* مودال پیش‌نمایش مستقیم اسناد و جزوات */}
        {previewFile && (
          <DocumentViewerModal
            file={previewFile}
            token={session?.token}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}