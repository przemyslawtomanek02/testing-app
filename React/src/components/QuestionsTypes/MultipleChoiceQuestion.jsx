import React, {useState, useEffect} from 'react';
import {Square, CheckSquare} from 'lucide-react';

export default function MultipleChoiceQuestion({question, answer, onAnswerChange}) {
    const [selectedAnswers, setSelectedAnswers] = useState(new Set());

    useEffect(() => {
        if (answer && Array.isArray(answer)) {
            const initialSelected = new Set(
                answer.filter(a => a.user_answer === 'True').map(a => a.answer_id)
            );
            setSelectedAnswers(initialSelected);
        } else {
            setSelectedAnswers(new Set());
        }
    }, [answer]);

    /**
     * Przełącza stan zaznaczenia dla danej odpowiedzi i zapisuje zmianę.
     * @param {string} answerId - ID odpowiedzi do przełączenia.
     */
    const toggleAnswer = (answerId) => {
        const newSelectedAnswers = new Set(selectedAnswers);
        if (newSelectedAnswers.has(answerId)) {
            newSelectedAnswers.delete(answerId);
        } else {
            newSelectedAnswers.add(answerId);
        }
        setSelectedAnswers(newSelectedAnswers);

        const formattedAnswer = question.answers.map(ans => ({
            answer_id: ans.answer_id,
            user_answer: newSelectedAnswers.has(ans.answer_id) ? 'True' : 'False',
        }));
        onAnswerChange(formattedAnswer);
    };

    const handleKeyDown = (e, answerId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleAnswer(answerId);
        }
    };

    return (
        <div className="flex flex-col gap-4 my-6">
            <p className="mt-5 text-lg sm:text-xl text-gray-800 dark:text-darkCustom-100">{question.question}</p>

            <div className="space-y-3 mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-300">Select all correct
                    answers</label>

                <div role="group" className="space-y-3">
                    {question.answers.map((ans) => {
                        const isSelected = selectedAnswers.has(ans.answer_id);
                        return (
                            <div
                                key={ans.answer_id}
                                onClick={() => toggleAnswer(ans.answer_id)}
                                onKeyDown={(e) => handleKeyDown(e, ans.answer_id)}
                                role="checkbox"
                                aria-checked={isSelected}
                                tabIndex={0}
                                className={`flex items-center gap-3 p-4 rounded-lg border border-transparent cursor-pointer transition-colors
                                ${isSelected
                                    ? 'bg-blue-100 border border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30'
                                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-darkCustom-700 dark:hover:bg-darkCustom-600'
                                }`}
                            >
                                {isSelected ? (
                                    <CheckSquare size={22} className="text-blue-600 dark:text-blue-400 flex-shrink-0"/>
                                ) : (
                                    <Square size={22}
                                            className="text-slate-400 dark:text-darkCustom-500 flex-shrink-0"/>
                                )}

                                <span className="text-base text-slate-800 dark:text-darkCustom-100">{ans.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}