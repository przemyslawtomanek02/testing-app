import React, {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom'
import {useTestContext} from './Context/TestContext.jsx';
import SingleChoiceQuestion from './QuestionsTypes/SingleChoiceQuestion.jsx';
import MultipleChoiceQuestion from './QuestionsTypes/MultipleChoiceQuestion';
import TrueFalseQuestion from './QuestionsTypes/TrueFalseQuestion';
import DragAndDropOrderQuestion from './QuestionsTypes/DragAndDropOrderQuestion.jsx';
import TimerClock from "./Reusable/TimerClock.jsx";
import {motion, AnimatePresence} from 'framer-motion';
import MatchingMultipleQuestion from "./QuestionsTypes/MatchingMultipleQuestion.jsx";
import RatingQuestion from "./QuestionsTypes/RatingQuestion.jsx";
import FillInTheBlankQuestion from "./QuestionsTypes/FillInTheBlankQuestion.jsx";
import SuspensePage from './Suspense.jsx';
import {toast} from "react-toastify";

export default function SolvingTestPage() {
    const {
        questions,
        answers,
        saveAnswer,
        currentQuestionIndex,
        goToNextQuestion,
        isTestFinished,
        finishTest,
        testTime,
        testMeta,
    } = useTestContext();

    const navigate = useNavigate();
    const [orientation, setOrientation] = useState('');
    const [warning, setWarning] = useState({
        visible: false,
        shown: false,
    });
    const [exitCount, setExitCount] = useState(0);
    const currentQuestion = questions[currentQuestionIndex];

    // console.log(questions);
    // console.log(answers);
    // console.log(currentQuestionIndex);

    const isExitRegistered = useRef(false);
    const blurTimeout = useRef(null);

    useEffect(() => {
        if (!isTestFinished && questions.length === 0) {
            toast.warn("No active test session found. Please start an exam first.");
            navigate('/exams', {replace: true});
        }
    }, [questions, isTestFinished, navigate]);

    useEffect(() => {
        if (currentQuestion?.image) {
            const img = new Image();
            // img.src = currentQuestion.image.replace(/\\/g, '/');
            img.src = `/uploads/${currentQuestion.image}`
            img.onload = () => {
                setOrientation(
                    img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait'
                );
            };
        } else {
            setOrientation('');
        }
    }, [currentQuestion]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isExitRegistered.current) {
                isExitRegistered.current = true;
                blurTimeout.current = setTimeout(() => {
                    setExitCount((prev) => prev + 1);
                }, 1000);
            } else if (document.visibilityState === 'visible') {
                clearTimeout(blurTimeout.current);
                isExitRegistered.current = false;
            }
        };

        const handleBlur = () => {
            if (!isExitRegistered.current) {
                isExitRegistered.current = true;
                blurTimeout.current = setTimeout(() => {
                    setExitCount((prev) => prev + 1);
                }, 1000);
            }
        };

        const handleFocus = () => {
            clearTimeout(blurTimeout.current);
            isExitRegistered.current = false;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            clearTimeout(blurTimeout.current);
        };
    }, []);

    useEffect(() => {
        if (exitCount === 1 && !warning.shown) {
            setWarning({visible: true, shown: true});
        } else if (exitCount >= 2) {
            finishTest();
        }
    }, [exitCount, finishTest, warning.shown]);

    const renderQuestion = () => {
        if (!currentQuestion) return null;

        // console.log(currentQuestion)
        // console.log(currentQuestion.type);

        const props = {
            question: currentQuestion, //obiekt pytania
            answer: answers[currentQuestionIndex], // odpowiedz usera na to pytanie
            onAnswerChange: saveAnswer,
        };

        switch (currentQuestion.type) {
            case 'SingleChoice':
                return <SingleChoiceQuestion {...props} />;
            case 'MultipleChoice':
                return <MultipleChoiceQuestion {...props} />;
            case 'TrueFalse':
                return <TrueFalseQuestion {...props} />;
            case 'DragAndDropOrder':
                return <DragAndDropOrderQuestion {...props} />;
            case 'FillInTheBlank':
                return <FillInTheBlankQuestion {...props} />;
            case 'Rating':
                return <RatingQuestion {...props} />;
            case 'MatchingMultiple':
                return <MatchingMultipleQuestion {...props} />;
            default:
                return <p>Nieobsługiwany typ pytania</p>;
        }
    };

    if (!currentQuestion) {
        return <SuspensePage/>;
    }

    return (
        <div
            className="mx-auto bg-gradient-to-br from-white via-indigo-100 to-white dark:bg-gradient-to-br dark:from-[#141517] dark:via-[#1d212a] dark:to-[#131314] p-5 pt-15 md:pt-25 font-sans flex flex-col justify-start items-center min-h-screen min-w-[320px] overflow-x-hidden">

            {warning.visible && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-darkCustom-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 text-center">
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Warning</h2>
                        <p className="text-gray-700 dark:text-darkCustom-200">
                            Leaving the test window or switching tabs will result in failure.
                        </p>
                        <button
                            onClick={() => setWarning(prev => ({...prev, visible: false}))}
                            className="mt-4 py-3 px-5 text-sm font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-900 dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:hover:bg-darkCustom-200 transition"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            {!warning.visible && currentQuestion && (
                <>
                    <div
                        className="fixed top-0 left-1/2 transform -translate-x-1/2 flex justify-between items-center w-[90%] sm:w-[85%] lg:w-[95%] mt-6 sm:mt-8 text-center">
                        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-darkCustom-100 drop-shadow-md max-w-[15rem]">
                            {testMeta.name}
                        </h1>
                        <div className="flex items-center md:mr-5">
                            <TimerClock totalTime={testTime} onTimeEnd={finishTest}/>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -20}}
                            transition={{duration: 0.3, ease: "easeInOut"}}
                            className="bg-white/50 dark:bg-darkCustom-800/80 p-4 sm:p-6 md:p-8 rounded-lg shadow-lg w-full max-w-4xl
                                       mt-24 md:mt-28 lg:mt-32
                                       text-left hover:shadow-2xl"
                        >
                            {currentQuestion.image && (
                                <img
                                    src={`/uploads/${currentQuestion.image}`}
                                    alt="Question"
                                    className={`rounded-xl shadow-md mx-auto mb-6 ${orientation === 'landscape' ? 'w-full sm:w-[90%]' : 'w-[70%] md:w-[50%]'}`}
                                />
                            )}
                            {renderQuestion()}
                            <div className="flex justify-between items-center mt-6">
                                <span className="text-sm sm:text-base text-gray-700 dark:text-darkCustom-300">
                                    Pytanie {currentQuestionIndex + 1} z {questions.length}
                                </span>
                                <button
                                    onClick={() => goToNextQuestion()}
                                    disabled={isTestFinished}
                                    className="py-2 px-4 text-sm sm:py-3 sm:px-6 sm:text-lg font-semibold bg-slate-800 text-white rounded-lg shadow hover:bg-slate-900 transition disabled:bg-slate-400 dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:hover:bg-darkCustom-200 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400 disabled:cursor-not-allowed"
                                >
                                    {currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'}
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
