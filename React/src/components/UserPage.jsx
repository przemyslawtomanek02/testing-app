import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'react-toastify';
import {useAppContext} from '../AppContext.jsx';
import {
    Loader2, FileText, Clock, Inbox, ChevronLeft, Search,
    ChevronRight, TrendingUp, BarChart3
} from 'lucide-react';
import formatDate from "./Reusable/FormatDate.jsx";
import {Header} from "./Layouts/Header.jsx";
import {SettingsPanel} from "./Reusable/UserSettingsPanel.jsx";
import ResultTemplate from "./Layouts/ResultTemplate.jsx";

const pct = (score, max) => {
    if (!max) return 0;
    const val = Math.round((Number(score ?? 0) / Number(max)) * 100);
    return isFinite(val) ? val : 0;
};

const KpiCardSkeleton = () => (
    <div
        className="rounded-2xl bg-white dark:bg-darkCustom-800 p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-darkCustom-700">
        <div className="h-4 w-3/4 bg-slate-200 dark:bg-darkCustom-600 rounded animate-shimmer"></div>
        <div className="mt-2 h-7 sm:h-8 w-1/3 bg-slate-200 dark:bg-darkCustom-600 rounded animate-shimmer"></div>
    </div>
);

const KpiCard = ({title, value, icon: Icon}) => (
    <div
        className="rounded-2xl bg-white dark:bg-darkCustom-800 p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-darkCustom-700">
        <div className="text-sm text-slate-500 dark:text-darkCustom-400">{title}</div>
        <div className="mt-1 flex items-end justify-between ">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-darkCustom-100">{value}</div>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 dark:text-darkCustom-200"/>
        </div>
    </div>
);

const TestHistoryCardSkeleton = () => (
    <div className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-5">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-200 dark:bg-darkCustom-700 p-3 rounded-lg w-12 h-12 animate-shimmer"></div>
                    <div>
                        <div className="h-6 w-48 bg-slate-200 dark:bg-darkCustom-600 rounded animate-shimmer"></div>
                        <div
                            className="mt-2 h-4 w-32 bg-slate-200 dark:bg-darkCustom-600 rounded animate-shimmer"></div>
                    </div>
                </div>
                <div className="h-8 w-16 bg-slate-200 dark:bg-darkCustom-600 rounded animate-shimmer"></div>
            </div>
            <div className="mt-4">
                <div className="w-full bg-slate-200 dark:bg-darkCustom-700 rounded-full h-2 animate-shimmer"></div>
            </div>
        </div>
    </div>
);

const TestHistoryCard = ({test, onClick}) => {
    const score = test.score ?? 0;
    const maxScore = test.max_score ?? 0;
    const percentage = pct(score, maxScore);

    let progressBarColor = 'bg-slate-400';
    if (test.is_finished) {
        if (percentage >= 85) progressBarColor = 'bg-green-500';
        else if (percentage >= 50) progressBarColor = 'bg-yellow-500';
        else progressBarColor = 'bg-red-500';
    }

    return (
        <div
            onClick={() => test.is_finished && onClick(test)}
            className={`bg-white dark:bg-darkCustom-800 rounded-xl shadow-md transition-all duration-300 overflow-hidden ${test.is_finished ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'opacity-70'}`}
        >
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-darkCustom-700 p-3 rounded-lg">
                            <FileText size={20} className="text-slate-600 dark:text-darkCustom-300"/>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-darkCustom-100">{test.instance_name}</h2>
                            <p className="text-sm text-slate-500 dark:text-darkCustom-400 flex items-center gap-1.5">
                                <Clock size={14}/>
                                {formatDate(test.timestamp)}
                            </p>
                        </div>
                    </div>
                    {test.is_finished ? (
                        <div className="text-right">
                            <span
                                className="font-bold text-2xl text-slate-800 dark:text-darkCustom-100">{percentage}%</span>
                            <p className="text-xs text-slate-500 dark:text-darkCustom-400">{score.toFixed(1)} / {maxScore.toFixed(1)} pts</p>
                        </div>
                    ) : (
                        <span
                            className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-1 rounded-full">In Progress</span>
                    )}
                </div>
                {test.is_finished && (
                    <div className="mt-4">
                        <div className="w-full bg-slate-200 dark:bg-darkCustom-700 rounded-full h-2">
                            <div className={`${progressBarColor} h-2 rounded-full`}
                                 style={{width: `${percentage}%`}}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Główny komponent ---

function UserPanel() {
    const navigate = useNavigate();
    const {validateSession, user, setUser} = useAppContext();

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(null);
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 6;
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const isValid = await validateSession();
                if (!isValid) {
                    navigate('/');
                    return;
                }

                const response = await fetch('/api/user/history');
                if (!response.ok) throw new Error('Failed to fetch test history');
                setHistory(await response.json());

            } catch (error) {
                toast.error('Error loading your test history.');
            } finally {
                setLoading(false);
            }
        };
        void fetchHistory();
    }, [navigate, validateSession]);

    useEffect(() => {
        const loadDetails = async () => {
            if (!selectedTest) return;
            setDetails(null);
            setDetailsLoading(true);
            try {
                const res = await fetch(`/api/user/results/${selectedTest.activity_id}`);
                if (!res.ok) throw new Error("Failed to fetch test results");
                const data = await res.json();
                console.log(data)
                setDetails(data);
            } catch (e) {
                toast.error("Error loading test details.");
            } finally {
                setDetailsLoading(false);
            }
        };
        void loadDetails();
    }, [selectedTest]);

    useEffect(() => {
        console.log(history)
    }, [history])

    const handleProfileUpdate = (updatedProfile) => {
        setUser(prevUser => ({...prevUser, ...updatedProfile}));
    };

    const processedData = useMemo(() => {
        let data = Array.isArray(history) ? [...history] : [];
        const q = search.trim().toLowerCase();
        if (q) {
            data = data.filter(item => item.instance_name.toLowerCase().includes(q));
        }
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return data;
    }, [history, search]);

    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return processedData.slice(start, start + pageSize);
    }, [processedData, page, pageSize]);

    const kpis = useMemo(() => {
        const finishedTests = processedData.filter(t => t.is_finished);
        const total = finishedTests.length;
        const pcts = finishedTests.map(r => pct(r.score, r.max_score));
        const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
        const best = pcts.length ? Math.max(...pcts) : 0;
        return {total, avg, best};
    }, [processedData]);

    const handleBack = useCallback(() => setSelectedTest(null), []);

    if (selectedTest) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-darkCustom-900">
                <Header variant="embedhistory" onSettingsClick={() => setIsSettingsOpen(true)} handleBack={handleBack}/>
                <SettingsPanel
                    user={user}
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onProfileUpdate={handleProfileUpdate}
                />
                <div className="py-10 px-4">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-bold text-center mb-10 lg:mb-20 text-slate-900 dark:text-darkCustom-100">Exam
                            Results</h1>
                        <ResultTemplate
                            results={details}
                            loading={detailsLoading}
                            title={selectedTest.instance_name}
                            asPage
                            useGsap={true}
                            onBack={() => {
                                setSelectedTest(null);
                                setDetails(null);
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-darkCustom-900">
            <Header variant="profile" onSettingsClick={() => setIsSettingsOpen(true)}/>
            <SettingsPanel user={user} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
                           onProfileUpdate={handleProfileUpdate}/>
            <div className="py-10 px-4">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-darkCustom-100 mb-8">Test's history</h1>

                    {loading ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <KpiCardSkeleton/>
                                <KpiCardSkeleton/>
                                <KpiCardSkeleton/>
                            </div>
                            <div
                                className="relative mb-6 h-12 bg-white dark:bg-darkCustom-800 rounded-lg shadow-md animate-shimmer"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TestHistoryCardSkeleton/>
                                <TestHistoryCardSkeleton/>
                                <TestHistoryCardSkeleton/>
                                <TestHistoryCardSkeleton/>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <KpiCard title="Finished Tests" value={kpis.total} icon={FileText}/>
                                <KpiCard title="Average Score" value={`${kpis.avg}%`} icon={BarChart3}/>
                                <KpiCard title="Best Score" value={`${kpis.best}%`} icon={TrendingUp}/>
                            </div>

                            <div className="relative mb-6">
                                <Search
                                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-darkCustom-400"/>
                                <input
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Search by test name..."
                                    className="w-full p-3 pl-12 text-base border-0 bg-white dark:bg-darkCustom-700 text-slate-800 dark:text-darkCustom-100 rounded-lg shadow-md focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 outline-none transition-shadow placeholder:text-slate-400 dark:placeholder:text-darkCustom-400
                                               [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_white_inset]
                                               dark:[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#353739_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F5F5F5]"
                                />
                            </div>

                            {paginatedItems.length === 0 ? (
                                <div
                                    className="text-center py-16 px-6 bg-white dark:bg-darkCustom-800 rounded-2xl shadow-sm">
                                    <Inbox size={48} className="mx-auto text-slate-400 dark:text-darkCustom-500"/>
                                    <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-darkCustom-100">No
                                        tests found</h3>
                                    <p className="mt-1 text-slate-500 dark:text-darkCustom-400">{search ? "Try adjusting your search term." : "You haven’t taken any tests yet."}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {paginatedItems.map((test) => (
                                            <TestHistoryCard key={test.activity_id} test={test}
                                                             onClick={setSelectedTest}/>
                                        ))}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-8 text-sm">
                                            <span
                                                className="text-slate-500 dark:text-darkCustom-400">Page {page} of {totalPages}</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setPage(p => Math.max(1, p - 1))}
                                                        disabled={page === 1}
                                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-darkCustom-700 bg-white dark:bg-darkCustom-700 dark:text-darkCustom-200 hover:bg-slate-50 dark:hover:bg-darkCustom-600 disabled:opacity-50 flex items-center gap-1">
                                                    <ChevronLeft size={16}/> Prev
                                                </button>
                                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={page === totalPages}
                                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-darkCustom-700 bg-white dark:bg-darkCustom-700 dark:text-darkCustom-200 hover:bg-slate-50 dark:hover:bg-darkCustom-600 disabled:opacity-50 flex items-center gap-1">
                                                    Next <ChevronRight size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserPanel;
