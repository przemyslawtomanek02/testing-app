import {ArrowRight, CheckCircle, CheckSquare, Circle, Square} from "lucide-react";
import React from "react";

export const RenderUserAnswer = ({result}) => {
    const userResponse = result.user_response || [];

    const findUserTrueFalseAnswer = (userResponses, answerId) => {
        if (!Array.isArray(userResponses)) return undefined;
        const userResponseItem = userResponses.find(item => item.answer_id === answerId);
        return userResponseItem ? userResponseItem.user_answer : undefined;
    };

    switch (result.question_type) {
        case 'SingleChoice':
            return (
                <div className="space-y-2 text-slate-800 dark:text-darkCustom-100">
                    {result.answers.map((answer, index) => {
                        const isSelected = userResponse[0]?.answer_id === answer.answer_id;
                        return (
                            <div key={answer.answer_id || index}
                                 className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-md ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10 font-medium' : ''}`}>
                                {isSelected ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400"/> :
                                    <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500"/>}
                                <span className="text-sm sm:text-base">{answer.text}</span>
                            </div>
                        );
                    })}
                </div>
            );

        case 'MultipleChoice':
            return (
                <div className="space-y-2 text-slate-800 dark:text-darkCustom-100">
                    {result.answers.map((answer, index) => {
                        const selection = userResponse.find(res => res.answer_id === answer.answer_id);
                        const isSelected = selection?.user_answer === 'True';
                        return (
                            <div key={answer.answer_id || index}
                                 className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-md ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10 font-medium' : ''}`}>
                                {isSelected ? <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400"/> :
                                    <Square className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500"/>}
                                <span className="text-sm sm:text-base">{answer.text}</span>
                            </div>
                        );
                    })}
                </div>
            );

        case 'DragAndDropOrder':
            return Array.isArray(userResponse) && userResponse.length > 0 ? (
                <div className="space-y-2">
                    {userResponse.map((item, idx) => (
                        <div key={item.answer_id || idx}
                             className="flex items-center gap-2 sm:gap-3 p-2 border border-slate-200 dark:border-darkCustom-700 rounded-md bg-blue-50 dark:bg-blue-500/10 text-slate-800 dark:text-darkCustom-100">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{idx + 1}.</span>
                            <span className="text-sm sm:text-base">{item.text}</span>
                        </div>
                    ))}
                </div>
            ) : <p className="text-slate-500 dark:text-darkCustom-400">No response was provided.</p>;

        case 'FillInTheBlank':
            return Array.isArray(userResponse) && userResponse.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3 rounded-md bg-slate-50 dark:bg-blue-500/10 border border-slate-200 dark:border-darkCustom-700 text-slate-800 dark:text-darkCustom-100">
                    {userResponse.map(part => (
                        part.type === 'text'
                            ? <span key={part.id} className="text-sm sm:text-base">{part.value}</span>
                            : <span key={part.id}
                                    className="font-bold text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-300/10 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-sm sm:text-base">{part.text}</span>
                    ))}
                </div>
            ) : <p className="text-slate-500 dark:text-darkCustom-400">No response was provided.</p>;

        case 'Rating':
            if (userResponse[0]?.selected_range) {
                return <p className="font-semibold text-sm sm:text-base text-slate-700 dark:text-darkCustom-200">Wybrano zakres: <span
                    className="text-blue-600 dark:text-blue-400">{userResponse[0].selected_range.join(' - ')}</span></p>;
            }
            if (userResponse[0]?.chosen_value) {
                return <p className="font-semibold text-sm sm:text-base text-slate-700 dark:text-darkCustom-200">Wybrano: <span
                    className="text-blue-600 dark:text-blue-400">{userResponse[0].chosen_value}</span></p>;
            }
            return <p className="text-slate-500 dark:text-darkCustom-400">No response was provided.</p>;


        case 'MatchingMultiple':
            const userResponseObject = userResponse[0] || {};
            const leftUserOrder = userResponseObject.left_order?.map(id => result.answers.find(a => a.answer_id === id)).filter(Boolean) || [];
            const rightUserOrder = userResponseObject.right_order?.map(id => result.answers.find(a => a.answer_id === id)).filter(Boolean) || [];

            if (leftUserOrder.length === 0) {
                return <p className="text-slate-500 dark:text-darkCustom-400">No response was provided.</p>;
            }

            return (
                <div className="space-y-2">
                    {leftUserOrder.map((leftItem, index) => {
                        const rightItem = rightUserOrder[index];
                        if (!rightItem) return null;

                        return (
                            <div key={leftItem.answer_id || index} className="flex items-center gap-1 sm:gap-2">
                                <div className="w-full text-xs sm:text-sm p-2 rounded-md border bg-blue-50 dark:bg-blue-500/10 border-slate-200 dark:border-darkCustom-700 text-slate-800 dark:text-darkCustom-100">
                                    <span className="line-clamp-2">{leftItem.text}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500 shrink-0"/>
                                <div className="w-full text-xs sm:text-sm p-2 rounded-md border bg-blue-50 dark:bg-blue-500/10 border-slate-200 dark:border-darkCustom-700 text-slate-800 dark:text-darkCustom-100">
                                    <span className="line-clamp-2">{rightItem.text}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );

        case 'TrueFalse':
            return (
                <div className="space-y-3 text-slate-800 dark:text-darkCustom-100">
                    {result.answers.map((answer, index) => {
                        const userAnswer = findUserTrueFalseAnswer(result.user_response, answer.answer_id) === 'True';
                        return (
                            <div key={answer.answer_id || index}
                                 className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-darkCustom-800">
                                <span className="text-sm sm:text-base pr-2">{answer.text}</span>
                                <span
                                    className={`font-bold px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm rounded-full ${userAnswer ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'}`}>
                                    {userAnswer ? 'True' : 'False'}
                                </span>
                            </div>
                        )
                    })}
                </div>
            );

        default:
            return <p className="text-slate-500 dark:text-darkCustom-400">No data to display.</p>;
    }
};

export const RenderCorrectAnswer = ({result}) => {
    const correctAnswers = result.correct_answers || [];

    switch (result.question_type) {
        case 'SingleChoice':
        case 'MultipleChoice':
            return (
                <div className="space-y-2 text-slate-800 dark:text-darkCustom-100">
                    {result.answers.map((answer, index) => (
                        <div key={answer.answer_id || index}
                             className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-md ${answer.is_correct ? 'bg-green-50 dark:bg-green-500/10 font-medium' : ''}`}>
                            {answer.is_correct ?
                                (result.question_type === 'SingleChoice' ?
                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400"/> :
                                    <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400"/>)
                                : (result.question_type === 'SingleChoice' ?
                                    <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500"/> :
                                    <Square className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500"/>)
                            }
                            <span className="text-sm sm:text-base">{answer.text}</span>
                        </div>
                    ))}
                </div>
            );

        case 'DragAndDropOrder':
            return Array.isArray(correctAnswers) && correctAnswers.length > 0 ? (
                <div className="space-y-2">
                    {correctAnswers.map((item, idx) => (
                        <div key={item.answer_id || idx}
                             className="flex items-center gap-2 sm:gap-3 p-2 border border-slate-200 dark:border-green-900/50 rounded-md bg-green-50 dark:bg-green-500/10 text-slate-800 dark:text-darkCustom-100">
                            <span className="font-bold text-green-600 dark:text-green-400">{idx + 1}.</span>
                            <span className="text-sm sm:text-base">{item.text}</span>
                        </div>
                    ))}
                </div>
            ) : <p className="text-slate-500 dark:text-darkCustom-400">Missing correct data order.</p>;

        case 'Rating': {
            const {correct_enabled, use_range, correct_range, correct_value} = result?.extra_data || {};

            if (!correct_enabled) {
                return <p className="text-slate-500 dark:text-darkCustom-400">Question without a scored answer.</p>;
            }

            if (use_range && Array.isArray(correct_range) && correct_range.length === 2) {
                return (
                    <p className="font-semibold text-sm sm:text-base text-slate-700 dark:text-darkCustom-200">
                        Poprawny zakres: <span className="text-green-600 dark:text-green-400">{correct_range[0]} - {correct_range[1]}</span>
                    </p>
                );
            }

            if (!use_range && correct_value != null) {
                return (
                    <p className="font-semibold text-sm sm:text-base text-slate-700 dark:text-darkCustom-200">
                        Poprawna wartość: <span className="text-green-600 dark:text-green-400">{correct_value}</span>
                    </p>
                );
            }

            return <p className="text-slate-500 dark:text-darkCustom-400">Missing correct data order.</p>;
        }

        case 'FillInTheBlank':
            return Array.isArray(correctAnswers) && correctAnswers.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3 rounded-md bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-900/50 text-slate-800 dark:text-darkCustom-100">
                    {correctAnswers.map((part, index) => (
                        part.type === 'text'
                            ? <span key={part.id || index} className="text-sm sm:text-base">{part.value}</span>
                            : <span key={part.id || index}
                                    className="font-bold text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-500/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-sm sm:text-base">{part.text}</span>
                    ))}
                </div>
            ) : <p className="text-slate-500 dark:text-darkCustom-400">Missing correct data order.</p>;


        case 'MatchingMultiple':
            if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
                return <p className="text-slate-500 dark:text-darkCustom-400">Missing correct data order.</p>;
            }
            return (
                <div className="space-y-2">
                    {correctAnswers.map((pair, index) => (
                        <div key={index} className="flex items-center gap-1 sm:gap-2">
                            <div className="w-full text-xs sm:text-sm p-2 rounded-md border bg-green-50 dark:bg-green-500/10 border-slate-200 dark:border-green-900/50 text-slate-800 dark:text-darkCustom-100">
                                <span className="line-clamp-2">{pair.left?.text}</span>
                            </div>
                            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500 shrink-0"/>
                            <div className="w-full text-xs sm:text-sm p-2 rounded-md border bg-green-50 dark:bg-green-500/10 border-slate-200 dark:border-green-900/50 text-slate-800 dark:text-darkCustom-100">
                                <span className="line-clamp-2">{pair.right?.text}</span>
                            </div>
                        </div>
                    ))}
                </div>
            );

        case 'TrueFalse':
            return (
                <div className="space-y-3 text-slate-800 dark:text-darkCustom-100">
                    {result.answers.map((answer, index) => {
                        const isThisTheCorrectAnswer = answer.is_correct;
                        return (
                            <div key={answer.answer_id || index}
                                 className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-darkCustom-800">
                                <span className="text-sm sm:text-base pr-2">{answer.text}</span>
                                <span
                                    className={`font-bold px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm rounded-full ${isThisTheCorrectAnswer ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'}`}>
                                    {isThisTheCorrectAnswer ? 'True' : 'False'}
                                </span>
                            </div>
                        )
                    })}
                </div>
            );

        default:
            return <p className="text-slate-500 dark:text-darkCustom-400">Missing correct data order.</p>;
    }
};