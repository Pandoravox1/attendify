import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { getLocalTimeZone, parseDate } from '@internationalized/date';
import { Calendar as CalendarIcon, ChevronDown, Download, Loader2, Maximize2, Minimize2 } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Calendar as CalendarRac } from '../../components/ui/calendar-rac';
import { Modal } from '../../components/ui/modal';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { supabase } from '../../lib/supabaseClient';
import {
  STATUS_OPTIONS,
  STATUS_EMPTY_OPTION,
  buildDateRangeList,
  formatAttendanceTime,
  formatDayLabel,
  getMonthRange,
  getExportRange,
  isSameClassId,
  normalizeSearchValue,
  parseLocalDateKey,
} from '../../lib/attendify-utils';
import { downloadCsv } from '../../lib/csv-utils';

const COMMENT_STATUSES = new Set(['Sick', 'Excused', 'Unexcused']);

const AttendanceDatePicker = ({ value, onChange }) => {
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 bg-black/30 border-white/20 text-gray-200 hover:bg-black/40 hover:text-white"
        >
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="macos-glass-panel w-auto overflow-hidden rounded-xl p-2 text-white"
      >
        <CalendarRac
          mode="single"
          selected={dateValue}
          captionLayout="dropdown"
          className="rounded-lg border border-white/10 bg-black/30 p-2 text-white"
          isDateUnavailable={(date) => date.toDate(getLocalTimeZone()).getDay() === 0}
          onChange={(nextDate) => {
            if (!nextDate) return;
            onChange(nextDate.toString());
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

const AttendanceRangeDateInput = ({ label, value, onChange }) => {
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
    <div className="space-y-1">
      <span className="text-xs text-gray-400">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start bg-black/30 border-white/20 text-gray-200 hover:bg-black/40 hover:text-white"
          >
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="macos-glass-panel w-auto overflow-hidden rounded-xl p-2 text-white"
        >
          <CalendarRac
            mode="single"
            selected={dateValue}
            captionLayout="dropdown"
            className="rounded-lg border border-white/10 bg-black/30 p-2 text-white"
            isDateUnavailable={(date) => date.toDate(getLocalTimeZone()).getDay() === 0}
            onChange={(nextDate) => {
              if (!nextDate) return;
              onChange(nextDate.toString());
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
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
  const [commentDrafts, setCommentDrafts] = useState({});
  const [studentStats, setStudentStats] = useState({});
  const [isListExpanded, setIsListExpanded] = useState(false);
  const classStudents = useMemo(
    () => students.filter(s => isSameClassId(s.classId, activeClass.id)),
    [students, activeClass?.id]
  );
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
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_OPTIONS.map(option => [option.label, 0]));
    classStudents.forEach((student) => {
      const record = attendanceRecords?.[String(student.id)];
      const status = record?.status || STATUS_EMPTY_OPTION.label;
      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    });
    return counts;
  }, [classStudents, attendanceRecords]);
  const statusCards = useMemo(
    () => STATUS_OPTIONS.map(option => ({ ...option, count: statusCounts[option.label] ?? 0 })),
    [statusCounts]
  );
  const totalStudents = classStudents.length;
  const presentCount = statusCounts.Present ?? 0;
  const lateCount = statusCounts.Late ?? 0;
  const attendedCount = presentCount + lateCount;
  const attendanceRate = totalStudents ? Math.round((attendedCount / totalStudents) * 100) : 0;

  useEffect(() => {
    if (exportType === 'custom') return;
    setExportRange(getExportRange(exportType, attendanceDate));
  }, [exportType, attendanceDate]);

  useEffect(() => {
    let isMounted = true;

    const loadStudentStats = async () => {
      if (!supabase || !activeClass?.id || !attendanceDate) {
        if (isMounted) setStudentStats({});
        return;
      }

      const range = getMonthRange(attendanceDate);
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id,status')
        .eq('class_id', activeClass.id)
        .gte('attendance_date', range.start)
        .lte('attendance_date', range.end);

      if (!isMounted) return;
      if (error) {
        setStudentStats({});
        return;
      }

      const totals = {};
      const attended = {};
      (data || []).forEach((record) => {
        const key = String(record.student_id);
        totals[key] = (totals[key] || 0) + 1;
        if (record.status === 'Present' || record.status === 'Late') {
          attended[key] = (attended[key] || 0) + 1;
        }
      });

      const stats = {};
      Object.keys(totals).forEach((key) => {
        const total = totals[key];
        const attendedCount = attended[key] || 0;
        stats[key] = {
          total,
          attended: attendedCount,
          percent: total ? Math.round((attendedCount / total) * 100) : 0,
        };
      });
      setStudentStats(stats);
    };

    loadStudentStats();

    return () => {
      isMounted = false;
    };
  }, [activeClass?.id, attendanceDate]);

  useEffect(() => {
    const nextDrafts = {};
    classStudents.forEach((student) => {
      const record = attendanceRecords?.[String(student.id)];
      nextDrafts[student.id] = record?.comment ?? '';
    });
    setCommentDrafts(nextDrafts);
  }, [classStudents, attendanceRecords, attendanceDate]);


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
      setExportError('Invalid date range.');
      return;
    }
    if (!classStudents.length) {
      setExportError('No students in this class.');
      return;
    }

    setIsExporting(true);
    setExportError('');

    const { data, error } = await supabase
      .from('attendance_records')
      .select('student_id,attendance_date,status,attendance_time,comment')
      .eq('class_id', activeClass.id)
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('attendance_date', { ascending: true });

    if (error) {
      setExportError('Failed to load attendance data.');
      setIsExporting(false);
      return;
    }

    const recordMap = new Map();
    (data || []).forEach((record) => {
      recordMap.set(`${record.attendance_date}|${record.student_id}`, record);
    });

    const sortedExportStudents = [...classStudents].sort((a, b) => {
      const left = String(a.studentNumber || a.id);
      const right = String(b.studentNumber || b.id);
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    });

    const dateList = buildDateRangeList(start, end);
    const rows = [];
    dateList.forEach((dateKey) => {
      const dayLabel = formatDayLabel(dateKey);
      sortedExportStudents.forEach((student) => {
        const record = recordMap.get(`${dateKey}|${student.id}`);
        rows.push({
          Date: dateKey,
          Day: dayLabel,
          Class: activeClass.name,
          'Student No.': student.studentNumber || String(student.id),
          'Student Name': student.name,
          Status: record?.status || STATUS_EMPTY_OPTION.label,
          Time: record?.attendance_time ? formatAttendanceTime(record.attendance_time) : '',
          Comment: record?.comment || '',
        });
      });
    });

    const headers = ['Date', 'Day', 'Class', 'Student No.', 'Student Name', 'Status', 'Time', 'Comment'];
    const csvRows = [
      headers,
      ...rows.map((row) => headers.map((key) => row[key] ?? '')),
    ];

    const safeClass = String(activeClass.name || 'class').replace(/[^a-z0-9-_]+/gi, '_');
    const fileName = start === end
      ? `attendance_${safeClass}_${start}.csv`
      : `attendance_${safeClass}_${start}_to_${end}.csv`;
    downloadCsv(csvRows, fileName);

    setIsExporting(false);
    setIsExportOpen(false);
  };

  const renderAttendanceList = (isExpanded) => (
    <div
      className={`macos-glass-panel overflow-hidden flex flex-col ${
        isExpanded ? 'h-full rounded-none' : 'rounded-xl flex-1 min-h-0'
      }`}
    >
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase">Student Attendance</span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{sortedStudents.length} Students</span>
          <button
            type="button"
            onClick={() => setIsListExpanded(!isExpanded)}
            className="p-1.5 rounded-md bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
            title={isExpanded ? 'Minimize view' : 'Maximize view'}
            aria-label={isExpanded ? 'Minimize attendance list' : 'Maximize attendance list'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1 min-h-0 pb-6">
        <div className="md:hidden space-y-3 px-4 pb-6">
          {sortedStudents.map((student) => {
            const record = attendanceRecords?.[String(student.id)];
            const displayStatus = record?.status || STATUS_EMPTY_OPTION.label;
            const displayTime = record?.attendanceTime || null;
            const commentValue = commentDrafts[student.id] ?? record?.comment ?? '';
            const needsComment = COMMENT_STATUSES.has(displayStatus);
            const stats = studentStats[String(student.id)];
            const currentStatus = STATUS_OPTIONS.find(s => s.label === displayStatus) || STATUS_EMPTY_OPTION;
            return (
              <div key={student.id} className="macos-glass-panel rounded-xl border border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-600 to-gray-500 flex items-center justify-center text-xs text-white font-medium shadow-sm">
                    {student.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{student.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">#{student.id}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === student.id ? null : student.id);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center justify-between gap-2 w-32 transition-all ${currentStatus.color} hover:brightness-110`}
                    >
                      {displayStatus}
                      <ChevronDown size={12} className="opacity-70" />
                    </button>

                    {openDropdown === student.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                        <div className="absolute top-10 left-0 z-20 w-40 bg-[#252525] border border-white/20 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => {
                                const nextNeedsComment = COMMENT_STATUSES.has(opt.label);
                                const nextComment = nextNeedsComment ? (commentDrafts[student.id] ?? record?.comment ?? '') : '';
                                setCommentDrafts((prev) => ({ ...prev, [student.id]: nextComment }));
                                onUpdateStatus(student.id, opt.label, attendanceDate, nextComment);
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-sky-500 hover:text-white flex items-center gap-2 transition-colors"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${opt.label === displayStatus ? 'bg-white' : 'bg-transparent'}`} />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="text-gray-500">Time</span>
                    <span>{formatAttendanceTime(displayTime)}</span>
                  </div>

                  <div className="ml-auto text-xs text-gray-300">
                    {stats ? (
                      <span>{stats.percent}% <span className="text-gray-500">({stats.attended}/{stats.total})</span></span>
                    ) : (
                      <span className="text-gray-500">%</span>
                    )}
                  </div>
                </div>

                {needsComment && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] text-gray-500">Comment (optional)</label>
                    <textarea
                      rows={2}
                      value={commentValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCommentDrafts((prev) => ({ ...prev, [student.id]: value }));
                      }}
                      onBlur={() => {
                        const trimmed = String(commentValue || '').trim();
                        const previous = String(record?.comment || '').trim();
                        if (trimmed === previous) return;
                        onUpdateStatus(student.id, displayStatus, attendanceDate, trimmed);
                      }}
                      className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-500 focus:border-sky-500 outline-none transition-colors"
                      placeholder="Add details..."
                    />
                  </div>
                )}
              </div>
            );
          })}
          {classStudents.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">No students in this class yet.</div>
          )}
          {classStudents.length > 0 && filteredStudents.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">No matching students.</div>
          )}
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#1e1e1e] z-10 shadow-md">
              <tr className="border-b border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wide">
                <th className="p-4 pl-6 w-16">ID</th>
                <th className="p-4">Student Name</th>
                <th className="p-4 w-48">Status</th>
                <th className="p-4 w-32 text-right">Attendance %</th>
                <th className="p-4 text-right pr-6">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedStudents.map((student) => {
                const record = attendanceRecords?.[String(student.id)];
                const displayStatus = record?.status || STATUS_EMPTY_OPTION.label;
                const displayTime = record?.attendanceTime || null;
                const commentValue = commentDrafts[student.id] ?? record?.comment ?? '';
                const needsComment = COMMENT_STATUSES.has(displayStatus);
                const stats = studentStats[String(student.id)];
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === student.id ? null : student.id);
                        }}
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
                                type="button"
                                onClick={() => {
                                  const nextNeedsComment = COMMENT_STATUSES.has(opt.label);
                                  const nextComment = nextNeedsComment ? (commentDrafts[student.id] ?? record?.comment ?? '') : '';
                                  setCommentDrafts((prev) => ({ ...prev, [student.id]: nextComment }));
                                  onUpdateStatus(student.id, opt.label, attendanceDate, nextComment);
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-sky-500 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${opt.label === displayStatus ? 'bg-white' : 'bg-transparent'}`} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {needsComment && (
                        <div className="mt-2 space-y-1">
                          <label className="text-[10px] text-gray-500">Comment (optional)</label>
                          <textarea
                            rows={2}
                            value={commentValue}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCommentDrafts((prev) => ({ ...prev, [student.id]: value }));
                            }}
                            onBlur={() => {
                              const trimmed = String(commentValue || '').trim();
                              const previous = String(record?.comment || '').trim();
                              if (trimmed === previous) return;
                              onUpdateStatus(student.id, displayStatus, attendanceDate, trimmed);
                            }}
                            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-500 focus:border-sky-500 outline-none transition-colors"
                            placeholder="Add details..."
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right text-sm text-gray-200">
                      {stats ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold">{stats.percent}%</span>
                          <span className="text-[10px] text-gray-500">{stats.attended}/{stats.total}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
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
                  <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">No students in this class yet.</td>
                </tr>
              )}
              {classStudents.length > 0 && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">No matching students.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const attendanceOverlay = typeof document !== 'undefined'
    ? createPortal(
      <AnimatePresence>
        {isListExpanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setIsListExpanded(false)}
          >
            <motion.div
              className="w-full h-full max-w-none"
              initial={{ opacity: 0, scale: 0.965, y: 26, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.985, y: -16, filter: 'blur(6px)' }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 26,
                mass: 0.9
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {renderAttendanceList(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 animate-slide-in">
      <div className="macos-glass-panel rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase">Attendance: {activeClass.name}</span>
          <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="px-2.5 py-1.5 rounded-md border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Download size={12} />
              Export
            </button>
            <div className="flex items-center gap-2">
              <CalendarIcon size={12} />
              <AttendanceDatePicker value={attendanceDate} onChange={onAttendanceDateChange} />
            </div>
            {isHistoryLoading && <span className="macos-spinner macos-spinner-sm" />}
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 border-b border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusCards.map((item) => (
              <div key={item.label} className={`rounded-lg border px-3 py-2 text-center ${item.color}`}>
                <div className="text-lg font-semibold">{item.count}</div>
                <div className="text-[10px] uppercase tracking-wide opacity-80">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>Attendance rate</span>
            <span>{attendanceRate}% ({attendedCount}/{totalStudents || 0})</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {!isListExpanded && renderAttendanceList(false)}
      </div>

      {attendanceOverlay}

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Attendance"
        size="lg"
      >
        <div className="space-y-4 text-sm text-gray-200">
          <div>
            <p className="text-xs text-gray-400 mb-2">Select export period</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'custom', label: 'Range' },
              ].map((option) => {
                const isActive = exportType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setExportType(option.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      isActive
                        ? 'bg-sky-600/80 border-sky-500 text-white'
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
                label="Start date"
                value={exportRange.start}
                onChange={(value) => setExportRange(prev => ({ ...prev, start: value }))}
              />
              <AttendanceRangeDateInput
                label="End date"
                value={exportRange.end}
                onChange={(value) => setExportRange(prev => ({ ...prev, end: value }))}
              />
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300">
              Date range: <span className="text-white">{exportRange.start}</span> to{' '}
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
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg text-xs bg-sky-600 text-white hover:bg-sky-500 font-semibold shadow-lg shadow-sky-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isExporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Export .csv
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { AttendanceView };
