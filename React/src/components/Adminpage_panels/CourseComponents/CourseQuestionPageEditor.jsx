import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Save, Loader } from 'lucide-react';
import QuestionEditor from '../CreateTestComponents/QuestionEditor.jsx';
import { QuestionDefaults } from '../CreateTestComponents/EditorQuestionTypes/QuestionDefaults.jsx';
import { useAppContext } from '../../../AppContext.jsx';

// Odwzorowuje kształt odpowiedzi z API (QuestionAdmin) na kształt oczekiwany przez
// QuestionEditor / react-hook-form — ten sam wzorzec co transformApiDataToFormState
// w EditTestPanel.jsx, tylko dla pojedynczego pytania.
const transformQuestionForForm = (q) => {
    if (!q) return JSON.parse(JSON.stringify(QuestionDefaults.SingleChoice));

    let transformedAnswers;
    if (q.type === 'MatchingMultiple') {
        const pairs = {};
        (q.answers || []).forEach(ans => {
            if (!pairs[ans.match_id]) pairs[ans.match_id] = { match_id: ans.match_id };
            pairs[ans.match_id][ans.side] = { text: ans.text, answer_id: ans.answer_id };
        });
        transformedAnswers = Object.values(pairs).map(pair => ({
            id: pair.match_id,
            left: pair.left || { text: '', answer_id: null },
            right: pair.right || { text: '', answer_id: null },
        }));
    } else {
        transformedAnswers = (q.answers || []).map(ans => ({ ...ans, id: ans.answer_id }));
    }
    return { ...q, answers: transformedAnswers };
};

export default function CourseQuestionPageEditor({ courseId, pageId, initialLabel, initialQuestion, initialImagePath, showOverlay, onSaved }) {
    const { darkMode: dk } = useAppContext();
    const T = {
        surface:  dk ? '#171B2D' : '#FFFFFF',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        inputBg:  dk ? '#1E2237' : '#FFFFFF',
    };

    const [label, setLabel] = useState(initialLabel || '');
    const [image, setImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const { register, control, setValue, getValues, watch } = useForm({
        defaultValues: { questions: [transformQuestionForForm(initialQuestion)] },
    });

    const handleImageUpload = useCallback((_qIndex, file) => {
        if (file.size > 2 * 1024 * 1024) { toast.error('Image too large. Max: 2MB.'); return; }
        setImage(file);
    }, []);
    const handleImageDelete = useCallback(() => setImage(null), []);

    const handleSave = async () => {
        const question = getValues('questions.0');
        if (!question.question || !question.question.trim()) { toast.error('Question text is required.'); return; }
        if (question.type !== 'MatchingMultiple' && !question.answers?.every(a => a.text?.trim())) {
            toast.error('All answers must contain text.'); return;
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append('title', label);
        formData.append('question_json', JSON.stringify(question));
        if (image) formData.append('image', image);

        try {
            const url = pageId
                ? `/api/admin/courses/${courseId}/pages/${pageId}`
                : `/api/admin/courses/${courseId}/pages`;
            if (!pageId) formData.append('page_type', 'question');
            const res = await fetch(url, { method: pageId ? 'PUT' : 'POST', body: formData });
            if (!res.ok) throw new Error();
            toast.success('Question page saved.');
            setImage(null);
            onSaved?.();
        } catch {
            toast.error('Failed to save the page.');
        } finally {
            setIsSaving(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '12px',
        border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>
                    Internal label <span style={{ fontWeight: 400, opacity: 0.7 }}>(shown only in this list, not to students)</span>
                </label>
                <input
                    type="text" value={label} onChange={e => setLabel(e.target.value)}
                    placeholder="e.g., Checkpoint 1"
                    style={inputStyle}
                />
            </div>

            <div style={{ background: T.surface, borderRadius: '16px', border: `1px solid ${T.border}` }}>
                <QuestionEditor
                    question={{}}
                    qIndex={0}
                    register={register}
                    control={control}
                    setValue={setValue}
                    getValues={getValues}
                    watch={watch}
                    image={image}
                    existingImagePath={initialImagePath}
                    onImageUpload={handleImageUpload}
                    onImageDelete={handleImageDelete}
                    removeQuestion={() => {}}
                    showOverlay={showOverlay}
                />
            </div>

            <div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: isSaving ? '#94A3B8' : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                        color: '#FFFFFF', fontWeight: '600', padding: '8px 20px',
                        borderRadius: '999px', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                    }}
                >
                    {isSaving ? <Loader size={15} className="animate-spin"/> : <Save size={15}/>}
                    <span>{isSaving ? 'Saving…' : 'Save Question'}</span>
                </button>
            </div>
        </div>
    );
}
