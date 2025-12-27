const DEFAULT_ASSESSMENTS = ['Quiz', 'Midterm', 'Project'];
const ATTITUDE_OPTIONS = ['EE', 'ME', 'DME'];
const ATTITUDE_SCORES = { EE: 3, ME: 2, DME: 1 };

const STATUS_OPTIONS = [
  { label: 'Present', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { label: 'Late', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { label: 'Sick', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
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
    'Tanpa keterangan': 'Unexcused',
    'Tanpa Keterangan': 'Unexcused',
    Absen: 'Absent',
    Present: 'Present',
    Late: 'Late',
    Sick: 'Sick',
    Excused: 'Excused',
    Unexcused: 'Unexcused',
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
      comment: row.comment ?? '',
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

export {
  DEFAULT_ASSESSMENTS,
  ATTITUDE_OPTIONS,
  ATTITUDE_SCORES,
  STATUS_OPTIONS,
  STATUS_EMPTY_OPTION,
  buildAvatar,
  formatAttendanceTime,
  getNowIso,
  safeNumber,
  isSameClassId,
  normalizeAssessmentTypes,
  normalizeZeroExclusions,
  normalizeZeroExclusionNotes,
  getGradesAverageInfo,
  calculateGradesAverage,
  getAttitudeScore,
  getAttitudeLabel,
  normalizeStatus,
  formatLocalDateKey,
  getTodayKey,
  parseLocalDateKey,
  buildDateRangeList,
  getWeekRange,
  getMonthRange,
  getExportRange,
  formatDayLabel,
  normalizeSearchValue,
  normalizeHeaderKey,
  mapClassRow,
  mapStudentRow,
  buildAttendanceRecordMap,
  normalizeTimeValue,
  mapScheduleRow,
};
