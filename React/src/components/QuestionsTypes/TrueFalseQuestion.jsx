import React, {useEffect, useState} from 'react';

export default function TrueFalseQuestion({question, answer, onAnswerChange}) {
    const [internalAnswers, setInternalAnswers] = useState([]);

    useEffect(() => {
        if (Array.isArray(answer) && answer.length > 0 && answer.every(a => a.hasOwnProperty('user_answer'))) {
            setInternalAnswers(answer);
        } else {
            const defaultAnswers = question.answers.map(ans => ({
                answer_id: ans.answer_id,
                text: ans.text,
                user_answer: 'False'
            }));
            setInternalAnswers(defaultAnswers);
            onAnswerChange(defaultAnswers);
        }
    }, [answer, question.answers, onAnswerChange]);

    const toggleAnswerState = (answerId) => {
        const updatedAnswers = internalAnswers.map(ans => {
            if (ans.answer_id === answerId) {
                let newUserAnswer;
                if (ans.user_answer === 'False') {
                    newUserAnswer = 'True';
                } else {
                    newUserAnswer = 'False';
                }
                return {...ans, user_answer: newUserAnswer};
            }
            return ans;
        });

        setInternalAnswers(updatedAnswers);
        onAnswerChange(updatedAnswers);
    };

    const getUserAnswer = (answerId) => {
        const ans = internalAnswers.find(a => a.answer_id === answerId);
        return ans ? ans.user_answer : undefined;
    };

    const handleKeyDown = (e, answerId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleAnswerState(answerId);
        }
    };

    return (
        <div className="flex flex-col gap-4 my-6">
            <p className="mt-5 text-sm sm:text-xl text-gray-800 dark:text-darkCustom-100">{question.question}</p>

            <div className="space-y-4 mt-4" role="group">
                {question.answers.map((ans) => {
                    const currentUserAnswer = getUserAnswer(ans.answer_id);
                    const isTrueSelected = currentUserAnswer === 'True';

                    return (
                        <div
                            key={ans.answer_id}
                            role="switch"
                            aria-checked={isTrueSelected}
                            aria-label={ans.text}
                            tabIndex={0}
                            onClick={() => toggleAnswerState(ans.answer_id)}
                            onKeyDown={(e) => handleKeyDown(e, ans.answer_id)}
                            className="flex items-center justify-start rounded-lg w-full px-2.5 py-4 bg-gray-100 dark:bg-darkCustom-700"
                        >
                            <button
                                type="button"
                                onClick={() => toggleAnswerState(ans.answer_id)}
                                className="relative w-20 sm:w-24 h-8 sm:h-10 mr-4 flex-shrink-0 flex items-center justify-center rounded-md border bg-white border-gray-300 dark:bg-darkCustom-600 dark:border-darkCustom-600 overflow-hidden"
                            >
                                <div
                                    className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-300 rounded-md
                                        ${isTrueSelected ? 'translate-x-0 bg-green-400' : 'translate-x-full bg-red-400'}`}
                                />
                                <div
                                    className="relative z-10 w-full flex justify-around items-center font-semibold text-xs pointer-events-none">
                                    <span className={isTrueSelected ? 'text-white' : 'text-slate-700 dark:text-white'}>
                                        True
                                    </span>
                                    <span
                                        className={!isTrueSelected ? 'text-white dark:text-darkCustom-1000' : 'text-slate-700 dark:text-darkCustom-50'}>
                                        False
                                    </span>
                                </div>
                            </button>

                            <span className="text-xs sm:text-lg text-slate-800 dark:text-darkCustom-50 flex-1">
                                {ans.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
