import React, {useEffect} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';
import {PlusCircle, Trash2, Square, CheckSquare} from 'lucide-react';

const MultipleChoiceEditor = ({qIndex, register, control, setValue}) => {
    const {fields, append, remove} = useFieldArray({
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
            setValue(`questions.${qIndex}.answers`, syncedAnswers, {shouldDirty: true});
        }
    }, [answers, qIndex, setValue]);


    /**
     * Dodaje nową opcję odpowiedzi, do maksymalnie 5.
     */
    const handleAddAnswer = () => {
        if (fields.length < 5) {
            append({text: "", is_correct: false});
        }
    };

    /**
     * Usuwa opcję odpowiedzi o podanym indeksie.
     * @param {number} indexToRemove - Indeks odpowiedzi do usunięcia.
     */
    const handleRemoveAnswer = (indexToRemove) => {
        if (fields.length > 1) {
            remove(indexToRemove);
        }
    };

    /**
     * Przełącza stan 'is_correct' dla wybranej odpowiedzi.
     * @param {number} index - Indeks odpowiedzi do przełączenia.
     */
    const toggleCorrectAnswer = (index) => {
        const currentAnswers = answers;
        const updatedAnswer = {
            ...currentAnswers[index],
            is_correct: !currentAnswers[index].is_correct
        };
        setValue(`questions.${qIndex}.answers.${index}`, updatedAnswer, {shouldDirty: true});
    };

    const inputClasses = "w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div className="space-y-6">
            {/* Pole do wprowadzania treści pytania */}
            <div>
                <label htmlFor={`question-text-${qIndex}`} className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">
                    Question Text
                </label>
                <textarea
                    id={`question-text-${qIndex}`}
                    placeholder="e.g., Which of the following are prime numbers?"
                    {...register(`questions.${qIndex}.question`, {required: "Question text cannot be empty."})}
                    className={`${inputClasses} max-h-[400px]`}
                    rows="3"
                />
            </div>

            {/* Sekcja z odpowiedziami */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">Answer Options (select all correct
                    answers)</label>
                {fields.map((field, aIndex) => (
                    <div key={field.key} className="flex items-center gap-2">
                        {/* Niestandardowy checkbox do zaznaczania poprawnych odpowiedzi */}
                        <button
                            type="button"
                            onClick={() => toggleCorrectAnswer(aIndex)}
                            className="flex-shrink-0 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors"
                            aria-label={`Mark option ${aIndex + 1} as correct`}
                        >
                            {answers[aIndex]?.is_correct ? (
                                <CheckSquare size={22} className="text-blue-600 dark:text-blue-400"/>
                            ) : (
                                <Square size={22} className="text-slate-400 dark:text-darkCustom-500"/>
                            )}
                        </button>

                        {/* Pole do wprowadzania treści odpowiedzi */}
                        <input
                            type="text"
                            placeholder={`Option ${aIndex + 1}`}
                            {...register(`questions.${qIndex}.answers.${aIndex}.text`, {required: "Answer option cannot be empty."})}
                            className={`${inputClasses} flex-grow`}
                        />

                        {/* Przycisk do usuwania odpowiedzi */}
                        <button
                            type="button"
                            onClick={() => handleRemoveAnswer(aIndex)}
                            disabled={fields.length <= 1}
                            className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 rounded-md disabled:text-slate-300 dark:text-darkCustom-400 dark:hover:text-red-500 dark:disabled:text-darkCustom-600 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Remove option ${aIndex + 1}`}
                        >
                            <Trash2 size={18}/>
                        </button>
                    </div>
                ))}
            </div>

            {/* Przycisk do dodawania nowej odpowiedzi */}
            <div>
                <button
                    type="button"
                    onClick={handleAddAnswer}
                    disabled={fields.length >= 5}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-darkCustom-500 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusCircle size={18}/>
                    Add Option
                </button>
            </div>
        </div>
    );
};

export default MultipleChoiceEditor;
