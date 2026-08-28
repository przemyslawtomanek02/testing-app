import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FilePlus2, Trash2, Edit, Inbox, Loader, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import CourseBuilderPanel from './CourseBuilderPanel.jsx';
import DeletePopup from '../OverlayComponents/DeletePopup.jsx';
import formatDate from '../../Reusable/FormatDate.jsx';
import { useAppContext } from '../../../AppContext.jsx';

export default function CoursesPanel({ setOverlay, setOverlayImage }) {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:       dk ? '#0F1117' : '#F4F6FB',
        surface:  dk ? '#171B2D' : '#FFFFFF',
        border:   dk ? '#2A2F45' : '#EDF0F7',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#94A3B8',
        inputBg:  dk ? '#1E2237' : '#F4F6FB',
    };

    const [courses, setCourses] = useState(null);
    const [editingCourseId, setEditingCourseId] = useState(null);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchCourses = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/courses');
            if (!res.ok) throw new Error();
            setCourses(await res.json());
        } catch {
            toast.error('Failed to load courses.');
        }
    }, []);

    useEffect(() => { if (!editingCourseId) void fetchCourses(); }, [editingCourseId, fetchCourses]);

    const handleCreate = async () => {
        if (!newTitle.trim()) { toast.error('Title is required.'); return; }
        setIsCreating(true);
        const formData = new FormData();
        formData.append('title', newTitle);
        formData.append('description', '');
        try {
            const res = await fetch('/api/admin/courses/create', { method: 'POST', body: formData });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCreating(false);
            setNewTitle('');
            setEditingCourseId(data.course_id);
        } catch {
            toast.error('Failed to create course.');
        } finally {
            setIsCreating(false);
        }
    };

    const confirmDelete = (id) => setOverlay(<DeletePopup onConfirm={() => doDelete(id)} onCancel={() => setOverlay(null)}/>);
    const doDelete = async (id) => {
        try {
            const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Course deleted.');
            void fetchCourses();
        } catch {
            toast.error('Delete failed.');
        } finally {
            setOverlay(null);
        }
    };

    if (editingCourseId) {
        return (
            <CourseBuilderPanel
                courseId={editingCourseId}
                onBack={() => setEditingCourseId(null)}
                setOverlay={setOverlay}
                setOverlayImage={setOverlayImage}
            />
        );
    }

    if (!courses) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
                <Loader size={36} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
            </div>
        );
    }

    const inputStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '12px',
        border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    };

    return (
        <div style={{ padding: '28px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', minHeight: '100%', background: T.bg }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>E-learning</h1>
                    {!creating && (
                        <button
                            onClick={() => setCreating(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '7px', height: '36px',
                                background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                color: '#FFFFFF', fontWeight: '600', padding: '0 18px', borderRadius: '999px',
                                border: 'none', cursor: 'pointer', fontSize: '13px',
                                boxShadow: '0 4px 14px rgba(43,115,255,0.35)',
                            }}
                        >
                            <FilePlus2 size={14}/> New Course
                        </button>
                    )}
                </div>

                {creating && (
                    <div style={{ background: T.surface, borderRadius: '20px', border: `1px solid ${T.border}`, padding: '16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            autoFocus
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Course title"
                            style={inputStyle}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                        />
                        <button
                            onClick={handleCreate}
                            disabled={isCreating}
                            style={{
                                flexShrink: 0, height: '38px', padding: '0 18px', borderRadius: '999px', border: 'none',
                                background: isCreating ? T.textMuted : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                color: '#fff', fontWeight: '600', fontSize: '13px', cursor: isCreating ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isCreating ? 'Creating…' : 'Create'}
                        </button>
                        <button
                            onClick={() => { setCreating(false); setNewTitle(''); }}
                            style={{ flexShrink: 0, height: '38px', padding: '0 16px', borderRadius: '999px', border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSec, fontSize: '13px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {courses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {courses.map(course => (
                            <div
                                key={course.course_id}
                                style={{
                                    background: T.surface, borderRadius: '22px', border: `1.5px solid ${T.border}`,
                                    display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '14px',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {course.title}
                                    </div>
                                    <div style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>
                                        {course.description || 'No description'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0, paddingRight: '16px', borderRight: `1px solid ${T.border}` }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '17px', fontWeight: '700', color: T.text }}>{course.page_count}</div>
                                        <div style={{ fontSize: '11px', color: T.textMuted, fontWeight: 500 }}>Pages</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: course.is_published ? '#22C55E' : T.textMuted }}>
                                        {course.is_published ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                        {course.is_published ? 'Published' : 'Draft'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: T.textMuted }}>{formatDate(course.created_at)}</div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <button onClick={() => setEditingCourseId(course.course_id)} title="Edit" style={{ width: '34px', height: '34px', borderRadius: '999px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Edit size={16}/>
                                    </button>
                                    <button onClick={() => confirmDelete(course.course_id)} title="Delete" style={{ width: '34px', height: '34px', borderRadius: '999px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ background: T.surface, borderRadius: '24px', border: `1px solid ${T.border}`, padding: '72px 24px', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #EEF4FF, #DDE9FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                            <GraduationCap size={26} style={{ color: '#2B73FF' }}/>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: T.text, marginBottom: '6px' }}>No courses yet</div>
                        <div style={{ fontSize: '13px', color: T.textSec, marginBottom: '24px' }}>Create your first course to get started.</div>
                        <button
                            onClick={() => setCreating(true)}
                            style={{
                                height: '40px', borderRadius: '999px', border: 'none', padding: '0 24px',
                                display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: '600',
                                cursor: 'pointer', background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)', color: '#FFFFFF',
                            }}
                        >
                            <FilePlus2 size={15}/> New Course
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
