import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import {
  buildAttendanceRecordMap,
  getNowIso,
  getTodayKey,
} from '../lib/attendify-utils';

const useAttendance = ({ attendanceDate, activeClassId, students, addNotification, setDataError }) => {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [todayAttendanceRecords, setTodayAttendanceRecords] = useState({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

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
        .select('student_id,status,attendance_time,comment')
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
  }, [attendanceDate, activeClassId, setDataError]);

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
        .select('student_id,status,attendance_time,comment')
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
  }, [activeClassId, setDataError]);

  const updateStudentStatus = async (id, newStatus, dateKey = attendanceDate, comment) => {
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
    const commentStatuses = new Set(['Sick', 'Excused', 'Unexcused']);
    const needsComment = commentStatuses.has(newStatus);
    const existingRecord = targetDate === attendanceDate
      ? attendanceRecords[String(id)]
      : (targetDate === getTodayKey() ? todayAttendanceRecords[String(id)] : null);
    const existingComment = existingRecord?.comment ? existingRecord.comment : null;
    let nextComment = null;
    if (needsComment) {
      if (comment === undefined) {
        nextComment = existingComment;
      } else {
        const trimmed = String(comment || '').trim();
        nextComment = trimmed ? trimmed : null;
      }
    }

    const { error: historyError } = await supabase
      .from('attendance_records')
      .upsert({
        student_id: id,
        class_id: classId,
        attendance_date: targetDate,
        status: newStatus,
        attendance_time: attendanceTime,
        comment: nextComment,
      }, { onConflict: 'student_id,class_id,attendance_date' });

    if (historyError) {
      setDataError('Failed to save attendance history.');
      return;
    }

    if (targetDate === attendanceDate) {
      setAttendanceRecords(prev => ({
        ...prev,
        [String(id)]: { status: newStatus, attendanceTime, comment: nextComment },
      }));
    }

    if (targetDate === getTodayKey()) {
      setTodayAttendanceRecords(prev => ({
        ...prev,
        [String(id)]: { status: newStatus, attendanceTime, comment: nextComment },
      }));
    }

    const studentName = student?.name || 'Student';
    addNotification(`Attendance ${targetDate}: ${studentName} - ${newStatus}`, 'attendance');
  };

  return {
    attendanceRecords,
    todayAttendanceRecords,
    isAttendanceLoading,
    updateStudentStatus,
  };
};

export { useAttendance };
