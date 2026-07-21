import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {toast} from 'react-toastify';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Search,
    Users,
    BookOpen,
    ChevronLeft,
    ChevronDown,
    Check,
    X,
    AlertTriangle,
    Inbox,
    Hash,
    ArrowRight,
    CalendarDays,
    Activity,
    ArrowUpDown,
    Percent,
    BarChart2,
    Loader,
} from 'lucide-react';
import DownloadResultButton from '../Reusable/DownloadResultButton.jsx';
import {useAppContext} from '../../AppContext.jsx';
import {RenderUserAnswer, RenderCorrectAnswer} from '../Reusable/ResultBlocks.jsx';
import formatDate from "../Reusable/FormatDate.jsx";

// =============================================================
// SKELETONY + WSPÓLNE ELEMENTY
// =============================================================

const TopLinearLoader = ({show}) => (
    <div className={`fixed top-0 left-0 right-0 h-0.5 z-30 ${show ? '' : 'opacity-0'}`} aria-hidden>
        <div
            className="h-full w-full animate-[loading_1.2s_ease-in-out_infinite] bg-slate-400/70 dark:bg-slate-300/70"/>
        <style>{`@keyframes loading { 0%{transform: translateX(-100%)} 50%{transform: translateX(0)} 100%{transform: translateX(100%)} }`}</style>
    </div>
);

const Skeleton = ({className = ''}) => (
    <div className={`animate-pulse rounded-md bg-[#3A3B3C]/70 ${className}`}/>
);

const SkeletonListCard = () => (
    <div className="bg-white p-4 rounded-2xl border border-[#E4E6EB] shadow-sm">
        <Skeleton className="h-5 w-2/3 mb-2"/>
        <Skeleton className="h-4 w-24"/>
    </div>
);

const SkeletonGrid = ({count = 6}) => (
    <div className="p-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: count}).map((_, i) => (
                <SkeletonListCard key={i}/>
            ))}
        </div>
    </div>
);

const SkeletonParticipants = ({rows = 6, instance}) => (
    <div className="p-6 max-w-5xl mx-auto card-enter">
        <header className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
                <button className="p-2 rounded-xl hover:bg-[#F0F2F5] transition-colors" disabled>
                    <ChevronLeft size={20} className="text-[#606770]"/>
                </button>
                <div>
                    <span className="text-xl font-bold text-[#1C1E21]">{instance?.instance_name || ''}</span>
                    <Skeleton className="h-4 w-28 mt-1"/>
                </div>
            </div>
            <Skeleton className="h-9 w-32"/>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({length: rows}).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-[#E4E6EB] shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <Skeleton className="h-10 w-10 rounded-full"/>
                        <div className="flex-1">
                            <Skeleton className="h-4 w-36 mb-1.5"/>
                            <Skeleton className="h-3 w-24"/>
                        </div>
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full"/>
                </div>
            ))}
        </div>
    </div>
);

// =============================================================
// NAGŁÓWEK WYSZUKIWANIA
// =============================================================

const SearchHeader = ({
                          searchTerm,
                          setSearchTerm,
                          searchType,
                          setSearchType,
                          resultsCount,
                      }) => (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-[#E4E6EB] px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#BEC3C9]"/>
                <input
                    className="w-full py-2 pl-10 pr-4 text-sm bg-[#F0F2F5] border border-[#E4E6EB] text-[#1C1E21] rounded-xl focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] outline-none transition-all placeholder:text-[#BEC3C9]"
                    type="text"
                    name="results-search-input"
                    id="results-search-input"
                    placeholder={searchType === 'instances' ? 'Search instances…' : 'Search users…'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F0F2F5] rounded-xl border border-[#E4E6EB]">
                <button
                    onClick={() => setSearchType('instances')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        searchType === 'instances'
                            ? 'bg-white text-[#0866FF] shadow-sm border border-[#E4E6EB]'
                            : 'text-[#65676B] hover:text-[#1C1E21]'
                    }`}
                >
                    <BookOpen size={15}/> Instances
                </button>
                <button
                    onClick={() => setSearchType('users')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        searchType === 'users'
                            ? 'bg-white text-[#0866FF] shadow-sm border border-[#E4E6EB]'
                            : 'text-[#65676B] hover:text-[#1C1E21]'
                    }`}
                >
                    <Users size={15}/> Users
                </button>
            </div>
            <span className="text-sm font-medium text-[#65676B] shrink-0">{resultsCount} results</span>
        </div>
    </header>
);

// =============================================================
// LISTY
// =============================================================

const EmptyState = ({title = 'No Results found', subtitle = 'Search for Instance or User.'}) => (
    <div className="flex flex-col items-center justify-center w-full h-full px-6">
        <div className="text-center py-16 px-8 w-full max-w-sm mt-10 bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
            <Inbox size={44} className="mx-auto text-[#BEC3C9]"/>
            <h3 className="mt-4 text-base font-semibold text-[#1C1E21]">{title}</h3>
            <p className="mt-1 text-sm text-[#65676B]">{subtitle}</p>
        </div>
    </div>
);


const fmt2 = (v, locale = 'en-US') => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(n);
};

const getPercentColor = (percentage) => {
    if (percentage >= 80) {
        return 'text-green-600 dark:text-green-400';
    }
    if (percentage >= 50) {
        return 'text-yellow-500 dark:text-yellow-400';
    }
    return 'text-red-600 dark:text-red-500';
};

const SearchResultsList = ({results, searchType, onInstanceClick, onUserClick, config}) => {
    if (!Array.isArray(results) || results.length === 0) return <EmptyState/>;

    const isInstanceMode = searchType === 'instances';

    const Badge = ({color = 'slate', children}) => {
        const colorClasses = {
            slate: 'bg-[#F0F2F5] text-[#65676B]',
            green: 'bg-green-50 text-green-700',
            indigo: 'bg-[#E7F3FF] text-[#0866FF]',
            red: 'bg-red-50 text-red-600',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colorClasses[color] || colorClasses.slate}`}>
                {children}
            </span>
        );
    };

    const Dot = ({on = false}) => (
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-red-500'}`}/>
    );

    const InfoItem = ({icon: Icon, children}) => (
        <div className="flex items-center gap-1.5 text-xs text-[#65676B]">
            {Icon && <Icon size={13} className="shrink-0 text-[#BEC3C9]"/>}
            <span className="truncate">{children}</span>
        </div>
    );

    const Card = ({item, index}) => {
        const key = isInstanceMode ? item.instance_id : item.activity_id || item.user_id;
        const created = formatDate(item.created_at);
        const updated = formatDate(item.updated_at || item.last_activity_at);
        const participants = item.participants_count ?? item.users_count ?? item.participants?.length ?? null;
        const avg = item.avg_score ?? item.average_score ?? null;
        const fullName = item.user_surname && item.user_name ? `${item.user_surname} ${item.user_name}` : item.full_name;
        const initials = (item.user_surname?.[0] || item.surname?.[0] || '') + (item.user_name?.[0] || item.name?.[0] || '');
        const handleClick = () => (isInstanceMode ? onInstanceClick(item) : onUserClick(item));

        return (
            <div
                key={key}
                onClick={handleClick}
                className="card-enter bg-white p-4 rounded-2xl border border-[#E4E6EB] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                style={{animationDelay: `${index * 40}ms`}}
            >
                <div className="flex items-start gap-3">
                    {!isInstanceMode && (
                        item.photo_url ? (
                            <img src={item.photo_url} alt={fullName || item.login}
                                 className="h-10 w-10 rounded-full object-cover"/>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-[#E7F3FF] text-[#0866FF] flex items-center justify-center font-semibold text-sm shrink-0">
                                {initials || 'U'}
                            </div>
                        )
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[#1C1E21] text-[14px] truncate">
                                {isInstanceMode ? item.instance_name : fullName}
                            </p>
                            {isInstanceMode ? (
                                <Badge color={item.is_active ? 'green' : 'red'}>
                                    <span className="flex items-center gap-1">
                                        <Dot on={item.is_active}/> {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </Badge>
                            ) : (
                                item.role && <Badge color={item.role === 'admin' ? 'indigo' : 'slate'}>{item.role}</Badge>
                            )}
                        </div>

                        <div className="mt-1.5 flex flex-col gap-0.5">
                            {isInstanceMode ? (
                                <>
                                    {created && <InfoItem icon={CalendarDays}>Created: {created}</InfoItem>}
                                    {updated && <InfoItem icon={Activity}>Last activity: {updated}</InfoItem>}
                                    {participants != null && <InfoItem icon={Users}>Participants: {participants}</InfoItem>}
                                    {avg != null && <InfoItem icon={Percent}>Avg score: {fmt2(avg)}</InfoItem>}
                                </>
                            ) : (
                                <>
                                    {item.user_index && config.use_index && <InfoItem icon={Hash}>Index: {item.user_index}</InfoItem>}
                                    {updated && <InfoItem icon={Activity}>Last active: {updated}</InfoItem>}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {isInstanceMode && (typeof item.completed_ratio === 'number' || typeof item.progress === 'number') && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-[#65676B] mb-1">
                            <span>Completion</span>
                            <span className="font-semibold text-[#1C1E21]">
                                {Math.round((item.completed_ratio ?? item.progress) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#F0F2F5]">
                            <div className="h-1.5 rounded-full bg-[#0866FF]"
                                 style={{width: `${Math.round((item.completed_ratio ?? item.progress) * 100)}%`}}/>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((item, index) => (
                    <Card key={(isInstanceMode ? item.instance_id : item.activity_id || item.user_id) ?? index}
                          item={item} index={index}/>
                ))}
            </div>
        </div>
    );
};


// =============================================================
// WIDOKI
// =============================================================

const InstanceDetailsView = ({instance, users, onUserClick, onBack, config}) => {
    const [sortKey, setSortKey] = useState('percentDesc');
    const [openSort, setOpenSort] = useState(false);
    const [activeTab, setActiveTab] = useState('participants');
    const [questionStats, setQuestionStats] = useState(null);
    const [questionStatsLoading, setQuestionStatsLoading] = useState(false);
    const menuRef = React.useRef(null);

    useEffect(() => {
        if (activeTab !== 'stats' || questionStats !== null) return;
        const fetchStats = async () => {
            setQuestionStatsLoading(true);
            try {
                const res = await fetch(`/api/admin/instance_question_stats/${instance.instance_id}`);
                if (!res.ok) throw new Error('Failed');
                setQuestionStats(await res.json());
            } catch {
                setQuestionStats([]);
            } finally {
                setQuestionStatsLoading(false);
            }
        };
        fetchStats();
    }, [activeTab, instance.instance_id, questionStats]);

    useEffect(() => {
        const onDown = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setOpenSort(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const sortOptions = [
        {value: 'surnameAsc', label: 'Surname (A–Z)'},
        {value: 'surnameDesc', label: 'Surname (Z–A)'},
        {value: 'nameAsc', label: 'Name (A–Z)'},
        {value: 'nameDesc', label: 'Name (Z–A)'},
        {value: 'percentDesc', label: 'Percent (high → low)'},
        {value: 'percentAsc', label: 'Percent (low → high)'},
        {value: 'pointsDesc', label: 'Points (high → low)'},
        {value: 'pointsAsc', label: 'Points (low → high)'},
        {value: 'indexAsc', label: 'Index (low → high)'},
        {value: 'indexDesc', label: 'Index (high → low)'},
    ];

    const currentSortLabel = sortOptions.find(o => o.value === sortKey)?.label ?? 'Sort';

    const stats = useMemo(() => {
        if (!Array.isArray(users) || users.length === 0) return {count: 0, avgPct: 0, bestPct: 0};
        let sum = 0, best = 0;
        for (const u of users) {
            const s = Number(u.score) || 0;
            const m = Number(u.max_score) || 0;
            const p = m > 0 ? (s / m) * 100 : 0;
            sum += p;
            if (p > best) best = p;
        }
        return {count: users.length, avgPct: Math.round(sum / users.length), bestPct: Math.round(best)};
    }, [users]);

    // sortowanie
    const viewUsers = useMemo(() => {
        const list = Array.isArray(users) ? [...users] : [];
        const pct = (u) => {
            const s = Number(u.score) || 0, m = Number(u.max_score) || 0;
            return m > 0 ? s / m : 0;
        };
        const cmpStr = (a, b) => (a || '').localeCompare(b || '', undefined, {sensitivity: 'base'});
        const cmpNum = (a, b) => (a ?? 0) - (b ?? 0);

        switch (sortKey) {
            case 'surnameAsc':
                list.sort((a, b) => cmpStr(a.user_surname, b.user_surname) || cmpStr(a.user_name, b.user_name));
                break;
            case 'surnameDesc':
                list.sort((a, b) => -cmpStr(a.user_surname, b.user_surname) || -cmpStr(a.user_name, b.user_name));
                break;
            case 'nameAsc':
                list.sort((a, b) => cmpStr(a.user_name, b.user_name) || cmpStr(a.user_surname, b.user_surname));
                break;
            case 'nameDesc':
                list.sort((a, b) => -cmpStr(a.user_name, b.user_name) || -cmpStr(a.user_surname, b.user_surname));
                break;
            case 'percentAsc':
                list.sort((a, b) => pct(a) - pct(b));
                break;
            case 'percentDesc':
                list.sort((a, b) => pct(b) - pct(a));
                break;
            case 'pointsAsc':
                list.sort((a, b) => (Number(a.score) || 0) - (Number(b.score) || 0));
                break;
            case 'pointsDesc':
                list.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
                break;
            case 'indexAsc':
                list.sort((a, b) => cmpNum(a.user_index, b.user_index));
                break;
            case 'indexDesc':
                list.sort((a, b) => cmpNum(b.user_index, a.user_index));
                break;
        }
        return list;
    }, [users, sortKey]);

    const Avatar = ({user}) => {
        const initials = `${user.user_surname?.[0] || ''}${user.user_name?.[0] || ''}` || 'U';
        return (
            <div className="h-10 w-10 rounded-full bg-[#E7F3FF] text-[#0866FF] flex items-center justify-center font-semibold text-sm shrink-0">
                {initials}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto card-enter">
            {/* HEADER */}
            <header className="mb-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack}
                                className="p-2 rounded-xl hover:bg-[#F0F2F5] text-[#606770] transition-colors">
                            <ChevronLeft size={20}/>
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-[#1C1E21]">{instance.instance_name}</h2>
                            <p className="text-sm text-[#65676B] mt-0.5">Participants: {users.length}</p>
                        </div>
                    </div>

                    {activeTab === 'participants' && users.length > 0 && (
                        <div className="flex gap-2">
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setOpenSort((v) => !v)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#E4E6EB] bg-white px-3 py-2 text-sm font-medium text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors shadow-sm"
                                >
                                    <ArrowUpDown size={15}/>
                                    <span className="truncate max-w-[12rem]">{currentSortLabel}</span>
                                    <ChevronDown size={15} className={`transition-transform text-[#65676B] ${openSort ? 'rotate-180' : ''}`}/>
                                </button>
                                <AnimatePresence>
                                    {openSort && (
                                        <motion.div
                                            initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}}
                                            exit={{opacity: 0, y: -5}}
                                            className="absolute z-20 mt-2 w-56 rounded-2xl border border-[#E4E6EB] bg-white p-1 shadow-xl">
                                            {sortOptions.map((opt) => {
                                                const active = opt.value === sortKey;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { setSortKey(opt.value); setOpenSort(false); }}
                                                        className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors ${active ? 'bg-[#E7F3FF] text-[#0866FF]' : 'text-[#1C1E21] hover:bg-[#F0F2F5]'}`}
                                                    >
                                                        <span>{opt.label}</span>
                                                        {active && <Check size={15}/>}
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <DownloadResultButton id={instance.instance_id} entityType="instance"/>
                        </div>
                    )}
                </div>
            </header>

            {/* TABS */}
            <div className="flex gap-1 mb-5 bg-[#F0F2F5] p-1 rounded-xl w-fit border border-[#E4E6EB]">
                <button
                    onClick={() => setActiveTab('participants')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'participants' ? 'bg-white text-[#0866FF] shadow-sm border border-[#E4E6EB]' : 'text-[#65676B] hover:text-[#1C1E21]'}`}
                >
                    <Users size={14}/> Participants
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stats' ? 'bg-white text-[#0866FF] shadow-sm border border-[#E4E6EB]' : 'text-[#65676B] hover:text-[#1C1E21]'}`}
                >
                    <BarChart2 size={14}/> Statistics
                </button>
            </div>

            {/* PARTICIPANTS */}
            {activeTab === 'participants' && (
                users.length === 0 ? (
                    <EmptyState title="No participants yet" subtitle="This test instance has no participants."/>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewUsers.map((user) => {
                            const score = Number(user.score) || 0;
                            const maxScore = Number(user.max_score) || 0;
                            const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                            const bar = percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-amber-400' : 'bg-red-500';

                            return (
                                <div
                                    key={user.activity_id || `${user.user_id}-${user.user_index}`}
                                    onClick={() => onUserClick(user, {fromInstance: true})}
                                    className="bg-white p-4 rounded-2xl border border-[#E4E6EB] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <Avatar user={user}/>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[#1C1E21] text-[14px] truncate">
                                                    {user.user_surname} {user.user_name}
                                                </p>
                                                <div className="mt-1 flex items-center gap-3 text-xs text-[#65676B]">
                                                    {config?.use_index && user.user_index && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Hash className="h-3 w-3 text-[#BEC3C9]"/> {user.user_index}
                                                        </span>
                                                    )}
                                                    <span>{fmt2(score)} / {fmt2(maxScore)} pts</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 flex items-center gap-2">
                                            <span className={`text-sm font-bold ${getPercentColor(percent)}`}>{percent}%</span>
                                            <ArrowRight className="text-[#BEC3C9]" size={16}/>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="h-1.5 w-full rounded-full bg-[#F0F2F5]">
                                            <div className={`h-1.5 rounded-full ${bar}`} style={{width: `${percent}%`}}/>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* STATISTICS */}
            {activeTab === 'stats' && (
                questionStatsLoading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader className="animate-spin h-8 w-8 text-[#BEC3C9]"/>
                    </div>
                ) : !questionStats || questionStats.length === 0 ? (
                    <EmptyState title="No statistics yet" subtitle="Statistics appear once students complete the test."/>
                ) : (
                    <div className="space-y-3">
                        {questionStats.map((q, idx) => (
                            <div key={q.question_id} className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-5">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[#BEC3C9] uppercase tracking-wider mb-1">
                                            Q{idx + 1} · {q.question_type}
                                        </p>
                                        <p className="font-semibold text-[#1C1E21] text-[14px]">{q.question_text}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-2xl font-bold ${getPercentColor(q.correct_percent)}`}>
                                            {q.correct_percent}%
                                        </p>
                                        <p className="text-xs text-[#65676B]">{q.correct_count}/{q.total_responses} correct</p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-[#F0F2F5] mb-4">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${q.correct_percent >= 80 ? 'bg-green-500' : q.correct_percent >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                        style={{width: `${q.correct_percent}%`}}
                                    />
                                </div>
                                {q.answers && q.answers.length > 0 && (
                                    <div className="space-y-2 mt-3 border-t border-[#E4E6EB] pt-3">
                                        {q.answers.map(a => (
                                            <div key={a.answer_id} className="flex items-center gap-3">
                                                <span className={`flex-shrink-0 h-2.5 w-2.5 rounded-sm ${a.is_correct ? 'bg-green-500' : 'bg-[#E4E6EB]'}`}/>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center text-xs mb-1">
                                                        <span className="text-[#1C1E21] truncate">{a.text}</span>
                                                        <span className="text-[#65676B] ml-2 shrink-0">{a.chosen_count} ({a.chosen_percent}%)</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-[#F0F2F5]">
                                                        <div
                                                            className={`h-1.5 rounded-full ${a.is_correct ? 'bg-green-500' : 'bg-[#CED0D4]'}`}
                                                            style={{width: `${a.chosen_percent}%`}}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};


const UserDetailsView = ({user, userDetails, onBack, config}) => {
    const [expandedQuestions, setExpandedQuestions] = useState([]);

    const toggleQuestion = (questionId) => {
        setExpandedQuestions((prev) => (prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]));
    };

    const percent = useMemo(() => {
        const m = Number(userDetails?.max_score_for_activity) || 0;
        const s = Number(userDetails?.user_score) || 0;
        return m > 0 ? Math.round((s / m) * 100) : 0;
    }, [userDetails]);

    return (
        <div className="p-6 max-w-5xl mx-auto card-enter">
            <header className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-[#F0F2F5] text-[#606770] transition-colors">
                        <ChevronLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-[#1C1E21]">
                            {userDetails.user_name} {userDetails.user_surname}
                        </h2>
                        <p className="text-sm text-[#65676B] mt-0.5">
                            {config.use_index && userDetails.user_index && `Index: ${userDetails.user_index} · `}
                            {userDetails.instance_name}
                        </p>
                    </div>
                </div>
                <div className="text-right bg-white rounded-2xl border border-[#E4E6EB] shadow-sm px-4 py-2">
                    <p className={`text-2xl font-bold ${getPercentColor(percent)}`}>{percent}%</p>
                    <p className="text-xs text-[#65676B]">
                        {fmt2(userDetails.user_score)} / {fmt2(userDetails.max_score_for_activity)} pts
                    </p>
                </div>
            </header>
            <div className="space-y-2">
                {userDetails.questions.map((q, index) => {
                    const isCorrect = q.points_collected === q.points_value;
                    const isExpanded = expandedQuestions.includes(q.question_id);

                    return (
                        <div key={q.question_id} className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm overflow-hidden">
                            <div
                                className="px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-[#F0F2F5] transition-colors"
                                onClick={() => toggleQuestion(q.question_id)}>
                                <div className="flex items-center gap-3 min-w-0">
                                    {isCorrect
                                        ? <div className="h-6 w-6 rounded-full bg-green-50 flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5 text-green-600"/></div>
                                        : <div className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center shrink-0"><X className="h-3.5 w-3.5 text-red-500"/></div>
                                    }
                                    <p className="font-medium text-[#1C1E21] text-[14px] truncate">Q{index + 1}: {q.question_text}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <span className={`font-semibold text-sm ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                        {fmt2(q.points_collected)} / {fmt2(q.points_value)} pts
                                    </span>
                                    <motion.div animate={{rotate: isExpanded ? 180 : 0}}>
                                        <ChevronDown className="h-4 w-4 text-[#BEC3C9]"/>
                                    </motion.div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        key="content"
                                        initial={{height: 0, opacity: 0}}
                                        animate={{height: 'auto', opacity: 1}}
                                        exit={{height: 0, opacity: 0}}
                                        transition={{duration: 0.25, ease: 'easeInOut'}}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 py-4 border-t border-[#E4E6EB] grid md:grid-cols-2 gap-4 text-sm bg-[#F0F2F5]/50">
                                            <div>
                                                <p className="font-semibold text-[#65676B] text-xs uppercase tracking-wider mb-2">Your Answer</p>
                                                <div className="bg-white rounded-xl p-3 border border-[#E4E6EB]">
                                                    <RenderUserAnswer result={q}/>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[#65676B] text-xs uppercase tracking-wider mb-2">Correct Answer</p>
                                                <div className="bg-white rounded-xl p-3 border border-[#E4E6EB]">
                                                    <RenderCorrectAnswer result={q}/>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const UserHistoryView = ({user, history, onInstanceClick, onBack, config}) => {
    const attempts = history?.length ?? 0;
    const {avgPercent, bestPercent} = useMemo(() => {
        if (!Array.isArray(history) || history.length === 0) return {avgPercent: 0, bestPercent: 0};
        let sum = 0;
        let best = 0;
        for (const h of history) {
            const s = Number(h.score) || 0;
            const m = Number(h.max_score) || 0;
            const p = m > 0 ? (s / m) * 100 : 0;
            sum += p;
            if (p > best) best = p;
        }
        return {avgPercent: Math.round(sum / history.length), bestPercent: Math.round(best)};
    }, [history]);

    const Stat = ({label, value}) => (
        <div className="rounded-2xl bg-white border border-[#E4E6EB] shadow-sm px-4 py-2 text-center">
            <div className="text-xs text-[#65676B]">{label}</div>
            <div className="text-base font-bold text-[#1C1E21]">{value}</div>
        </div>
    );

    const StatusPill = ({finished}) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            finished ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
            {finished
                ? <><Check size={12}/> Finished</>
                : <><X size={12}/> In Progress</>
            }
        </span>
    );

    if (!Array.isArray(history) || history.length === 0) {
        return (
            <div className="p-6 max-w-5xl mx-auto card-enter">
                <header className="flex items-center gap-3 mb-5">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-[#F0F2F5] text-[#606770] transition-colors">
                        <ChevronLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-[#1C1E21]">{user.user_surname} {user.user_name}</h2>
                        {config?.use_index && user.user_index && (
                            <p className="text-sm text-[#65676B]">Index: {user.user_index}</p>
                        )}
                    </div>
                </header>
                <EmptyState title="No attempts yet" subtitle="This user has no test history."/>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto card-enter">
            <header className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-[#F0F2F5] text-[#606770] transition-colors">
                        <ChevronLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-[#1C1E21]">{user.user_surname} {user.user_name}</h2>
                        <p className="text-sm text-[#65676B] mt-0.5">
                            {config?.use_index && user.user_index && `Index: ${user.user_index} · `}
                            {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Stat label="Average" value={`${avgPercent}%`}/>
                    <Stat label="Best" value={`${bestPercent}%`}/>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {history.map((item) => {
                    const s = Number(item.score) || 0;
                    const m = Number(item.max_score) || 0;
                    const pct = m > 0 ? Math.round((s / m) * 100) : 0;

                    return (
                        <div
                            key={item.activity_id}
                            onClick={() => onInstanceClick(item)}
                            className="bg-white p-4 rounded-2xl border border-[#E4E6EB] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-[#1C1E21] text-[14px] truncate">{item.instance_name}</p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#65676B]">
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarDays size={12} className="text-[#BEC3C9]"/> {formatDate(item.timestamp)}
                                        </span>
                                        <span className="text-[#CED0D4]">·</span>
                                        <span>{fmt2(s)} / {fmt2(m)} pts</span>
                                        <span className="text-[#CED0D4]">·</span>
                                        <StatusPill finished={item.is_finished}/>
                                    </div>
                                </div>
                                <ArrowRight className="text-[#BEC3C9] shrink-0" size={16}/>
                            </div>

                            <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-[#65676B] mb-1">
                                    <span>Score</span>
                                    <span className="font-semibold text-[#1C1E21]">{pct}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-[#F0F2F5]">
                                    <div
                                        className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                                        style={{width: `${pct}%`}}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// =============================================================
// GŁÓWNY KOMPONENT
// =============================================================

function ResultsPanel({reset}) {
    const {config} = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('instances');
    const [results, setResults] = useState([]);

    const [selectedInstance, setSelectedInstance] = useState(null);
    const [users, setUsers] = useState([]);

    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);

    const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
    const [userHistory, setUserHistory] = useState([]);

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset
    useEffect(() => {
        if (!reset) return;
        setSearchTerm('');
        setSearchType('instances');
        setResults([]);
        setSelectedInstance(null);
        setUsers([]);
        setSelectedUser(null);
        setUserDetails(null);
        setSelectedUserForHistory(null);
        setUserHistory([]);
        setError(null);
    }, [reset]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 500);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (debouncedSearchTerm !== '' || searchType) {
            setSelectedInstance(null);
            setSelectedUser(null);
            setUserDetails(null);
            setSelectedUserForHistory(null);
            setUserHistory([]);
        }
    }, [debouncedSearchTerm, searchType]);

    useEffect(() => {
        const controller = new AbortController();
        const {signal} = controller;

        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                if (selectedUser?.activity_id) {
                    const res = await fetch(`/api/admin/users_search/detailUserInfo/${selectedUser.activity_id}`, {signal});
                    if (!res.ok) throw new Error('Failed to fetch user details');
                    setUserDetails(await res.json());
                    return;
                }

                if (selectedUserForHistory?.user_id) {
                    const res = await fetch(`/api/admin/user_history/${selectedUserForHistory.user_id}`, {signal});
                    if (!res.ok) throw new Error('Failed to fetch user history');
                    setUserHistory(await res.json());
                    return;
                }

                if (selectedInstance?.instance_id) {
                    const res = await fetch(`/api/admin/instances_search/detailInstanceInfo/${selectedInstance.instance_id}`, {signal});
                    if (res.status === 204) {
                        setUsers([]);
                        return;
                    }
                    if (!res.ok) throw new Error('Failed to fetch users');
                    const raw = await res.json();
                    setUsers(Array.isArray(raw) ? raw : []);
                    return;
                }

                // Lista
                let url = '';
                if (debouncedSearchTerm) {
                    url = searchType === 'instances'
                        ? `/api/admin/instances_search?search=${encodeURIComponent(debouncedSearchTerm)}`
                        : `/api/admin/users_search?search=${encodeURIComponent(debouncedSearchTerm)}`;
                } else {
                    if (searchType === 'instances') url = '/api/admin/instances_search_all';
                    else if (searchType === 'users' && config && !config.open_mode) url = '/api/admin/users_search_all';
                }

                if (!url) {
                    setResults([]);
                    return;
                }
                const res = await fetch(url, {signal});
                if (!res.ok) throw new Error('Search failed');
                const data = await res.json();
                if (searchType === 'instances' && Array.isArray(data)) {
                    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                }
                setResults(data);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Fetch error:', e);
                    toast.error('An error occurred while fetching data.');
                    setError(e.message);
                }
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        run();
        return () => controller.abort();
    }, [debouncedSearchTerm, searchType, selectedInstance, selectedUser, selectedUserForHistory, config]);

    const handleBack = useCallback(() => {
        if (selectedUser) {
            setSelectedUser(null);
            setUserDetails(null);
            return;
        }
        if (selectedUserForHistory) {
            setSelectedUserForHistory(null);
            setUserHistory([]);
            return;
        }
        if (selectedInstance) {
            setSelectedInstance(null);
            setUsers([]);
        }
    }, [selectedUser, selectedInstance, selectedUserForHistory]);

    // ESC => back
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') handleBack();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [handleBack]);

    const handleUserClick = (user, opts = {}) => {
        const fromInstance = typeof opts === 'boolean' ? opts : !!opts.fromInstance;
        console.log('handleUserClick fired', {user, config, fromInstance});

        setSelectedInstance(null);
        setUsers([]);

        if (fromInstance) {
            if (!user?.activity_id) {
                toast.error('Brak activity_id dla wybranego podejścia.');
                return;
            }
            setSelectedUserForHistory(null);
            setSelectedUser(user);
            return;
        }
        if (config && !config.open_mode && user?.user_id) {
            setSelectedUserForHistory(user);
        } else {
            setSelectedUser(user);
        }
    };

    // Render
    const renderCurrentView = () => {
        if (error) {
            return (
                <div className="flex justify-center items-center p-16 text-red-500 font-semibold">
                    <AlertTriangle className="mr-2"/>{error}
                </div>
            );
        }

        // Widok INSTANCJI
        if (selectedInstance) {
            return loading ? (
                <SkeletonParticipants rows={6} instance={selectedInstance}/>
            ) : (
                <InstanceDetailsView
                    instance={selectedInstance}
                    users={users}
                    onUserClick={handleUserClick}
                    onBack={handleBack}
                    config={config}
                />
            );
        }

        // Widok HISTORY / DETAILS
        if (selectedUser && userDetails) {
            return <UserDetailsView user={selectedUser} userDetails={userDetails} onBack={handleBack} config={config}/>;
        }

        if (config && selectedUserForHistory && userHistory) {
            return (
                <UserHistoryView
                    user={selectedUserForHistory}
                    history={userHistory}
                    onInstanceClick={setSelectedUser}
                    onBack={handleBack}
                    config={config}
                />
            );
        }

        // LISTA (instancji / użytkowników)
        return loading ? (
            <SkeletonGrid count={6}/>
        ) : (
            <SearchResultsList
                results={results}
                searchType={searchType}
                onInstanceClick={setSelectedInstance}
                onUserClick={handleUserClick}
                config={config}
            />
        );
    };

    return (
        <div className="bg-[#F0F2F5] min-h-full">
            <style>{`.card-enter { animation: fadeInUp 0.4s ease-out both; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <TopLinearLoader show={loading}/>

            <SearchHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchType={searchType}
                setSearchType={setSearchType}
                resultsCount={Array.isArray(results) ? results.length : 0}
            />

            <div className="relative">{renderCurrentView()}</div>
        </div>
    );
}

export default ResultsPanel;
