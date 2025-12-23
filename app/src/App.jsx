import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DatePicker, TimeInput } from '@nextui-org/react';
import { Time, parseDate } from '@internationalized/date';
import * as XLSX from 'xlsx';
import attendifyLogo from './assets/attendify-logo.png';
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

/* --- CSS STYLES FOR MACOS AESTHETIC --- */
const styleTag = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  /* MacOS Wallpaper Background */
  .macos-wallpaper {
    background: url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2832&auto=format&fit=crop') no-repeat center center fixed; 
    background-size: cover;
  }

  /* Vibrancy Effect */
  .macos-sidebar {
    background: rgba(40, 40, 40, 0.75);
    backdrop-filter: blur(25px) saturate(180%);
    -webkit-backdrop-filter: blur(25px) saturate(180%);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 768px) {
    .macos-sidebar.mobile-panel {
      background: rgba(32, 32, 40, 0.6);
      backdrop-filter: blur(22px) saturate(160%);
      -webkit-backdrop-filter: blur(22px) saturate(160%);
    }
  }

  .macos-content {
    background: rgba(30, 30, 30, 0.6);
  }

  .macos-glass-panel {
    background: rgba(30, 30, 30, 0.7);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .macos-input {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
  }
  
  .macos-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .macos-input:focus {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(0, 122, 255, 0.6);
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.25);
  }

  .macos-select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
  }

  .macos-select:focus {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(0, 122, 255, 0.6);
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.25);
  }

  .macos-select:invalid {
    color: rgba(255, 255, 255, 0.55);
  }

  .macos-select option {
    background-color: #141414;
    color: #f1f5f9;
  }

  .auth-icon svg,
  .auth-icon svg * {
    color: #ffffff !important;
    fill: #ffffff !important;
    stroke: #ffffff !important;
    opacity: 1 !important;
    filter: none !important;
  }

  .macos-loading-panel {
    background: rgba(20, 20, 28, 0.6);
    backdrop-filter: blur(16px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
  }

  .macos-spinner {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: rgba(255, 255, 255, 0.85);
    animation: macosSpin 0.8s linear infinite;
  }

  .macos-spinner-sm {
    width: 18px;
    height: 18px;
    border-width: 2px;
  }

  .macos-tooltip {
    background: rgba(18, 18, 24, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  }

  @keyframes macosSpin {
    to { transform: rotate(360deg); }
  }

  /* Navigation & Interactive Elements */
  .nav-item-active {
    background: rgba(0, 122, 255, 1);
    color: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  .nav-item-inactive:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
  ::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.4); }

  /* Table */
  .macos-table-row:nth-child(even) { background-color: rgba(255, 255, 255, 0.03); }
  .macos-table-row:hover { background-color: rgba(0, 122, 255, 0.15) !important; }

  /* Animations */
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
  
  .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .schedule-scroll {
    scrollbar-gutter: stable both-edges;
  }

  .schedule-grid {
    --schedule-time-width: 72px;
    --schedule-row-height: 40px;
  }

  .schedule-grid-header,
  .schedule-grid-body {
    display: grid;
    grid-template-columns: var(--schedule-time-width) repeat(6, minmax(0, 1fr));
  }

  .schedule-grid-header {
    background: linear-gradient(
      180deg,
      rgba(26, 28, 40, 0.52) 0%,
      rgba(26, 28, 40, 0.32) 100%
    );
    backdrop-filter: blur(14px) saturate(130%);
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    border-left: 1px solid rgba(255, 255, 255, 0.06);
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.2);
  }

  .schedule-grid-header::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }

  .schedule-time-row,
  .schedule-grid-row {
    height: var(--schedule-row-height);
  }
`;

const SCHOOL_EMAIL_REGEX = /@(?:.+\.sch\.id|uphcollege\.com)$/i;
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
const AUTH_ERROR_MESSAGE = 'Email atau password yang dimasukkan salah.';
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
  { label: 'Present', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { label: 'Late', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { label: 'Sick', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { label: 'Excused', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
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

const parseTimeString = (value) => {
  if (!value || !value.includes(':')) return new Time(0, 0);
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  return new Time(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0);
};

const formatTimeString = (time) => {
  if (!time || typeof time.hour !== 'number' || typeof time.minute !== 'number') {
    return '00:00';
  }
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

const parseDateString = (value) => {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

const formatDateString = (dateValue) => {
  if (!dateValue) return '';
  return dateValue.toString();
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
  { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', indicator: 'bg-blue-500' },
  { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', indicator: 'bg-green-500' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400', indicator: 'bg-purple-500' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', indicator: 'bg-orange-500' },
  { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-400', indicator: 'bg-pink-500' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400', indicator: 'bg-cyan-500' },
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

// --- PARTICLE BACKGROUND COMPONENT ---
const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        this.opacity = Math.random() * 0.5 + 0.1;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;
      }
      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 80; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
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
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/35 blur-3xl"
          style={{ x: smoothX, y: smoothY }}
        />
        <motion.div
          className="absolute bottom-[-6rem] right-[-4rem] w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl"
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
            src={attendifyLogo}
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
          className="mt-2 text-sm text-blue-100/70"
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
              className="h-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500"
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const normalizedEmail = credentials.email.trim().toLowerCase();

    if (!supabase) {
      setError(AUTH_ERROR_MESSAGE);
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-sm"></div>

        <div className="flex flex-col items-center mb-8">
          <img
            src={attendifyLogo}
            alt="Attendify logo"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg mb-3 sm:mb-4 transform transition-transform group-hover:scale-105 duration-300"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Attendify</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Class Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 ml-1 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <span className="auth-icon absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <EnvelopeSimple
                  size={16}
                  weight="bold"
                  style={{ color: '#ffffff', opacity: 1, filter: 'none' }}
                />
              </span>
              <input 
                type="email"
                className="relative z-0 w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl text-sm text-white placeholder-gray-500 macos-input outline-none focus:ring-1 focus:ring-blue-500/50"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 ml-1 uppercase tracking-wide">Password</label>
            <div className="relative">
              <span className="auth-icon absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <LockKey
                  size={16}
                  weight="bold"
                  style={{ color: '#ffffff', opacity: 1, filter: 'none' }}
                />
              </span>
              <input 
                type={showPassword ? "text" : "password"}
                className="relative z-0 w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl text-sm text-white placeholder-gray-500 macos-input outline-none focus:ring-1 focus:ring-blue-500/50"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
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
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-5 sm:mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 sm:py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Enter Dashboard <ArrowRight size={16} />
              </>
            )}
          </button>
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 shadow-lg flex items-center justify-center text-2xl font-bold text-white">
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all resize-none"
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
            className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
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

const DashboardView = ({ students, activeClass, attendanceRecords }) => {
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

  // Get top performing students
  const topStudents = [...classStudents]
    .map((student) => {
      const info = getGradesAverageInfo(student.grades, assessmentTypes, student.zeroExclusions);
      return { ...student, avg: info.avg, hasScores: info.hasScores };
    })
    .filter((student) => student.hasScores)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  // Get recent activity (simulated)
  const recentActivities = [
    { id: 1, action: 'Attendance completed', time: '07:45', icon: Users, color: 'text-green-400' },
    { id: 2, action: 'Quiz 1 grades entered', time: '09:30', icon: BookOpen, color: 'text-blue-400' },
    { id: 3, action: 'New student added', time: 'Yesterday', icon: Plus, color: 'text-purple-400' },
  ];

  // Get schedule (simulated)
  const todaySchedule = [
    { id: 1, time: '07:00 - 08:30', class: 'Grade 10 Science 1', subject: 'Homeroom' },
    { id: 2, time: '08:30 - 10:00', class: 'Grade 11 Social 2', subject: 'Basic Physics' },
    { id: 3, time: '10:15 - 11:45', class: 'Grade 12 Science 3', subject: 'Advanced Physics' },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Users size={18} /></div>
            <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Today</span>
          </div>
          <h3 className="text-2xl font-semibold text-white">{attendanceRate}%</h3>
          <p className="text-xs text-gray-400 mt-1">Attendance: {activeClass.name}</p>
        </div>

        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><BookOpen size={18} /></div>
          </div>
          <h3 className="text-2xl font-semibold text-white">{classAvg}</h3>
          <p className="text-xs text-gray-400 mt-1">Average Score</p>
        </div>

        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Users size={18} /></div>
          </div>
          <h3 className="text-2xl font-semibold text-white">{classStudents.length}</h3>
          <p className="text-xs text-gray-400 mt-1">Total Students</p>
        </div>

        <div className="macos-glass-panel rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
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
              <Calendar size={16} className="text-blue-400" />
              Today's Attendance Summary
            </h3>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{presentCount}</div>
              <div className="text-[10px] text-green-400/80 uppercase font-medium mt-1">Present</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{lateCount}</div>
              <div className="text-[10px] text-yellow-400/80 uppercase font-medium mt-1">Late</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{sickCount}</div>
              <div className="text-[10px] text-blue-400/80 uppercase font-medium mt-1">Sick</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{permitCount}</div>
              <div className="text-[10px] text-purple-400/80 uppercase font-medium mt-1">Excused</div>
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
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${classStudents.length ? ((presentCount + lateCount) / classStudents.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-orange-400" />
            Schedule Today
          </h3>
          <div className="space-y-3">
            {todaySchedule.map((item, index) => (
              <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg ${index === 0 ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5'}`}>
                <div className={`w-1 h-10 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{item.time}</p>
                  <p className="text-sm text-white font-medium truncate">{item.class}</p>
                  <p className="text-[10px] text-gray-500">{item.subject}</p>
                </div>
                {index === 0 && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">Now</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Students */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-yellow-400" />
            Top Students
          </h3>
          <div className="space-y-3">
            {topStudents.length > 0 ? topStudents.map((student, index) => (
              <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300' :
                  'bg-orange-500/20 text-orange-400'
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
            <Bell size={16} className="text-purple-400" />
            Recent Activity
          </h3>
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
        </div>

        {/* Quick Actions */}
        <div className="macos-glass-panel rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <LayoutGrid size={16} className="text-green-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors group">
              <Users size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Attendance</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors group">
              <BookOpen size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Enter Grades</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors group">
              <Plus size={20} className="text-green-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Add Student</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors group">
              <Calendar size={20} className="text-orange-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300">Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendanceDatePicker = ({ value, onChange }) => {
  const dateValue = useMemo(() => parseDateString(value), [value]);

  return (
    <DatePicker
      aria-label="Attendance date"
      value={dateValue}
      onChange={(nextValue) => {
        const formatted = formatDateString(nextValue);
        if (formatted) {
          onChange(formatted);
        }
      }}
      classNames={{
        base: 'w-[150px] min-w-[140px]',
        inputWrapper: '!bg-black/30 !border-white/20 rounded-lg px-3 py-1.5 text-white shadow-none transition-all focus-within:!border-blue-500 hover:!bg-black/40 data-[hover=true]:!bg-black/40',
        innerWrapper: 'gap-1',
        input: 'text-xs text-white',
        segment: 'text-xs text-white data-[focus=true]:bg-white/10 rounded-sm',
        separator: 'text-xs text-white',
        selectorButton: 'text-gray-400 hover:text-white',
      }}
      popoverProps={{
        placement: 'bottom-end',
        offset: 8,
        shouldFlip: true,
        classNames: {
          content: 'bg-[#1b1b1b] text-white border border-white/10 shadow-2xl w-[260px] max-w-[85vw] overflow-hidden',
        },
      }}
      calendarProps={{
        classNames: {
          base: 'bg-[#1b1b1b] text-white w-[260px]',
          headerWrapper: 'bg-[#1b1b1b] text-white border-b border-white/10',
          header: 'text-white',
          title: 'text-gray-200',
          nextButton: 'text-gray-400 hover:text-white',
          prevButton: 'text-gray-400 hover:text-white',
          gridWrapper: 'bg-[#1b1b1b]',
          grid: 'bg-[#1b1b1b]',
          gridHeader: 'bg-[#1b1b1b] text-gray-400',
          gridHeaderRow: 'text-gray-400',
          gridHeaderCell: 'text-gray-400',
          gridBody: 'bg-[#1b1b1b]',
          gridBodyRow: 'text-gray-200',
          cell: 'text-gray-200',
          cellButton: 'text-gray-200 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white data-[hover=true]:bg-white/10 data-[outside-month=true]:text-gray-600 data-[disabled=true]:text-gray-600 data-[today=true]:ring-1 data-[today=true]:ring-blue-500',
        },
      }}
    />
  );
};

const AttendanceRangeDateInput = ({ label, value, onChange }) => {
  const dateValue = useMemo(() => parseDateString(value), [value]);

  return (
    <DatePicker
      label={label}
      labelPlacement="outside"
      value={dateValue}
      onChange={(nextValue) => onChange(formatDateString(nextValue))}
      classNames={{
        base: 'w-full',
        label: 'text-xs text-gray-400 mb-1',
        inputWrapper: '!bg-black/30 !border-white/20 rounded-lg px-3 py-2 text-white shadow-none transition-all focus-within:!border-blue-500 hover:!bg-black/40 data-[hover=true]:!bg-black/40',
        innerWrapper: 'gap-1',
        input: 'text-sm text-white',
        segment: 'text-sm text-white data-[focus=true]:bg-white/10 rounded-sm',
        separator: 'text-sm text-white',
        selectorButton: 'text-gray-400 hover:text-white',
      }}
      popoverProps={{
        placement: 'bottom-end',
        offset: 8,
        shouldFlip: true,
        classNames: {
          content: 'bg-[#1b1b1b] text-white border border-white/10 shadow-2xl w-[260px] max-w-[85vw] overflow-hidden',
        },
      }}
      calendarProps={{
        classNames: {
          base: 'bg-[#1b1b1b] text-white w-[260px]',
          headerWrapper: 'bg-[#1b1b1b] text-white border-b border-white/10',
          header: 'text-white',
          title: 'text-gray-200',
          nextButton: 'text-gray-400 hover:text-white',
          prevButton: 'text-gray-400 hover:text-white',
          gridWrapper: 'bg-[#1b1b1b]',
          grid: 'bg-[#1b1b1b]',
          gridHeader: 'bg-[#1b1b1b] text-gray-400',
          gridHeaderRow: 'text-gray-400',
          gridHeaderCell: 'text-gray-400',
          gridBody: 'bg-[#1b1b1b]',
          gridBodyRow: 'text-gray-200',
          cell: 'text-gray-200',
          cellButton: 'text-gray-200 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white data-[hover=true]:bg-white/10 data-[outside-month=true]:text-gray-600 data-[disabled=true]:text-gray-600 data-[today=true]:ring-1 data-[today=true]:ring-blue-500',
        },
      }}
    />
  );
};

const AttendanceView = ({
  students,
  activeClass,
  attendanceDate,
  onAttendanceDateChange,
  attendanceRecords,
  onUpdateStatus,
  isHistoryLoading,
  searchQuery,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportType, setExportType] = useState('daily');
  const [exportRange, setExportRange] = useState(() => getExportRange('daily', attendanceDate));
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const classStudents = students.filter(s => isSameClassId(s.classId, activeClass.id));
  const normalizedQuery = useMemo(() => normalizeSearchValue(searchQuery), [searchQuery]);
  const filteredStudents = useMemo(() => {
    if (!normalizedQuery) return classStudents;
    return classStudents.filter((student) => {
      const haystack = [
        student.name,
        student.studentNumber,
        student.email,
        student.gender,
      ].map(normalizeSearchValue);
      return haystack.some(value => value.includes(normalizedQuery));
    });
  }, [classStudents, normalizedQuery]);
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    return list;
  }, [filteredStudents]);

  useEffect(() => {
    if (exportType === 'custom') return;
    setExportRange(getExportRange(exportType, attendanceDate));
  }, [exportType, attendanceDate]);

  const handleExport = async () => {
    if (!supabase) {
      setExportError('Supabase is not configured.');
      return;
    }
    if (!activeClass?.id) {
      setExportError('Class not found.');
      return;
    }
    const { start, end } = exportRange;
    const startDate = parseLocalDateKey(start);
    const endDate = parseLocalDateKey(end);
    if (!startDate || !endDate || startDate > endDate) {
      setExportError('Tanggal belum valid.');
      return;
    }
    if (!classStudents.length) {
      setExportError('Tidak ada siswa dalam kelas ini.');
      return;
    }

    setIsExporting(true);
    setExportError('');

    const { data, error } = await supabase
      .from('attendance_records')
      .select('student_id,attendance_date,status,attendance_time')
      .eq('class_id', activeClass.id)
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('attendance_date', { ascending: true });

    if (error) {
      setExportError('Gagal memuat data absensi.');
      setIsExporting(false);
      return;
    }

    const recordMap = new Map();
    (data || []).forEach((record) => {
      recordMap.set(`${record.attendance_date}|${record.student_id}`, record);
    });

    const sortedStudents = [...classStudents].sort((a, b) => {
      const left = String(a.studentNumber || a.id);
      const right = String(b.studentNumber || b.id);
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    });

    const dateList = buildDateRangeList(start, end);
    const rows = [];
    dateList.forEach((dateKey) => {
      const dayLabel = formatDayLabel(dateKey);
      sortedStudents.forEach((student) => {
        const record = recordMap.get(`${dateKey}|${student.id}`);
        rows.push({
          Date: dateKey,
          Day: dayLabel,
          Class: activeClass.name,
          'Student No.': student.studentNumber || String(student.id),
          'Student Name': student.name,
          Status: record?.status || STATUS_EMPTY_OPTION.label,
          Time: record?.attendance_time ? formatAttendanceTime(record.attendance_time) : '',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ['Date', 'Day', 'Class', 'Student No.', 'Student Name', 'Status', 'Time'],
    });
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
      { wch: 12 },
      { wch: 8 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const safeClass = String(activeClass.name || 'class').replace(/[^a-z0-9-_]+/gi, '_');
    const fileName = start === end
      ? `attendance_${safeClass}_${start}.xlsx`
      : `attendance_${safeClass}_${start}_to_${end}.xlsx`;
    XLSX.writeFile(workbook, fileName, { compression: true });

    setIsExporting(false);
    setIsExportOpen(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-slide-in">
      <div className="macos-glass-panel rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex flex-wrap justify-between items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase">Attendance: {activeClass.name}</span>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="px-2.5 py-1.5 rounded-md border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Download size={12} />
              Export
            </button>
            <Calendar size={12} />
            <AttendanceDatePicker value={attendanceDate} onChange={onAttendanceDateChange} />
            {isHistoryLoading && <span className="macos-spinner macos-spinner-sm" />}
          </div>
        </div>
        
        <div className="overflow-auto flex-1 pb-10">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#1e1e1e] z-10 shadow-md">
              <tr className="border-b border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wide">
                <th className="p-4 pl-6 w-16">ID</th>
                <th className="p-4">Student Name</th>
                <th className="p-4 w-48">Status</th>
                <th className="p-4 text-right pr-6">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedStudents.map((student) => {
                const record = attendanceRecords?.[String(student.id)];
                const displayStatus = record?.status || STATUS_EMPTY_OPTION.label;
                const displayTime = record?.attendanceTime || null;
                const currentStatus = STATUS_OPTIONS.find(s => s.label === displayStatus) || STATUS_EMPTY_OPTION;
                return (
                  <tr key={student.id} className="macos-table-row transition-colors cursor-default group">
                    <td className="p-4 pl-6 text-gray-500 text-sm font-mono">#{student.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-600 to-gray-500 flex items-center justify-center text-xs text-white font-medium shadow-sm">
                          {student.avatar}
                        </div>
                        <span className="text-sm text-gray-200 font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === student.id ? null : student.id); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center justify-between gap-2 w-32 transition-all ${currentStatus.color} hover:brightness-110`}
                      >
                        {displayStatus}
                        <ChevronDown size={12} className="opacity-70" />
                      </button>

                      {openDropdown === student.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute top-10 left-4 z-20 w-40 bg-[#252525] border border-white/20 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.label}
                                onClick={() => {
                                  onUpdateStatus(student.id, opt.label, attendanceDate);
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${opt.label === displayStatus ? 'bg-white' : 'bg-transparent'}`} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6 text-sm text-gray-500">
                      {formatAttendanceTime(displayTime)}
                    </td>
                  </tr>
                );
              })}
              {classStudents.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500 text-sm">No students in this class yet.</td>
                </tr>
              )}
              {classStudents.length > 0 && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500 text-sm">No matching students.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Attendance"
        size="lg"
      >
        <div className="space-y-4 text-sm text-gray-200">
          <div>
            <p className="text-xs text-gray-400 mb-2">Pilih periode ekspor</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'daily', label: 'Harian' },
                { id: 'weekly', label: 'Mingguan' },
                { id: 'monthly', label: 'Bulanan' },
                { id: 'custom', label: 'Rentang' },
              ].map((option) => {
                const isActive = exportType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setExportType(option.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      isActive
                        ? 'bg-blue-600/80 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {exportType === 'custom' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AttendanceRangeDateInput
                label="Tanggal mulai"
                value={exportRange.start}
                onChange={(value) => setExportRange(prev => ({ ...prev, start: value }))}
              />
              <AttendanceRangeDateInput
                label="Tanggal selesai"
                value={exportRange.end}
                onChange={(value) => setExportRange(prev => ({ ...prev, end: value }))}
              />
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300">
              Rentang tanggal: <span className="text-white">{exportRange.start}</span> sampai{' '}
              <span className="text-white">{exportRange.end}</span>
            </div>
          )}

          {exportError && (
            <p className="text-xs text-red-400">{exportError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsExportOpen(false)}
              className="px-4 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 font-semibold shadow-lg shadow-blue-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Menyiapkan...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Export .xlsx
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StudentsDataView = ({ students, activeClass, onAddStudent, onDeleteStudent, onEditStudent, onImportStudents, onRefreshStudents, onDeleteStudentsBatch, searchQuery }) => {
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
  const importInputRef = useRef(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    gender: '',
    studentNumber: '',
  });
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
    setFormData({ id: '', name: '', email: '', gender: '', studentNumber: '' });
  };

  const openEdit = (student) => {
    setFormData({
      id: student.id,
      name: student.name,
      email: student.email || '',
      gender: student.gender || '',
      studentNumber: student.studentNumber || '',
    });
    setFormError('');
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setFormData({ id: '', name: '', email: '', gender: '', studentNumber: '' });
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
      setImportError('Pilih file .xlsx terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    setImportError('');
    setImportSummary('');

    try {
      const buffer = await fileToImport.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setImportError('File tidak valid.');
        setIsImporting(false);
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
        header: 1,
      });
      if (!rows.length) {
        setImportError('File kosong.');
        setIsImporting(false);
        return;
      }

      const headerRowIndex = rows.findIndex((row) => (
        Array.isArray(row) && row.some((cell) => String(cell || '').trim())
      ));
      if (headerRowIndex === -1) {
        setImportError('Header tidak ditemukan.');
        setIsImporting(false);
        return;
      }

      const headerRow = rows[headerRowIndex].map((cell) => String(cell || '').trim());
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
        setImportError('Header tidak sesuai. Pastikan kolom: Student Number, Full Name, Email, Gender.');
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
          setImportError('Semua data sudah ada di kelas ini.');
        } else {
          setImportError('Tidak ada data siswa yang valid.');
        }
        setIsImporting(false);
        return;
      }

      if (!onImportStudents) {
        setImportError('Import belum tersedia.');
        setIsImporting(false);
        return;
      }

      const result = await onImportStudents(payload);
      if (result && result.ok === false) {
        const rawMessage = result.message || 'Gagal mengimpor data siswa.';
        const lowered = rawMessage.toLowerCase();
        if (lowered.includes('row-level security')) {
          setImportError('RLS memblokir insert. Aktifkan policy insert untuk table students.');
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
      const skippedInfo = skipped ? ` (${skipped} baris tidak lengkap)` : '';
      const duplicateInfo = duplicates ? ` (${duplicates} data duplikat dilewati)` : '';
      setImportSummary(`Berhasil import ${importedCount} siswa${skippedInfo}${duplicateInfo}.`);
      setIsImporting(false);
    } catch (error) {
      setImportError('Gagal membaca file.');
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
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
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
                    className="h-4 w-4 rounded border border-white/30 bg-black/30 text-blue-500 focus:ring-blue-500/40"
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
                      className="h-4 w-4 rounded border border-white/30 bg-black/30 text-blue-500 focus:ring-blue-500/40"
                      aria-label={`Select ${student.name}`}
                    />
                  </td>
                  <td className="p-3 sm:p-4 text-gray-500 text-sm">{student.studentNumber || '-'}</td>
                  <td className="p-3 sm:p-4 text-gray-200 text-sm font-medium break-words">{student.name}</td>
                  <td className="p-3 sm:p-4 text-gray-300 text-sm break-all">{student.email || '-'}</td>
                  <td className="p-3 sm:p-4 text-gray-300 text-sm hidden sm:table-cell">{student.gender || '-'}</td>
                  <td className="p-3 sm:p-4 text-right pr-4 sm:pr-6 flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(student)} className="p-1.5 rounded-md bg-white/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
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
        onClose={() => setIsModalOpen(false)} 
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
              placeholder="Email address"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Gender</label>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full macos-select rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all"
            >
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Student Number</label>
            <input 
              type="text" 
              required
              value={formData.studentNumber}
              onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
              placeholder="Student number"
            />
          </div>
          {formError && (
            <p className="text-xs text-red-400">{formError}</p>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={formSaving}
              className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-600/20 transition-colors disabled:opacity-70"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
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

const ScheduleTimeInput = ({ label, value, onChange }) => {
  const timeValue = useMemo(() => parseTimeString(value), [value]);

  return (
    <TimeInput
      label={label}
      labelPlacement="outside"
      value={timeValue}
      onChange={(nextValue) => onChange(formatTimeString(nextValue))}
      hourCycle={24}
      granularity="minute"
      classNames={{
        base: 'w-full',
        label: 'text-xs text-gray-400 mb-1',
        inputWrapper: '!bg-black/30 !border-white/20 rounded-lg px-3 py-2 text-white shadow-none transition-all focus-within:!border-blue-500 hover:!bg-black/40 data-[hover=true]:!bg-black/40',
        innerWrapper: 'gap-1',
        input: 'text-sm text-white',
        segment: 'text-sm text-white data-[focus=true]:bg-white/10 rounded-sm',
        separator: 'text-sm text-white',
        selectorButton: 'text-gray-400 hover:text-white',
      }}
    />
  );
};

const ScheduleDateInput = ({ label, value, onChange, minDate }) => {
  const dateValue = useMemo(() => parseDateString(value), [value]);

  const isDateUnavailable = (date) => {
    const jsDate = new Date(date.year, date.month - 1, date.day);
    return jsDate.getDay() === 0;
  };

  return (
    <DatePicker
      label={label}
      labelPlacement="outside"
      value={dateValue}
      onChange={(nextValue) => onChange(formatDateString(nextValue))}
      minValue={minDate || undefined}
      isDateUnavailable={isDateUnavailable}
      classNames={{
        base: 'w-full',
        label: 'text-xs text-gray-400 mb-1',
        inputWrapper: '!bg-black/30 !border-white/20 rounded-lg px-3 py-2 text-white shadow-none transition-all focus-within:!border-blue-500 hover:!bg-black/40 data-[hover=true]:!bg-black/40',
        innerWrapper: 'gap-1',
        input: 'text-sm text-white',
        segment: 'text-sm text-white data-[focus=true]:bg-white/10 rounded-sm',
        separator: 'text-sm text-white',
        selectorButton: 'text-gray-400 hover:text-white',
      }}
      popoverProps={{
        classNames: {
          content: 'bg-[#1b1b1b] text-white border border-white/10 shadow-2xl',
        },
      }}
      calendarProps={{
        classNames: {
          base: 'bg-[#1b1b1b] text-white',
          headerWrapper: 'bg-[#1b1b1b] text-white border-b border-white/10',
          header: 'text-white',
          title: 'text-gray-200',
          nextButton: 'text-gray-400 hover:text-white',
          prevButton: 'text-gray-400 hover:text-white',
          gridWrapper: 'bg-[#1b1b1b]',
          grid: 'bg-[#1b1b1b]',
          gridHeader: 'bg-[#1b1b1b] text-gray-400',
          gridHeaderRow: 'text-gray-400',
          gridHeaderCell: 'text-gray-400',
          gridBody: 'bg-[#1b1b1b]',
          gridBodyRow: 'text-gray-200',
          cell: 'text-gray-200',
          cellButton: 'text-gray-200 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white data-[hover=true]:bg-white/10 data-[outside-month=true]:text-gray-600 data-[disabled=true]:text-gray-600 data-[today=true]:ring-1 data-[today=true]:ring-blue-500',
        },
      }}
    />
  );
};

// --- SCHEDULE VIEW COMPONENT ---
const ScheduleView = ({ schedules, classes, onAddSchedule, onEditSchedule, onDeleteSchedule, searchQuery }) => {
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
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors">
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
        <button onClick={() => openAddModal()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
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
                <div key={day} className={`p-2 text-center border-l border-white/10 ${day === todayStr ? 'bg-blue-500/20' : ''}`}>
                  <p className={`text-xs font-medium ${day === todayStr ? 'text-blue-300' : 'text-gray-400'}`}>{day.substring(0, 3)}</p>
                  <p className={`text-sm font-semibold ${day === todayStr ? 'text-white' : 'text-gray-200'}`}>{dateStr}</p>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="schedule-grid-body" style={{ minHeight: `${gridMinHeight}px` }}>
              {/* Time Labels */}
              <div className="relative">
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="schedule-time-row border-b border-white/5 flex items-start justify-end pr-2">
                    <span className="text-[10px] text-gray-500 -mt-1.5">{time}</span>
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
                  <div key={day} className={`relative border-l border-white/10 ${day === todayStr ? 'bg-blue-500/5' : ''}`}>
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
              <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div>
              <ScheduleTimeInput
                label="Start Time"
                value={formData.startTime}
                onChange={(value) => setFormData({ ...formData, startTime: value })}
              />
            </div>
            <div>
              <ScheduleTimeInput
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
                    formData.repeatWeekly ? 'bg-blue-600 border-blue-500' : 'bg-white/10 border-white/20'
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g., Room 101" />
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
            <button type="submit" className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-600/20 transition-colors">Save</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

// --- GRADES VIEW COMPONENT ---
const GradesView = ({ students, activeClass, onUpdateGrades, onUpdateAssessmentTypes, searchQuery, onImportGrades }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [gradeForm, setGradeForm] = useState({});
  const [attitudeForm, setAttitudeForm] = useState('ME');
  const [zeroExclusionsForm, setZeroExclusionsForm] = useState({});
  const [newAssessment, setNewAssessment] = useState('');
  const [saving, setSaving] = useState(false);
  const [isGradesExpanded, setIsGradesExpanded] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [assessmentToRemove, setAssessmentToRemove] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [zeroNoteOpen, setZeroNoteOpen] = useState(false);
  const [zeroNoteStudent, setZeroNoteStudent] = useState(null);
  const [zeroNoteType, setZeroNoteType] = useState('');
  const [zeroNoteText, setZeroNoteText] = useState('');
  const [zeroNoteError, setZeroNoteError] = useState('');
  const [zeroNoteSaving, setZeroNoteSaving] = useState(false);
  const [hoverNote, setHoverNote] = useState(null);
  const hoverTimerRef = useRef(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef(null);

  const classStudents = students.filter(s => isSameClassId(s.classId, activeClass.id));
  const assessmentTypes = activeClass?.assessmentTypes ?? DEFAULT_ASSESSMENTS;
  const normalizedQuery = useMemo(() => normalizeSearchValue(searchQuery), [searchQuery]);
  const filteredStudents = useMemo(() => {
    if (!normalizedQuery) return classStudents;
    return classStudents.filter((student) => {
      const haystack = [
        student.name,
        student.studentNumber,
        student.email,
        student.gender,
      ].map(normalizeSearchValue);
      return haystack.some(value => value.includes(normalizedQuery));
    });
  }, [classStudents, normalizedQuery]);
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
    return list;
  }, [filteredStudents]);

  const calculateAverage = (grades, zeroExclusions = {}) => (
    calculateGradesAverage(grades, assessmentTypes, zeroExclusions)
  );

  useEffect(() => () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const resetImportState = () => {
    setImportError('');
    setImportSummary('');
    setImportFile(null);
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  const openImport = () => {
    resetImportState();
    setIsImportOpen(true);
  };

  const closeImport = () => {
    if (isImporting) return;
    setIsImportOpen(false);
    resetImportState();
  };

  const triggerImportPicker = () => {
    resetImportState();
    if (importInputRef.current) {
      importInputRef.current.click();
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Full Name', 'Attitude'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 2) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades');
    XLSX.writeFile(workbook, 'grades_import_template.xlsx', { compression: true });
  };

  const parseAttitudeValue = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return '';
    if (ATTITUDE_OPTIONS.includes(normalized)) return normalized;
    if (normalized === '3') return 'EE';
    if (normalized === '2') return 'ME';
    if (normalized === '1') return 'DME';
    if (normalized.startsWith('E')) return 'EE';
    if (normalized.startsWith('M')) return 'ME';
    if (normalized.startsWith('D')) return 'DME';
    return '';
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
    const fileToImport = fileOverride || importFile;
    if (!fileToImport) {
      setImportError('Pilih file .xlsx terlebih dahulu.');
      return;
    }
    if (!onImportGrades) {
      setImportError('Import belum tersedia.');
      return;
    }
    if (isImporting) return;

    setIsImporting(true);
    setImportError('');
    setImportSummary('');

    try {
      const buffer = await fileToImport.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setImportError('File tidak valid.');
        setIsImporting(false);
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
        header: 1,
      });
      if (!rows.length) {
        setImportError('File kosong.');
        setIsImporting(false);
        return;
      }

      const headerRowIndex = rows.findIndex((row) => (
        Array.isArray(row) && row.some((cell) => String(cell || '').trim())
      ));
      if (headerRowIndex === -1) {
        setImportError('Header tidak ditemukan.');
        setIsImporting(false);
        return;
      }

      const headerRow = rows[headerRowIndex].map((cell) => String(cell || '').trim());
      const normalizedHeaders = headerRow.map((cell) => normalizeHeaderKey(cell));
      const findIndex = (candidates) => (
        candidates.map(normalizeHeaderKey).map(key => normalizedHeaders.indexOf(key)).find(idx => idx >= 0) ?? -1
      );
      const studentNumberIndex = findIndex(['studentnumber', 'studentno', 'studentid', 'nis', 'nisn', 'noinduk']);
      const nameIndex = findIndex(['fullname', 'name', 'studentname', 'nama', 'namalengkap']);
      const attitudeIndex = findIndex(['attitude', 'sikap', 'attitudevalue']);

      if (nameIndex === -1 || attitudeIndex === -1) {
        setImportError('Header wajib: Full Name dan Attitude.');
        setIsImporting(false);
        return;
      }

      const assessmentColumns = headerRow
        .map((header, index) => ({ header: String(header || '').trim(), index }))
        .filter(({ header, index }) => {
          if (!header) return false;
          if (index === nameIndex || index === attitudeIndex) return false;
          if (studentNumberIndex !== -1 && index === studentNumberIndex) return false;
          return true;
        })
        .map(({ header, index }) => ({ header, index }));

      const assessmentSet = new Set();
      const assessmentList = [];
      assessmentColumns.forEach(({ header }) => {
        const trimmed = String(header || '').trim();
        const key = normalizeSearchValue(trimmed);
        if (!trimmed || assessmentSet.has(key)) return;
        assessmentSet.add(key);
        assessmentList.push(trimmed);
      });

      let effectiveTypes = assessmentTypes;
      if (assessmentList.length > 0) {
        const result = await onUpdateAssessmentTypes?.(activeClass.id, assessmentList);
        if (result && result.ok === false) {
          setImportError(result.message || 'Gagal memperbarui jenis penilaian.');
          setIsImporting(false);
          return;
        }
        effectiveTypes = assessmentList;
      }

      const byNumber = new Map(
        classStudents
          .filter(student => student.studentNumber)
          .map(student => [String(student.studentNumber).trim(), student])
      );
      const byName = new Map(
        classStudents
          .filter(student => student.name)
          .map(student => [normalizeSearchValue(student.name), student])
      );

      const updates = [];
      let skipped = 0;
      let notFound = 0;

      rows.slice(headerRowIndex + 1).forEach((row) => {
        const safeRow = Array.isArray(row) ? row : [];
        const studentNumber = studentNumberIndex >= 0 ? String(safeRow[studentNumberIndex] || '').trim() : '';
        const name = String(safeRow[nameIndex] || '').trim();
        const attitudeRaw = safeRow[attitudeIndex];
        const isEmpty = !studentNumber && !name;
        if (isEmpty) return;

        const student = studentNumber
          ? byNumber.get(studentNumber)
          : byName.get(normalizeSearchValue(name));
        if (!student) {
          notFound += 1;
          return;
        }

        const nextGrades = {};
        effectiveTypes.forEach((type) => {
          nextGrades[type] = safeNumber(student.grades?.[type]);
        });

        assessmentColumns.forEach(({ header, index }) => {
          const type = String(header || '').trim();
          if (!type) return;
          const rawValue = safeRow[index];
          if (rawValue === '' || rawValue === null || rawValue === undefined) {
            return;
          }
          const score = Number(rawValue);
          if (!Number.isFinite(score)) {
            return;
          }
          nextGrades[type] = Math.max(0, Math.min(100, score));
        });

        const nextAttitude = parseAttitudeValue(attitudeRaw) || student.attitude || 'ME';
        updates.push({
          id: student.id,
          grades: nextGrades,
          attitude: nextAttitude,
          zeroExclusions: normalizeZeroExclusions(student.zeroExclusions),
          zeroExclusionNotes: normalizeZeroExclusionNotes(student.zeroExclusionNotes),
        });
      });

      if (!updates.length) {
        setImportError('Tidak ada data nilai yang valid.');
        setIsImporting(false);
        return;
      }

      const result = await onImportGrades(updates);
      if (result && result.ok === false) {
        setImportError(result.message || 'Gagal mengimpor nilai.');
        setIsImporting(false);
        return;
      }

      const skippedInfo = skipped ? ` (${skipped} incomplete rows)` : '';
      const notFoundInfo = notFound ? ` (${notFound} students not found)` : '';
      setImportSummary(`Successfully imported grades for ${updates.length} students${skippedInfo}${notFoundInfo}.`);
      setIsImporting(false);
    } catch (error) {
      setImportError('Gagal membaca file.');
      setIsImporting(false);
    }
  };

  const getGradeColor = (avg) => {
    if (avg >= 90) return 'text-green-400';
    if (avg >= 75) return 'text-blue-400';
    if (avg >= 60) return 'text-yellow-400';
    if (avg >= 45) return 'text-orange-400';
    return 'text-red-400';
  };

  const getGradeBadge = (avg) => {
    if (avg >= 95) return { label: 'A', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
    if (avg >= 90) return { label: 'A-', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
    if (avg >= 85) return { label: 'B+', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (avg >= 80) return { label: 'B', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (avg >= 75) return { label: 'B-', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (avg >= 70) return { label: 'C+', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (avg >= 65) return { label: 'C', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (avg >= 60) return { label: 'C-', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (avg >= 55) return { label: 'D+', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    if (avg >= 50) return { label: 'D', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    if (avg >= 45) return { label: 'D-', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    return { label: 'F', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const getAttitudeBadge = (value) => {
    if (value === 'EE') return { label: 'EE', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
    if (value === 'ME') return { label: 'ME', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    return { label: 'DME', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    const nextForm = assessmentTypes.reduce((acc, type) => {
      acc[type] = safeNumber(student.grades?.[type]);
      return acc;
    }, {});
    setGradeForm(nextForm);
    setAttitudeForm(student.attitude || 'ME');
    setZeroExclusionsForm(normalizeZeroExclusions(student.zeroExclusions));
    setIsModalOpen(true);
  };

  const handleZeroCellClick = (student, type) => {
    const score = safeNumber(student.grades?.[type]);
    if (score !== 0) return;
    const notes = normalizeZeroExclusionNotes(student.zeroExclusionNotes);
    setZeroNoteStudent(student);
    setZeroNoteType(type);
    setZeroNoteText(notes[type] || '');
    setZeroNoteError('');
    setZeroNoteOpen(true);
  };

  const scheduleHoverNote = (studentId, type, text) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setHoverNote({ studentId, type, text });
      hoverTimerRef.current = null;
    }, 2000);
  };

  const cancelHoverNote = (studentId, type) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverNote((prev) => (
      prev && prev.studentId === studentId && prev.type === type ? null : prev
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSaving(true);
    await onUpdateGrades(selectedStudent.id, { 
      grades: gradeForm, 
      attitude: attitudeForm, 
      zeroExclusions: zeroExclusionsForm,
      zeroExclusionNotes: normalizeZeroExclusionNotes(selectedStudent.zeroExclusionNotes),
    });
    setSaving(false);
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleGradeChange = (field, value) => {
    const numValue = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    setGradeForm(prev => ({ ...prev, [field]: numValue }));
  };

  const handleAddAssessment = (event) => {
    event.preventDefault();
    if (!activeClass?.id) return;
    const label = newAssessment.trim();
    if (!label) return;
    if (assessmentTypes.some(item => item.toLowerCase() === label.toLowerCase())) {
      setNewAssessment('');
      return;
    }
    const next = [...assessmentTypes, label];
    onUpdateAssessmentTypes?.(activeClass.id, next);
    setNewAssessment('');
  };

  const handleRemoveAssessment = (label) => {
    if (!activeClass?.id) return;
    if (assessmentTypes.length <= 1) return;
    setAssessmentToRemove(label);
    setConfirmPassword('');
    setConfirmError('');
    setIsConfirmOpen(true);
  };

  const handleSaveZeroNote = async () => {
    if (!zeroNoteStudent || !zeroNoteType) return;
    const current = normalizeZeroExclusions(zeroNoteStudent.zeroExclusions);
    const currentNotes = normalizeZeroExclusionNotes(zeroNoteStudent.zeroExclusionNotes);

    const trimmed = zeroNoteText.trim();
    if (!trimmed) {
      setZeroNoteError('Please add a reason.');
      return;
    }
    current[zeroNoteType] = false;
    currentNotes[zeroNoteType] = trimmed;

    setZeroNoteSaving(true);
    setZeroNoteError('');
    await onUpdateGrades(zeroNoteStudent.id, {
      grades: zeroNoteStudent.grades,
      attitude: zeroNoteStudent.attitude,
      zeroExclusions: current,
      zeroExclusionNotes: currentNotes,
    });
    setZeroNoteSaving(false);
    setZeroNoteOpen(false);
    setZeroNoteStudent(null);
    setZeroNoteType('');
    setZeroNoteText('');
  };

  const handleUncountZero = async () => {
    if (!zeroNoteStudent || !zeroNoteType) return;
    const current = normalizeZeroExclusions(zeroNoteStudent.zeroExclusions);
    const currentNotes = normalizeZeroExclusionNotes(zeroNoteStudent.zeroExclusionNotes);
    delete current[zeroNoteType];
    delete currentNotes[zeroNoteType];

    setZeroNoteSaving(true);
    setZeroNoteError('');
    await onUpdateGrades(zeroNoteStudent.id, {
      grades: zeroNoteStudent.grades,
      attitude: zeroNoteStudent.attitude,
      zeroExclusions: current,
      zeroExclusionNotes: currentNotes,
    });
    setZeroNoteSaving(false);
    setZeroNoteOpen(false);
    setZeroNoteStudent(null);
    setZeroNoteType('');
    setZeroNoteText('');
  };


  const handleConfirmRemove = async () => {
    if (!activeClass?.id || !assessmentToRemove) return;
    if (!confirmPassword) {
      setConfirmError('Password is required.');
      return;
    }
    if (!supabase) {
      setConfirmError('Supabase is not configured.');
      return;
    }

    setConfirming(true);
    setConfirmError('');

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (userError || !email) {
      setConfirmError('User session not found.');
      setConfirming(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: confirmPassword,
    });

    if (authError) {
      setConfirmError('Incorrect password.');
      setConfirming(false);
      return;
    }

    const next = assessmentTypes.filter(item => item !== assessmentToRemove);
    const result = await onUpdateAssessmentTypes?.(activeClass.id, next);
    if (result && result.ok === false) {
      setConfirmError(result.message || 'Failed to delete assessment.');
      setConfirming(false);
      return;
    }

    setConfirming(false);
    setIsConfirmOpen(false);
    setAssessmentToRemove('');
    setConfirmPassword('');
  };

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (classStudents.length === 0) {
      return { classAverage: 0, belowStandard: 0, attitudeScore: 0, attitudeLabel: 'ME' };
    }
    const averageInfo = classStudents.map(student => ({
      info: getGradesAverageInfo(student.grades, assessmentTypes, student.zeroExclusions),
    }));
    const averages = averageInfo
      .filter(({ info }) => info.hasScores)
      .map(({ info }) => info.avg);
    const classAverage = averages.length
      ? Math.round(averages.reduce((acc, value) => acc + value, 0) / averages.length)
      : 0;
    const belowStandard = averageInfo
      .filter(({ info }) => info.hasScores)
      .filter(({ info }) => info.avg < 65).length;
    const attitudeTotal = classStudents.reduce((acc, student) => acc + getAttitudeScore(student.attitude), 0);
    const attitudeScore = attitudeTotal / classStudents.length;
    const attitudeLabel = getAttitudeLabel(attitudeScore);
    return { classAverage, belowStandard, attitudeScore, attitudeLabel };
  }, [classStudents, assessmentTypes]);

  const renderGradesTable = (isExpanded) => (
    <div className={`macos-glass-panel rounded-xl overflow-hidden flex flex-col ${isExpanded ? 'h-full' : 'flex-1 min-h-0'}`}>
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase">Grades: {activeClass.name}</span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{sortedStudents.length} Students</span>
          <button
            type="button"
            onClick={() => setIsGradesExpanded(!isExpanded)}
            className="p-1.5 rounded-md bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
            title={isExpanded ? 'Minimize view' : 'Maximize view'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 min-h-0">
        <table className="min-w-max w-full table-fixed text-left border-collapse">
          <thead className="sticky top-0 bg-[#1e1e1e] z-10 shadow-md">
            <tr className="border-b border-white/10 text-gray-400 text-[10px] font-semibold uppercase tracking-wide">
              <th className="p-3 pl-6 sticky left-0 z-20 bg-[#1e1e1e] w-56">Student</th>
              {assessmentTypes.map((type) => (
                <th key={type} className="p-3 text-center w-24">
                  <span className="block max-w-[88px] mx-auto truncate">{type}</span>
                </th>
              ))}
              <th className="p-3 text-center w-20">Average</th>
              <th className="p-3 text-center w-20">Attitude</th>
              <th className="p-3 text-center w-16">Grade</th>
              <th className="p-3 text-right pr-6 w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedStudents.map((student) => {
              const avgInfo = getGradesAverageInfo(student.grades, assessmentTypes, student.zeroExclusions);
              const avg = avgInfo.avg;
              const hasScores = avgInfo.hasScores;
              const badge = hasScores
                ? getGradeBadge(avg)
                : { label: '--', bg: 'bg-white/5', text: 'text-gray-400', border: 'border-white/10' };
              const attitudeBadge = getAttitudeBadge(student.attitude || 'ME');
              const normalizedZeroExclusions = normalizeZeroExclusions(student.zeroExclusions);
              return (
                <tr key={student.id} className="macos-table-row transition-colors cursor-default group hover:bg-white/5">
                  <td className="p-3 pl-6 sticky left-0 z-10 bg-[#1b1b1f]/95 backdrop-blur-sm w-56">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-600 to-gray-500 flex items-center justify-center text-xs text-white font-medium shadow-sm">
                        {student.avatar}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-gray-200 font-medium block truncate">{student.name}</span>
                        <span className="text-[10px] text-gray-500 truncate">{student.studentNumber || '-'}</span>
                      </div>
                    </div>
                  </td>
                  {assessmentTypes.map((type) => (
                    <td key={type} className="p-3 text-center w-24">
                      {(() => {
                        const score = safeNumber(student.grades?.[type]);
                        const isZero = score === 0;
                        const isExcluded = isZero && normalizedZeroExclusions[type] !== false;
                        const isCountedZero = isZero && normalizedZeroExclusions[type] === false;
                        const note = normalizeZeroExclusionNotes(student.zeroExclusionNotes)[type];
                        const colorClass = isExcluded
                          ? 'text-gray-400 line-through'
                          : isZero
                            ? 'text-red-400'
                            : getGradeColor(score);
                        return (
                          <div className="relative flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleZeroCellClick(student, type)}
                              onMouseEnter={() => {
                                if (isCountedZero && note) {
                                  scheduleHoverNote(student.id, type, note);
                                }
                              }}
                              onMouseLeave={() => {
                                if (isCountedZero && note) {
                                  cancelHoverNote(student.id, type);
                                }
                              }}
                              className={`w-full text-sm font-semibold ${colorClass} ${isZero ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              {score}
                            </button>
                            {isCountedZero && note && hoverNote?.studentId === student.id && hoverNote.type === type && (
                              <div className="absolute z-20 bottom-full mb-2 w-44 px-3 py-2 rounded-lg text-[11px] text-gray-100 macos-tooltip">
                                {note}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  ))}
                  <td className="p-3 text-center w-20">
                    <span className={`text-lg font-bold ${hasScores ? getGradeColor(avg) : 'text-gray-500'}`}>
                      {hasScores ? avg : '--'}
                    </span>
                  </td>
                  <td className="p-3 text-center w-20">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${attitudeBadge.bg} ${attitudeBadge.text} ${attitudeBadge.border}`}>
                      {attitudeBadge.label}
                    </span>
                  </td>
                  <td className="p-3 text-center w-16">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-3 text-right pr-6 w-16">
                    <button 
                      onClick={() => openEditModal(student)}
                      className="p-1.5 rounded-md bg-white/10 text-blue-400 hover:bg-blue-500/20 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Edit3 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {classStudents.length === 0 && (
              <tr>
                <td colSpan={assessmentTypes.length + 5} className="p-8 text-center text-gray-500 text-sm">
                  No students in this class yet.
                </td>
              </tr>
            )}
            {classStudents.length > 0 && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={assessmentTypes.length + 5} className="p-8 text-center text-gray-500 text-sm">
                  No matching students.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const gradesOverlay = typeof document !== 'undefined'
    ? createPortal(
      <AnimatePresence>
        {isGradesExpanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setIsGradesExpanded(false)}
          >
            <motion.div
              className="w-[96vw] h-[88vh] max-w-[1400px]"
              initial={{ opacity: 0, scale: 0.965, y: 26, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.985, y: -16, filter: 'blur(6px)' }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 26,
                mass: 0.9
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderGradesTable(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
    : null;

  return (
    <div className="flex flex-col h-full animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Grades: {activeClass.name}</h2>
          <p className="text-xs text-gray-400">Import scores with XLSX and adjust assessments from the header row.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="bg-white/10 hover:bg-white/15 text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors border border-white/10"
          >
            <Download size={14} /> Template XLSX
          </button>
          <button
            onClick={triggerImportPicker}
            disabled={isImporting}
            className="bg-white/10 hover:bg-white/15 text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors border border-white/10 disabled:opacity-60"
          >
            {isImporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileUp size={14} /> Import XLSX
              </>
            )}
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
      {(importError || importSummary) && (
        <div className="mb-4 text-xs">
          {importError ? (
            <span className="text-red-400">{importError}</span>
          ) : (
            <span className="text-emerald-300">{importSummary}</span>
          )}
        </div>
      )}
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="macos-glass-panel rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase font-medium">Class Average</p>
          <p className={`text-xl font-bold ${getGradeColor(classStats.classAverage)}`}>{classStats.classAverage}</p>
        </div>
        <div className="macos-glass-panel rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase font-medium">Below Standard</p>
          <p className="text-xl font-bold text-red-400">{classStats.belowStandard}</p>
          <p className="text-[10px] text-gray-500 mt-1">Scores below 65</p>
        </div>
        <div className="macos-glass-panel rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase font-medium">Attitude Average</p>
          <p className="text-xl font-bold text-blue-400">{classStats.attitudeLabel}</p>
          <p className="text-[10px] text-gray-500 mt-1">EE / ME / DME</p>
        </div>
      </div>

      {/* Assessment Types */}
      <div className="macos-glass-panel rounded-xl p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 uppercase font-medium">Assessment Types</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {assessmentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (assessmentTypes.length <= 1) return;
                    handleRemoveAssessment(type);
                  }}
                  aria-disabled={assessmentTypes.length <= 1}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border transition-colors select-none ${
                    assessmentTypes.length <= 1
                      ? 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                      : 'bg-white/10 text-gray-200 border-white/10 hover:bg-white/15 cursor-pointer'
                  }`}
                  aria-label={`Remove ${type}`}
                  title="Remove assessment"
                >
                  <span className="truncate max-w-[160px]">{type}</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/15 bg-white/10 text-gray-300">
                    <X size={10} />
                  </span>
                </button>
              ))}
              {assessmentTypes.length === 0 && (
                <span className="text-xs text-gray-500">No assessments yet.</span>
              )}
            </div>
          </div>
          <form onSubmit={handleAddAssessment} className="flex items-center gap-2 w-full md:w-auto">
            <input
              value={newAssessment}
              onChange={(e) => setNewAssessment(e.target.value)}
              className="w-full md:w-48 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:border-blue-500 outline-none transition-all"
              placeholder="Add assessment"
            />
            <button type="submit" className="px-3 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 transition-colors">
              Add
            </button>
          </form>
        </div>
      </div>

      {!isGradesExpanded && renderGradesTable(false)}

      {gradesOverlay}

      {/* Edit Grades Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Edit Grades: ${selectedStudent?.name || ''}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview Average */}
          <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
            <p className="text-xs text-gray-400 mb-1">Predicted Average</p>
            <p className={`text-3xl font-bold ${getGradeColor(calculateAverage(gradeForm, zeroExclusionsForm))}`}>
              {calculateAverage(gradeForm, zeroExclusionsForm)}
            </p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-md text-sm font-bold border ${getGradeBadge(calculateAverage(gradeForm, zeroExclusionsForm)).bg} ${getGradeBadge(calculateAverage(gradeForm, zeroExclusionsForm)).text} ${getGradeBadge(calculateAverage(gradeForm, zeroExclusionsForm)).border}`}>
              Grade {getGradeBadge(calculateAverage(gradeForm, zeroExclusionsForm)).label}
            </span>
          </div>

          {/* Attitude Selection */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Attitude</label>
            <div className="grid grid-cols-3 gap-2">
              {ATTITUDE_OPTIONS.map(option => {
                const isSelected = attitudeForm === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAttitudeForm(option)}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade Inputs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {assessmentTypes.map((type) => (
              <div key={type}>
                <label className="block text-[10px] text-gray-400 mb-1 text-center">{type}</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={gradeForm[type] ?? 0}
                  onChange={(e) => handleGradeChange(type, e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-base font-semibold text-center focus:border-blue-500 outline-none transition-all"
                />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-500 text-center">
            Tip: zeros are excluded by default. Click a 0 score to add a reason and count it.
          </p>

          {/* Grade Scale Reference */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-[10px] text-gray-400 uppercase font-medium mb-2">Grade Scale</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-green-400">A: 95-100</span>
              <span className="text-green-400">A-: 90-94</span>
              <span className="text-blue-400">B+: 85-89</span>
              <span className="text-blue-400">B: 80-84</span>
              <span className="text-blue-400">B-: 75-79</span>
              <span className="text-yellow-400">C+: 70-74</span>
              <span className="text-yellow-400">C: 65-69</span>
              <span className="text-yellow-400">C-: 60-64</span>
              <span className="text-orange-400">D+: 55-59</span>
              <span className="text-orange-400">D: 50-54</span>
              <span className="text-orange-400">D-: 45-49</span>
              <span className="text-red-400">F: 0-44</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Grades
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Zero Exclusion Note Modal */}
      <Modal
        isOpen={zeroNoteOpen}
        onClose={() => {
          if (zeroNoteSaving) return;
          setZeroNoteOpen(false);
          setZeroNoteStudent(null);
          setZeroNoteType('');
          setZeroNoteText('');
          setZeroNoteError('');
        }}
        title="Count Zero Score"
      >
        <div className="space-y-4">
          <div className="macos-glass-panel rounded-lg border border-white/10 p-4 text-sm text-gray-200">
            <p className="font-semibold text-white">Add a reason to count this zero in the average.</p>
            <p className="text-xs text-gray-400 mt-2">
              Student: <span className="text-gray-200">{zeroNoteStudent?.name || '-'}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Assessment: <span className="text-gray-200">{zeroNoteType || '-'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Reason</label>
            <textarea
              rows={3}
              value={zeroNoteText}
              onChange={(e) => setZeroNoteText(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Explain why this zero should be counted"
            />
          </div>

          {zeroNoteError && <p className="text-xs text-red-400">{zeroNoteError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (zeroNoteSaving) return;
                setZeroNoteOpen(false);
                setZeroNoteStudent(null);
                setZeroNoteType('');
                setZeroNoteText('');
                setZeroNoteError('');
              }}
              className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={zeroNoteSaving}
              onClick={handleSaveZeroNote}
              className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {zeroNoteSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Count Zero'
              )}
            </button>
            {zeroNoteStudent && zeroNoteType && normalizeZeroExclusions(zeroNoteStudent.zeroExclusions)[zeroNoteType] === false && (
              <button
                type="button"
                disabled={zeroNoteSaving}
                onClick={handleUncountZero}
                className="px-3 py-2 rounded-lg text-sm text-gray-300 border border-white/15 hover:bg-white/10 transition-colors disabled:opacity-70"
              >
                Mark as not counted
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Remove Assessment Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (confirming) return;
          setIsConfirmOpen(false);
          setAssessmentToRemove('');
          setConfirmPassword('');
          setConfirmError('');
        }}
        title="Delete Assessment"
      >
        <div className="space-y-4">
          <div className="macos-glass-panel rounded-lg border border-white/10 p-4 text-sm text-gray-200">
            <p className="font-semibold text-white">This action will permanently delete the assessment data.</p>
            <p className="text-xs text-gray-400 mt-2">
              Assessment: <span className="text-gray-200">{assessmentToRemove || '-'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
              placeholder="Enter your password"
            />
          </div>

          {confirmError && <p className="text-xs text-red-400">{confirmError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirming) return;
                setIsConfirmOpen(false);
                setAssessmentToRemove('');
                setConfirmPassword('');
                setConfirmError('');
              }}
              className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRemove}
              disabled={confirming}
              className="px-3 py-2 rounded-lg text-sm bg-red-500/80 text-white hover:bg-red-500 font-medium shadow-lg shadow-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {confirming ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Verifying...
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

const ClassManager = ({ classes, activeClassId, setActiveClassId, onAddClass, onDeleteClass, onSelectClass }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', subtitle: '', type: 'subject' });

  const handleAdd = (e) => {
    e.preventDefault();
    onAddClass(newClass);
    setNewClass({ name: '', subtitle: '', type: 'subject' });
    setIsAdding(false);
  };

  const homeroomClasses = classes.filter(c => c.type === 'homeroom');
  const subjectClasses = classes.filter(c => c.type === 'subject');

  const openDelete = (cls) => {
    if (classes.length <= 1) return;
    setDeleteTarget(cls);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (!deletePassword) {
      setDeleteError('Password is required.');
      return;
    }
    setDeleteSaving(true);
    setDeleteError('');
    const result = await onDeleteClass?.(deleteTarget.id, deletePassword);
    setDeleteSaving(false);
    if (result && result.ok === false) {
      setDeleteError(result.message || 'Failed to delete class.');
      return;
    }
    setIsDeleteOpen(false);
    setDeleteTarget(null);
    setDeletePassword('');
  };

  const ClassList = ({ items, title, icon: Icon }) => (
    <div className="mb-4">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-2 flex items-center gap-1">
        <Icon size={10} /> {title}
      </h3>
      <div className="space-y-1">
        {items.map(cls => (
          <div key={cls.id} className="group relative flex items-center">
            <button
              onClick={() => {
                setActiveClassId(cls.id);
                onSelectClass?.();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex flex-col ${
                activeClassId === cls.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className="font-medium">{cls.name}</span>
              <span className="text-[10px] opacity-70 truncate">{cls.subtitle}</span>
            </button>
            {classes.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); openDelete(cls); }}
                className="absolute right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-3 text-[10px] text-gray-600 italic">No classes</p>}
      </div>
    </div>
  );

  return (
    <div className="px-4 py-2 mb-2 border-b border-white/10 pb-4 max-h-[60vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Class List</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="text-gray-400 hover:text-white transition-colors">
          <Plus size={14} />
        </button>
      </div>
      
      {isAdding && (
        <form onSubmit={handleAdd} className="mb-4 bg-white/5 p-3 rounded-lg animate-in fade-in slide-in-from-top-2 border border-white/10">
          <div className="flex gap-2 mb-2">
            <button 
              type="button"
              onClick={() => setNewClass({ ...newClass, type: 'homeroom', subtitle: 'Homeroom' })}
              className={`flex-1 text-[10px] py-1 rounded border transition-colors ${newClass.type === 'homeroom' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
            >
              Homeroom
            </button>
            <button 
              type="button"
              onClick={() => setNewClass({ ...newClass, type: 'subject', subtitle: '' })}
              className={`flex-1 text-[10px] py-1 rounded border transition-colors ${newClass.type === 'subject' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
            >
              Subject
            </button>
          </div>

          <input 
            placeholder="Class name" 
            className="w-full bg-black/30 text-xs text-white px-2 py-1.5 rounded mb-2 border border-white/10 focus:border-blue-500 outline-none placeholder:text-gray-600"
            value={newClass.name}
            onChange={e => setNewClass({ ...newClass, name: e.target.value })}
            required
          />
          <input 
            placeholder={newClass.type === 'homeroom' ? "Description" : "Subject"}
            className="w-full bg-black/30 text-xs text-white px-2 py-1.5 rounded mb-2 border border-white/10 focus:border-blue-500 outline-none placeholder:text-gray-600"
            value={newClass.subtitle}
            onChange={e => setNewClass({ ...newClass, subtitle: e.target.value })}
            required
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 text-gray-400 text-xs py-1.5 rounded hover:bg-white/10">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600/80 text-white text-xs py-1.5 rounded hover:bg-blue-600 shadow-sm">Save</button>
          </div>
        </form>
      )}

      <ClassList items={homeroomClasses} title="Homeroom" icon={Home} />
      <ClassList items={subjectClasses} title="Subject Classes" icon={Briefcase} />

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (deleteSaving) return;
          setIsDeleteOpen(false);
          setDeleteTarget(null);
          setDeletePassword('');
          setDeleteError('');
        }}
        title="Delete Class"
      >
        <div className="space-y-4">
          <div className="macos-glass-panel rounded-lg border border-white/10 p-4 text-sm text-gray-200">
            <p className="font-semibold text-white">This action will permanently delete the class data.</p>
            <p className="text-xs text-gray-400 mt-2">
              Class: <span className="text-gray-200">{deleteTarget?.name || '-'}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Detail: <span className="text-gray-200">{deleteTarget?.subtitle || '-'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm password</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
    </div>
  );
};

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
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [todayAttendanceRecords, setTodayAttendanceRecords] = useState({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef(null);
  const notificationsPopoverRef = useRef(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [lastReadAt, setLastReadAt] = useState(null);

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0] || null;

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

  const refreshStudents = async () => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setDataError('Failed to refresh students.');
      return;
    }

    setStudents((data || []).map(mapStudentRow));
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

  useEffect(() => {
    let isMounted = true;

    const loadAttendanceHistory = async () => {
      if (!supabase || !attendanceDate || !activeClassId) {
        if (isMounted) {
          setAttendanceRecords({});
          setIsAttendanceLoading(false);
        }
        return;
      }

      setIsAttendanceLoading(true);
      setDataError('');

      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id,status,attendance_time')
        .eq('class_id', activeClassId)
        .eq('attendance_date', attendanceDate);

      if (!isMounted) return;

      if (error) {
        setDataError('Failed to load attendance history.');
        setAttendanceRecords({});
        setIsAttendanceLoading(false);
        return;
      }

      setAttendanceRecords(buildAttendanceRecordMap(data || []));
      setIsAttendanceLoading(false);
    };

    loadAttendanceHistory();

    return () => {
      isMounted = false;
    };
  }, [attendanceDate, activeClassId]);

  useEffect(() => {
    let isMounted = true;

    const loadTodayAttendance = async () => {
      if (!supabase || !activeClassId) {
        if (isMounted) {
          setTodayAttendanceRecords({});
        }
        return;
      }

      const todayKey = getTodayKey();
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id,status,attendance_time')
        .eq('class_id', activeClassId)
        .eq('attendance_date', todayKey);

      if (!isMounted) return;

      if (error) {
        setDataError('Failed to load attendance history.');
        setTodayAttendanceRecords({});
        return;
      }

      setTodayAttendanceRecords(buildAttendanceRecordMap(data || []));
    };

    loadTodayAttendance();

    return () => {
      isMounted = false;
    };
  }, [activeClassId]);

  const updateStudentStatus = async (id, newStatus, dateKey = attendanceDate) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const student = students.find(item => item.id === id);
    const classId = student?.classId ?? activeClassId;
    if (!classId) {
      setDataError('Class not found.');
      return;
    }

    const targetDate = dateKey || getTodayKey();
    const shouldStamp = newStatus === 'Present' || newStatus === 'Late';
    const attendanceTime = shouldStamp ? getNowIso() : null;

    const { error: historyError } = await supabase
      .from('attendance_records')
      .upsert({
        student_id: id,
        class_id: classId,
        attendance_date: targetDate,
        status: newStatus,
        attendance_time: attendanceTime,
      }, { onConflict: 'student_id,class_id,attendance_date' });

    if (historyError) {
      setDataError('Failed to save attendance history.');
      return;
    }

    if (targetDate === attendanceDate) {
      setAttendanceRecords(prev => ({
        ...prev,
        [String(id)]: { status: newStatus, attendanceTime },
      }));
    }

    if (targetDate === getTodayKey()) {
      setTodayAttendanceRecords(prev => ({
        ...prev,
        [String(id)]: { status: newStatus, attendanceTime },
      }));
    }

    const studentName = student?.name || 'Student';
    addNotification(`Attendance ${targetDate}: ${studentName} - ${newStatus}`, 'attendance');
  };

  const insertStudentsBatch = async (rows) => {
    const attempt = await supabase
      .from('students')
      .insert(rows)
      .select();

    if (!attempt.error) {
      return { data: attempt.data || [] };
    }

    const message = String(attempt.error.message || '').toLowerCase();
    const needsStatus = message.includes('status') || message.includes('attendance_time') || message.includes('null value');
    if (!needsStatus) {
      return { error: attempt.error };
    }

    const fallbackRows = rows.map(row => ({
      status: row.status ?? 'Present',
      attendance_time: row.attendance_time ?? null,
      ...row,
    }));

    const retry = await supabase
      .from('students')
      .insert(fallbackRows)
      .select();

    if (retry.error) {
      return { error: retry.error };
    }

    return { data: retry.data || [] };
  };

  const addClass = async (clsData) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const trimmedName = clsData.name.trim();
    const trimmedSubtitle = clsData.subtitle.trim();
    if (!trimmedName || !trimmedSubtitle) return;

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: trimmedName,
        subtitle: trimmedSubtitle,
        type: clsData.type,
        assessment_types: DEFAULT_ASSESSMENTS,
      })
      .select()
      .single();

    if (error) {
      setDataError('Failed to add class.');
      return;
    }

    const newClass = mapClassRow(data);
    setClasses(prev => [...prev, newClass]);
    setActiveClassId(newClass.id);
  };

  const updateAssessmentTypes = async (classId, nextTypes) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
    }

    const sanitized = normalizeAssessmentTypes(nextTypes);
    const currentTypes = classes.find(cls => cls.id === classId)?.assessmentTypes ?? DEFAULT_ASSESSMENTS;
    const removed = currentTypes.filter(item => !sanitized.includes(item));
    const added = sanitized.filter(item => !currentTypes.includes(item));

    const { error } = await supabase
      .from('classes')
      .update({ assessment_types: sanitized })
      .eq('id', classId);

    if (error) {
      setDataError('Failed to update assessment types.');
      return { ok: false, message: error.message || 'Failed to update assessment types.' };
    }

    const updatedStudents = students
      .filter(student => student.classId === classId)
      .map((student) => {
        const nextGrades = { ...(student.grades || {}) };
        const nextZeroExclusions = { ...(student.zeroExclusions || {}) };
        const nextZeroExclusionNotes = { ...(student.zeroExclusionNotes || {}) };
        removed.forEach((type) => {
          delete nextGrades[type];
          delete nextZeroExclusions[type];
          delete nextZeroExclusionNotes[type];
        });
        added.forEach((type) => {
          if (nextGrades[type] === undefined) {
            nextGrades[type] = 0;
          }
        });
        return { ...student, grades: nextGrades, zeroExclusions: nextZeroExclusions, zeroExclusionNotes: nextZeroExclusionNotes };
      });

    if (removed.length || added.length) {
      const updates = await Promise.all(
        updatedStudents.map((student) => (
          supabase
            .from('students')
            .update({ grades: student.grades, zero_exclusions: student.zeroExclusions, zero_exclusion_notes: student.zeroExclusionNotes })
            .eq('id', student.id)
        ))
      );
      const failedUpdate = updates.find(result => result.error);
      if (failedUpdate?.error) {
        setDataError('Failed to update assessment data.');
        return { ok: false, message: failedUpdate.error.message || 'Failed to update assessment data.' };
      }
    }

    const updatedMap = new Map(updatedStudents.map(student => [student.id, student]));
    setClasses(prev => prev.map(cls => cls.id === classId ? { ...cls, assessmentTypes: sanitized } : cls));
    setStudents(prev => prev.map(student => updatedMap.get(student.id) || student));
    return { ok: true };
  };


  const deleteClass = async (id, password) => {
    if (classes.length <= 1) {
      return { ok: false, message: 'At least one class must remain.' };
    }
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
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

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      const message = error.message || 'Failed to delete class.';
      setDataError(message);
      return { ok: false, message };
    }

    const nextClasses = classes.filter(c => c.id !== id);
    setClasses(nextClasses);
    setStudents(prev => prev.filter(s => !isSameClassId(s.classId, id)));
    setActiveClassId(prev => (isSameClassId(prev, id) ? (nextClasses[0]?.id ?? null) : prev));
    return { ok: true };
  };

  const addStudent = async (classId, formData) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
    }
    if (!classId) return;

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedGender = formData.gender.trim();
    const trimmedStudentNumber = formData.studentNumber.trim();
    if (!trimmedName || !trimmedEmail || !trimmedGender || !trimmedStudentNumber) {
      return { ok: false, message: 'Please complete all fields.' };
    }

    const avatar = buildAvatar(trimmedName);
    const classInfo = classes.find(cls => cls.id === classId);
    const assessmentTypes = classInfo?.assessmentTypes ?? DEFAULT_ASSESSMENTS;
    const grades = assessmentTypes.reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {});
    const { data, error } = await insertStudentsBatch([{
      class_id: classId,
      name: trimmedName,
      avatar,
      email: trimmedEmail,
      gender: trimmedGender,
      student_number: trimmedStudentNumber,
      grades,
      attitude: 'ME',
      zero_exclusions: {},
      zero_exclusion_notes: {},
    }]);

    if (error) {
      const message = error.message || 'Failed to add student.';
      setDataError(message);
      return { ok: false, message };
    }

    const inserted = Array.isArray(data) ? data[0] : null;
    if (inserted) {
      setStudents(prev => [...prev, mapStudentRow(inserted)]);
      addNotification(`Student added: ${trimmedName}`, 'student');
    }
    return { ok: true };
  };

  const importStudents = async (payload) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
    }
    if (!Array.isArray(payload) || payload.length === 0) {
      return { ok: false, message: 'No data to import.' };
    }

    const { data, error } = await insertStudentsBatch(payload);

    if (error) {
      const message = error.message || 'Failed to import students.';
      setDataError(message);
      return { ok: false, message };
    }

    if (data?.length) {
      setStudents(prev => [...prev, ...data.map(mapStudentRow)]);
    }
    if (data?.length) {
      addNotification(`Imported ${data.length} students to ${activeClass?.name || 'class'}.`, 'student');
    }
    return { ok: true, count: data?.length || 0 };
  };

  const editStudent = async (id, formData) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
    }

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedGender = formData.gender.trim();
    const trimmedStudentNumber = formData.studentNumber.trim();
    if (!trimmedName || !trimmedEmail || !trimmedGender || !trimmedStudentNumber) {
      return { ok: false, message: 'Please complete all fields.' };
    }

    const avatar = buildAvatar(trimmedName);
    const { error } = await supabase
      .from('students')
      .update({
        name: trimmedName,
        avatar,
        email: trimmedEmail,
        gender: trimmedGender,
        student_number: trimmedStudentNumber,
      })
      .eq('id', id);

    if (error) {
      const message = error.message || 'Failed to update student.';
      setDataError(message);
      return { ok: false, message };
    }

    setStudents(prev => prev.map(s => s.id === id ? { 
      ...s, 
      name: trimmedName, 
      avatar,
      email: trimmedEmail,
      gender: trimmedGender,
      studentNumber: trimmedStudentNumber,
    } : s));
    return { ok: true };
  };

  const deleteStudent = async (id, password) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
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

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      const message = error.message || 'Failed to delete student.';
      setDataError(message);
      return { ok: false, message };
    }

    const deletedStudent = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    if (deletedStudent) {
      addNotification(`Student deleted: ${deletedStudent.name}`, 'student');
    }
    return { ok: true };
  };

  const deleteStudentsBatch = async (ids, password) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return { ok: false, message: 'Supabase is not configured.' };
    }
    if (!ids || !ids.length) {
      return { ok: false, message: 'No students selected.' };
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

    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', ids);

    if (error) {
      const message = error.message || 'Failed to delete students.';
      setDataError(message);
      return { ok: false, message };
    }

    setStudents(prev => prev.filter(s => !ids.includes(s.id)));
    addNotification(`Deleted ${ids.length} students.`, 'student');
    return { ok: true };
  };

  const updateGrades = async (id, payload) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const grades = payload?.grades || {};
    const attitude = payload?.attitude || 'ME';
    const zeroExclusions = normalizeZeroExclusions(payload?.zeroExclusions);
    const zeroExclusionNotes = normalizeZeroExclusionNotes(payload?.zeroExclusionNotes);
    const { error } = await supabase
      .from('students')
      .update({
        grades,
        attitude,
        zero_exclusions: zeroExclusions,
        zero_exclusion_notes: zeroExclusionNotes,
      })
      .eq('id', id);

    if (error) {
      setDataError('Failed to update grades.');
      return;
    }

    setStudents(prev => prev.map(s => s.id === id ? { 
      ...s, 
      grades,
      attitude,
      zeroExclusions,
      zeroExclusionNotes,
    } : s));
  };

  const importGrades = async (updates) => {
    if (!supabase) {
      const message = 'Supabase is not configured.';
      setDataError(message);
      return { ok: false, message };
    }
    if (!updates || !updates.length) {
      return { ok: false, message: 'No grade data to import.' };
    }

    const normalizedUpdates = updates.map((update) => ({
      id: update.id,
      grades: update.grades || {},
      attitude: update.attitude || 'ME',
      zeroExclusions: normalizeZeroExclusions(update.zeroExclusions),
      zeroExclusionNotes: normalizeZeroExclusionNotes(update.zeroExclusionNotes),
    }));

    const results = await Promise.all(
      normalizedUpdates.map((update) => (
        supabase
          .from('students')
          .update({
            grades: update.grades,
            attitude: update.attitude,
            zero_exclusions: update.zeroExclusions,
            zero_exclusion_notes: update.zeroExclusionNotes,
          })
          .eq('id', update.id)
      ))
    );

    const failed = results.find(result => result.error);
    if (failed?.error) {
      const message = failed.error.message || 'Failed to import grades.';
      setDataError(message);
      return { ok: false, message };
    }

    const updatesMap = new Map(normalizedUpdates.map(update => [update.id, update]));
    setStudents(prev => prev.map(student => {
      const updated = updatesMap.get(student.id);
      if (!updated) return student;
      return {
        ...student,
        grades: updated.grades,
        attitude: updated.attitude,
        zeroExclusions: updated.zeroExclusions,
        zeroExclusionNotes: updated.zeroExclusionNotes,
      };
    }));

    addNotification(`Grades imported for ${normalizedUpdates.length} students.`, 'grade');
    return { ok: true, count: normalizedUpdates.length };
  };

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
    <div className="w-full max-w-6xl h-[92dvh] md:h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden border border-white/20 relative animate-in zoom-in-95 duration-300 z-10 backdrop-blur-sm">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/35 backdrop-blur-sm z-20 md:hidden"
          />
        )}

        <aside
          className={`w-72 md:w-64 macos-sidebar mobile-panel flex flex-col shrink-0 z-30 md:z-20 fixed md:static inset-y-3 left-3 md:inset-y-0 md:left-0 transform md:translate-x-0 transition-[transform,opacity] duration-300 rounded-2xl md:rounded-none border border-white/15 md:border-0 shadow-2xl md:shadow-none overflow-hidden ${
            isSidebarOpen
              ? 'translate-x-0 opacity-100'
              : '-translate-x-[120%] opacity-0 pointer-events-none'
          } md:opacity-100 md:pointer-events-auto`}
        >
          <div className="h-14 px-6 flex items-center gap-2 border-b border-white/5">
             <img src={attendifyLogo} alt="Attendify logo" className="w-7 h-7 rounded-lg" />
             <span className="font-bold text-lg text-white tracking-tight">Attendify</span>
          </div>

          <ClassManager 
            classes={classes} 
            activeClassId={activeClassId} 
            setActiveClassId={setActiveClassId} 
            onAddClass={addClass} 
            onDeleteClass={deleteClass}
            onSelectClass={() => setIsSidebarOpen(false)}
          />

          <div className="px-4 mt-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Menu</h2>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'nav-item-active' : 'text-gray-300 nav-item-inactive'
                    }`}
                  >
                    <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-white/10">
            {isLoadingData ? (
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-300 text-xs">
                <span className="macos-spinner macos-spinner-sm" />
                <span>Loading profile...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                {teacherProfile.avatarUrl ? (
                  <img
                    src={teacherProfile.avatarUrl}
                    alt={teacherProfile.name}
                    className="w-8 h-8 rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 shadow-inner flex items-center justify-center text-xs font-bold text-white">
                    {teacherProfile.avatar}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{teacherProfile.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">ID: {teacherProfile.nip}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsEditProfileOpen(true)} 
                    className="text-gray-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 p-1" 
                    title="Edit Profil"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors p-1" title="Keluar">
                    <LogIn size={14} className="transform rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

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
                  className="bg-black/20 border border-transparent focus:border-blue-500/50 hover:bg-black/30 text-white text-xs rounded-md pl-9 pr-3 py-1.5 w-32 sm:w-40 md:w-48 transition-all outline-none"
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
        {notificationsPopover}
      </div>
  );
};

// --- MAIN APP ENTRY ---

// Set to true for development/demo mode (bypass login)
const DEV_MODE = false;

const App = () => {
  // If supabase is not configured or DEV_MODE is true, allow direct access to dashboard for testing
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_MODE || !supabase);
  const [authReady, setAuthReady] = useState(DEV_MODE || !supabase);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (DEV_MODE || !supabase) {
      setAuthReady(true);
      setIsAuthenticated(true); // Auto-login for testing/demo mode
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
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-[100dvh] macos-wallpaper dark flex items-center justify-center p-3 md:p-8 overflow-hidden font-sans relative">
        <style>{styleTag}</style>
        <ParticleBackground />
        <div className="macos-glass-panel px-6 py-5 rounded-2xl flex items-center gap-3 text-gray-300 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Menyiapkan sesi...
        </div>
      </div>
    );
  }

  const introActive = !isAuthenticated && showIntro;

  return (
    <div className="min-h-[100dvh] macos-wallpaper dark flex items-center justify-center p-3 md:p-8 overflow-hidden font-sans relative">
      <style>{styleTag}</style>
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
