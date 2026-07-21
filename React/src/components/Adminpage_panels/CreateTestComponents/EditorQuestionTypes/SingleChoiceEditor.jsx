import React from "react";
import {useFieldArray, useWatch} from "react-hook-form";
import {PlusCircle, Trash2, Circle, CheckCircle} from 'lucide-react';

const SingleChoiceEditor = ({qIndex, register, control, setValue}) => {
    const {fields, append, remove} = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
    });

    const answers = useWatch({control, name: `questions.${qIndex}.answers`}) || [];

    const handleAddAnswer = () => {
        if (fields.length < 5) {
            append({id: answers.length.toString(), text: "", is_correct: false});
        }
    };

    const handleRemoveAnswer = (indexToRemove) => {
        if (fields.length > 1) {
            const wasCorrect = answers[indexToRemove]?.is_correct;
            remove(indexToRemove);
            if (wasCorrect) {
                const remaining = answers.filter((_, i) => i !== indexToRemove);
                if (remaining.length > 0 && !remaining.some(a => a.is_correct)) {
                    setValue(`questions.${qIndex}.answers.0.is_correct`, true, {shouldDirty: true});
                }
            }
        }
    };

    const toggleCorrectAnswer = (index) => {
        setValue(
            `questions.${qIndex}.answers`,
            answers.map((a, idx) => ({...a, is_correct: idx === index})),
            {shouldDirty: true}
        );
    };

    const inputCls = "w-full px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    return (
        <div className="space-y-5">
            <div>
                <label htmlFor={`qt-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
                    Question Text
                </label>
                <textarea
                    id={`qt-${qIndex}`}
                    placeholder="e.g., What is the capital of Poland?"
                    {...register(`questions.${qIndex}.question`, {required: "Question text cannot be empty."})}
                    className={`${inputCls} max-h-[400px]`}
                    rows="3"
                />
            </div>

            <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#1C1E21]">Answer Options</label>
                {fields.map((field, aIndex) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => toggleCorrectAnswer(aIndex)}
                            className="flex-shrink-0 p-1 rounded-full hover:bg-[#F0F2F5] transition-colors"
                            aria-label={`Mark option ${aIndex + 1} as correct`}
                        >
                            {answers[aIndex]?.is_correct
                                ? <CheckCircle size={20} className="text-green-600"/>
                                : <Circle size={20} className="text-[#BEC3C9]"/>}
                        </button>
                        <input
                            type="text"
                            placeholder={`Option ${aIndex + 1}`}
                            {...register(`questions.${qIndex}.answers.${aIndex}.text`, {required: "Answer option cannot be empty."})}
                            className={`${inputCls} flex-grow`}
                        />
                        <button
                            type="button"
                            onClick={() => handleRemoveAnswer(aIndex)}
                            disabled={fields.length <= 1}
                            className="flex-shrink-0 p-1.5 text-[#BEC3C9] hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Remove option ${aIndex + 1}`}
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={handleAddAnswer}
                disabled={fields.length >= 5}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0866FF] hover:text-[#0757D9] disabled:text-[#BEC3C9] disabled:cursor-not-allowed transition-colors"
            >
                <PlusCircle size={16}/>
                Add Option
            </button>
        </div>
    );
};

export default SingleChoiceEditor;
