import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Save, Loader, UploadCloud, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppContext } from '../../../AppContext.jsx';

export default function CourseContentPageEditor({ courseId, pageId, initialTitle, initialMarkdown, initialImagePath, showOverlay, onSaved }) {
    const { darkMode: dk } = useAppContext();
    const T = {
        surface:  dk ? '#171B2D' : '#FFFFFF',
        surface2: dk ? '#1E2237' : '#F4F6FB',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#BEC3C9',
        inputBg:  dk ? '#1E2237' : '#FFFFFF',
    };

    const [title, setTitle] = useState(initialTitle || '');
    const [markdown, setMarkdown] = useState(initialMarkdown || '');
    const [image, setImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const inputStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '12px',
        border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    };

    const handleImageUpload = (file) => {
        if (file.size > 2 * 1024 * 1024) { toast.error('Image too large. Max: 2MB.'); return; }
        setImage(file);
    };

    const handleSave = async () => {
        if (!markdown.trim() && !title.trim()) { toast.error('Add a title or some content first.'); return; }
        setIsSaving(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content_markdown', markdown);
        if (image) formData.append('image', image);
        try {
            const url = pageId
                ? `/api/admin/courses/${courseId}/pages/${pageId}`
                : `/api/admin/courses/${courseId}/pages`;
            if (!pageId) formData.append('page_type', 'content');
            const res = await fetch(url, { method: pageId ? 'PUT' : 'POST', body: formData });
            if (!res.ok) throw new Error();
            toast.success('Page saved.');
            setImage(null);
            onSaved?.();
        } catch {
            toast.error('Failed to save the page.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Page Title</label>
                <input
                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Introduction"
                    style={inputStyle}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Content (Markdown)</label>
                    <textarea
                        value={markdown}
                        onChange={e => setMarkdown(e.target.value)}
                        rows={14}
                        placeholder={'Write the page content in Markdown...\n\n## Heading\n\nSome **bold** text.'}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Preview</label>
                    <div style={{
                        border: `1.5px solid ${T.border}`, borderRadius: '12px', padding: '12px 16px',
                        background: T.surface2, color: T.text, minHeight: '312px', maxHeight: '312px', overflowY: 'auto',
                        fontSize: '14px',
                    }}>
                        {title && <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{title}</h2>}
                        <div className="prose dark:prose-invert" style={{ maxWidth: 'none' }}>
                            <ReactMarkdown>{markdown || '*Nothing to preview yet.*'}</ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Image (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="file" id="course-page-image" accept="image/*"
                        onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])}
                        style={{ display: 'none' }}
                    />
                    <label
                        htmlFor="course-page-image"
                        style={{
                            flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: T.surface2, color: T.textSec, padding: '8px 12px', borderRadius: '12px',
                            cursor: 'pointer', fontSize: '13px', border: `1.5px solid ${T.border}`,
                        }}
                    >
                        <UploadCloud size={14}/>
                        <span>{image?.name || initialImagePath || 'Upload Image (max 2MB)'}</span>
                    </label>
                    {image && (
                        <button
                            type="button" onClick={() => setImage(null)}
                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}
                        >
                            <Trash2 size={14}/>
                        </button>
                    )}
                </div>
                {(image || initialImagePath) && (
                    <div style={{ marginTop: '8px' }}>
                        <img
                            src={image ? URL.createObjectURL(image) : `/uploads/${initialImagePath}`}
                            alt="Preview"
                            style={{ maxHeight: '96px', width: 'auto', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${T.border}` }}
                            onClick={() => showOverlay?.(image ? URL.createObjectURL(image) : `/uploads/${initialImagePath}`)}
                        />
                    </div>
                )}
            </div>

            <div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: isSaving ? T.textMuted : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                        color: '#FFFFFF', fontWeight: '600', padding: '8px 20px',
                        borderRadius: '999px', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                    }}
                >
                    {isSaving ? <Loader size={15} className="animate-spin"/> : <Save size={15}/>}
                    <span>{isSaving ? 'Saving…' : 'Save Page'}</span>
                </button>
            </div>
        </div>
    );
}
