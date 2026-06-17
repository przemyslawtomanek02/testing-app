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
                if (!pairs[ans.match_id]) {
                    pairs[ans.match_id] = { match_id: ans.match_id };
                }
                pairs[ans.match_id][ans.side] = { text: ans.text, answer_id: ans.answer_id };
            });
            transformedAnswers = Object.values(pairs).map((pair, index) => ({
                id: pair.match_id,
                left: pair.left || { text: '', answer_id: null },
                right: pair.right || { text: '', answer_id: null }
            }));
        } else {
            transformedAnswers = q.answers.map((ans) => ({
                ...ans,
                id: ans.answer_id
            }));
        }

        return {...q, answers: transformedAnswers};
    });
};

function EditTestPanel({testId, setOverlayImage, setActivePanel}) {
    const [images, setImages] = useState([]);

    const {
        register,
        handleSubmit,
        control,
        reset,
        getValues,
        setValue,
        watch,
        formState: {isSubmitting, errors},
    } = useForm({
        defaultValues: {
            test_name: "Loading...",
            test_description: "Loading...",
            questions: [],
        },
    });

    const {fields, append, remove} = useFieldArray({
        control,
        name: "questions",
        keyName: "key",
    });

    useEffect(() => {
        const fetchTestData = async () => {
            try {
                const response = await fetch(`/api/admin/get_admin_one_test/${testId}`);
                if (!response.ok) throw new Error("Failed to fetch test data");

                const data = await response.json();

                const formFriendlyQuestions = transformApiDataToFormState(data.questions);

                reset({
                    test_name: data.test_name || "",
                    test_description: data.test_description || "",
                    questions: formFriendlyQuestions,
                });

                toast.success("Test data loaded successfully!");

            } catch (err) {
                console.error("Error fetching test data:", err);
                toast.error(err.message || "An unknown error occurred.");
            }
        };

        if (testId) {
            void fetchTestData();
        }
    }, [testId, reset]);

    const handleImageUpload = useCallback((qIndex, file) => {
        const maxSizeMB = 2;
        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`Image for question ${qIndex + 1} is too large. Max size: ${maxSizeMB}MB.`);
            return;
        }
        setImages(prevImages => {
            const updatedImages = [...prevImages];
            updatedImages[qIndex] = file;
            return updatedImages;
        });

        setValue(`questions.${qIndex}.image_path`, null, {shouldDirty: true});

    }, [setValue]);

    const handleImageDelete = useCallback((qIndex) => {
        setImages(prevImages => {
            const updated = [...prevImages];
            updated[qIndex] = null;
            return updated;
        });

        setValue(`questions.${qIndex}.image_path`, null, {shouldDirty: true});

    }, [setValue]);


    const onFormSubmit = async (data) => {
        const formData = new FormData();
        formData.append('test_name', data.test_name);
        formData.append('test_description', data.test_description);

        data.questions.forEach((q, index) => {
            let questionToSend;
            if (q.type === 'MatchingMultiple') {
                questionToSend = q;
            } else {
                const {id, ...rest} = q;
                questionToSend = rest;
            }
            formData.append('questions', JSON.stringify(questionToSend));

            if (images[index]) {
                formData.append(`images_${index}`, images[index]);
            }
        });

        try {
            const response = await fetch(`/api/admin/edit_test/${testId}`, {
                method: 'PUT',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update test.");
            }

            toast.success("Test updated successfully!");
            setActivePanel('tests')
        } catch (error) {
            toast.error(error.message);
        }
    };

    const watchedQuestions = watch("questions");
    console.log(watchedQuestions);

    const removeQuestion = (indexToRemove) => {
        const currentQuestions = getValues("questions");
        const newQuestions = currentQuestions.filter((_, i) => i !== indexToRemove);
        setValue("questions", newQuestions);
        setImages(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const addNewQuestion = (type = "SingleChoice") => {
        const defaultQuestion = JSON.parse(JSON.stringify(QuestionDefaults[type] || QuestionDefaults.SingleChoice));
        append(defaultQuestion);
    };

    const inputClasses = "w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-darkCustom-800 font-sans min-h-screen">
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <div className='flex flex-wrap items-center justify-between gap-4 mb-8'>
                    <button onClick={() => setActivePanel('tests')}
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-darkCustom-700 transition-colors">
                        <ArrowLeft size={30} className="text-slate-600 dark:text-darkCustom-300"/>
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 w-[180px] bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400"
                    >
                        {isSubmitting ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>}
                        <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-md border border-slate-200 dark:border-darkCustom-700">
                    <div className="p-6 border-b border-slate-200 dark:border-darkCustom-700 grid md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="test_name" className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Test
                                Name</label>
                            <input
                                id="test_name"
                                type="text"
                                {...register("test_name", {required: "Test name is required."})}
                                className={inputClasses}
                            />
                            {errors.test_name &&
                                <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.test_name.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="test_description"
                                   className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Description</label>
                            <input
                                id="test_description"
                                type="text"
                                {...register("test_description")}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    <div className="p-6 divide-y divide-slate-300 dark:divide-darkCustom-700 space-y-6">
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
                                         question={field}
                                         qIndex={index}
                                         register={register}
                                         control={control}
                                        setValue={setValue}
                                        getValues={getValues}
                                        watch={watch}
                                         onImageUpload={handleImageUpload}
                                         onImageDelete={handleImageDelete}
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
                                className="flex items-center gap-2 bg-blue-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-slate-400 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400"
                            >
                                <Plus size={18}/>
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
