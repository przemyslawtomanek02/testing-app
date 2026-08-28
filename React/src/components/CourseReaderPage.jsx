import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft } from 'lucide-react';
import CourseReader from './Reusable/CourseReader/CourseReader.jsx';
import SuspensePage from './Suspense.jsx';

export default function CourseReaderPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/courses/${courseId}`, { credentials: 'include' });
                if (!res.ok) throw new Error();
                setCourse(await res.json());
            } catch {
                toast.error('Failed to load the course.');
                navigate('/courses', { replace: true });
            } finally {
                setLoading(false);
            }
        };
        void fetchCourse();
    }, [courseId, navigate]);

    const handleAnswerSubmit = async (pageId, userResponse) => {
        const res = await fetch(`/api/courses/${courseId}/pages/${pageId}/answer`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_response: userResponse }),
        });
        if (!res.ok) throw new Error('Answer check failed.');
        return res.json();
    };

    const handlePageChange = (pageIndex) => {
        fetch(`/api/courses/${courseId}/progress`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_page_index: pageIndex }),
        }).catch(() => {});
    };

    const handleComplete = () => {
        toast.success(`"${course.title}" completed!`);
        navigate('/courses');
    };

    if (loading) return <SuspensePage/>;
    if (!course) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-indigo-100 to-white dark:bg-gradient-to-br dark:from-[#141517] dark:via-[#1d212a] dark:to-[#131314]">
            <div className="max-w-3xl mx-auto px-4 pt-8 flex items-center justify-between">
                <button
                    onClick={() => navigate('/courses')}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-darkCustom-300 hover:text-slate-900 dark:hover:text-darkCustom-100 transition-colors"
                >
                    <ArrowLeft size={16}/> Back to courses
                </button>
                <h1 className="text-sm font-semibold text-slate-500 dark:text-darkCustom-400 truncate max-w-xs text-right">{course.title}</h1>
            </div>

            <CourseReader
                pages={course.pages}
                initialPageIndex={course.current_page_index}
                onAnswerSubmit={handleAnswerSubmit}
                onPageChange={handlePageChange}
                onComplete={handleComplete}
            />
        </div>
    );
}
