import React, {useEffect, useState, useCallback} from 'react';
import {useForm, useFieldArray} from 'react-hook-form';
import {toast} from 'react-toastify';
import {motion, AnimatePresence} from 'framer-motion';
import {Plus, Save, Loader, ArrowLeft} from 'lucide-react';
import QuestionEditor from './QuestionEditor';
import {QuestionDefaults} from './EditorQuestionTypes/QuestionDefaults';

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

    const inputCls = "w-full px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    return (
        <div className="p-6 bg-[#F0F2F5] min-h-screen">
            <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setActivePanel('tests')}
                            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-[#E4E6EB] text-[#606770] transition-all"
                        >
                            <ArrowLeft size={20}/>
                        </button>
                        <h1 className="text-xl font-bold text-[#1C1E21]">Edit Test</h1>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 min-w-[150px] bg-[#0866FF] text-white hover:bg-[#0757D9] font-semibold py-2 px-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                    >
                        {isSubmitting ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>}
                        <span>{isSubmitting ? 'Saving…' : 'Save Changes'}</span>
                    </button>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
                    {/* Test info */}
                    <div className="p-6 border-b border-[#E4E6EB] grid md:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="test_name" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Test Name</label>
                            <input
                                id="test_name" type="text"
                                {...register("test_name", {required: "Test name is required."})}
                                className={inputCls}
                            />
                            {errors.test_name && <p className="text-red-500 text-xs mt-1">{errors.test_name.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="test_description" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Description</label>
                            <input
                                id="test_description" type="text"
                                {...register("test_description")}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="p-6 divide-y divide-[#E4E6EB] space-y-6">
                        <AnimatePresence>
                            {fields.map((field, index) => (
                                <motion.div
                                    key={field.key}
                                    layout
                                    initial={{opacity: 0, y: -20}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, x: 0, transition: {duration: 0.3}}}
                                    className="pt-6 first:pt-0 pb-6"
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
                        <div className="pt-6">
                            <button
                                type="button"
                                onClick={() => addNewQuestion()}
                                className="flex items-center gap-2 bg-[#0866FF] text-white font-semibold py-2 px-4 rounded-xl hover:bg-[#0757D9] transition-colors text-sm shadow-sm"
                            >
                                <Plus size={16}/>
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
