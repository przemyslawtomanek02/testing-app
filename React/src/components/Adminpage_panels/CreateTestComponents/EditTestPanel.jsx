import React, {useEffect, useState, useCallback} from 'react';
import {useForm, useFieldArray} from 'react-hook-form';
import {toast} from 'react-toastify';
import {motion, AnimatePresence} from 'framer-motion';
import {Plus, Save, Loader, ArrowLeft} from 'lucide-react';
import QuestionEditor from './QuestionEditor';
import {QuestionDefaults} from './EditorQuestionTypes/QuestionDefaults';
import {useAppContext} from '../../../AppContext.jsx';

const transformApiDataToFormState = (apiQuestions) => {
    if (!Array.isArray(apiQuestions)) return [];
    return apiQuestions.map((q) => {
        let transformedAnswers;
        if (q.type === 'MatchingMultiple') {
            const pairs = {};
            q.answers.forEach(ans => {
                if (!pairs[ans.match_id]) pairs[ans.match_id] = {match_id: ans.match_id};
                pairs[ans.match_id][ans.side] = {text: ans.text, answer_id: ans.answer_id};
            });
            transformedAnswers = Object.values(pairs).map(pair => ({
                id: pair.match_id,
                left: pair.left || {text: '', answer_id: null},
                right: pair.right || {text: '', answer_id: null},
            }));
        } else {
            transformedAnswers = q.answers.map(ans => ({...ans, id: ans.answer_id}));
        }
        return {...q, answers: transformedAnswers};
    });
};

function EditTestPanel({testId, setOverlayImage, setActivePanel}) {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:       dk ? '#0F1117' : '#F4F6FB',
        surface:  dk ? '#171B2D' : '#FFFFFF',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#94A3B8',
        inputBg:  dk ? '#1E2237' : '#FFFFFF',
        divider:  dk ? '#2A2F45' : '#EDF0F7',
    };
    const [images, setImages] = useState([]);

    const {
        register, handleSubmit, control, reset, getValues, setValue, watch,
        formState: {isSubmitting, errors},
    } = useForm({
        defaultValues: {test_name: "Loading…", test_description: "Loading…", questions: []},
    });

    const {fields, append} = useFieldArray({control, name: "questions", keyName: "key"});

    useEffect(() => {
        if (!testId) return;
        const fetchTestData = async () => {
            try {
                const response = await fetch(`/api/admin/get_admin_one_test/${testId}`);
                if (!response.ok) throw new Error("Failed to fetch test data");
                const data = await response.json();
                reset({
                    test_name: data.test_name || "",
                    test_description: data.test_description || "",
                    questions: transformApiDataToFormState(data.questions),
                });
                toast.success("Test data loaded successfully!");
            } catch (err) {
                toast.error(err.message || "An unknown error occurred.");
            }
        };
        void fetchTestData();
    }, [testId, reset]);

    const handleImageUpload = useCallback((qIndex, file) => {
        if (file.size > 2 * 1024 * 1024) {
            toast.error(`Image for question ${qIndex + 1} is too large. Max: 2MB.`);
            return;
        }
        setImages(prev => {const u = [...prev]; u[qIndex] = file; return u;});
        setValue(`questions.${qIndex}.image_path`, null, {shouldDirty: true});
    }, [setValue]);

    const handleImageDelete = useCallback((qIndex) => {
        setImages(prev => {const u = [...prev]; u[qIndex] = null; return u;});
        setValue(`questions.${qIndex}.image_path`, null, {shouldDirty: true});
    }, [setValue]);

    const removeQuestion = (indexToRemove) => {
        const current = getValues("questions");
        setValue("questions", current.filter((_, i) => i !== indexToRemove));
        setImages(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const addNewQuestion = (type = "SingleChoice") => {
        append(JSON.parse(JSON.stringify(QuestionDefaults[type] || QuestionDefaults.SingleChoice)));
    };

    const onFormSubmit = async (data) => {
        const formData = new FormData();
        formData.append('test_name', data.test_name);
        formData.append('test_description', data.test_description);
        data.questions.forEach((q, index) => {
            const {id, ...rest} = q.type !== 'MatchingMultiple' ? q : {id: undefined, ...q};
            formData.append('questions', JSON.stringify(q.type !== 'MatchingMultiple' ? rest : q));
            if (images[index]) formData.append(`images_${index}`, images[index]);
        });
        try {
            const response = await fetch(`/api/admin/edit_test/${testId}`, {method: 'PUT', body: formData});
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update test.");
            }
            toast.success("Test updated successfully!");
            setActivePanel('tests');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const inputStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '12px',
        border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        transition: 'border-color 0.15s',
    };

    return (
        <div style={{ padding: '28px', background: T.bg, minHeight: '100%' }}>
            <form onSubmit={handleSubmit(onFormSubmit)} style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setActivePanel('tests')}
                            style={{
                                width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`,
                                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: T.textSec, transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.06)' : '#EEF4FF'; e.currentTarget.style.color = '#2B73FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSec; }}
                        >
                            <ArrowLeft size={18}/>
                        </button>
                        <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>Edit Test</h1>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            minWidth: '150px', background: isSubmitting ? T.textMuted : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                            color: '#FFFFFF', fontWeight: '600', padding: '7px 20px',
                            borderRadius: '999px', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '13px', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(43,115,255,0.35)',
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                        {isSubmitting ? <Loader size={15} className="animate-spin"/> : <Save size={15}/>}
                        <span>{isSubmitting ? 'Saving…' : 'Save Changes'}</span>
                    </button>
                </div>

                {/* Card */}
                <div style={{ background: T.surface, borderRadius: '22px', border: `1px solid ${T.border}`, boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)' }}>
                    {/* Test info */}
                    <div style={{ padding: '24px', borderBottom: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label htmlFor="test_name" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Test Name</label>
                            <input
                                id="test_name" type="text"
                                {...register("test_name", {required: "Test name is required."})}
                                style={inputStyle}
                                onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,115,255,0.1)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                            {errors.test_name && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.test_name.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="test_description" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Description</label>
                            <input
                                id="test_description" type="text"
                                {...register("test_description")}
                                style={inputStyle}
                                onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,115,255,0.1)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    {/* Questions */}
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <AnimatePresence>
                            {fields.map((field, index) => (
                                <motion.div
                                    key={field.key}
                                    layout
                                    initial={{opacity: 0, y: -20}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, x: 0, transition: {duration: 0.3}}}
                                    style={{ paddingTop: index > 0 ? '24px' : 0, borderTop: index > 0 ? `1px solid ${T.divider}` : 'none' }}
                                >
                                    <QuestionEditor
                                        question={field} qIndex={index}
                                        register={register} control={control}
                                        setValue={setValue} getValues={getValues} watch={watch}
                                        onImageUpload={handleImageUpload} onImageDelete={handleImageDelete}
                                        image={images[index]}
                                        existingImagePath={watch(`questions.${index}.image`) || field.image}
                                        showOverlay={setOverlayImage}
                                        removeQuestion={() => removeQuestion(index)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <div style={{ paddingTop: '8px', borderTop: `1px solid ${T.divider}` }}>
                            <button
                                type="button"
                                onClick={() => addNewQuestion()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                    color: '#FFFFFF', fontWeight: '600', padding: '8px 18px',
                                    borderRadius: '999px', border: 'none', cursor: 'pointer',
                                    fontSize: '13px', boxShadow: '0 4px 14px rgba(43,115,255,0.35)',
                                    transition: 'opacity 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                            >
                                <Plus size={15}/>
                                <span>Add New Question</span>
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default EditTestPanel;
