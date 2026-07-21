import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, Loader, AlertCircle } from 'lucide-react';
import SingleChoiceQuestion from '../QuestionsTypes/SingleChoiceQuestion.jsx';
import MultipleChoiceQuestion from '../QuestionsTypes/MultipleChoiceQuestion';
import TrueFalseQuestion from '../QuestionsTypes/TrueFalseQuestion';
import DragAndDropOrderQuestion from '../QuestionsTypes/DragAndDropOrderQuestion.jsx';
import MatchingMultipleQuestion from '../QuestionsTypes/MatchingMultipleQuestion.jsx';
import RatingQuestion from '../QuestionsTypes/RatingQuestion.jsx';
import FillInTheBlankQuestion from '../QuestionsTypes/FillInTheBlankQuestion.jsx';
import TypedFillInBlankQuestion from '../QuestionsTypes/TypedFillInBlankQuestion.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function TestPreviewPanel({ testId, onBack }) {
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        const fetchTest = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/admin/get_admin_one_test/${testId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch test data');
                const data = await res.json();
                setTestData(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId]);

    const handleAnswerChange = (answer) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: answer }));
    };

    const renderQuestion = (question) => {
        const props = {
            question,
            answer: answers[currentIndex],
            onAnswerChange: handleAnswerChange,
        };
        switch (question.type) {
            case 'SingleChoice': return <SingleChoiceQuestion {...props} />;
            case 'MultipleChoice': return <MultipleChoiceQuestion {...props} />;
            case 'TrueFalse': return <TrueFalseQuestion {...props} />;
            case 'DragAndDropOrder': return <DragAndDropOrderQuestion {...props} />;
            case 'FillInTheBlank': return <FillInTheBlankQuestion {...props} />;
            case 'Rating': return <RatingQuestion {...props} />;
            case 'MatchingMultiple': return <MatchingMultipleQuestion {...props} />;
            case 'TypedFillInBlank': return <TypedFillInBlankQuestion {...props} />;
            default: return <p className="text-slate-500 dark:text-darkCustom-400 italic">Unsupported question type: {question.type}</p>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-darkCustom-800">
                <Loader className="animate-spin h-12 w-12 text-slate-400 dark:text-darkCustom-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-darkCustom-800">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
                    <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!testData) return null;

    const questions = testData.questions || [];
    const total = questions.length;
    const currentQuestion = questions[currentIndex];

    return (
        <div className="bg-slate-100 dark:bg-darkCustom-800 min-h-screen p-4 sm:p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-darkCustom-700 dark:text-darkCustom-50 transition-colors flex-shrink-0"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-darkCustom-50 truncate">{testData.test_name}</h2>
                        {testData.test_description && (
                            <p className="text-sm text-slate-500 dark:text-darkCustom-400 truncate">{testData.test_description}</p>
                        )}
                    </div>
                </div>
                <span className="flex items-center gap-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0">
                    <Eye size={16} /> Preview
                </span>
            </div>

            {/* Progress bar */}
            <div className="max-w-4xl mx-auto mb-4">
                <div className="flex justify-between text-xs text-slate-500 dark:text-darkCustom-400 mb-1.5">
                    <span>Question {currentIndex + 1} of {total}</span>
                    <span>{Math.round(((currentIndex + 1) / total) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-darkCustom-700 rounded-full">
                    <div
                        className="h-1.5 bg-slate-600 dark:bg-darkCustom-300 rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-4xl mx-auto bg-white dark:bg-darkCustom-900 rounded-xl shadow-lg p-6 sm:p-8"
                >
                    {currentQuestion.image && (
                        <img
                            src={`/uploads/${currentQuestion.image}`}
                            alt="Question"
                            className="rounded-xl shadow-md mx-auto mb-6 max-h-64 object-contain"
                        />
                    )}
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-medium text-slate-400 dark:text-darkCustom-500 uppercase tracking-wider bg-slate-100 dark:bg-darkCustom-700 px-2 py-1 rounded">
                            {currentQuestion.type}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-darkCustom-400 bg-slate-100 dark:bg-darkCustom-700 px-2 py-1 rounded">
                            {currentQuestion.points_value} pt{currentQuestion.points_value !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {renderQuestion(currentQuestion)}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="max-w-4xl mx-auto mt-4 flex justify-between items-center">
                <button
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-darkCustom-900 border border-slate-200 dark:border-darkCustom-700 text-slate-700 dark:text-darkCustom-200 hover:bg-slate-50 dark:hover:bg-darkCustom-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                    <ChevronLeft size={18} /> Previous
                </button>

                <div className="hidden sm:flex gap-1.5 flex-wrap justify-center max-w-xs">
                    {questions.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`h-2 rounded-full transition-all ${i === currentIndex ? 'bg-slate-700 dark:bg-darkCustom-200 w-5' : 'w-2 bg-slate-300 dark:bg-darkCustom-600 hover:bg-slate-400 dark:hover:bg-darkCustom-500'}`}
                        />
                    ))}
                </div>

                <button
                    onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
                    disabled={currentIndex === total - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 dark:bg-darkCustom-200 text-white dark:text-darkCustom-900 hover:bg-slate-800 dark:hover:bg-darkCustom-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                    Next <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
