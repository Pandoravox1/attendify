import React, { useState, useMemo, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { format } from 'date-fns';
import { getLocalTimeZone, parseDate } from '@internationalized/date';
import * as XLSX from 'xlsx';
import { BookOpen as PhBookOpen, CalendarBlank, EnvelopeSimple, Eye as PhEye, EyeSlash, LockKey, SquaresFour, Student, UserCheck } from '@phosphor-icons/react';
import { 
  LayoutGrid, 
  Users, 
  BookOpen, 
  Search, 
  Bell, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Plus, 
  Menu,
  Maximize2,
  Minimize2,
  Trash2,
  Edit3,
  Calendar,
  X,
  School,
  Home,
  Briefcase,
  LogIn,
  ArrowRight,
  Loader2,
  User,
  Phone,
  MapPin,
  Camera,
  Save,
  Download,
  FileUp
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { AttendanceView } from './features/attendance/AttendanceView';
import { GradesView } from './features/grades/GradesView';
import { Sidebar } from './components/layout/Sidebar';
import { DockNav } from './components/layout/DockNav';
import { useAttendance } from './hooks/useAttendance';
import { useStudents } from './hooks/useStudents';
import attendifyLogo from './assets/attendify-logo.png';
import { Button } from './components/ui/button';
import { Calendar as CalendarRac } from './components/ui/calendar-rac';
import { Checkbox } from './components/ui/checkbox';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Switch } from './components/ui/switch';
import {
  enforceSheetLimits,
  getSafeXlsxReadOptions,
  sanitizeHeaderRow,
  validateXlsxFile,
} from './lib/xlsx-utils';

const SCHOOL_EMAIL_REGEX = /@(?:.+\.sch\.id|uphcollege\.com)$/i;
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
const AUTH_ERROR_MESSAGE = 'Incorrect email or password.';
const SUPABASE_MISSING_MESSAGE = 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
const INTRO_DURATION_MS = 4000;
const DEFAULT_ASSESSMENTS = ['Quiz', 'Midterm', 'Project'];
const ATTITUDE_OPTIONS = ['EE', 'ME', 'DME'];
const ATTITUDE_SCORES = { EE: 3, ME: 2, DME: 1 };

// --- DATA MODEL ---
const INITIAL_CLASSES = [
  { id: 1, type: 'homeroom', name: 'Grade 10 Science 1', subtitle: 'Homeroom', assessmentTypes: DEFAULT_ASSESSMENTS },
  { id: 2, type: 'subject', name: 'Grade 11 Social 2', subtitle: 'Basic Physics', assessmentTypes: DEFAULT_ASSESSMENTS },
  { id: 3, type: 'subject', name: 'Grade 12 Science 3', subtitle: 'Advanced Physics', assessmentTypes: DEFAULT_ASSESSMENTS },
];

const INITIAL_STUDENTS = [
  { id: 1, classId: 1, name: "Alex Chen", avatar: "AC", status: 'Present', attitude: 'ME', zeroExclusions: {}, zeroExclusionNotes: {}, grades: { Quiz: 85, Midterm: 92, Project: 88 } },
  { id: 2, classId: 1, name: "Sarah Johnson", avatar: "SJ", status: 'Present', attitude: 'EE', zeroExclusions: {}, zeroExclusionNotes: {}, grades: { Quiz: 92, Midterm: 88, Project: 95 } },
  { id: 3, classId: 1, name: "Michael Davis", avatar: "MD", status: 'Late', attitude: 'ME', zeroExclusions: {}, zeroExclusionNotes: {}, grades: { Quiz: 78, Midterm: 75, Project: 82 } },
  { id: 4, classId: 2, name: "Emily Wilson", avatar: "EW", status: 'Absent', attitude: 'DME', zeroExclusions: {}, zeroExclusionNotes: {}, grades: { Quiz: 95, Midterm: 96, Project: 98 } },
  { id: 5, classId: 2, name: "Jessica Taylor", avatar: "JT", status: 'Excused', attitude: 'ME', zeroExclusions: {}, zeroExclusionNotes: {}, grades: { Quiz: 88, Midterm: 90, Project: 85 } },
  { id: 6, classId: 3, name: "David Brown", avatar: "DB", status: 'Present', attitude: 'ME', zeroExclusions: {}, zeroExclusionNotes: {}, grades: { Quiz: 72, Midterm: 68, Project: 75 } },
];

const STATUS_OPTIONS = [
  { label: 'Present', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { label: 'Late', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { label: 'Sick', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { label: 'Excused', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { label: 'Unexcused', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { label: 'Absent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];
const STATUS_EMPTY_OPTION = { label: 'Not set', color: 'bg-white/10 text-gray-300 border-white/10' };

const buildAvatar = (name) => (
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
);

const resizeImageToBlob = (file, size = 256) => new Promise((resolve, reject) => {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Canvas not supported'));
      return;
    }
    const minSide = Math.min(image.width, image.height);
    const sx = (image.width - minSide) / 2;
    const sy = (image.height - minSide) / 2;
    ctx.drawImage(image, sx, sy, minSide, minSide, 0, 0, size, size);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(imageUrl);
      if (!blob) {
        reject(new Error('Failed to resize image'));
        return;
      }
      resolve(blob);
    }, 'image/png', 0.92);
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error('Failed to load image'));
  };
  image.src = imageUrl;
});

const formatAttendanceTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getNowIso = () => new Date().toISOString();

const safeNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isSameClassId = (left, right) => String(left ?? '') === String(right ?? '');

const normalizeAssessmentTypes = (value) => {
  if (!Array.isArray(value)) return [...DEFAULT_ASSESSMENTS];
  const trimmed = value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return trimmed.length ? Array.from(new Set(trimmed)) : [...DEFAULT_ASSESSMENTS];
};

const normalizeZeroExclusions = (value) => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), Boolean(entry)])
  );
};

const normalizeZeroExclusionNotes = (value) => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [String(key), String(entry || '')])
  );
};

const getGradesAverageInfo = (grades, assessmentTypes, zeroExclusions = {}) => {
  const types = Array.isArray(assessmentTypes) && assessmentTypes.length
    ? assessmentTypes
    : DEFAULT_ASSESSMENTS;
  if (!grades || typeof grades !== 'object') return { avg: 0, hasScores: false };
  const exclusions = normalizeZeroExclusions(zeroExclusions);
  const values = types.map(type => ({ type, value: safeNumber(grades[type]) }));
  if (!values.length) return { avg: 0, hasScores: false };

  const counted = values.filter(({ type, value }) => !(value === 0 && exclusions[type] !== false));
  if (!counted.length) return { avg: 0, hasScores: false };
  const total = counted.reduce((acc, entry) => acc + entry.value, 0);
  return { avg: Math.round(total / counted.length), hasScores: true };
};

const calculateGradesAverage = (grades, assessmentTypes, zeroExclusions = {}) => (
  getGradesAverageInfo(grades, assessmentTypes, zeroExclusions).avg
);

const getAttitudeScore = (value) => ATTITUDE_SCORES[value] ?? 0;

const getAttitudeLabel = (score) => {
  if (score >= 2.5) return 'EE';
  if (score >= 1.5) return 'ME';
  return 'DME';
};

const normalizeStatus = (status) => {
  const map = {
    Hadir: 'Present',
    Terlambat: 'Late',
    Sakit: 'Sick',
    Izin: 'Excused',
    Absen: 'Absent',
    Present: 'Present',
    Late: 'Late',
    Sick: 'Sick',
    Excused: 'Excused',
    Absent: 'Absent',
  };
  return map[status] || 'Present';
};

const formatLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayKey = () => formatLocalDateKey(new Date());

const NOTIFICATION_STORAGE_KEY = 'attendify.notifications';
const NOTIFICATION_DATE_KEY = 'attendify.notifications_date';
const NOTIFICATION_READ_KEY = 'attendify.notifications_read_at';
const MAX_NOTIFICATIONS = 40;

const parseLocalDateKey = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
};

const buildDateRangeList = (startKey, endKey) => {
  const startDate = parseLocalDateKey(startKey);
  const endDate = parseLocalDateKey(endKey);
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];
  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(formatLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const getWeekRange = (dateKey) => {
  const date = parseLocalDateKey(dateKey);
  if (!date) return { start: dateKey, end: dateKey };
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: formatLocalDateKey(start),
    end: formatLocalDateKey(end),
  };
};

const getMonthRange = (dateKey) => {
  const date = parseLocalDateKey(dateKey);
  if (!date) return { start: dateKey, end: dateKey };
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: formatLocalDateKey(start),
    end: formatLocalDateKey(end),
  };
};

const getExportRange = (type, anchorDate) => {
  const dateKey = anchorDate || getTodayKey();
  if (type === 'weekly') return getWeekRange(dateKey);
  if (type === 'monthly') return getMonthRange(dateKey);
  return { start: dateKey, end: dateKey };
};

const formatDayLabel = (dateKey) => {
  const date = parseLocalDateKey(dateKey);
  if (!date) return '';
  return date.toLocaleDateString('id-ID', { weekday: 'short' });
};

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim();

const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const normalizeHeaderKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const mapClassRow = (row) => ({
  id: row.id,
  type: row.type,
  name: row.name,
  subtitle: row.subtitle,
  assessmentTypes: normalizeAssessmentTypes(row.assessment_types),
});

const mapStudentRow = (row) => {
  const fallbackGrades = {
    Quiz: safeNumber(row.quiz1),
    Midterm: safeNumber(row.mid),
    Project: safeNumber(row.project),
  };
  const rawGrades = row.grades && typeof row.grades === 'object' ? row.grades : fallbackGrades;
  const normalizedGrades = Object.fromEntries(
    Object.entries(rawGrades).map(([key, value]) => [String(key), safeNumber(value)])
  );

  return {
    id: row.id,
    classId: row.class_id,
    name: row.name,
    avatar: row.avatar || buildAvatar(row.name),
    email: row.email || '',
    gender: row.gender || '',
    studentNumber: row.student_number || '',
    attitude: row.attitude || 'ME',
    zeroExclusions: normalizeZeroExclusions(row.zero_exclusions),
    zeroExclusionNotes: normalizeZeroExclusionNotes(row.zero_exclusion_notes),
    grades: normalizedGrades,
  };
};

const buildAttendanceRecordMap = (rows = []) => {
  const map = {};
  rows.forEach((row) => {
    if (!row) return;
    const key = String(row.student_id);
    map[key] = {
      status: normalizeStatus(row.status),
      attendanceTime: row.attendance_time || null,
    };
  });
  return map;
};

const normalizeTimeValue = (value) => {
  if (!value || typeof value !== 'string') return '00:00';
  const [hour = '00', minute = '00'] = value.split(':');
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const mapScheduleRow = (row) => ({
  id: row.id,
  day: row.day,
  startTime: normalizeTimeValue(row.start_time),
  endTime: normalizeTimeValue(row.end_time),
  classId: row.class_id,
  subject: row.subject || '',
  room: row.room || '',
  colorIndex: row.color_index ?? 0,
  repeatWeekly: row.repeat_weekly ?? true,
  date: row.date
    ? (typeof row.date === 'string' ? row.date : formatLocalDateKey(new Date(row.date)))
    : '',
});

// --- INITIAL TEACHER PROFILE ---
const INITIAL_TEACHER_PROFILE = {
  name: 'Mr. Budi',
  nip: '19850123',
  email: 'budi@uphcollege.com',
  phone: '',
  address: '',
  subject: 'Physics',
  avatar: 'GB',
  avatarUrl: ''
};

// --- SCHEDULE DATA ---
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const buildTimeSlots = (startHour, endHour, stepMinutes = 30) => {
  const slots = [];
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += stepMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }
  return slots;
};
const TIME_SLOTS = buildTimeSlots(7, 18, 30);

const SCHEDULE_COLORS = [
  { bg: 'bg-sky-500/20', border: 'border-sky-500/40', text: 'text-sky-400', indicator: 'bg-sky-500' },
  { bg: 'bg-sky-400/20', border: 'border-sky-400/40', text: 'text-sky-300', indicator: 'bg-sky-400' },
  { bg: 'bg-sky-500/20', border: 'border-sky-500/40', text: 'text-sky-400', indicator: 'bg-sky-500' },
  { bg: 'bg-sky-400/20', border: 'border-sky-400/40', text: 'text-sky-300', indicator: 'bg-sky-400' },
  { bg: 'bg-lime-500/20', border: 'border-lime-500/40', text: 'text-lime-400', indicator: 'bg-lime-500' },
  { bg: 'bg-lime-400/20', border: 'border-lime-400/40', text: 'text-lime-300', indicator: 'bg-lime-400' },
];

const INITIAL_SCHEDULES = [
  { id: 1, day: 'Monday', startTime: '07:00', endTime: '08:30', classId: '1', className: 'Grade 10 Science 1', subject: 'Homeroom', room: 'Room 101', colorIndex: 0, repeatWeekly: true, date: '' },
  { id: 2, day: 'Monday', startTime: '09:00', endTime: '10:30', classId: '2', className: 'Grade 11 Social 2', subject: 'Basic Physics', room: 'Lab Physics', colorIndex: 1, repeatWeekly: true, date: '' },
  { id: 3, day: 'Tuesday', startTime: '08:00', endTime: '09:30', classId: '3', className: 'Grade 12 Science 3', subject: 'Advanced Physics', room: 'Room 203', colorIndex: 2, repeatWeekly: true, date: '' },
  { id: 4, day: 'Tuesday', startTime: '10:00', endTime: '11:30', classId: '1', className: 'Grade 10 Science 1', subject: 'Homeroom', room: 'Room 101', colorIndex: 0, repeatWeekly: true, date: '' },
  { id: 5, day: 'Wednesday', startTime: '07:30', endTime: '09:00', classId: '2', className: 'Grade 11 Social 2', subject: 'Basic Physics', room: 'Lab Physics', colorIndex: 1, repeatWeekly: true, date: '' },
  { id: 6, day: 'Wednesday', startTime: '13:00', endTime: '14:30', classId: '3', className: 'Grade 12 Science 3', subject: 'Advanced Physics', room: 'Room 203', colorIndex: 2, repeatWeekly: true, date: '' },
  { id: 7, day: 'Thursday', startTime: '08:30', endTime: '10:00', classId: '1', className: 'Grade 10 Science 1', subject: 'Homeroom', room: 'Room 101', colorIndex: 0, repeatWeekly: true, date: '' },
  { id: 8, day: 'Friday', startTime: '09:00', endTime: '10:30', classId: '2', className: 'Grade 11 Social 2', subject: 'Basic Physics', room: 'Lab Physics', colorIndex: 1, repeatWeekly: true, date: '' },
  { id: 9, day: 'Friday', startTime: '11:00', endTime: '12:30', classId: '3', className: 'Grade 12 Science 3', subject: 'Advanced Physics', room: 'Room 203', colorIndex: 2, repeatWeekly: true, date: '' },
];

// --- PIXEL BACKGROUND COMPONENT ---
const ParticleBackground = () => {
  const pixels = useMemo(() => (
    Array.from({ length: 72 }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() > 0.8 ? 4 : 3,
      driftX: (Math.random() - 0.5) * 14,
      driftY: (Math.random() - 0.5) * 20,
      opacity: 0.2 + Math.random() * 0.5,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 3,
    }))
  ), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {pixels.map((pixel) => (
        <motion.span
          key={pixel.id}
          className="absolute bg-sky-300/70"
          style={{
            left: `${pixel.x}%`,
            top: `${pixel.y}%`,
            width: `${pixel.size}px`,
            height: `${pixel.size}px`,
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.35)',
          }}
          animate={{
            x: [0, pixel.driftX, 0],
            y: [0, pixel.driftY, 0],
            opacity: [0.15, pixel.opacity, 0.15],
          }}
          transition={{
            duration: pixel.duration,
            delay: pixel.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

const IntroScreen = ({ onFinish }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 90, damping: 18, mass: 0.4 });
  const smoothY = useSpring(y, { stiffness: 90, damping: 18, mass: 0.4 });
  const tiltX = useTransform(smoothY, [-30, 30], [6, -6]);
  const tiltY = useTransform(smoothX, [-30, 30], [-6, 6]);

  const handleMove = (event) => {
    const { clientX, clientY, currentTarget } = event;
    const rect = currentTarget.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width - 0.5;
    const relY = (clientY - rect.top) / rect.height - 0.5;
    x.set(relX * 60);
    y.set(relY * 60);
  };

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: 'blur(10px)' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMove}
      onClick={onFinish}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onFinish();
      }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.65 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-sky-500/35 blur-3xl"
          style={{ x: smoothX, y: smoothY }}
        />
        <motion.div
          className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 rounded-full bg-sky-400/25 blur-3xl"
          style={{ x: smoothX, y: smoothY }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10"
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.div
        className="relative z-10 text-center px-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <motion.div
          className="relative mx-auto w-24 h-24 rounded-[28px] bg-white/10 border border-white/15 shadow-2xl flex items-center justify-center"
          style={{ rotateX: tiltX, rotateY: tiltY }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        >
          <motion.img
            src={attendifyLogo.src}
            alt="Attendify logo"
            className="w-16 h-16 rounded-2xl"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
          <motion.div
            className="absolute inset-0 rounded-[28px] border border-white/20"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.h1
          className="mt-6 text-3xl font-semibold text-white tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Attendify
        </motion.h1>
        <motion.p
          className="mt-2 text-sm text-sky-100/70"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Interactive attendance, made calm.
        </motion.p>
        <motion.div
          className="mt-6 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-400 via-sky-300 to-sky-500"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: INTRO_DURATION_MS / 1000, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setError(SUPABASE_MISSING_MESSAGE);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const normalizedEmail = credentials.email.trim().toLowerCase();

    if (!supabase) {
      setError(SUPABASE_MISSING_MESSAGE);
      return;
    }
    if (!SCHOOL_EMAIL_REGEX.test(normalizedEmail)) {
      setError(AUTH_ERROR_MESSAGE);
      return;
    }
    if (ADMIN_EMAIL && normalizedEmail !== ADMIN_EMAIL) {
      setError(AUTH_ERROR_MESSAGE);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: credentials.password,
      });
      if (authError) {
        setError(AUTH_ERROR_MESSAGE);
        return;
      }
      onLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] w-full relative z-10 p-3 sm:p-4 md:p-8">
      <div className="macos-glass-panel p-6 sm:p-8 md:p-10 rounded-2xl w-full max-w-sm sm:max-w-md animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden group border-white/20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent blur-sm"></div>

        <div className="flex flex-col items-center mb-8">
          <img
            src={attendifyLogo.src}
            alt="Attendify logo"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg mb-3 sm:mb-4 transform transition-transform group-hover:scale-105 duration-300"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Attendify</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Class Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 ml-1 uppercase tracking-wide">Email Address</label>
            <motion.div
              className="relative rounded-xl"
              initial={{ opacity: 0.9 }}
            >
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-xl p-[1px]"
                initial={{ backgroundPosition: '0% 50%' }}
                animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', delay: 0.4 }}
                style={{
                  backgroundImage:
                    'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.45) 45%, transparent 70%)',
                  backgroundSize: '200% 100%',
                  WebkitMask:
                    'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <span className="auth-icon absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <EnvelopeSimple
                  size={16}
                  weight="bold"
                  style={{ color: '#ffffff', opacity: 1, filter: 'none' }}
                />
              </span>
              <Input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                required
                className="relative z-0 w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl text-sm text-white placeholder:text-gray-500 bg-black/50 border-white/20 focus:ring-1 focus:ring-sky-500/50"
              />
            </motion.div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 ml-1 uppercase tracking-wide">Password</label>
            <motion.div
              className="relative rounded-xl"
              initial={{ opacity: 0.9 }}
            >
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-xl p-[1px]"
                initial={{ backgroundPosition: '0% 50%' }}
                animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', delay: 1.1 }}
                style={{
                  backgroundImage:
                    'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.45) 45%, transparent 70%)',
                  backgroundSize: '200% 100%',
                  WebkitMask:
                    'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <span className="auth-icon absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <LockKey
                  size={16}
                  weight="bold"
                  style={{ color: '#ffffff', opacity: 1, filter: 'none' }}
                />
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                className="relative z-0 w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl text-sm text-white placeholder:text-gray-500 bg-black/50 border-white/20 focus:ring-1 focus:ring-sky-500/50"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1 z-10"
              >
                <span className="auth-icon">
                  {showPassword ? (
                    <EyeSlash size={16} weight="bold" style={{ color: '#ffffff', opacity: 1, filter: 'none' }} />
                  ) : (
                    <PhEye size={16} weight="bold" style={{ color: '#ffffff', opacity: 1, filter: 'none' }} />
                  )}
                </span>
              </button>
            </motion.div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="relative w-full mt-5 sm:mt-6 overflow-hidden rounded-xl bg-white text-slate-900 font-semibold py-2.5 sm:py-3 shadow-lg shadow-black/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            initial="rest"
            animate="rest"
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
          >
            <motion.span
              className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400"
              variants={{
                rest: { scale: 0, opacity: 0 },
                hover: { scale: 18, opacity: 1 },
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="relative z-10 flex items-center gap-2"
              variants={{
                rest: { color: '#0f172a' },
                hover: { color: '#ffffff' },
              }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Enter Dashboard <ArrowRight size={16} />
                </>
              )}
            </motion.span>
          </motion.button>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-4">
          <p className="text-[10px] text-gray-500">
            &copy; 2024 Attendify Education System. <br/>Ver 2.1.0 (Beta)
          </p>
        </div>
      </div>
    </div>
  );
};

// --- DASHBOARD COMPONENTS ---

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className={`bg-[#1e1e1e] border border-white/20 rounded-xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden relative z-50`}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-sm font-medium text-white">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// --- EDIT PROFILE MODAL ---
const EditProfileModal = ({ isOpen, onClose, profile, onSave }) => {
  const [formData, setFormData] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(profile);
    setAvatarFile(null);
    setAvatarPreview(profile.avatarUrl || '');
    setError('');
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Generate avatar from name
    const avatar = formData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    const result = await onSave({ ...formData, avatar }, avatarFile);
    if (result && typeof result === 'object') {
      if (!result.ok) {
        setError(result.message || 'Failed to save profile. Please try again.');
        setSaving(false);
        return;
      }
    } else if (!result) {
      setError('Failed to save profile. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Teacher Profile" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 shadow-lg flex items-center justify-center text-2xl font-bold text-white">
                {formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
            <label
              htmlFor="teacher-avatar-upload"
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
            >
              <Camera size={20} className="text-white" />
            </label>
            <input
              id="teacher-avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <User size={12} /> Full Name
            </label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Full name"
            />
          </div>

          {/* Employee ID */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Briefcase size={12} /> Employee ID
            </label>
            <input 
              type="text" 
              required
              value={formData.nip}
              onChange={(e) => handleChange('nip', e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Employee ID"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <BookOpen size={12} /> Subject
            </label>
            <input 
              type="text" 
              required
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Subject"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <EnvelopeSimple size={12} weight="bold" /> Email
            </label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Email address"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Phone size={12} /> Phone Number
            </label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Phone number"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <MapPin size={12} /> Address
            </label>
            <textarea 
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-sky-500 outline-none transition-all resize-none"
              placeholder="Address"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500 font-medium shadow-lg shadow-sky-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const DashboardView = ({ students, activeClass, attendanceRecords, schedules, notifications, onQuickAction }) => {
  const classStudents = students.filter(s => isSameClassId(s.classId, activeClass.id));
  const assessmentTypes = activeClass?.assessmentTypes ?? DEFAULT_ASSESSMENTS;
  const attendanceMap = attendanceRecords || {};
  const statusList = classStudents
    .map(student => attendanceMap[String(student.id)]?.status)
    .filter(Boolean);
  const presentCount = statusList.filter(status => status === 'Present').length;
  const lateCount = statusList.filter(status => status === 'Late').length;
  const sickCount = statusList.filter(status => status === 'Sick').length;
  const permitCount = statusList.filter(status => status === 'Excused').length;
  const unexcusedCount = statusList.filter(status => status === 'Unexcused').length;
  const absentCount = statusList.filter(status => status === 'Absent').length;
  const attendanceRate = classStudents.length ? Math.round((presentCount / classStudents.length) * 100) : 0;
  
  const classAverages = classStudents
    .map((student) => ({
      student,
      info: getGradesAverageInfo(student.grades, assessmentTypes, student.zeroExclusions),
    }))
    .filter(({ info }) => info.hasScores)
    .map(({ info }) => info.avg);
  const classAvg = classAverages.length
    ? Math.round(classAverages.reduce((acc, value) => acc + value, 0) / classAverages.length)
    : 0;

  const timeToMinutes = (value) => {
    if (!value || typeof value !== 'string') return 0;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return (hours * 60) + minutes;
  };

  const todayKey = getTodayKey();
  const todayDate = new Date(`${todayKey}T00:00:00`);
  const todayLabel = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = (schedules || [])
    .filter((schedule) => {
      if (!schedule || !schedule.startTime || !schedule.endTime) return false;
      if (!isSameClassId(schedule.classId, activeClass.id)) return false;
      if (schedule.repeatWeekly) {
        return schedule.day === todayLabel;
      }
      return schedule.date && schedule.date === todayKey;
    })
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const nowMinutes = (() => {
    const now = new Date();
    return (now.getHours() * 60) + now.getMinutes();
  })();
  const activeScheduleId = todaySchedule.find((schedule) => {
    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    return nowMinutes >= start && nowMinutes < end;
  })?.id;

  const activityMeta = {
    attendance: { icon: Users, color: 'text-sky-400' },
    grade: { icon: BookOpen, color: 'text-sky-400' },
    student: { icon: Plus, color: 'text-sky-400' },
    class: { icon: School, color: 'text-sky-400' },
    schedule: { icon: Calendar, color: 'text-sky-400' },
    info: { icon: Bell, color: 'text-sky-300' },
  };
  const recentActivities = (notifications || []).slice(0, 3).map((item) => {
    const meta = activityMeta[item.type] || activityMeta.info;
    return {
      id: item.id,
      action: item.message,
      time: formatNotificationTime(item.time) || 'Just now',
      icon: meta.icon,
      color: meta.color,
    };
  });

  // Get top performing students
  const topStudents = [...classStudents]
    .map((student) => {
      const info = getGradesAverageInfo(student.grades, assessmentTypes, student.zeroExclusions);
      return { ...student, avg: info.avg, hasScores: info.hasScores };
    })
    .filter((student) => student.hasScores)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400"><Users size={18} /></div>
            <span className="text-xs font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">Today</span>
          </div>
          <h3 className="text-2xl font-semibold text-white">{attendanceRate}%</h3>
          <p className="text-xs text-gray-400 mt-1">Attendance: {activeClass.name}</p>
        </div>

        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400"><BookOpen size={18} /></div>
          </div>
          <h3 className="text-2xl font-semibold text-white">{classAvg}</h3>
          <p className="text-xs text-gray-400 mt-1">Average Score</p>
        </div>

        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400"><Users size={18} /></div>
          </div>
          <h3 className="text-2xl font-semibold text-white">{classStudents.length}</h3>
          <p className="text-xs text-gray-400 mt-1">Total Students</p>
        </div>

        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400">
               {activeClass.type === 'homeroom' ? <Home size={18} /> : <School size={18} />}
            </div>
          </div>
          <h3 className="text-lg font-medium text-white truncate">{activeClass.subtitle}</h3>
          <p className="text-xs text-gray-400 mt-1">
             {activeClass.type === 'homeroom' ? 'Class Status' : 'Subject'}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Breakdown */}
        <div className="macos-glass-panel rounded-xl p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={16} className="text-sky-400" />
              Today's Attendance Summary
            </h3>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-sky-400">{presentCount}</div>
              <div className="text-[10px] text-sky-400/80 uppercase font-medium mt-1">Present</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{lateCount}</div>
              <div className="text-[10px] text-yellow-400/80 uppercase font-medium mt-1">Late</div>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-sky-400">{sickCount}</div>
              <div className="text-[10px] text-sky-400/80 uppercase font-medium mt-1">Sick</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{permitCount}</div>
              <div className="text-[10px] text-purple-400/80 uppercase font-medium mt-1">Excused</div>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-rose-400">{unexcusedCount}</div>
              <div className="text-[10px] text-rose-400/80 uppercase font-medium mt-1">Unexcused</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{absentCount}</div>
              <div className="text-[10px] text-red-400/80 uppercase font-medium mt-1">Absent</div>
            </div>
          </div>

          {/* Attendance Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Attendance Progress</span>
              <span>{presentCount + lateCount}/{classStudents.length} Students</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${classStudents.length ? ((presentCount + lateCount) / classStudents.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-sky-400" />
            Schedule Today
          </h3>
          {todaySchedule.length ? (
            <div className="space-y-3">
              {todaySchedule.map((item) => {
                const color = SCHEDULE_COLORS[item.colorIndex % SCHEDULE_COLORS.length] || SCHEDULE_COLORS[0];
                const isActive = item.id === activeScheduleId;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${isActive ? 'bg-sky-500/10 border border-sky-500/20' : 'hover:bg-white/5'}`}
                  >
                    <div className={`w-1 h-10 rounded-full ${isActive ? 'bg-sky-500' : color.indicator}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{item.startTime} - {item.endTime}</p>
                      <p className="text-sm text-white font-medium truncate">{item.className || 'Class'}</p>
                      <p className="text-[10px] text-gray-500">{item.subject || '-'}</p>
                    </div>
                    {isActive && (
                      <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-1 rounded-full">Now</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No schedule for today yet.</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Students */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-sky-400" />
            Top Students
          </h3>
          <div className="space-y-3">
            {topStudents.length > 0 ? topStudents.map((student, index) => (
              <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-sky-500/20 text-sky-400' :
                  index === 1 ? 'bg-sky-400/20 text-sky-300' :
                  'bg-sky-300/20 text-sky-200'
                }`}>
                  {index + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-600 to-gray-500 flex items-center justify-center text-xs text-white font-medium">
                  {student.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{student.name}</p>
                  <p className="text-[10px] text-gray-500">Average: {student.avg}</p>
                </div>
                <div className="text-lg font-bold text-white">{student.avg}</div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No student data yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Bell size={16} className="text-sky-400" />
            Recent Activity
          </h3>
          {recentActivities.length ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`p-2 bg-white/5 rounded-lg ${activity.color}`}>
                    <activity.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.action}</p>
                    <p className="text-[10px] text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No recent activity yet.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <LayoutGrid size={16} className="text-sky-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onQuickAction?.('attendance')}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-colors group"
            >
              <Users size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction?.('grades')}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-colors group"
            >
              <BookOpen size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Enter Grades</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction?.('add-student')}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-colors group"
            >
              <Plus size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Add Student</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction?.('schedule')}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-colors group"
            >
              <Calendar size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentsDataView = ({ students, activeClass, onAddStudent, onDeleteStudent, onEditStudent, onImportStudents, onRefreshStudents, onDeleteStudentsBatch, searchQuery, addTrigger }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeletePassword, setBulkDeletePassword] = useState('');
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const lastAddTrigger = useRef(addTrigger || 0);
  const importInputRef = useRef(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    gender: 'Male',
    studentNumber: '',
  });
  const genderMaleId = useId();
  const genderFemaleId = useId();
  const classStudents = students.filter(s => isSameClassId(s.classId, activeClass.id));
  const selectedCount = selectedIds.size;
  const sortedStudents = useMemo(() => {
    const list = [...classStudents];
    const direction = sortDir === 'asc' ? 1 : -1;
    const normalize = (value) => String(value || '').toLowerCase();
    const getValue = (student) => {
      if (sortKey === 'studentNumber') return normalize(student.studentNumber);
      if (sortKey === 'name') return normalize(student.name);
      if (sortKey === 'email') return normalize(student.email);
      if (sortKey === 'gender') return normalize(student.gender);
      return '';
    };
    list.sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (sortKey === 'studentNumber') {
        const base = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
        return base === 0 ? normalize(a.name).localeCompare(normalize(b.name)) * direction : base * direction;
      }
      const base = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return base === 0 ? normalize(a.name).localeCompare(normalize(b.name)) * direction : base * direction;
    });
    return list;
  }, [classStudents, sortDir, sortKey]);
  const normalizedQuery = useMemo(() => normalizeSearchValue(searchQuery), [searchQuery]);
  const filteredStudents = useMemo(() => {
    if (!normalizedQuery) return sortedStudents;
    return sortedStudents.filter((student) => {
      const haystack = [
        student.name,
        student.studentNumber,
        student.email,
        student.gender,
      ].map(normalizeSearchValue);
      return haystack.some(value => value.includes(normalizedQuery));
    });
  }, [sortedStudents, normalizedQuery]);
  const allSelected = filteredStudents.length > 0 && filteredStudents.every(student => selectedIds.has(student.id));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeClass?.id]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(classStudents.map(student => student.id));
      const next = new Set();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [classStudents]);

  useEffect(() => {
    if (!addTrigger || addTrigger === lastAddTrigger.current) return;
    lastAddTrigger.current = addTrigger;
    if (!activeClass?.id) return;
    openAdd();
  }, [addTrigger, activeClass?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    const result = isEditMode
      ? await onEditStudent(formData.id, formData)
      : await onAddStudent(activeClass.id, formData);
    setFormSaving(false);
    if (result && result.ok === false) {
      setFormError(result.message || 'Failed to save student.');
      return;
    }
    setIsModalOpen(false);
    setFormData({ id: '', name: '', email: '', gender: 'Male', studentNumber: '' });
  };

  const openEdit = (student) => {
    setFormData({
      id: student.id,
      name: student.name,
      email: student.email || '',
      gender: student.gender || 'Male',
      studentNumber: student.studentNumber || '',
    });
    setFormError('');
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setFormData({ id: '', name: '', email: '', gender: 'Male', studentNumber: '' });
    setFormError('');
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const triggerImportPicker = () => {
    setImportError('');
    setImportSummary('');
    setImportFile(null);
    if (importInputRef.current) {
      importInputRef.current.value = '';
      importInputRef.current.click();
    }
    setIsImportOpen(true);
  };

  const closeImport = () => {
    setIsImportOpen(false);
    setImportError('');
    setImportSummary('');
    setImportFile(null);
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  const openDelete = (student) => {
    setDeleteTarget(student);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const openBulkDelete = () => {
    if (!selectedCount) return;
    setBulkDeletePassword('');
    setBulkDeleteError('');
    setIsBulkDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (!deletePassword) {
      setDeleteError('Password is required.');
      return;
    }
    setDeleteSaving(true);
    setDeleteError('');
    const result = await onDeleteStudent(deleteTarget.id, deletePassword);
    setDeleteSaving(false);
    if (result && result.ok === false) {
      setDeleteError(result.message || 'Failed to delete student.');
      return;
    }
    setIsDeleteOpen(false);
    setDeleteTarget(null);
    setDeletePassword('');
  };

  const handleBulkDeleteConfirm = async () => {
    if (!selectedCount) {
      setBulkDeleteError('No students selected.');
      return;
    }
    if (!bulkDeletePassword) {
      setBulkDeleteError('Password is required.');
      return;
    }
    if (!onDeleteStudentsBatch) {
      setBulkDeleteError('Bulk delete is not available.');
      return;
    }

    setBulkDeleteSaving(true);
    setBulkDeleteError('');
    const ids = Array.from(selectedIds);
    const result = await onDeleteStudentsBatch(ids, bulkDeletePassword);
    setBulkDeleteSaving(false);
    if (result && result.ok === false) {
      setBulkDeleteError(result.message || 'Failed to delete students.');
      return;
    }
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
    setBulkDeletePassword('');
  };

  const handleDownloadTemplate = () => {
    const headers = ['Student Number', 'Full Name', 'Email', 'Gender'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 26 },
      { wch: 28 },
      { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_import_template.xlsx', { compression: true });
  };

  const handleImportFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportSummary('');
    setIsImportOpen(true);
    handleImportSubmit(file);
  };

  const handleImportSubmit = async (fileOverride) => {
    if (!activeClass?.id) {
      setImportError('Class not found.');
      return;
    }
    if (isImporting) {
      return;
    }
    const fileToImport = fileOverride || importFile;
    if (!fileToImport) {
      setImportError('Please select an .xlsx file first.');
      return;
    }
    const fileCheck = validateXlsxFile(fileToImport);
    if (!fileCheck.ok) {
      setImportError(fileCheck.message);
      return;
    }

    setIsImporting(true);
    setImportError('');
    setImportSummary('');

    try {
      const buffer = await fileToImport.arrayBuffer();
      const workbook = XLSX.read(buffer, getSafeXlsxReadOptions());
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setImportError('Invalid file.');
        setIsImporting(false);
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
        header: 1,
      });
      const limitCheck = enforceSheetLimits(rows);
      if (!limitCheck.ok) {
        setImportError(limitCheck.message);
        setIsImporting(false);
        return;
      }

      const headerRowIndex = rows.findIndex((row) => (
        Array.isArray(row) && row.some((cell) => String(cell || '').trim())
      ));
      if (headerRowIndex === -1) {
        setImportError('Header not found.');
        setIsImporting(false);
        return;
      }

      const headerRow = sanitizeHeaderRow(rows[headerRowIndex]);
      const normalizedHeaders = headerRow.map((cell) => normalizeHeaderKey(cell));
      const studentNumberIndex = [
        'studentnumber', 'studentno', 'studentid', 'nis', 'nisn', 'noinduk'
      ].map(normalizeHeaderKey).map(key => normalizedHeaders.indexOf(key)).find(idx => idx >= 0) ?? -1;
      const nameIndex = [
        'fullname', 'name', 'studentname', 'nama', 'namalengkap'
      ].map(normalizeHeaderKey).map(key => normalizedHeaders.indexOf(key)).find(idx => idx >= 0) ?? -1;
      const emailIndex = [
        'email', 'emailaddress'
      ].map(normalizeHeaderKey).map(key => normalizedHeaders.indexOf(key)).find(idx => idx >= 0) ?? -1;
      const genderIndex = [
        'gender', 'sex', 'jk', 'jeniskelamin'
      ].map(normalizeHeaderKey).map(key => normalizedHeaders.indexOf(key)).find(idx => idx >= 0) ?? -1;

      if (studentNumberIndex === -1 || nameIndex === -1 || emailIndex === -1 || genderIndex === -1) {
        setImportError('Headers do not match. Expected columns: Student Number, Full Name, Email, Gender.');
        setIsImporting(false);
        return;
      }

      const assessmentTypes = activeClass.assessmentTypes ?? DEFAULT_ASSESSMENTS;
      const payload = [];
      let skipped = 0;
      let duplicates = 0;
      const existingNumbers = new Set(
        classStudents
          .map(student => String(student.studentNumber || '').trim())
          .filter(Boolean)
      );
      const existingEmails = new Set(
        classStudents
          .map(student => String(student.email || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const seenNumbers = new Set();
      const seenEmails = new Set();

      rows.slice(headerRowIndex + 1).forEach((row) => {
        const safeRow = Array.isArray(row) ? row : [];
        const studentNumber = String(safeRow[studentNumberIndex] || '').trim();
        const name = String(safeRow[nameIndex] || '').trim();
        const email = String(safeRow[emailIndex] || '').trim().toLowerCase();
        const gender = String(safeRow[genderIndex] || '').trim();
        const isEmpty = !studentNumber && !name && !email && !gender;
        if (isEmpty) return;

        if (!studentNumber || !name || !email || !gender) {
          skipped += 1;
          return;
        }

        const isDuplicate = existingNumbers.has(studentNumber)
          || existingEmails.has(email)
          || (studentNumber && seenNumbers.has(studentNumber))
          || (email && seenEmails.has(email));
        if (isDuplicate) {
          duplicates += 1;
          return;
        }

        if (studentNumber) {
          seenNumbers.add(studentNumber);
        }
        if (email) {
          seenEmails.add(email);
        }

        const grades = assessmentTypes.reduce((acc, type) => {
          acc[type] = 0;
          return acc;
        }, {});

        payload.push({
          class_id: activeClass.id,
          name,
          avatar: buildAvatar(name),
          email,
          gender,
          student_number: studentNumber,
          grades,
          attitude: 'ME',
          zero_exclusions: {},
          zero_exclusion_notes: {},
        });
      });

      if (!payload.length) {
        if (duplicates) {
          setImportError('All data already exists in this class.');
        } else {
          setImportError('No valid student data.');
        }
        setIsImporting(false);
        return;
      }

      if (!onImportStudents) {
        setImportError('Import is not available yet.');
        setIsImporting(false);
        return;
      }

      const result = await onImportStudents(payload);
      if (result && result.ok === false) {
        const rawMessage = result.message || 'Failed to import student data.';
        const lowered = rawMessage.toLowerCase();
        if (lowered.includes('row-level security')) {
          setImportError('RLS blocked inserts. Enable insert policies for the `students` table.');
        } else {
          setImportError(rawMessage);
        }
        setIsImporting(false);
        return;
      }

      if (onRefreshStudents) {
        await onRefreshStudents();
      }

      const importedCount = result?.count ?? payload.length;
      const skippedInfo = skipped ? ` (${skipped} incomplete rows)` : '';
      const duplicateInfo = duplicates ? ` (${duplicates} duplicate rows skipped)` : '';
      setImportSummary(`Successfully imported ${importedCount} students${skippedInfo}${duplicateInfo}.`);
      setIsImporting(false);
    } catch (error) {
      setImportError('Failed to read file.');
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-slide-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Students: {activeClass.name}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openBulkDelete}
            disabled={!selectedCount}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} /> Delete Selected {selectedCount ? `(${selectedCount})` : ''}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="bg-white/10 hover:bg-white/15 text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors border border-white/10"
          >
            <Download size={14} /> Template XLSX
          </button>
          <button
            onClick={triggerImportPicker}
            className="bg-white/10 hover:bg-white/15 text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors border border-white/10"
          >
            <FileUp size={14} /> Import XLSX
          </button>
          <button onClick={openAdd} className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-sky-500/20">
            <Plus size={16} /> Add Student
          </button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleImportFileChange}
        />
      </div>

      <div className="macos-glass-panel rounded-xl overflow-hidden flex-1 min-h-0">
        <div className="w-full h-full overflow-auto">
          <table className="w-full table-fixed text-left">
            <thead className="sticky top-0 bg-[#1e1e1e] border-b border-white/10 z-10">
              <tr className="text-gray-400 text-xs uppercase font-medium">
                <th className="p-3 pl-4 sm:p-4 sm:pl-6 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        setSelectedIds(new Set());
                        return;
                      }
                      setSelectedIds(new Set(filteredStudents.map(student => student.id)));
                    }}
                    className="h-4 w-4 rounded border border-white/30 bg-black/30 text-sky-500 focus:ring-sky-500/40"
                    aria-label="Select all students"
                  />
                </th>
                <th className="p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('studentNumber')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    Student No.
                    {sortKey === 'studentNumber' && (
                      <span className="text-[10px] text-gray-500">{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
                    )}
                  </button>
                </th>
                <th className="p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    Full Name
                    {sortKey === 'name' && (
                      <span className="text-[10px] text-gray-500">{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
                    )}
                  </button>
                </th>
                <th className="p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('email')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    Email
                    {sortKey === 'email' && (
                      <span className="text-[10px] text-gray-500">{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
                    )}
                  </button>
                </th>
                <th className="p-3 sm:p-4 hidden sm:table-cell">
                  <button
                    type="button"
                    onClick={() => toggleSort('gender')}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  >
                    Gender
                    {sortKey === 'gender' && (
                      <span className="text-[10px] text-gray-500">{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
                    )}
                  </button>
                </th>
                <th className="p-3 sm:p-4 text-right pr-4 sm:pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-white/5 group">
                  <td className="p-3 pl-4 sm:p-4 sm:pl-6">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.id)}
                      onChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(student.id)) {
                            next.delete(student.id);
                          } else {
                            next.add(student.id);
                          }
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border border-white/30 bg-black/30 text-sky-500 focus:ring-sky-500/40"
                      aria-label={`Select ${student.name}`}
                    />
                  </td>
                  <td className="p-3 sm:p-4 text-gray-500 text-sm">{student.studentNumber || '-'}</td>
                  <td className="p-3 sm:p-4 text-gray-200 text-sm font-medium break-words">{student.name}</td>
                  <td className="p-3 sm:p-4 text-gray-300 text-sm break-all">{student.email || '-'}</td>
                  <td className="p-3 sm:p-4 text-gray-300 text-sm hidden sm:table-cell">{student.gender || '-'}</td>
                  <td className="p-3 sm:p-4 text-right pr-4 sm:pr-6 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(student)} className="p-1.5 rounded-md bg-white/10 text-sky-400 hover:bg-sky-500/20 transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => openDelete(student)} className="p-1.5 rounded-md bg-white/10 text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
               {classStudents.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500 text-sm">No student data.</td>
                  </tr>
                )}
               {classStudents.length > 0 && filteredStudents.length === 0 && (
                 <tr>
                   <td colSpan="6" className="p-8 text-center text-gray-500 text-sm">No matching students.</td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
        }} 
        title={isEditMode ? "Edit Student" : "Add New Student"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Email address"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gender</label>
            <div className="flex flex-wrap gap-4">
              <label
                htmlFor={genderMaleId}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 cursor-pointer select-none"
              >
                <Checkbox
                  id={genderMaleId}
                  checked={formData.gender === 'Male'}
                  onChange={() => setFormData((prev) => ({ ...prev, gender: 'Male' }))}
                />
                <span className="text-xs text-gray-200">Male</span>
              </label>
              <label
                htmlFor={genderFemaleId}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 cursor-pointer select-none"
              >
                <Checkbox
                  id={genderFemaleId}
                  checked={formData.gender === 'Female'}
                  onChange={() => setFormData((prev) => ({ ...prev, gender: 'Female' }))}
                />
                <span className="text-xs text-gray-200">Female</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Student Number</label>
            <input 
              type="text" 
              required
              value={formData.studentNumber}
              onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Student number"
            />
          </div>
          {formError && (
            <p className="text-xs text-red-400">{formError}</p>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSaving}
              className="px-3 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500 font-medium shadow-lg shadow-sky-600/20 transition-colors disabled:opacity-70"
            >
              {formSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (deleteSaving) return;
          setIsDeleteOpen(false);
          setDeleteTarget(null);
          setDeletePassword('');
          setDeleteError('');
        }}
        title="Delete Student"
      >
        <div className="space-y-4">
          <div className="macos-glass-panel rounded-lg border border-white/10 p-4 text-sm text-gray-200">
            <p className="font-semibold text-white">This action will permanently delete the student data.</p>
            <p className="text-xs text-gray-400 mt-2">
              Student: <span className="text-gray-200">{deleteTarget?.name || '-'}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Student No: <span className="text-gray-200">{deleteTarget?.studentNumber || '-'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm password</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Enter your password"
            />
          </div>

          {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (deleteSaving) return;
                setIsDeleteOpen(false);
                setDeleteTarget(null);
                setDeletePassword('');
                setDeleteError('');
              }}
              className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteSaving}
              className="px-3 py-2 rounded-lg text-sm bg-red-500/80 text-white hover:bg-red-500 font-medium shadow-lg shadow-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {deleteSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => {
          if (bulkDeleteSaving) return;
          setIsBulkDeleteOpen(false);
          setBulkDeletePassword('');
          setBulkDeleteError('');
        }}
        title="Delete Selected Students"
      >
        <div className="space-y-4">
          <div className="macos-glass-panel rounded-lg border border-white/10 p-4 text-sm text-gray-200">
            <p className="font-semibold text-white">This action will permanently delete selected student data.</p>
            <p className="text-xs text-gray-400 mt-2">
              Selected: <span className="text-gray-200">{selectedCount}</span> students
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm password</label>
            <input
              type="password"
              value={bulkDeletePassword}
              onChange={(e) => setBulkDeletePassword(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all"
              placeholder="Enter your password"
            />
          </div>

          {bulkDeleteError && <p className="text-xs text-red-400">{bulkDeleteError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (bulkDeleteSaving) return;
                setIsBulkDeleteOpen(false);
                setBulkDeletePassword('');
                setBulkDeleteError('');
              }}
              className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteConfirm}
              disabled={bulkDeleteSaving}
              className="px-3 py-2 rounded-lg text-sm bg-red-500/80 text-white hover:bg-red-500 font-medium shadow-lg shadow-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {bulkDeleteSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ScheduleDateInput = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const dateValue = useMemo(() => {
    if (!value) return undefined;
    try {
      return parseDate(value);
    } catch {
      return undefined;
    }
  }, [value]);
  const displayValue = dateValue
    ? format(dateValue.toDate(getLocalTimeZone()), 'dd MMM yyyy')
    : 'Select date';

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="schedule-date" className="px-1 text-xs text-gray-400">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id="schedule-date"
            className="h-10 w-full justify-between rounded-lg border border-white/20 bg-black/30 px-3 text-sm font-normal text-gray-200 hover:bg-black/40 hover:text-white"
          >
            {displayValue}
            <ChevronDown size={16} className="text-white/60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="macos-glass-panel w-auto overflow-hidden rounded-xl p-2 text-white"
          align="start"
        >
          <CalendarRac
            mode="single"
            selected={dateValue}
            captionLayout="dropdown"
            className="rounded-lg border border-white/10 bg-black/30 p-2 text-white"
            isDateUnavailable={(date) => date.toDate(getLocalTimeZone()).getDay() === 0}
            onChange={(nextDate) => {
              onChange(nextDate ? nextDate.toString() : '');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const ScheduleTimeInput = ({ id, label, value, onChange }) => (
  <div className="flex flex-col gap-3">
    <Label htmlFor={id} className="px-1 text-xs text-gray-400">
      {label}
    </Label>
    <Input
      type="time"
      id={id}
      step="1"
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border-white/20 bg-black/30 text-white placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-sky-500/40 focus-visible:ring-offset-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
    />
  </div>
);

// --- SCHEDULE VIEW COMPONENT ---
const ScheduleView = ({ schedules, classes, onAddSchedule, onEditSchedule, onDeleteSchedule, searchQuery, addTrigger }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const lastAddTrigger = useRef(addTrigger || 0);
  const [formData, setFormData] = useState({
    id: '', day: 'Monday', startTime: '08:00', endTime: '09:30',
    classId: '', className: '', subject: '', room: '', colorIndex: 0,
    repeatWeekly: true, date: ''
  });

  const getWeekDates = () => {
    return DAYS_OF_WEEK.map((day, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return { 
        day, 
        date, 
        dateStr: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        dateKey: formatLocalDateKey(date)
      };
    });
  };

  const weekDates = getWeekDates();
  const weekDateByDay = useMemo(
    () => Object.fromEntries(weekDates.map(item => [item.day, item.dateKey])),
    [weekDates]
  );
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
  const classById = useMemo(() => new Map((classes || []).map(cls => [cls.id, cls])), [classes]);
  const normalizedQuery = useMemo(() => normalizeSearchValue(searchQuery), [searchQuery]);
  const filteredSchedules = useMemo(() => {
    const safeSchedules = Array.isArray(schedules) ? schedules : [];
    const normalizedList = safeSchedules.filter(schedule => schedule && typeof schedule === 'object');
    if (!normalizedQuery) return normalizedList;
    return normalizedList.filter((schedule) => {
      const classInfo = classById.get(schedule.classId);
      const haystack = [
        schedule.day,
        schedule.subject,
        schedule.room,
        classInfo?.name,
        classInfo?.subtitle,
      ].map(normalizeSearchValue);
      return haystack.some(value => value.includes(normalizedQuery));
    });
  }, [schedules, classById, normalizedQuery]);

  const navigateWeek = (direction) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const getTimePosition = (time) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) {
      return 0;
    }
    const [hours, minutes] = time.split(':').map(Number);
    const [startHour, startMinute] = TIME_SLOTS[0].split(':').map(Number);
    const startMinutes = (startHour * 60) + startMinute;
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return 0;
    }
    const currentMinutes = (hours * 60) + minutes;
    return (currentMinutes - startMinutes) / 30;
  };

  const rowHeight = 40;
  const gridMinHeight = TIME_SLOTS.length * rowHeight;

  const getScheduleHeight = (startTime, endTime) => {
    const start = getTimePosition(startTime);
    const end = getTimePosition(endTime);
    return (end - start) * rowHeight;
  };

  const openAddModal = (day = todayStr) => {
    const safeDay = DAYS_OF_WEEK.includes(day) ? day : 'Monday';
    const dateKey = weekDateByDay[safeDay] || '';
    setFormData({
      id: '', day: safeDay, startTime: '08:00', endTime: '09:30',
      classId: classes[0]?.id || '', className: classes[0]?.name || '',
      subject: classes[0]?.subtitle || '', room: '', colorIndex: 0,
      repeatWeekly: true, date: dateKey
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!addTrigger || addTrigger === lastAddTrigger.current) return;
    lastAddTrigger.current = addTrigger;
    if (!classes?.length) return;
    openAddModal();
  }, [addTrigger, classes]);

  const openEditModal = (schedule) => {
    const dateKey = weekDateByDay[schedule.day] || '';
    setFormData({ 
      ...schedule,
      repeatWeekly: schedule.repeatWeekly ?? true,
      date: schedule.date || dateKey,
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedClass = classes.find(c => c.id === formData.classId);
    const dateKey = weekDateByDay[formData.day] || '';
    const repeatWeekly = Boolean(formData.repeatWeekly);
    const resolvedDate = formData.date || dateKey;
    const resolvedDay = formData.date
      ? new Date(`${formData.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
      : formData.day;
    const data = {
      ...formData,
      classId: formData.classId,
      className: selectedClass?.name || formData.className,
      subject: selectedClass?.subtitle || formData.subject,
      day: resolvedDay,
      repeatWeekly,
      date: repeatWeekly ? '' : resolvedDate,
    };
    if (isEditMode) {
      onEditSchedule(data);
    } else {
      onAddSchedule(data);
    }
    setIsModalOpen(false);
  };

  const handleDateChange = (value) => {
    if (!value) {
      setFormData(prev => ({ ...prev, date: '' }));
      return;
    }
    const nextDay = new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    setFormData(prev => ({ ...prev, date: value, day: nextDay }));
  };

  const handleDelete = (id) => {
    if (confirm('Delete this schedule?')) {
      onDeleteSchedule(id);
    }
  };

  return (
    <div className="flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors">
            Today
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => navigateWeek(-1)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => navigateWeek(1)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <span className="text-sm font-medium text-white">
            {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button onClick={() => openAddModal()} className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-sky-500/20">
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="macos-glass-panel rounded-xl overflow-hidden flex-1">
        <div className="schedule-scroll h-full overflow-auto">
          <div className="schedule-grid min-w-[720px]">
            {/* Day Headers */}
            <div className="schedule-grid-header sticky top-0 z-20 border-b border-white/10">
              <div className="p-2 text-center text-xs text-gray-500">Time</div>
              {weekDates.map(({ day, dateStr }) => (
                <div key={day} className={`p-2 text-center border-l border-white/10 ${day === todayStr ? 'bg-sky-500/20' : ''}`}>
                  <p className={`text-xs font-medium ${day === todayStr ? 'text-sky-300' : 'text-gray-400'}`}>{day.substring(0, 3)}</p>
                  <p className={`text-sm font-semibold ${day === todayStr ? 'text-white' : 'text-gray-200'}`}>{dateStr}</p>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="schedule-grid-body" style={{ minHeight: `${gridMinHeight}px` }}>
              {/* Time Labels */}
              <div className="relative">
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="schedule-time-row border-b border-white/5 flex items-center justify-center">
                    <span className="text-[10px] text-gray-500 leading-none">{time}</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {DAYS_OF_WEEK.map((day) => {
                const dayDateKey = weekDateByDay[day];
                const daySchedules = filteredSchedules.filter((schedule) => {
                  if (!schedule || typeof schedule !== 'object') return false;
                  if (schedule.day !== day) return false;
                  if (schedule.repeatWeekly) return true;
                  return schedule.date && schedule.date === dayDateKey;
                });
                return (
                  <div key={day} className={`relative border-l border-white/10 ${day === todayStr ? 'bg-sky-500/5' : ''}`}>
                    {/* Grid Lines */}
                    {TIME_SLOTS.map((_, index) => (
                      <div key={index} className="schedule-grid-row border-b border-white/5" />
                    ))}
                    
                    {/* Schedule Items */}
                    {daySchedules.map((schedule) => {
                      if (!schedule.startTime || !schedule.endTime) {
                        return null;
                      }
                      const top = getTimePosition(schedule.startTime) * rowHeight;
                      const height = getScheduleHeight(schedule.startTime, schedule.endTime);
                      const color = SCHEDULE_COLORS[schedule.colorIndex % SCHEDULE_COLORS.length];
                      const classInfo = classById.get(schedule.classId);
                      const className = classInfo?.name || schedule.className || 'Class';
                      const subject = classInfo?.subtitle || schedule.subject || '';
                      return (
                        <div
                          key={schedule.id}
                          className={`absolute left-1 right-1 rounded-lg p-2 cursor-pointer border ${color.bg} ${color.border} hover:brightness-110 transition-all group`}
                          style={{ top: `${top}px`, height: `${height}px`, minHeight: '60px' }}
                          onClick={() => openEditModal(schedule)}
                        >
                          <div className={`w-1 h-full absolute left-0 top-0 rounded-l-lg ${color.indicator}`} />
                          <div className="pl-2 overflow-hidden h-full flex flex-col">
                            <p className={`text-[10px] ${color.text} font-medium`}>
                              {schedule.startTime} - {schedule.endTime}
                            </p>
                            <p className="text-xs text-white font-semibold truncate">{className}</p>
                            <p className="text-[10px] text-gray-400 truncate">{subject}</p>
                            {height >= 80 && <p className="text-[10px] text-gray-500 truncate">{schedule.room}</p>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
                            className="absolute top-1 right-1 p-1 rounded bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Schedule" : "Add Schedule"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <ScheduleDateInput
                label="Date"
                value={formData.date || weekDateByDay[formData.day] || ''}
                onChange={handleDateChange}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Class</label>
              <Select
                value={formData.classId ? String(formData.classId) : undefined}
                onValueChange={(value) => setFormData((prev) => (
                  prev.classId === value ? prev : { ...prev, classId: value }
                ))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent align="start">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <ScheduleTimeInput
                id="schedule-start-time"
                label="Start Time"
                value={formData.startTime}
                onChange={(value) => setFormData({ ...formData, startTime: value })}
              />
            </div>
            <div>
              <ScheduleTimeInput
                id="schedule-end-time"
                label="End Time"
                value={formData.endTime}
                onChange={(value) => setFormData({ ...formData, endTime: value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Repeat</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-white">Repeat weekly</p>
                  <p className="text-[10px] text-gray-500">
                    {formData.repeatWeekly ? 'Applies every week' : 'One-time for this week only'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={formData.repeatWeekly}
                  onClick={() => setFormData({ ...formData, repeatWeekly: !formData.repeatWeekly })}
                  className={`w-11 h-6 rounded-full border transition-colors ${
                    formData.repeatWeekly ? 'bg-sky-600 border-sky-500' : 'bg-white/10 border-white/20'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                      formData.repeatWeekly ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Room</label>
            <input type="text" value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none" placeholder="e.g., Room 101" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex gap-2">
              {SCHEDULE_COLORS.map((color, index) => (
                <button key={index} type="button" onClick={() => setFormData({ ...formData, colorIndex: index })}
                  className={`w-8 h-8 rounded-full ${color.indicator} ${formData.colorIndex === index ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1e1e]' : 'opacity-50 hover:opacity-100'} transition-all`} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500 font-medium shadow-lg shadow-sky-600/20 transition-colors">Save</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

// --- GRADES VIEW COMPONENT ---
const MainDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(INITIAL_TEACHER_PROFILE);
  const [profileUserId, setProfileUserId] = useState('');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => getTodayKey());
  const [searchQuery, setSearchQuery] = useState('');
  const [studentAddTrigger, setStudentAddTrigger] = useState(0);
  const [scheduleAddTrigger, setScheduleAddTrigger] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef(null);
  const notificationsPopoverRef = useRef(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [lastReadAt, setLastReadAt] = useState(null);

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0] || null;

  const handleQuickAction = (action) => {
    if (action === 'attendance') {
      setAttendanceDate(getTodayKey());
      setActiveTab('attendance');
      return;
    }
    if (action === 'grades') {
      setActiveTab('grades');
      return;
    }
    if (action === 'add-student') {
      setActiveTab('students');
      setStudentAddTrigger(prev => prev + 1);
      return;
    }
    if (action === 'schedule') {
      setActiveTab('schedule');
      setScheduleAddTrigger(prev => prev + 1);
    }
  };

  const loadNotifications = () => {
    if (typeof window === 'undefined') return [];
    const todayKey = getTodayKey();
    const storedDate = window.localStorage.getItem(NOTIFICATION_DATE_KEY);
    if (storedDate !== todayKey) {
      const now = new Date();
      window.localStorage.setItem(NOTIFICATION_DATE_KEY, todayKey);
      window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]));
      window.localStorage.setItem(NOTIFICATION_READ_KEY, now.toISOString());
      return [];
    }
    try {
      const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistNotifications = (items) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NOTIFICATION_DATE_KEY, getTodayKey());
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items));
  };

  const loadLastReadAt = () => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(NOTIFICATION_READ_KEY);
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const persistLastReadAt = (value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NOTIFICATION_READ_KEY, value.toISOString());
  };

  const markNotificationsRead = () => {
    const now = new Date();
    setLastReadAt(now);
    persistLastReadAt(now);
  };

  const addNotification = (message, type = 'info') => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      type,
      time: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const next = [entry, ...prev].slice(0, MAX_NOTIFICATIONS);
      persistNotifications(next);
      return next;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    persistNotifications([]);
    markNotificationsRead();
  };

  const {
    refreshStudents,
    addStudent,
    importStudents,
    editStudent,
    deleteStudent,
    deleteStudentsBatch,
    updateGrades,
    importGrades,
  } = useStudents({
    students,
    setStudents,
    classes,
    activeClass,
    addNotification,
    setDataError,
  });

  const {
    attendanceRecords,
    todayAttendanceRecords,
    isAttendanceLoading,
    updateStudentStatus,
  } = useAttendance({
    attendanceDate,
    activeClassId,
    students,
    addNotification,
    setDataError,
  });

  const addClass = async (payload) => {
    if (!supabase) {
      const message = 'Supabase is not configured.';
      setDataError(message);
      return { ok: false, message };
    }
    const name = String(payload?.name || '').trim();
    const subtitle = String(payload?.subtitle || '').trim();
    const type = payload?.type === 'homeroom' ? 'homeroom' : 'subject';
    if (!name || !subtitle) {
      return { ok: false, message: 'Please complete all fields.' };
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        subtitle,
        type,
        assessment_types: DEFAULT_ASSESSMENTS,
      })
      .select()
      .single();

    if (error) {
      const message = error.message || 'Failed to add class.';
      setDataError(message);
      return { ok: false, message };
    }

    const newClass = mapClassRow(data);
    setClasses(prev => [...prev, newClass]);
    setActiveClassId(newClass.id);
    addNotification(`Class added: ${name}`, 'class');
    return { ok: true, data: newClass };
  };

  const deleteClass = async (classId, password) => {
    if (!supabase) {
      const message = 'Supabase is not configured.';
      setDataError(message);
      return { ok: false, message };
    }
    if (!classId) {
      return { ok: false, message: 'Class not found.' };
    }
    if (!password) {
      return { ok: false, message: 'Password is required.' };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (userError || !email) {
      const message = 'User session not found.';
      setDataError(message);
      return { ok: false, message };
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      return { ok: false, message: 'Incorrect password.' };
    }

    const cleanupResults = await Promise.all([
      supabase.from('attendance_records').delete().eq('class_id', classId),
      supabase.from('schedules').delete().eq('class_id', classId),
      supabase.from('students').delete().eq('class_id', classId),
    ]);
    const cleanupError = cleanupResults.find(result => result.error)?.error;
    if (cleanupError) {
      const message = cleanupError.message || 'Failed to delete class data.';
      setDataError(message);
      return { ok: false, message };
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      const message = error.message || 'Failed to delete class.';
      setDataError(message);
      return { ok: false, message };
    }

    const removedClass = classes.find(cls => cls.id === classId);
    const remainingClasses = classes.filter(cls => cls.id !== classId);
    setClasses(remainingClasses);
    setStudents(prev => prev.filter(student => !isSameClassId(student.classId, classId)));
    setSchedules(prev => prev.filter(schedule => !isSameClassId(schedule.classId, classId)));
    if (activeClassId === classId) {
      setActiveClassId(remainingClasses[0]?.id ?? null);
    }
    if (removedClass) {
      addNotification(`Class deleted: ${removedClass.name}`, 'class');
    }
    return { ok: true };
  };

  const updateAssessmentTypes = async (classId, types) => {
    if (!supabase) {
      const message = 'Supabase is not configured.';
      setDataError(message);
      return { ok: false, message };
    }
    if (!classId) {
      return { ok: false, message: 'Class not found.' };
    }

    const normalized = normalizeAssessmentTypes(types);
    const { error } = await supabase
      .from('classes')
      .update({ assessment_types: normalized })
      .eq('id', classId);

    if (error) {
      const message = error.message || 'Failed to update assessment types.';
      setDataError(message);
      return { ok: false, message };
    }

    setClasses(prev => prev.map(cls => (
      cls.id === classId
        ? { ...cls, assessmentTypes: normalized }
        : cls
    )));
    setStudents(prev => prev.map(student => {
      if (!isSameClassId(student.classId, classId)) return student;
      const nextGrades = { ...(student.grades || {}) };
      normalized.forEach((type) => {
        if (nextGrades[type] === undefined) {
          nextGrades[type] = 0;
        }
      });
      return { ...student, grades: nextGrades };
    }));
    addNotification('Assessment types updated.', 'grade');
    return { ok: true };
  };

  const handleUpdateProfile = async (updatedProfile, avatarFile) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
    }
    if (!profileUserId) {
      setDataError('User session not found.');
      return { ok: false, message: 'User session not found.' };
    }

    let avatarUrl = teacherProfile.avatarUrl || '';
    if (avatarFile) {
      try {
        const resizedBlob = await resizeImageToBlob(avatarFile, 256);
        const filePath = `${profileUserId}.png`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, resizedBlob, { upsert: true, contentType: 'image/png', cacheControl: '3600' });
        if (uploadError) {
          setDataError('Failed to upload profile photo.');
          return { ok: false, message: uploadError.message || 'Failed to upload profile photo.' };
        }
        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicData.publicUrl;
      } catch (error) {
        setDataError('Failed to process profile photo.');
        return { ok: false, message: 'Failed to process profile photo.' };
      }
    }

    const payload = {
      user_id: profileUserId,
      full_name: updatedProfile.name,
      employee_id: updatedProfile.nip,
      subject: updatedProfile.subject,
      email: updatedProfile.email,
      phone: updatedProfile.phone,
      address: updatedProfile.address,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('teacher_profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      setDataError('Failed to save profile.');
      return { ok: false, message: error.message || 'Failed to save profile.' };
    }

    setTeacherProfile({ ...updatedProfile, avatarUrl });
    return { ok: true };
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!supabase) {
        if (isMounted) {
          setDataError('Supabase is not configured.');
          setIsLoadingData(false);
        }
        return;
      }

      setIsLoadingData(true);
      setDataError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        if (isMounted) {
          setDataError('Please sign in again.');
          setIsLoadingData(false);
        }
        await onLogout?.();
        return;
      }

      const userId = userData.user.id;
      setProfileUserId(userId);

      const [classResponse, studentResponse, scheduleResponse, profileResponse] = await Promise.all([
        supabase.from('classes').select('*').order('created_at', { ascending: true }),
        supabase.from('students').select('*').order('created_at', { ascending: true }),
        supabase.from('schedules').select('*').order('created_at', { ascending: true }),
        supabase.from('teacher_profiles').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (!isMounted) return;

      if (classResponse.error || studentResponse.error || scheduleResponse.error || profileResponse.error) {
        setDataError('Failed to load data from the server.');
        setIsLoadingData(false);
        return;
      }

      const classList = (classResponse.data || []).map(mapClassRow);
      const studentList = (studentResponse.data || []).map(mapStudentRow);
      const classMap = new Map(classList.map(item => [item.id, item]));
      const scheduleList = (scheduleResponse.data || []).map((row) => {
        const schedule = mapScheduleRow(row);
        const classInfo = classMap.get(schedule.classId);
        return {
          ...schedule,
          className: classInfo?.name || '',
          subject: schedule.subject || classInfo?.subtitle || '',
        };
      });

      const profileData = profileResponse.data;
      const fallbackName = profileData?.full_name || INITIAL_TEACHER_PROFILE.name;
      const profileSnapshot = {
        name: fallbackName,
        nip: profileData?.employee_id || INITIAL_TEACHER_PROFILE.nip,
        email: profileData?.email || userData.user.email || INITIAL_TEACHER_PROFILE.email,
        phone: profileData?.phone || '',
        address: profileData?.address || '',
        subject: profileData?.subject || INITIAL_TEACHER_PROFILE.subject,
        avatar: buildAvatar(fallbackName),
        avatarUrl: profileData?.avatar_url || '',
      };

      setClasses(classList);
      setStudents(studentList);
      setSchedules(scheduleList);
      setTeacherProfile(profileSnapshot);
      setActiveClassId((prev) => (
        prev && classList.some((item) => item.id === prev)
          ? prev
          : (classList[0]?.id ?? null)
      ));
      setIsLoadingData(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setNotifications(loadNotifications());
    setLastReadAt(loadLastReadAt());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const interval = setInterval(() => {
      const todayKey = getTodayKey();
      const storedDate = window.localStorage.getItem(NOTIFICATION_DATE_KEY);
      if (storedDate !== todayKey) {
        const now = new Date();
        window.localStorage.setItem(NOTIFICATION_DATE_KEY, todayKey);
        window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]));
        window.localStorage.setItem(NOTIFICATION_READ_KEY, now.toISOString());
        setNotifications([]);
        setLastReadAt(now);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      const buttonEl = notificationsButtonRef.current;
      const popoverEl = notificationsPopoverRef.current;
      if (buttonEl?.contains(event.target)) return;
      if (popoverEl?.contains(event.target)) return;
      setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const updateAnchor = () => {
      if (!notificationsButtonRef.current) return;
      const rect = notificationsButtonRef.current.getBoundingClientRect();
      const right = Math.max(12, window.innerWidth - rect.right);
      const top = rect.bottom + 8;
      setNotificationsAnchor({ top, right });
    };
    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
    };
  }, [isNotificationsOpen]);

  const unreadCount = useMemo(() => {
    if (!notifications.length) return 0;
    if (!lastReadAt) return notifications.length;
    const lastReadTime = lastReadAt.getTime();
    if (Number.isNaN(lastReadTime)) return notifications.length;
    return notifications.filter((item) => {
      const time = new Date(item.time).getTime();
      if (Number.isNaN(time)) return false;
      return time > lastReadTime;
    }).length;
  }, [notifications, lastReadAt]);



  // Schedule state
  const [schedules, setSchedules] = useState([]);

  const addSchedule = async (data) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }
    const classInfo = classes.find(cls => cls.id === data.classId);
    if (!classInfo) {
      setDataError('Please select a class.');
      return;
    }

    const payload = {
      day: data.day,
      date: data.repeatWeekly ? null : (data.date || null),
      start_time: data.startTime,
      end_time: data.endTime,
      class_id: data.classId,
      room: data.room?.trim() || null,
      subject: classInfo.subtitle || data.subject || null,
      color_index: data.colorIndex ?? 0,
      repeat_weekly: data.repeatWeekly,
    };

    const { data: inserted, error } = await supabase
      .from('schedules')
      .insert(payload)
      .select()
      .single();

    if (error) {
      setDataError('Failed to add schedule.');
      return;
    }

    const schedule = mapScheduleRow(inserted);
    setSchedules(prev => [
      ...prev,
      {
        ...schedule,
        className: classInfo.name,
        subject: schedule.subject || classInfo.subtitle || '',
      },
    ]);
    addNotification(`Schedule added: ${classInfo.name} ${data.day} ${data.startTime}-${data.endTime}`, 'schedule');
  };

  const editSchedule = async (data) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }
    const classInfo = classes.find(cls => cls.id === data.classId);
    if (!classInfo) {
      setDataError('Please select a class.');
      return;
    }

    const payload = {
      day: data.day,
      date: data.repeatWeekly ? null : (data.date || null),
      start_time: data.startTime,
      end_time: data.endTime,
      class_id: data.classId,
      room: data.room?.trim() || null,
      subject: classInfo.subtitle || data.subject || null,
      color_index: data.colorIndex ?? 0,
      repeat_weekly: data.repeatWeekly,
    };

    const { data: updated, error } = await supabase
      .from('schedules')
      .update(payload)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      setDataError('Failed to update schedule.');
      return;
    }

    const schedule = mapScheduleRow(updated);
    setSchedules(prev => prev.map(item => (
      item.id === schedule.id
        ? {
          ...schedule,
          className: classInfo.name,
          subject: schedule.subject || classInfo.subtitle || '',
        }
        : item
    )));
    addNotification(`Schedule updated: ${classInfo.name} ${data.day} ${data.startTime}-${data.endTime}`, 'schedule');
  };

  const deleteSchedule = async (id) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      setDataError('Failed to delete schedule.');
      return;
    }

    const removed = schedules.find(schedule => schedule.id === id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (removed) {
      addNotification(`Schedule deleted: ${removed.className || 'Class'} ${removed.day} ${removed.startTime}-${removed.endTime}`, 'schedule');
    }
  };

  const navItems = [
    { id: 'dashboard', icon: SquaresFour, label: 'Dashboard' },
    { id: 'schedule', icon: CalendarBlank, label: 'Schedule' },
    { id: 'attendance', icon: UserCheck, label: 'Attendance' },
    { id: 'students', icon: Student, label: 'Students' }, 
    { id: 'grades', icon: PhBookOpen, label: 'Grades' },
  ];

  const notificationsPopover = isNotificationsOpen && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={notificationsPopoverRef}
        className="fixed z-[999] w-72 max-w-[80vw] macos-glass-panel rounded-xl border border-white/10 shadow-2xl overflow-hidden"
        style={{
          top: notificationsAnchor?.top ?? 64,
          right: notificationsAnchor?.right ?? 16,
        }}
      >
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
          <span className="text-xs font-semibold text-gray-200">Notifications</span>
          <button
            type="button"
            onClick={clearNotifications}
            className="text-[10px] text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
        <div className="max-h-72 overflow-auto">
          {notifications.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-400">No notifications today.</div>
          )}
          {notifications.map((item) => (
            <div key={item.id} className="px-3 py-2 border-b border-white/5 last:border-b-0">
              <p className="text-xs text-gray-200">{item.message}</p>
              <span className="text-[10px] text-gray-500">{formatNotificationTime(item.time)}</span>
            </div>
          ))}
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full max-w-6xl h-[80dvh] md:h-[78vh] rounded-2xl shadow-2xl flex overflow-hidden border border-white/20 relative animate-in zoom-in-95 duration-300 z-10 backdrop-blur-sm">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          classes={classes}
          activeClassId={activeClassId}
          setActiveClassId={setActiveClassId}
          onAddClass={addClass}
          onDeleteClass={deleteClass}
          onEditProfile={() => setIsEditProfileOpen(true)}
          onLogout={onLogout}
          isLoadingData={isLoadingData}
          teacherProfile={teacherProfile}
        />

        {/* Edit Profile Modal */}
        <EditProfileModal 
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          profile={teacherProfile}
          onSave={handleUpdateProfile}
        />

        <main className="flex-1 macos-content flex flex-col min-w-0 relative z-10">
          <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu size={16} />
              </button>
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-white">{navItems.find(n => n.id === activeTab)?.label}</h1>
                <span className="text-[10px] text-gray-400">
                  {activeClass ? `${activeClass.name} - ${activeClass.subtitle}` : 'No classes yet'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/20 border border-transparent focus:border-sky-500/50 hover:bg-black/30 text-white text-xs rounded-md pl-9 pr-3 py-1.5 w-32 sm:w-40 md:w-48 transition-all outline-none"
                />
              </div>
              <div className="relative">
                <button
                  ref={notificationsButtonRef}
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((prev) => {
                      const next = !prev;
                      if (next) {
                        markNotificationsRead();
                      }
                      return next;
                    });
                  }}
                  className="p-1.5 rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
            {isLoadingData && (
              <div className="absolute inset-6 flex items-center justify-center z-10">
                <div className="macos-loading-panel rounded-2xl px-6 py-4 flex items-center gap-3 text-gray-100 text-sm">
                  <span className="macos-spinner" />
                  Loading data...
                </div>
              </div>
            )}

            {!isLoadingData && dataError && (
              <div className="macos-glass-panel rounded-xl p-6 text-sm text-red-300">
                {dataError}
              </div>
            )}

            {!isLoadingData && !dataError && !activeClass && (
              <div className="macos-glass-panel rounded-xl p-6 text-sm text-gray-400">
                No classes yet. Please add a class first.
              </div>
            )}

            {!isLoadingData && !dataError && activeClass && (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    students={students}
                    activeClass={activeClass}
                    attendanceRecords={todayAttendanceRecords}
                    schedules={schedules}
                    notifications={notifications}
                    onQuickAction={handleQuickAction}
                  />
                )}
                {activeTab === 'schedule' && (
                  <ScheduleView 
                    schedules={schedules} 
                    classes={classes} 
                    onAddSchedule={addSchedule}
                    onEditSchedule={editSchedule}
                    onDeleteSchedule={deleteSchedule}
                    searchQuery={searchQuery}
                    addTrigger={scheduleAddTrigger}
                  />
                )}
                {activeTab === 'attendance' && (
                  <AttendanceView
                    students={students}
                    activeClass={activeClass}
                    attendanceDate={attendanceDate}
                    onAttendanceDateChange={setAttendanceDate}
                    attendanceRecords={attendanceRecords}
                    onUpdateStatus={updateStudentStatus}
                    isHistoryLoading={isAttendanceLoading}
                    searchQuery={searchQuery}
                  />
                )}
                {activeTab === 'students' && (
                  <StudentsDataView 
                    students={students} 
                    activeClass={activeClass} 
                    onAddStudent={addStudent}
                    onDeleteStudent={deleteStudent}
                    onEditStudent={editStudent}
                    onImportStudents={importStudents}
                    onRefreshStudents={refreshStudents}
                    onDeleteStudentsBatch={deleteStudentsBatch}
                    searchQuery={searchQuery}
                    addTrigger={studentAddTrigger}
                  />
                )}
                {activeTab === 'grades' && (
                  <GradesView 
                    students={students} 
                    activeClass={activeClass} 
                    onUpdateGrades={updateGrades}
                    onUpdateAssessmentTypes={updateAssessmentTypes}
                    searchQuery={searchQuery}
                    onImportGrades={importGrades}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <DockNav
        className="pb-4"
        navItems={navItems}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
      />
      {notificationsPopover}
    </div>
  );
};

// --- MAIN APP ENTRY ---

// Set to true for development/demo mode (bypass login)
const DEV_MODE = false;

const App = () => {
  // Allow direct access only for explicit DEV_MODE
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_MODE);
  const [authReady, setAuthReady] = useState(DEV_MODE);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (DEV_MODE) {
      setAuthReady(true);
      setIsAuthenticated(true); // Auto-login for testing/demo mode
      return;
    }

    if (!supabase) {
      setAuthReady(true);
      setIsAuthenticated(false);
      return;
    }

    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setIsAuthenticated(!!data.session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setIsAuthenticated(!!session);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || isAuthenticated || !showIntro) return;
    const timer = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [authReady, isAuthenticated, showIntro]);

  useEffect(() => {
    if (isAuthenticated && showIntro) {
      setShowIntro(false);
    }
  }, [isAuthenticated, showIntro]);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = async () => {
    setIsAuthenticated(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-[100dvh] macos-wallpaper dark flex items-center justify-center p-3 md:p-8 overflow-hidden font-sans relative">
                <ParticleBackground />
        <div className="macos-glass-panel px-6 py-5 rounded-2xl flex items-center gap-3 text-gray-300 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Preparing session...
        </div>
      </div>
    );
  }

  const introActive = !isAuthenticated && showIntro;

  return (
    <div className="min-h-[100dvh] macos-wallpaper dark flex items-center justify-center p-3 md:p-8 overflow-hidden font-sans relative">
            <ParticleBackground />

      <AnimatePresence>
        {introActive && (
          <IntroScreen onFinish={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={false}
        animate={
          introActive
            ? { opacity: 0, scale: 0.98, filter: 'blur(12px)' }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          {isAuthenticated ? (
            <motion.div
              key="dashboard"
              className="w-full h-full flex items-center justify-center"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <MainDashboard onLogout={handleLogout} />
            </motion.div>
          ) : (
            <motion.div
              key="login"
              className="w-full h-full flex items-center justify-center"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <LoginScreen onLogin={handleLogin} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default App;
