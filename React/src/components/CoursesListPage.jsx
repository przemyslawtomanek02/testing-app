import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GraduationCap, PlayCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CourseCardSkeleton = () => (
    <div className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-darkCustom-600 rounded mb-3"></div>
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-darkCustom-600 rounded"></div>
    </div>
);

const CourseCard = ({ course, onOpen, index }) => {
    const progressPct = course.is_completed
        ? 100
        : course.total_pages > 0
            ? Math.min(100, Math.round((course.current_page_index / course.total_pages) * 100))
            : 0;
    const started = course.current_page_index > 0 || course.is_completed;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
            className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-lg flex flex-col sm:flex-row items-stretch overflow-hidden border-l-4 border-slate-700 dark:border-darkCustom-300"
        >
            <div className="p-4 sm:p-6 flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-darkCustom-100 line-clamp-2">
                    {course.title}
                </h2>
                {course.description && (
                    <p className="text-sm text-slate-500 dark:text-darkCustom-400 mt-1 line-clamp-2">{course.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-darkCustom-700 rounded-full overflow-hidden max-w-xs">
                        <div className="h-full bg-slate-700 dark:bg-darkCustom-300 rounded-full" style={{ width: `${progressPct}%` }}/>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-darkCustom-400 whitespace-nowrap">
                        {course.is_completed ? 'Completed' : `${progressPct}%`}
                    </span>
                </div>
            </div>
            <div className="p-4 sm:p-6 flex items-center border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-darkCustom-700 flex-shrink-0">
                <button
                    onClick={() => onOpen(course.course_id)}
                    className="w-full sm:w-auto px-4 py-3 sm:px-6 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 whitespace-nowrap dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:hover:bg-darkCustom-200 text-sm sm:text-base"
                >
                    {course.is_completed
                        ? <CheckCircle2 size={18}/>
                        : <PlayCircle size={18}/>}
                    <span>{course.is_completed ? 'Review' : started ? 'Continue' : 'Start'}</span>
                </button>
            </div>
        </motion.div>
    );
};

export default function CoursesListPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/courses', { credentials: 'include' });
                if (!res.ok) throw new Error();
                setCourses(await res.json());
            } catch {
                toast.error('Failed to load courses.');
            } finally {
                setLoading(false);
            }
        };
        void fetchCourses();
    }, []);

    return (
        <div className="min-h-full bg-gradient-to-br from-white via-indigo-100 to-white dark:bg-gradient-to-br dark:from-[#141517] dark:via-[#1d212a] dark:to-[#131314]">
            <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10 sm:mb-12">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-darkCustom-50">E-learning</h1>
                        <p className="text-slate-500 dark:text-darkCustom-50 mt-2 text-base sm:text-lg">Pick a course to continue learning.</p>
                    </div>

                    <div className="flex flex-col space-y-4 sm:space-y-6">
                        <AnimatePresence>
                            {loading ? (
                                [1, 2, 3].map(i => <CourseCardSkeleton key={i}/>)
                            ) : courses.length > 0 ? (
                                courses.map((course, index) => (
                                    <CourseCard key={course.course_id} course={course} index={index} onOpen={(id) => navigate(`/courses/${id}`)}/>
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                    className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 bg-white dark:bg-darkCustom-800 rounded-2xl shadow-lg"
                                >
                                    <GraduationCap className="h-12 w-12 sm:h-14 sm:w-14 text-slate-400 dark:text-darkCustom-400 mb-4"/>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-darkCustom-300">No courses yet</h2>
                                    <p className="text-slate-500 dark:text-darkCustom-400 mt-2 text-sm sm:text-base">Please check back later.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
