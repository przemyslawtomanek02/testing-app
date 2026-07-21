import React, {useEffect} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';
import {PlusCircle, Trash2} from 'lucide-react';

const TrueFalseEditor = ({qIndex, register, control, setValue}) => {
    const {fields, append, remove} = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
        keyName: "key",
    });

    const answers = useWatch({control, name: `questions.${qIndex}.answers`}) || [];

    useEffect(() => {
        const needsSync = answers.some((answer, index) => answer.id !== index + 1);
        if (needsSync) {
            setValue(`questions.${qIndex}.answers`, answers.map((a, i) => ({...a, id: i + 1})), {shouldDirty: true});
        }
    }, [answers, qIndex, setValue]);

    const handleAddAnswer = () => {
        if (fields.length < 10) append({text: "", is_correct: true});
    };

    const handleRemoveAnswer = (indexToRemove) => {
        if (fields.length > 1) remove(indexToRemove);
    };

    const setCorrectness = (index, value) => {
        setValue(`questions.${qIndex}.answers.${index}.is_correct`, value, {shouldDirty: true});
    };

    const inputCls = "px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    return (
        <div className="space-y-5">
            <div>
                <label htmlFor={`qt-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
                    Question
                </label>
                <textarea
                    id={`qt-${qIndex}`}
                    placeholder="e.g., Determine if the following statements are true or false."
                    {...register(`questions.${qIndex}.question`, {required: "Question text cannot be empty."})}
                    className={`${inputCls} w-full max-h-[400px]`}
                    rows="3"
                />
            </div>

            <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#1C1E21]">Answer Options</label>
                {fields.map((field, aIndex) => {
                    const isCorrect = answers[aIndex]?.is_correct;
                    return (
                        <div key={field.key} className="flex items-center gap-3">
                            <div className="relative flex-shrink-0 flex w-32 rounded-xl border border-[#E4E6EB] bg-[#F0F2F5] overflow-hidden">
                                <div className={`absolute top-0 h-full w-1/2 rounded-xl transition-all duration-300 ease-in-out ${isCorrect ? 'translate-x-0 bg-green-500' : 'translate-x-full bg-red-500'}`}/>
                                <button
                                    type="button"
                                    onClick={() => setCorrectness(aIndex, true)}
                                    className={`relative z-10 w-1/2 py-2 px-3 text-sm font-semibold transition-colors duration-150 ${isCorrect ? 'text-white' : 'text-[#65676B] hover:bg-black/5'}`}
                                >
                                    True
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCorrectness(aIndex, false)}
                                    className={`relative z-10 w-1/2 py-2 px-3 text-sm font-semibold transition-colors duration-150 ${!isCorrect ? 'text-white' : 'text-[#65676B] hover:bg-black/5'}`}
                                >
                                    False
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder={`Statement ${aIndex + 1}`}
                                {...register(`questions.${qIndex}.answers.${aIndex}.text`, {required: "Option cannot be empty."})}
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
                    );
                })}
            </div>

            <button
                type="button"
                onClick={handleAddAnswer}
                disabled={fields.length >= 10}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0866FF] hover:text-[#0757D9] disabled:text-[#BEC3C9] disabled:cursor-not-allowed transition-colors"
            >
                <PlusCircle size={16}/>
                Add Statement
            </button>
        </div>
    );
};

export default TrueFalseEditor;
