import React, {useEffect, useState} from 'react';
import {useTestContext} from "./Context/TestContext.jsx";
import {toast} from 'react-toastify';
import {BookCopy, Clock, PlayCircle, Loader2} from 'lucide-react';
import {AnimatePresence, motion} from "framer-motion";

const ExamCardSkeleton = () => (
    <div
        className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-lg flex flex-col md:flex-row border-l-4 border-slate-200 dark:border-darkCustom-700 animate-pulse">
        <div className="p-4 sm:p-6 flex-1">
            <div className="h-5 w-3/4 bg-slate-200 dark:bg-darkCustom-600 rounded mb-2"></div>
            <div className="h-5 w-1/2 bg-slate-200 dark:bg-darkCustom-600 rounded"></div>
        </div>
        <div
            className="flex flex-col md:flex-row items-stretch md:items-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-darkCustom-700 flex-shrink-0">
            <div className="flex items-center justify-center gap-4 sm:gap-6 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col items-center w-16 sm:w-20">
                    <div className="h-6 w-6 bg-slate-200 dark:bg-darkCustom-600 rounded mb-1"></div>
                    <div className="h-5 w-12 bg-slate-200 dark:bg-darkCustom-600 rounded"></div>
                </div>
                <div className="flex flex-col items-center w-16 sm:w-20">
                    <div className="h-6 w-6 bg-slate-200 dark:bg-darkCustom-600 rounded mb-1"></div>
                    <div className="h-5 w-12 bg-slate-200 dark:bg-darkCustom-600 rounded"></div>
                </div>
            </div>
            <div className="p-4 md:p-6 md:border-l border-t border-slate-200 md:border-t-0 dark:border-darkCustom-700">
                <div className="h-12 w-full md:w-28 bg-slate-200 dark:bg-darkCustom-600 rounded-lg"></div>
            </div>
        </div>
    </div>
);

const ExamCard = ({exam, onStart, index, isLoading}) => (
    <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.3, ease: "easeOut", delay: index * 0.05}}
        className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-lg flex flex-col md:flex-row items-stretch
                   transform transition-all duration-300 hover:shadow-2xl md:hover:scale-[1.03] will-change-transform
                   border-l-4 border-slate-700 dark:border-darkCustom-300 overflow-hidden"
    >
        <div className="p-4 sm:p-6 flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-darkCustom-100 line-clamp-2">
                {exam.instance_name}
            </h2>
        </div>

        <div
            className="flex flex-col md:flex-row items-stretch md:items-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-darkCustom-700 flex-shrink-0">
            <div className="flex items-center justify-center gap-4 sm:gap-6 px-4 py-3 sm:px-6 sm:py-4 text-center">
                <div className="flex flex-col items-center w-16 sm:w-20">
                    <BookCopy className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 dark:text-darkCustom-400 mb-1"/>
                    <div>
                        <span
                            className="font-bold text-lg sm:text-xl text-slate-800 dark:text-darkCustom-100">{exam.num_questions}</span>
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-darkCustom-400 ml-1">q's</span>
                    </div>
                </div>
                <div className="flex flex-col items-center w-16 sm:w-20">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 dark:text-darkCustom-400 mb-1"/>
                    <div>
                        <span
                            className="font-bold text-lg sm:text-xl text-slate-800 dark:text-darkCustom-100">{exam.test_time}</span>
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-darkCustom-400 ml-1">min</span>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-6 md:border-l border-t border-slate-200 md:border-t-0 dark:border-darkCustom-700">
                <button
                    className="w-full md:w-auto px-4 py-3 sm:px-6 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 whitespace-nowrap
                               dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:hover:bg-darkCustom-200
                               disabled:bg-slate-400 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400 text-sm sm:text-base"
                    onClick={() => onStart(exam.instance_id)}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin"/> :
                        <PlayCircle size={18}/>}
                    <span>Start</span>
                </button>
            </div>
        </div>
    </motion.div>
);

function ExamsPage() {
    const [exams, setExams] = useState([]);
    const [loadingExams, setLoadingExams] = useState(true);
    const [startingTestId, setStartingTestId] = useState(null);
    const {startTest} = useTestContext();

    useEffect(() => {
        const fetchExams = async () => {
            console.log("EXAMS PAGE: Pobieranie egzaminów...");
            setLoadingExams(true);
            try {
                const response = await fetch("/api/get_instances");
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const data = await response.json();
                setExams(data);
                console.log("EXAMS PAGE: Egzaminy załadowane.");
            } catch (error) {
                console.error("EXAMS PAGE: Błąd podczas pobierania egzaminów:", error);
                toast.error("Failed to load exams.");
            } finally {
                setLoadingExams(false);
            }
        };
        void fetchExams();
    }, []);

    const handleStartTest = async (instanceId) => {
        setStartingTestId(instanceId);
        try {
            const result = await startTest(instanceId);
            if (typeof result === 'object' && result.error) {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error starting test. Please try again later.");
        }
        setStartingTestId(null);
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-white via-indigo-100 to-white dark:bg-gradient-to-br dark:from-[#141517] dark:via-[#1d212a] dark:to-[#131314]">
            <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10 sm:mb-12">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-darkCustom-50">Select
                            Exam</h1>
                        <p className="text-slate-500 dark:text-darkCustom-50 mt-2 text-base sm:text-lg">Good luck!</p>
                    </div>

                    <div className="flex flex-col space-y-4 sm:space-y-6">
                        <AnimatePresence>
                            {loadingExams ? (
                                [1, 2, 3].map(i => <ExamCardSkeleton key={i}/>)
                            ) : exams.length > 0 ? (
                                exams.map((exam, index) => (
                                    <ExamCard
                                        key={exam.instance_id}
                                        exam={exam}
                                        onStart={handleStartTest}
                                        index={index}
                                        isLoading={startingTestId === exam.instance_id}
                                    />
                                ))
                            ) : (
                                <motion.div
                                    initial={{opacity: 0, scale: 0.95}}
                                    animate={{opacity: 1, scale: 1}}
                                    transition={{
                                        duration: 0.4,
                                        delay: 0.1
                                    }}
                                    className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 bg-white dark:bg-darkCustom-800 rounded-2xl shadow-lg"
                                >
                                    <BookCopy
                                        className="h-12 w-12 sm:h-14 sm:w-14 text-slate-400 dark:text-darkCustom-400 mb-4"/>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-darkCustom-300">
                                        No exams available</h2>
                                    <p className="text-slate-500 dark:text-darkCustom-400 mt-2 text-sm sm:text-base">
                                        Please check back later.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default ExamsPage;
