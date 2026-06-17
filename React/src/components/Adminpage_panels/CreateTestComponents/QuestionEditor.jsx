import React, {useEffect} from 'react';
import {Trash2, UploadCloud} from 'lucide-react';
import {QuestionDefaults} from "./EditorQuestionTypes/QuestionDefaults.jsx";
import SingleChoiceEditor from './EditorQuestionTypes/SingleChoiceEditor';
import MultipleChoiceEditor from './EditorQuestionTypes/MultipleChoiceEditor';
import TrueFalseEditor from './EditorQuestionTypes/TrueFalseEditor';
import DragAndDropOrderEditor from './EditorQuestionTypes/DragAndDropOrderEditor';
import FillInTheBlankEditor from "./EditorQuestionTypes/FillInTheBlankEditor";
import RatingEditor from "./EditorQuestionTypes/RatingEditor.jsx";
import MatchingMultipleEditor from "./EditorQuestionTypes/MatchingMultipleEditor.jsx";

const QuestionEditor = ({
                            question,
                            qIndex,
                            register,
                            control,
                            setValue,
                            getValues,
                            watch,
                            image,
                            existingImagePath,
                            onImageUpload,
                            onImageDelete,
                            removeQuestion,
                            showOverlay
                        }) => {
    const handleTypeChange = (index, newType) => {
        const current = getValues(`questions.${index}`);
        const base = JSON.parse(JSON.stringify(QuestionDefaults[newType]));

        const updated = {
            ...base,
            question: current.question || "",
            points_value: current.points_value || 1,
            key: current.key
        };

        setValue(`questions.${index}`, updated, {shouldDirty: true});
    };

    const handleLocalImageDelete = () => {
        onImageDelete(qIndex);
        const currentQuestion = getValues(`questions.${qIndex}`);
        if (currentQuestion.imageError) {
            setValue(`questions.${qIndex}.imageError`, '');
        }
    };

    const type = watch(`questions.${qIndex}.type`);
    const isCorrectEnabled = watch(`questions.${qIndex}.extra_data.correct_enabled`);

    useEffect(() => {
        const currentPoints = getValues(`questions.${qIndex}.points_value`);

        if (type === "Rating") {
            if (isCorrectEnabled === false && currentPoints !== 0) {
                setValue(`questions.${qIndex}.points_value`, 0, { shouldDirty: true });
            } else if (isCorrectEnabled === true && currentPoints === 0) {
                setValue(`questions.${qIndex}.points_value`, 1, { shouldDirty: true });
            }
        }
    }, [type, isCorrectEnabled, qIndex, setValue, getValues]);


    const renderQuestionBody = () => {
        const props = {
            qIndex,
            register,
            control,
            setValue,
            getValues,
            watch,
        };

        switch (type) {
            case 'SingleChoice':
                return <SingleChoiceEditor {...props} />;
            case 'MultipleChoice':
                return <MultipleChoiceEditor {...props} />;
            case 'TrueFalse':
                return <TrueFalseEditor {...props} />;
            case 'DragAndDropOrder':
                return <DragAndDropOrderEditor {...props} />;
            case 'FillInTheBlank':
                return <FillInTheBlankEditor {...props} />;
            case 'Rating':
                return <RatingEditor {...props} />;
            case 'MatchingMultiple':
                return <MatchingMultipleEditor {...props} />;
            default:
                return <p className="text-red-500">Unsupported question type: {type}</p>;
        }
    };

    const isPointsInputDisabled = type === "Rating" && !isCorrectEnabled;
    const formElementClasses = "w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div
            className="bg-white dark:bg-darkCustom-900 p-4 grid md:grid-cols-3 gap-6 relative transition-all duration-300">
            {qIndex > 0 && (
                <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="absolute top-0 right-3 p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:text-darkCustom-500 dark:hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={24}/>
                </button>
            )}
            {/* Lewa kolumna: Edytor pytania */}
            <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-darkCustom-100">Question {qIndex + 1}</h3>
                <div>{renderQuestionBody()}</div>
            </div>

            {/* Prawa kolumna: Ustawienia pytania */}
            <div className="space-y-4 md:border-l md:border-slate-200 dark:md:border-darkCustom-700 md:pl-6 md:pt-6">
                <div>
                    <label htmlFor="question-type-select" className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Question
                        Type</label>
                    <select
                        value={type}
                        name="question-type-select"
                        onChange={(e) => handleTypeChange(qIndex, e.target.value)}
                        className={formElementClasses}
                    >
                        <option value="SingleChoice">Single Choice</option>
                        <option value="MultipleChoice">Multiple Choice</option>
                        <option value="TrueFalse">True/False</option>
                        <option value="DragAndDropOrder">Drag and Drop Order</option>
                        <option value="FillInTheBlank">Fill In The Blank</option>
                        <option value="Rating">Rating</option>
                        <option value="MatchingMultiple">Matching Multiple</option>
                    </select>
                </div>


                <div>
                    <label htmlFor={`points-value-${qIndex}`}
                           className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Points</label>
                    <input
                        id={`points-value-${qIndex}`}
                        type="number"
                        min="0"
                        disabled={isPointsInputDisabled}
                        {...register(`questions.${qIndex}.points_value`, {valueAsNumber: true, min: 0, value: 1})}
                        className={`${formElementClasses} ${isPointsInputDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                </div>


                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Image
                        Attachment</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            id={`image-upload-${qIndex}`}
                            accept="image/*"
                            onChange={(e) => onImageUpload(qIndex, e.target.files[0])}
                            className="hidden"
                        />
                        <label
                            htmlFor={`image-upload-${qIndex}`}
                            className="flex-grow flex items-center justify-center gap-2 bg-slate-100 text-slate-600 p-2 rounded-md cursor-pointer hover:bg-slate-200 dark:bg-darkCustom-700 dark:text-darkCustom-100 dark:hover:bg-darkCustom-600 text-sm truncate"
                        >
                            <UploadCloud size={16}/>
                            <span className="truncate">{image?.name || existingImagePath || "Upload Image (max 2MB)"}</span>
                        </label>
                        {image && (
                            <button type="button" onClick={handleLocalImageDelete}>
                                <Trash2 size={16} className="text-red-500"/>
                            </button>
                        )}
                    </div>
                    {image && (
                        <div className="mt-2">
                            <img
                                src={URL.createObjectURL(image)}
                                alt="Preview"
                                className="max-h-24 w-auto rounded-md cursor-pointer border border-slate-200 dark:border-darkCustom-700"
                                onClick={() => showOverlay(URL.createObjectURL(image))}
                            />
                        </div>
                    )}
                    {!image && existingImagePath && (
                        <div className="mt-2">
                            <img
                                src={`/uploads/${existingImagePath}`}
                                alt="Current image"
                                className="max-h-24 w-auto rounded-md cursor-pointer border border-slate-200 dark:border-darkCustom-700"
                                onClick={() => showOverlay(`/uploads/${existingImagePath}`)}
                            />
                        </div>
                    )}
                    {question.imageError && (
                        <p className="text-red-500 dark:text-red-400 text-sm mt-1">{question.imageError}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestionEditor;
