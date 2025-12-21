import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DatePicker, TimeInput } from '@nextui-org/react';
import { Time, parseDate } from '@internationalized/date';
import attendifyLogo from './assets/attendify-logo.png';
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
  Trash2,
  Edit3,
  Calendar,
  X,
  School,
  Home,
  Briefcase,
  LogIn,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Mail,
  User,
  Phone,
  MapPin,
  Camera,
  Save
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

// --- DATA MODEL ---
const INITIAL_CLASSES = [
  { id: 1, type: 'homeroom', name: 'Grade 10 Science 1', subtitle: 'Homeroom' },
  { id: 2, type: 'subject', name: 'Grade 11 Social 2', subtitle: 'Basic Physics' },
  { id: 3, type: 'subject', name: 'Grade 12 Science 3', subtitle: 'Advanced Physics' },
];

const INITIAL_STUDENTS = [
  { id: 1, classId: 1, name: "Alex Chen", avatar: "AC", status: 'Present', grades: { quiz1: 85, mid: 92, project: 88 } },
  { id: 2, classId: 1, name: "Sarah Johnson", avatar: "SJ", status: 'Present', grades: { quiz1: 92, mid: 88, project: 95 } },
  { id: 3, classId: 1, name: "Michael Davis", avatar: "MD", status: 'Late', grades: { quiz1: 78, mid: 75, project: 82 } },
  { id: 4, classId: 2, name: "Emily Wilson", avatar: "EW", status: 'Absent', grades: { quiz1: 95, mid: 96, project: 98 } },
  { id: 5, classId: 2, name: "Jessica Taylor", avatar: "JT", status: 'Excused', grades: { quiz1: 88, mid: 90, project: 85 } },
  { id: 6, classId: 3, name: "David Brown", avatar: "DB", status: 'Present', grades: { quiz1: 72, mid: 68, project: 75 } },
];

const STATUS_OPTIONS = [
  { label: 'Present', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { label: 'Late', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { label: 'Sick', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { label: 'Excused', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { label: 'Absent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

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

const mapClassRow = (row) => ({
  id: row.id,
  type: row.type,
  name: row.name,
  subtitle: row.subtitle,
});

const mapStudentRow = (row) => ({
  id: row.id,
  classId: row.class_id,
  name: row.name,
  avatar: row.avatar || buildAvatar(row.name),
  email: row.email || '',
  gender: row.gender || '',
  studentNumber: row.student_number || '',
  status: normalizeStatus(row.status),
  attendanceTime: row.attendance_time || null,
  grades: {
    quiz1: safeNumber(row.quiz1),
    mid: safeNumber(row.mid),
    project: safeNumber(row.project),
  },
});

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
    <div className="flex items-center justify-center min-h-screen w-full relative z-10 p-4">
      <div className="macos-glass-panel p-8 md:p-10 rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden group border-white/20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-sm"></div>

        <div className="flex flex-col items-center mb-8">
          <img
            src={attendifyLogo}
            alt="Attendify logo"
            className="w-16 h-16 rounded-2xl shadow-lg mb-4 transform transition-transform group-hover:scale-105 duration-300"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendify</h1>
          <p className="text-sm text-gray-400 mt-1">Class Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 ml-1 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 macos-input outline-none focus:ring-1 focus:ring-blue-500/50"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 ml-1 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-gray-500 macos-input outline-none focus:ring-1 focus:ring-blue-500/50"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
  if (!isOpen) return null;
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-[#1e1e1e] border border-white/20 rounded-xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden animate-in zoom-in-95 duration-200 relative z-50`}>
        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
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
              <Mail size={12} /> Email
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

const DashboardView = ({ students, activeClass, allClasses }) => {
  const classStudents = students.filter(s => s.classId === activeClass.id);
  const presentCount = classStudents.filter(s => s.status === 'Present').length;
  const lateCount = classStudents.filter(s => s.status === 'Late').length;
  const sickCount = classStudents.filter(s => s.status === 'Sick').length;
  const permitCount = classStudents.filter(s => s.status === 'Excused').length;
  const absentCount = classStudents.filter(s => s.status === 'Absent').length;
  const attendanceRate = classStudents.length ? Math.round((presentCount / classStudents.length) * 100) : 0;
  
  const totalAvg = classStudents.reduce((acc, s) => acc + (s.grades.quiz1 + s.grades.mid + s.grades.project) / 3, 0);
  const classAvg = classStudents.length ? Math.round(totalAvg / classStudents.length) : 0;

  // Get top performing students
  const topStudents = [...classStudents]
    .map(s => ({ ...s, avg: Math.round((s.grades.quiz1 + s.grades.mid + s.grades.project) / 3) }))
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

const AttendanceView = ({ students, activeClass, onUpdateStatus }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const classStudents = students.filter(s => s.classId === activeClass.id);

  return (
    <div className="flex flex-col h-full animate-slide-in">
      <div className="macos-glass-panel rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase">Attendance: {activeClass.name}</span>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Calendar size={12} /> {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
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
              {classStudents.map((student) => {
                const currentStatus = STATUS_OPTIONS.find(s => s.label === student.status) || STATUS_OPTIONS[0];
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
                        {student.status}
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
                                  onUpdateStatus(student.id, opt.label);
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-blue-500 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${opt.label === student.status ? 'bg-white' : 'bg-transparent'}`} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6 text-sm text-gray-500">
                      {formatAttendanceTime(student.attendanceTime)}
                    </td>
                  </tr>
                );
              })}
              {classStudents.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500 text-sm">No students in this class yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StudentsDataView = ({ students, activeClass, onAddStudent, onDeleteStudent, onEditStudent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    gender: '',
    studentNumber: '',
  });
  const classStudents = students.filter(s => s.classId === activeClass.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditMode) {
      onEditStudent(formData.id, formData);
    } else {
      onAddStudent(activeClass.id, formData);
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
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setFormData({ id: '', name: '', email: '', gender: '', studentNumber: '' });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full animate-slide-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Students: {activeClass.name}</h2>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="macos-glass-panel rounded-xl overflow-hidden flex-1">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-gray-400 text-xs uppercase font-medium">
              <th className="p-4 pl-6">Student No.</th>
              <th className="p-4">Full Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Gender</th>
              <th className="p-4 text-right pr-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {classStudents.map((student) => (
              <tr key={student.id} className="hover:bg-white/5 group">
                <td className="p-4 pl-6 text-gray-500 text-sm">{student.studentNumber || '-'}</td>
                <td className="p-4 text-gray-200 text-sm font-medium">{student.name}</td>
                <td className="p-4 text-gray-300 text-sm">{student.email || '-'}</td>
                <td className="p-4 text-gray-300 text-sm">{student.gender || '-'}</td>
                <td className="p-4 text-right pr-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(student)} className="p-1.5 rounded-md bg-white/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => onDeleteStudent(student.id)} className="p-1.5 rounded-md bg-white/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
             {classStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">No student data.</td>
                </tr>
              )}
          </tbody>
        </table>
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none transition-all"
            >
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
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
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-500 font-medium shadow-lg shadow-blue-600/20 transition-colors">Save</button>
          </div>
        </form>
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
const ScheduleView = ({ schedules, classes, onAddSchedule, onEditSchedule, onDeleteSchedule }) => {
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
  const classById = useMemo(() => new Map(classes.map(cls => [cls.id, cls])), [classes]);

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
    const [hours, minutes] = time.split(':').map(Number);
    const [startHour, startMinute] = TIME_SLOTS[0].split(':').map(Number);
    const startMinutes = (startHour * 60) + startMinute;
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
                const daySchedules = schedules.filter((schedule) => {
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

const ClassManager = ({ classes, activeClassId, setActiveClassId, onAddClass, onDeleteClass }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', subtitle: '', type: 'subject' });

  const handleAdd = (e) => {
    e.preventDefault();
    onAddClass(newClass);
    setNewClass({ name: '', subtitle: '', type: 'subject' });
    setIsAdding(false);
  };

  const homeroomClasses = classes.filter(c => c.type === 'homeroom');
  const subjectClasses = classes.filter(c => c.type === 'subject');

  const ClassList = ({ items, title, icon: Icon }) => (
    <div className="mb-4">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 px-2 flex items-center gap-1">
        <Icon size={10} /> {title}
      </h3>
      <div className="space-y-1">
        {items.map(cls => (
          <div key={cls.id} className="group relative flex items-center">
            <button
              onClick={() => setActiveClassId(cls.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex flex-col ${
                activeClassId === cls.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className="font-medium">{cls.name}</span>
              <span className="text-[10px] opacity-70 truncate">{cls.subtitle}</span>
            </button>
            {classes.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteClass(cls.id); }}
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

  const activeClass = classes.find(c => c.id === activeClassId) || classes[0] || null;

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

  const updateStudentStatus = async (id, newStatus) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const shouldStamp = newStatus === 'Present' || newStatus === 'Late';
    const attendanceTime = shouldStamp ? getNowIso() : null;

    const { error } = await supabase
      .from('students')
      .update({ status: newStatus, attendance_time: attendanceTime })
      .eq('id', id);

    if (error) {
      setDataError('Failed to save attendance.');
      return;
    }

    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, attendanceTime } : s));
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
      .insert({ name: trimmedName, subtitle: trimmedSubtitle, type: clsData.type })
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

  const deleteClass = async (id) => {
    if (classes.length <= 1) return;
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      setDataError('Failed to delete class.');
      return;
    }

    const nextClasses = classes.filter(c => c.id !== id);
    setClasses(nextClasses);
    setStudents(prev => prev.filter(s => s.classId !== id));
    setActiveClassId(prev => (prev === id ? (nextClasses[0]?.id ?? null) : prev));
  };

  const addStudent = async (classId, formData) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }
    if (!classId) return;

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedGender = formData.gender.trim();
    const trimmedStudentNumber = formData.studentNumber.trim();
    if (!trimmedName || !trimmedEmail || !trimmedGender || !trimmedStudentNumber) return;

    const avatar = buildAvatar(trimmedName);
    const attendanceTime = getNowIso();
    const { data, error } = await supabase
      .from('students')
      .insert({
        class_id: classId,
        name: trimmedName,
        avatar,
        email: trimmedEmail,
        gender: trimmedGender,
        student_number: trimmedStudentNumber,
        status: 'Present',
        attendance_time: attendanceTime,
        quiz1: 0,
        mid: 0,
        project: 0,
      })
      .select()
      .single();

    if (error) {
      setDataError('Failed to add student.');
      return;
    }

    setStudents(prev => [...prev, mapStudentRow(data)]);
  };

  const editStudent = async (id, formData) => {
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedGender = formData.gender.trim();
    const trimmedStudentNumber = formData.studentNumber.trim();
    if (!trimmedName || !trimmedEmail || !trimmedGender || !trimmedStudentNumber) return;

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
      setDataError('Failed to update student.');
      return;
    }

    setStudents(prev => prev.map(s => s.id === id ? { 
      ...s, 
      name: trimmedName, 
      avatar,
      email: trimmedEmail,
      gender: trimmedGender,
      studentNumber: trimmedStudentNumber,
    } : s));
  };

  const deleteStudent = async (id) => {
    if (!confirm('Delete this student?')) return;
    if (!supabase) {
      setDataError('Supabase is not configured.');
      return;
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      setDataError('Failed to delete student.');
      return;
    }

    setStudents(prev => prev.filter(s => s.id !== id));
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

    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'schedule', icon: Calendar, label: 'Schedule' },
    { id: 'attendance', icon: Users, label: 'Attendance' },
    { id: 'students', icon: School, label: 'Students' }, 
    { id: 'grades', icon: BookOpen, label: 'Grades' },
  ];

  return (
    <div className="w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden border border-white/20 relative animate-in zoom-in-95 duration-300 z-10 backdrop-blur-sm">
        
        <aside className="w-64 macos-sidebar flex flex-col shrink-0 z-20">
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
          />

          <div className="px-4 mt-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Menu</h2>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id ? 'nav-item-active' : 'text-gray-300 nav-item-inactive'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-white/10">
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
          <header className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-white">{navItems.find(n => n.id === activeTab)?.label}</h1>
              <span className="text-[10px] text-gray-400">
                {activeClass ? `${activeClass.name} - ${activeClass.subtitle}` : 'No classes yet'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-black/20 border border-transparent focus:border-blue-500/50 hover:bg-black/30 text-white text-xs rounded-md pl-9 pr-3 py-1.5 w-48 transition-all outline-none"
                />
              </div>
              <button className="p-1.5 rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors relative">
                <Bell size={16} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {isLoadingData && (
              <div className="macos-glass-panel rounded-xl p-6 flex items-center gap-3 text-gray-300 text-sm">
                <Loader2 size={18} className="animate-spin" />
                Loading data...
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
                {activeTab === 'dashboard' && <DashboardView students={students} activeClass={activeClass} />}
                {activeTab === 'schedule' && (
                  <ScheduleView 
                    schedules={schedules} 
                    classes={classes} 
                    onAddSchedule={addSchedule}
                    onEditSchedule={editSchedule}
                    onDeleteSchedule={deleteSchedule}
                  />
                )}
                {activeTab === 'attendance' && <AttendanceView students={students} activeClass={activeClass} onUpdateStatus={updateStudentStatus} />}
                {activeTab === 'students' && (
                  <StudentsDataView 
                    students={students} 
                    activeClass={activeClass} 
                    onAddStudent={addStudent}
                    onDeleteStudent={deleteStudent}
                    onEditStudent={editStudent}
                  />
                )}
                {activeTab === 'grades' && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Fitur Grades akan menggunakan logika yang sama dengan Students.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
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
      <div className="min-h-screen macos-wallpaper dark flex items-center justify-center p-2 md:p-8 overflow-hidden font-sans relative">
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
    <div className="min-h-screen macos-wallpaper dark flex items-center justify-center p-2 md:p-8 overflow-hidden font-sans relative">
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
        {isAuthenticated ? (
          <MainDashboard onLogout={handleLogout} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </motion.div>
    </div>
  );
};

export default App;
