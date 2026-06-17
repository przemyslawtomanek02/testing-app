import React, {useEffect} from "react";
import {useFieldArray, useWatch} from "react-hook-form";
import { PlusCircle, Trash2, Circle, CheckCircle } from 'lucide-react';

const SingleChoiceEditor = ({qIndex, register, control, setValue}) => {
    const {
        fields,
        append,
        remove,
    } = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
    });

    const answers = useWatch({
        control,
        name: `questions.${qIndex}.answers`,
    }) || [];

    const handleAddAnswer = () => {
        if (fields.length < 5) {
            const newId = answers.length.toString();
            append({ id: newId, text: "", is_correct: false });
        }
    };

     const handleRemoveAnswer = (indexToRemove) => {
        if (fields.length > 1) {
            const wasCorrect = answers[indexToRemove]?.is_correct;
            remove(indexToRemove);

            if (wasCorrect) {
                const remainingAnswers = answers.filter((_, i) => i !== indexToRemove);
                if (remainingAnswers.length > 0 && !remainingAnswers.some(a => a.is_correct)) {
                    setValue(`questions.${qIndex}.answers.0.is_correct`, true, { shouldDirty: true });
                }
            }
        }
    };

    const toggleCorrectAnswer = (index) => {
        const updatedAnswers = answers.map((answer, idx) => ({
            ...answer,
            is_correct: idx === index
        }));
        setValue(`questions.${qIndex}.answers`, updatedAnswers, { shouldDirty: true });
    };

    const inputClasses = "w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div className="space-y-6">
            {/* Question Text Input */}
            <div>
                <label htmlFor={`question-text-${qIndex}`} className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">
                    Question Text
                </label>
                <textarea
                    id={`question-text-${qIndex}`}
                    placeholder="e.g., What is the capital of Poland?"
                    {...register(`questions.${qIndex}.question`, { required: "Question text cannot be empty." })}
                    className={`${inputClasses} max-h-[400px]`}
                    rows="3"
                />
            </div>

            {/* Answers Section */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">Answer Options</label>
                {fields.map((field, aIndex) => (
                    <div key={field.id} className="flex items-center gap-2">
                        {/* Custom Radio Button for Correct Answer */}
                        <button
                            type="button"
                            onClick={() => toggleCorrectAnswer(aIndex)}
                            className="flex-shrink-0 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors"
                            aria-label={`Mark option ${aIndex + 1} as correct`}
                        >
                            {answers[aIndex]?.is_correct ? (
                                <CheckCircle size={22} className="text-green-600" />
                            ) : (
                                <Circle size={22} className="text-slate-400" />
                            )}
                        </button>

                        {/* Answer Text Input */}
                        <input
                            type="text"
                            placeholder={`Option ${aIndex + 1}`}
                            {...register(`questions.${qIndex}.answers.${aIndex}.text`, { required: "Answer option cannot be empty." })}
                            className={`${inputClasses} flex-grow`}
                        />

                        {/* Remove Answer Button */}
                        <button
                            type="button"
                            onClick={() => handleRemoveAnswer(aIndex)}
                            disabled={fields.length <= 1}
                            className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 rounded-md disabled:text-slate-300 dark:text-darkCustom-400 dark:hover:text-red-500 dark:disabled:text-darkCustom-600 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Remove option ${aIndex + 1}`}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Answer Button */}
            <div>
                <button
                    type="button"
                    onClick={handleAddAnswer}
                    disabled={fields.length >= 5}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-darkCustom-500 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusCircle size={18} />
                    Add Option
                </button>
            </div>
        </div>
    );
};

export default SingleChoiceEditor;