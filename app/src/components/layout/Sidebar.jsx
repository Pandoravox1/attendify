import { useState } from 'react';
import attendifyLogo from '../../assets/attendify-logo.png';
import { Briefcase, Edit3, Home, Loader2, LogIn, Plus, Trash2 } from 'lucide-react';

import { Modal } from '../ui/modal';

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
              type="button"
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
                type="button"
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
        <button type="button" onClick={() => setIsAdding(!isAdding)} className="text-gray-400 hover:text-white transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-4 bg-white/5 p-3 rounded-lg animate-in fade-in slide-in-from-top-2 border border-white/10">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setNewClass({ ...newClass, type: 'homeroom', subtitle: 'Homeroom' })}
              className={`flex-1 text-[10px] py-1 rounded border transition-colors ${newClass.type === 'homeroom' ? 'bg-sky-500/20 border-sky-500 text-sky-400' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
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
            className="w-full bg-black/30 text-xs text-white px-2 py-1.5 rounded mb-2 border border-white/10 focus:border-sky-500 outline-none placeholder:text-gray-600"
            value={newClass.name}
            onChange={e => setNewClass({ ...newClass, name: e.target.value })}
            required
          />
          <input
            placeholder={newClass.type === 'homeroom' ? 'Description' : 'Subject'}
            className="w-full bg-black/30 text-xs text-white px-2 py-1.5 rounded mb-2 border border-white/10 focus:border-sky-500 outline-none placeholder:text-gray-600"
            value={newClass.subtitle}
            onChange={e => setNewClass({ ...newClass, subtitle: e.target.value })}
            required
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 text-gray-400 text-xs py-1.5 rounded hover:bg-white/10">Cancel</button>
            <button type="submit" className="flex-1 bg-sky-600/80 text-white text-xs py-1.5 rounded hover:bg-sky-600 shadow-sm">Save</button>
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
    </div>
  );
};

const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  classes,
  activeClassId,
  setActiveClassId,
  onAddClass,
  onDeleteClass,
  onEditProfile,
  onLogout,
  isLoadingData,
  teacherProfile,
}) => (
    <>
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
          <img src={attendifyLogo.src} alt="Attendify logo" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-lg text-white tracking-tight">Attendify</span>
        </div>

        <ClassManager
          classes={classes}
          activeClassId={activeClassId}
          setActiveClassId={setActiveClassId}
          onAddClass={onAddClass}
          onDeleteClass={onDeleteClass}
          onSelectClass={() => setIsSidebarOpen(false)}
        />

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
                <div className="w-8 h-8 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 shadow-inner flex items-center justify-center text-xs font-bold text-white">
                  {teacherProfile.avatar}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{teacherProfile.name}</p>
                <p className="text-[10px] text-gray-400 truncate">ID: {teacherProfile.nip}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="text-gray-400 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                  title="Edit Profile"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                  title="Sign out"
                >
                  <LogIn size={14} className="transform rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
    </aside>
  </>
);

export { Sidebar };
