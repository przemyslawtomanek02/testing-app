import React, {useState, useRef, useCallback} from "react";
import {useForm, useFieldArray} from "react-hook-form";
import {AnimatePresence, motion} from "framer-motion";
import {toast} from "react-toastify";
import {Plus, Save, FileJson, Loader} from 'lucide-react';
import QuestionEditor from "./QuestionEditor.jsx";
import {QuestionDefaults} from "./EditorQuestionTypes/QuestionDefaults.jsx";

function CreateTestsPanel({setOverlayImage}) {
    const [images, setImages] = useState([]);
    const [jsonFileName, setJsonFileName] = useState("");
    const jsonFileInputRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const questionRefs = useRef([]);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        control,
        reset,
        formState: {errors},
    } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        shouldUnregister: false,
        defaultValues: {
            test_name: "",
            test_description: "",
            questions: [JSON.parse(JSON.stringify(QuestionDefaults.SingleChoice))],
        },
    });

    const {fields: questions, append, remove} = useFieldArray({
        control,
        name: "questions",
        keyName: "key",
    });

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

    const handleImageDelete = useCallback((qIndex) => {
        setImages(prevImages => {
            const updated = [...prevImages];
            updated[qIndex] = null;
            return updated;
        });

        setValue(`questions.${qIndex}.image_path`, null, {shouldDirty: true});

    }, [setValue]);

    const handleJsonFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                if (!jsonData.test_name || !Array.isArray(jsonData.questions)) {
                    toast.error("Invalid JSON structure. Required fields: 'test_name' and 'questions' array.");
                    return;
                }

                const validatedQuestions = jsonData.questions.map((q) => {
                    const type = q.type;
                    const defaults = QuestionDefaults[type] || QuestionDefaults.SingleChoice;

                    return {
                        ...defaults,
                        ...q,
                        answers: Array.isArray(q.answers) ? q.answers : defaults.answers,
                        extra_data: q.extra_data ?? defaults.extra_data ?? [],
                    };
                });

                console.log("validated:", validatedQuestions);

                reset({
                    test_name: jsonData.test_name,
                    test_description: jsonData.test_description || "",
                    questions: validatedQuestions,
                });

                setJsonFileName(file.name);
                toast.success("Test imported successfully!");
            } catch (err) {
                console.error("JSON Import Error:", err);
                toast.error("Failed to parse or process the JSON file.");
            } finally {
                if (jsonFileInputRef.current) {
                    jsonFileInputRef.current.value = null;
                }
            }
        };
        reader.readAsText(file);
    };

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

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        const {test_name, test_description, questions} = data;
        const {valid, errors: validationErrors, firstInvalidIndex} = validateQuestions(questions);

        if (!valid) {
            validationErrors.forEach(err => toast.error(err));

            if (firstInvalidIndex !== null && questionRefs.current[firstInvalidIndex]) {
                questionRefs.current[firstInvalidIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append("test_name", test_name);
        formData.append("test_description", test_description);

        questions.forEach((q, i) => {
            formData.append("questions", JSON.stringify(q));
            if (images[i]) {
                formData.append(`question_image_${i}`, images[i]);
            }
        });

        try {
            const response = await fetch("/api/admin/create_new_test", {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Submission failed.");
            }
            toast.success("Test created successfully!");
            reset();
            setImages([]);
            setJsonFileName("");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateQuestions = (questions) => {
        const errors = [];
        let firstInvalidIndex = null;

        if (!Array.isArray(questions) || questions.length === 0) {
            errors.push("No questions in the test.");
            return {valid: false, errors, firstInvalidIndex: 0};
        }

        questions.forEach((q, index) => {
            const prefix = `Question ${index + 1}`;
            let hasError = false;

            if (!q.question || q.question.trim().length === 0) {
                errors.push(`${prefix}: No question content.`);
                hasError = true;
            }

            switch (q.type) {
                case 'FillInTheBlank': {
                    const allAnswersHaveText = q.answers?.every(a => a.text?.trim().length > 0);
                    if (!allAnswersHaveText) {
                        errors.push(`${prefix}: All answers must contain text.`);
                        hasError = true;
                    }

                    const definedAnswersCount = q.answers?.length || 0;
                    const placedBlanksCount = Array.isArray(q.extra_data)
                        ? q.extra_data.filter(part => part.type === 'blank').length
                        : 0;

                    if (definedAnswersCount > 0 && definedAnswersCount !== placedBlanksCount) {
                        errors.push(`${prefix}: number of gaps ≠ number of responses (${placedBlanksCount} ≠ ${definedAnswersCount}).`);
                        hasError = true;
                    }
                    break;
                }

                case 'MatchingMultiple': {
                    const allFieldsFilled = q.answers?.every((a) =>
                        typeof a.left === "string" &&
                        typeof a.right === "string" &&
                        a.left.trim().length > 0 &&
                        a.right.trim().length > 0
                    );
                    if (!allFieldsFilled) {
                        errors.push(`${prefix}: Each match must have “left” and “right” fields.".`);
                        hasError = true;
                    }
                    break;
                }

                default: {
                    const allAnswersHaveText = q.answers?.every(a => a.text?.trim().length > 0);
                    if (!allAnswersHaveText) {
                        errors.push(`${prefix}: Answers must contain text.`);
                        hasError = true;
                    }
                    break;
                }
            }

            if (hasError && firstInvalidIndex === null) {
                firstInvalidIndex = index;
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            firstInvalidIndex
        };
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-darkCustom-800 font-sans min-h-screen">
            <form onSubmit={handleSubmit(onSubmit)} className="mx-auto h-full">
                <div className='flex flex-wrap items-center justify-between gap-4 mb-8'>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-darkCustom-50">Create Test</h1>
                    <div className="flex items-center gap-2">
                        <input
                            ref={jsonFileInputRef}
                            id='ct_files'
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleJsonFileUpload}
                        />
                        <button
                            type="button"
                            onClick={() => jsonFileInputRef.current?.click()}
                            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 font-medium py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors dark:bg-darkCustom-600 dark:text-darkCustom-100 dark:border-darkCustom-600 dark:hover:bg-darkCustom-500 dark:hover:text-darkCustom-50"
                        >
                            <FileJson size={18}/>
                            <span>Import from JSON</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center justify-center gap-2 w-[150px] bg-slate-800 text-white hover:bg-slate-900 font-medium py-2 px-4 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed dark:bg-darkCustom-100 dark:text-darkCustom-900 dark:hover:text-darkCustom-1000 dark:hover:bg-darkCustom-300 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400"
                        >
                            {isSubmitting ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>}
                            <span>{isSubmitting ? 'Creating...' : 'Create Test'}</span>
                        </button>
                    </div>
                </div>
                {jsonFileName && <p className="text-sm text-slate-600 dark:text-darkCustom-300 mb-4 -mt-4">Imported
                    file: {jsonFileName}</p>}

                <div
                    className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-md border border-slate-200 dark:border-darkCustom-700 h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-darkCustom-700 grid md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="test_name"
                                   className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Test
                                Name</label>
                            <input
                                id="test_name"
                                type="text"
                                placeholder="e.g., Algebra Basics"
                                {...register("test_name", {required: "Test name is required."})}
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300"
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
                                placeholder="A short description of the test content"
                                {...register("test_description", {required: "Description is required."})}
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300"
                            />
                            {errors.test_description &&
                                <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.test_description.message}</p>}
                        </div>
                    </div>

                    <div className="p-6 divide-y divide-gray-300 dark:divide-darkCustom-700 space-y-6">
                        <AnimatePresence>
                            {questions.map((q, index) => (
                                <motion.div
                                    key={q.key}
                                    ref={(el) => (questionRefs.current[index] = el)}
                                    layout
                                    initial={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: 'auto', transition: {duration: 0.3}}}
                                    exit={{opacity: 0, height: 0, transition: {duration: 0.3}}}
                                    className="pt-6 first:pt-0 pb-6 overflow-hidden"
                                >
                                    <QuestionEditor
                                        question={q}
                                        qIndex={index}
                                        register={register}
                                        control={control}
                                        setValue={setValue}
                                        getValues={getValues}
                                        watch={watch}
                                        onImageUpload={handleImageUpload}
                                        onImageDelete={handleImageDelete}
                                        image={images[index]}
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
                                disabled={!validateQuestions(watchedQuestions).valid}
                                className="flex items-center gap-2 bg-blue-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400"
                            >
                                <Plus size={18}/>
                                <span>Add New Question</span>
                            </button>
                            {!validateQuestions(watchedQuestions).valid &&
                                <p className="text-slate-500 dark:text-darkCustom-400 text-xs mt-2">Please fill all
                                    fields and place all answers
                                    before adding a new question.</p>}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default CreateTestsPanel;
