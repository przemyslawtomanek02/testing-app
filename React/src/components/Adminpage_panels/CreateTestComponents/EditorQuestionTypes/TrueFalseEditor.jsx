import React, { useEffect } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { PlusCircle, Trash2 } from 'lucide-react';

const TrueFalseEditor = ({ qIndex, register, control, setValue }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
        keyName: "key",
    });

    const answers = useWatch({
        control,
        name: `questions.${qIndex}.answers`,
    }) || [];

    useEffect(() => {
        const needsSync = answers.some((answer, index) => answer.id !== index + 1);

        if (needsSync) {
            const syncedAnswers = answers.map((answer, index) => ({
                ...answer,
                id: index + 1,
            }));
            setValue(`questions.${qIndex}.answers`, syncedAnswers, { shouldDirty: true });
        }
    }, [answers, qIndex, setValue]);


    /**
     * Dodaje nowe, puste stwierdzenie do listy. Domyślnie ustawione jako "True".
     */
    const handleAddAnswer = () => {
        if (fields.length < 10) {
            append({ text: "", is_correct: true });
        }
    };

    /**
     * Usuwa stwierdzenie z listy.
     * @param {number} indexToRemove - Indeks stwierdzenia do usunięcia.
     */
    const handleRemoveAnswer = (indexToRemove) => {
        if (fields.length > 1) {
            remove(indexToRemove);
        }
    };

    /**
     * Ustawia stan Prawda/Fałsz dla konkretnego stwierdzenia.
     * @param {number} index - Indeks stwierdzenia, którego stan zmieniamy.
     * @param {boolean} value - Nowa wartość (true dla Prawda, false dla Fałsz).
     */
    const setCorrectness = (index, value) => {
        setValue(`questions.${qIndex}.answers.${index}.is_correct`, value, { shouldDirty: true });
    };

    const inputClasses = "p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div className="space-y-6">
            {/* Pole do wprowadzania głównego pytania/instrukcji */}
            <div>
                <label htmlFor={`question-text-${qIndex}`} className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">
                    Question
                </label>
                <textarea
                    id={`question-text-${qIndex}`}
                    placeholder="e.g., Determine if the following statements are true or false."
                    {...register(`questions.${qIndex}.question`, { required: "Question text cannot be empty." })}
                    className={`${inputClasses} w-full max-h-[400px]`}
                    rows="3"
                />
            </div>

            {/* Sekcja z listą stwierdzeń do oceny */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">Answer Options</label>
                {fields.map((field, aIndex) => {
                    const isCorrect = answers[aIndex]?.is_correct;
                    return (
                        <div key={field.key} className="flex items-center gap-3">
                            <div className="relative flex-shrink-0 flex w-32 rounded-md border border-slate-300 bg-slate-50 dark:border-darkCustom-600 dark:bg-darkCustom-700">
                                {/* Przesuwające się tło */}
                                <div
                                    className={`absolute top-0 h-full w-1/2 rounded-md transition-all duration-300 ease-in-out ${
                                        isCorrect ? 'translate-x-0 bg-green-500' : 'translate-x-full bg-red-500'
                                    }`}
                                />

                                {/* Przycisk "True" */}
                                <button
                                    type="button"
                                    onClick={() => setCorrectness(aIndex, true)}
                                    className={`relative z-10 w-1/2 py-2 px-3 text-sm font-semibold transition-colors duration-150 ${
                                        isCorrect ? 'text-white' : 'text-slate-700 dark:text-darkCustom-100 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    True
                                </button>

                                {/* Przycisk "False" */}
                                <button
                                    type="button"
                                    onClick={() => setCorrectness(aIndex, false)}
                                    className={`relative z-10 w-1/2 py-2 px-3 text-sm font-semibold transition-colors duration-150 ${
                                        !isCorrect ? 'text-white' : 'text-slate-700 dark:text-darkCustom-100 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    False
                                </button>
                            </div>

                            {/* Pole do wprowadzania treści stwierdzenia */}
                            <input
                                type="text"
                                placeholder={`Option ${aIndex + 1}`}
                                {...register(`questions.${qIndex}.answers.${aIndex}.text`, { required: "Option cannot be empty." })}
                                className={`${inputClasses} flex-grow`}
                            />

                            {/* Przycisk do usuwania stwierdzenia */}
                            <button
                                type="button"
                                onClick={() => handleRemoveAnswer(aIndex)}
                                disabled={fields.length <= 1}
                                className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 rounded-md disabled:text-slate-300 dark:text-darkCustom-400 dark:hover:text-red-500 dark:disabled:text-darkCustom-600 disabled:cursor-not-allowed transition-colors"
                                aria-label={`Remove Option ${aIndex + 1}`}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Przycisk do dodawania nowego stwierdzenia */}
            <div>
                <button
                    type="button"
                    onClick={handleAddAnswer}
                    disabled={fields.length >= 10}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-darkCustom-500 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusCircle size={18} />
                    Add Option
                </button>
            </div>
        </div>
    );
};

export default TrueFalseEditor;
