import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Edit3, FileUp, Loader2, Maximize2, Minimize2, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';

import { Modal } from '../../components/ui/modal';
import { supabase } from '../../lib/supabaseClient';
import {
  ATTITUDE_OPTIONS,
  DEFAULT_ASSESSMENTS,
  calculateGradesAverage,
  getGradesAverageInfo,
  getAttitudeLabel,
  getAttitudeScore,
  isSameClassId,
  normalizeHeaderKey,
  normalizeSearchValue,
  normalizeZeroExclusions,
  normalizeZeroExclusionNotes,
  safeNumber,
} from '../../lib/attendify-utils';
import {
  enforceSheetLimits,
  getSafeXlsxReadOptions,
  sanitizeHeaderRow,
  validateXlsxFile,
} from '../../lib/xlsx-utils';

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
      setImportError('Please select an .xlsx file first.');
      return;
    }
    const fileCheck = validateXlsxFile(fileToImport);
    if (!fileCheck.ok) {
      setImportError(fileCheck.message);
      return;
    }
    if (!onImportGrades) {
      setImportError('Import is not available yet.');
      return;
    }
    if (isImporting) return;

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
      const findIndex = (candidates) => (
        candidates.map(normalizeHeaderKey).map(key => normalizedHeaders.indexOf(key)).find(idx => idx >= 0) ?? -1
      );
      const studentNumberIndex = findIndex(['studentnumber', 'studentno', 'studentid', 'nis', 'nisn', 'noinduk']);
      const nameIndex = findIndex(['fullname', 'name', 'studentname', 'nama', 'namalengkap']);
      const attitudeIndex = findIndex(['attitude', 'sikap', 'attitudevalue']);

      if (nameIndex === -1 || attitudeIndex === -1) {
        setImportError('Required headers: Full Name and Attitude.');
        setIsImporting(false);
        return;
      }

      const assessmentColumns = headerRow
        .map((header, index) => ({ header, index }))
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
          setImportError(result.message || 'Failed to update assessment types.');
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
        setImportError('No valid grade data.');
        setIsImporting(false);
        return;
      }

      const result = await onImportGrades(updates);
      if (result && result.ok === false) {
        setImportError(result.message || 'Failed to import grades.');
        setIsImporting(false);
        return;
      }

      const skippedInfo = skipped ? ` (${skipped} incomplete rows)` : '';
      const notFoundInfo = notFound ? ` (${notFound} students not found)` : '';
      setImportSummary(`Successfully imported grades for ${updates.length} students${skippedInfo}${notFoundInfo}.`);
      setIsImporting(false);
    } catch (error) {
      setImportError('Failed to read file.');
      setIsImporting(false);
    }
  };

  const getGradeColor = (avg) => {
    if (avg >= 90) return 'text-sky-400';
    if (avg >= 75) return 'text-sky-400';
    if (avg >= 60) return 'text-yellow-400';
    if (avg >= 45) return 'text-orange-400';
    return 'text-red-400';
  };

  const getGradeBadge = (avg) => {
    if (avg >= 95) return { label: 'A', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
    if (avg >= 90) return { label: 'A-', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
    if (avg >= 85) return { label: 'B+', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
    if (avg >= 80) return { label: 'B', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
    if (avg >= 75) return { label: 'B-', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
    if (avg >= 70) return { label: 'C+', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (avg >= 65) return { label: 'C', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (avg >= 60) return { label: 'C-', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (avg >= 55) return { label: 'D+', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    if (avg >= 50) return { label: 'D', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    if (avg >= 45) return { label: 'D-', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    return { label: 'F', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const getAttitudeBadge = (value) => {
    if (value === 'EE') return { label: 'EE', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
    if (value === 'ME') return { label: 'ME', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
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
    <div className={`macos-glass-panel overflow-hidden flex flex-col ${isExpanded ? 'h-full rounded-none' : 'rounded-xl flex-1 min-h-0'}`}>
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
                      className="p-1.5 rounded-md bg-white/10 text-sky-400 hover:bg-sky-500/20 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
            className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setIsGradesExpanded(false)}
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
            <span className="text-sky-300">{importSummary}</span>
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
          <p className="text-xl font-bold text-sky-400">{classStats.attitudeLabel}</p>
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
              className="w-full md:w-48 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:border-sky-500 outline-none transition-all"
              placeholder="Add assessment"
            />
            <button type="submit" className="px-3 py-2 rounded-lg text-xs bg-sky-600 text-white hover:bg-sky-500 transition-colors">
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
                        ? 'bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-600/20'
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
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-base font-semibold text-center focus:border-sky-500 outline-none transition-all"
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
              <span className="text-sky-400">A: 95-100</span>
              <span className="text-sky-400">A-: 90-94</span>
              <span className="text-sky-400">B+: 85-89</span>
              <span className="text-sky-400">B: 80-84</span>
              <span className="text-sky-400">B-: 75-79</span>
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all resize-none"
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
              className="px-3 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-500 font-medium shadow-lg shadow-sky-600/20 transition-colors flex items-center gap-2 disabled:opacity-70"
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
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none transition-all"
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

export { GradesView };
