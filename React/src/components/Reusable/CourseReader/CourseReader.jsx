import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import SingleChoiceQuestion from '../../QuestionsTypes/SingleChoiceQuestion.jsx';
import MultipleChoiceQuestion from '../../QuestionsTypes/MultipleChoiceQuestion.jsx';
import TrueFalseQuestion from '../../QuestionsTypes/TrueFalseQuestion.jsx';
import DragAndDropOrderQuestion from '../../QuestionsTypes/DragAndDropOrderQuestion.jsx';
import FillInTheBlankQuestion from '../../QuestionsTypes/FillInTheBlankQuestion.jsx';
import RatingQuestion from '../../QuestionsTypes/RatingQuestion.jsx';
import MatchingMultipleQuestion from '../../QuestionsTypes/MatchingMultipleQuestion.jsx';
import TypedFillInBlankQuestion from '../../QuestionsTypes/TypedFillInBlankQuestion.jsx';

const renderQuestionInput = (question, response, onAnswerChange) => {
    const props = { question, answer: response, onAnswerChange };
    switch (question?.type) {
        case 'SingleChoice':     return <SingleChoiceQuestion {...props} />;
        case 'MultipleChoice':   return <MultipleChoiceQuestion {...props} />;
        case 'TrueFalse':        return <TrueFalseQuestion {...props} />;
        case 'DragAndDropOrder': return <DragAndDropOrderQuestion {...props} />;
        case 'FillInTheBlank':   return <FillInTheBlankQuestion {...props} />;
        case 'Rating':           return <RatingQuestion {...props} />;
        case 'MatchingMultiple': return <MatchingMultipleQuestion {...props} />;
        case 'TypedFillInBlank': return <TypedFillInBlankQuestion {...props} />;
        default: return <p className="text-red-500">Unsupported question type.</p>;
    }
};

/**
 * Page-by-page reader shared by the student course view and the admin preview.
 * `pages` follow the CoursePageStudent/CoursePageAdmin shape: {page_id, order_index,
 * page_type: 'content'|'question', title, content_markdown, image, question, is_completed}.
 */
export default function CourseReader({ pages, initialPageIndex = 0, onAnswerSubmit, onPageChange, onComplete, readOnly = false }) {
    const [pageIndex, setPageIndex] = useState(Math.min(initialPageIndex, Math.max(pages.length - 1, 0)));
    const [response, setResponse] = useState(null);
    const [checking, setChecking] = useState(false);
    const [completedIds, setCompletedIds] = useState(
        () => new Set(pages.filter(p => p.is_completed).map(p => p.page_id))
    );

    const page = pages[pageIndex];
    const total = pages.length;
    const isQuestionPage = page?.page_type === 'question';
    const isCompleted = page ? completedIds.has(page.page_id) : false;
    const isLastPage = pageIndex >= total - 1;

    useEffect(() => { setResponse(null); }, [pageIndex]);

    useEffect(() => {
        if (page) onPageChange?.(pageIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex]);

    if (!page) return null;

    const handleAnswerChange = (val) => setResponse(Array.isArray(val) ? val : [val]);

    const goPrev = () => { if (pageIndex > 0) setPageIndex(i => i - 1); };
    const goNext = () => { if (!isLastPage) setPageIndex(i => i + 1); };
    const finishCourse = () => onComplete?.();

    const checkAnswer = async () => {
        if (readOnly) return;
        if (!response) { toast.warn('Select an answer first.'); return; }
        setChecking(true);
        try {
            const result = await onAnswerSubmit(page.page_id, response);
            if (result?.is_correct) {
                setCompletedIds(prev => new Set(prev).add(page.page_id));
                toast.success('Correct!');
            } else {
                toast.error('Not quite right — try again.');
            }
        } catch {
            toast.error('Could not check the answer.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 w-full">
            <div className="bg-white dark:bg-darkCustom-800 rounded-2xl shadow-lg p-6 sm:p-10 min-h-[420px] flex flex-col">
                <div className="flex-1">
                    {page.page_type === 'content' ? (
                        <>
                            {page.title && (
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-darkCustom-100 mb-4">{page.title}</h2>
                            )}
                            {page.image && (
                                <img src={`/uploads/${page.image}`} alt="" className="rounded-xl mb-6 max-h-96 mx-auto"/>
                            )}
                            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-slate-700 dark:text-darkCustom-200">
                                <ReactMarkdown>{page.content_markdown || ''}</ReactMarkdown>
                            </div>
                        </>
                    ) : (
                        <>
                            {page.question?.image && (
                                <img src={`/uploads/${page.question.image}`} alt="" className="rounded-xl mb-4 max-h-72 mx-auto"/>
                            )}
                            <p className="text-lg text-slate-800 dark:text-darkCustom-100 font-medium">{page.question?.question}</p>
                            {renderQuestionInput(page.question, response, handleAnswerChange)}
                            {isCompleted && (
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                                    <CheckCircle2 size={16}/> Correct — you can move on.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-darkCustom-700">
                    <button
                        onClick={goPrev}
                        disabled={pageIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 dark:text-darkCustom-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors"
                    >
                        <ArrowLeft size={18}/> Back
                    </button>

                    <span className="text-sm text-slate-500 dark:text-darkCustom-400">{pageIndex + 1} / {total}</span>

                    {isQuestionPage && !isCompleted ? (
                        <button
                            onClick={checkAnswer}
                            disabled={checking || readOnly}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-800 dark:bg-darkCustom-100 text-white dark:text-darkCustom-1000 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 dark:hover:bg-darkCustom-200 transition-colors"
                        >
                            {checking ? <Loader2 size={18} className="animate-spin"/> : 'Check answer'}
                        </button>
                    ) : isLastPage ? (
                        <button
                            onClick={finishCourse}
                            disabled={readOnly}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                        >
                            <CheckCircle2 size={18}/> Complete course
                        </button>
                    ) : (
                        <button
                            onClick={goNext}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-800 dark:bg-darkCustom-100 text-white dark:text-darkCustom-1000 font-semibold hover:bg-slate-900 dark:hover:bg-darkCustom-200 transition-colors"
                        >
                            Next <ArrowRight size={18}/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
