import { supabase } from '../lib/supabaseClient';
import {
  DEFAULT_ASSESSMENTS,
  buildAvatar,
  mapStudentRow,
  normalizeZeroExclusions,
  normalizeZeroExclusionNotes,
} from '../lib/attendify-utils';

const useStudents = ({ students, setStudents, classes, activeClass, addNotification, setDataError }) => {
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

  return {
    refreshStudents,
    addStudent,
    importStudents,
    editStudent,
    deleteStudent,
    deleteStudentsBatch,
    updateGrades,
    importGrades,
  };
};

export { useStudents };
