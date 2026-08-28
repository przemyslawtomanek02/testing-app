import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, FileText, HelpCircle, Plus, Loader, Save } from 'lucide-react';
import CourseContentPageEditor from './CourseContentPageEditor.jsx';
import CourseQuestionPageEditor from './CourseQuestionPageEditor.jsx';
import DeletePopup from '../OverlayComponents/DeletePopup.jsx';
import { useAppContext } from '../../../AppContext.jsx';

export default function CourseBuilderPanel({ courseId, onBack, setOverlay, setOverlayImage }) {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:       dk ? '#0F1117' : '#F4F6FB',
        surface:  dk ? '#171B2D' : '#FFFFFF',
        surface2: dk ? '#1E2237' : '#F4F6FB',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#94A3B8',
        inputBg:  dk ? '#1E2237' : '#FFFFFF',
    };

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPageId, setSelectedPageId] = useState(null);
    const [addingType, setAddingType] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [savingMeta, setSavingMeta] = useState(false);

    const fetchCourse = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/courses/${courseId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCourse(data);
            setTitle(data.title || '');
            setDescription(data.description || '');
            setIsPublished(!!data.is_published);
            setSelectedPageId(prev => (data.pages.some(p => p.page_id === prev) ? prev : (data.pages[0]?.page_id ?? null)));
        } catch {
            toast.error('Failed to load course.');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => { void fetchCourse(); }, [fetchCourse]);

    const handleSaveMeta = async () => {
        setSavingMeta(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('is_published', isPublished);
        try {
            const res = await fetch(`/api/admin/courses/${courseId}`, { method: 'PUT', body: formData });
            if (!res.ok) throw new Error();
            toast.success('Course updated.');
            void fetchCourse();
        } catch {
            toast.error('Failed to update course.');
        } finally {
            setSavingMeta(false);
        }
    };

    const handlePageSaved = () => {
        setAddingType(null);
        void fetchCourse();
    };

    const handleDeletePage = (pageId) => {
        setOverlay(<DeletePopup onConfirm={() => doDeletePage(pageId)} onCancel={() => setOverlay(null)}/>);
    };
    const doDeletePage = async (pageId) => {
        try {
            const res = await fetch(`/api/admin/courses/${courseId}/pages/${pageId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Page deleted.');
            if (selectedPageId === pageId) setSelectedPageId(null);
            void fetchCourse();
        } catch {
            toast.error('Failed to delete page.');
        } finally {
            setOverlay(null);
        }
    };

    const movePage = async (index, direction) => {
        if (!course) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= course.pages.length) return;

        const pages = [...course.pages];
        [pages[index], pages[targetIndex]] = [pages[targetIndex], pages[index]];
        setCourse(c => ({ ...c, pages }));

        try {
            const res = await fetch(`/api/admin/courses/${courseId}/pages/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pages.map((p, i) => ({ page_id: p.page_id, order_index: i }))),
            });
            if (!res.ok) throw new Error();
        } catch {
            toast.error('Failed to reorder pages.');
            void fetchCourse();
        }
    };

    const inputStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '12px',
        border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    };

    if (loading || !course) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
                <Loader size={32} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
            </div>
        );
    }

    const selectedPage = course.pages.find(p => p.page_id === selectedPageId) || null;

    return (
        <div style={{ padding: '28px', minHeight: '100%', background: T.bg }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <button
                        onClick={onBack}
                        style={{
                            width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`,
                            background: T.surface, cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: T.textSec,
                        }}
                    >
                        <ArrowLeft size={16}/>
                    </button>
                    <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>Edit Course</h1>
                </div>

                {/* Course meta */}
                <div style={{
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: '22px',
                    padding: '20px', marginBottom: '20px', display: 'grid',
                    gridTemplateColumns: '2fr 2fr auto auto', gap: '16px', alignItems: 'end',
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle}/>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Description</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle}/>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.text, paddingBottom: '9px', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#2B73FF' }}/>
                        Published
                    </label>
                    <button
                        onClick={handleSaveMeta}
                        disabled={savingMeta}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', height: '38px',
                            background: savingMeta ? T.textMuted : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                            color: '#FFFFFF', fontWeight: '600', padding: '0 18px', borderRadius: '999px',
                            border: 'none', cursor: savingMeta ? 'not-allowed' : 'pointer', fontSize: '13px',
                        }}
                    >
                        {savingMeta ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>}
                        Save
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
                    {/* Page list */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '22px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: T.textSec, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                            Pages ({course.pages.length})
                        </h3>

                        {course.pages.map((p, i) => {
                            const isSelected = !addingType && p.page_id === selectedPageId;
                            const label = p.page_type === 'content'
                                ? (p.title || 'Untitled page')
                                : (p.title || p.question?.question || 'Question');
                            return (
                                <div
                                    key={p.page_id}
                                    onClick={() => { setSelectedPageId(p.page_id); setAddingType(null); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px',
                                        borderRadius: '12px', cursor: 'pointer',
                                        background: isSelected ? (dk ? 'rgba(43,115,255,0.14)' : '#EEF4FF') : 'transparent',
                                        border: `1px solid ${isSelected ? '#2B73FF' : 'transparent'}`,
                                    }}
                                >
                                    {p.page_type === 'content' ? <FileText size={14} style={{ color: T.textMuted, flexShrink: 0 }}/> : <HelpCircle size={14} style={{ color: T.textMuted, flexShrink: 0 }}/>}
                                    <span style={{ fontSize: '13px', color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {i + 1}. {label}
                                    </span>
                                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                        <button onClick={e => { e.stopPropagation(); movePage(i, -1); }} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', color: T.textMuted, opacity: i === 0 ? 0.4 : 1, padding: '3px' }}><ArrowUp size={12}/></button>
                                        <button onClick={e => { e.stopPropagation(); movePage(i, 1); }} disabled={i === course.pages.length - 1} style={{ background: 'none', border: 'none', cursor: i === course.pages.length - 1 ? 'not-allowed' : 'pointer', color: T.textMuted, opacity: i === course.pages.length - 1 ? 0.4 : 1, padding: '3px' }}><ArrowDown size={12}/></button>
                                        <button onClick={e => { e.stopPropagation(); handleDeletePage(p.page_id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: '3px' }}><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${T.border}` }}>
                            <button
                                onClick={() => { setSelectedPageId(null); setAddingType('content'); }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '10px', border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSec, cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                            >
                                <Plus size={13}/> Content
                            </button>
                            <button
                                onClick={() => { setSelectedPageId(null); setAddingType('question'); }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '10px', border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSec, cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                            >
                                <Plus size={13}/> Question
                            </button>
                        </div>
                    </div>

                    {/* Editor */}
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '22px', padding: '20px' }}>
                        {addingType === 'content' && (
                            <CourseContentPageEditor courseId={courseId} pageId={null} showOverlay={setOverlayImage} onSaved={handlePageSaved}/>
                        )}
                        {addingType === 'question' && (
                            <CourseQuestionPageEditor courseId={courseId} pageId={null} showOverlay={setOverlayImage} onSaved={handlePageSaved}/>
                        )}
                        {!addingType && selectedPage?.page_type === 'content' && (
                            <CourseContentPageEditor
                                key={selectedPage.page_id}
                                courseId={courseId}
                                pageId={selectedPage.page_id}
                                initialTitle={selectedPage.title}
                                initialMarkdown={selectedPage.content_markdown}
                                initialImagePath={selectedPage.image}
                                showOverlay={setOverlayImage}
                                onSaved={handlePageSaved}
                            />
                        )}
                        {!addingType && selectedPage?.page_type === 'question' && (
                            <CourseQuestionPageEditor
                                key={selectedPage.page_id}
                                courseId={courseId}
                                pageId={selectedPage.page_id}
                                initialLabel={selectedPage.title}
                                initialQuestion={selectedPage.question}
                                initialImagePath={selectedPage.question?.image}
                                showOverlay={setOverlayImage}
                                onSaved={handlePageSaved}
                            />
                        )}
                        {!addingType && !selectedPage && (
                            <div style={{ textAlign: 'center', padding: '80px 0', color: T.textMuted, fontSize: '14px' }}>
                                Select a page on the left, or add a new one to get started.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
