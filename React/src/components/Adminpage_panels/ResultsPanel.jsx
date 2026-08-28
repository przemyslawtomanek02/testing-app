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
// SKELETONS + SHARED ELEMENTS
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
// SEARCH HEADER
// =============================================================

const SearchHeader = ({searchTerm, setSearchTerm, searchType, setSearchType, resultsCount}) => {
    const { darkMode: dk } = useAppContext();
    const surface  = dk ? '#171B2D' : '#FFFFFF';
    const border   = dk ? '#2A2F45' : '#E2E8F0';
    const inputBg  = dk ? '#1E2237' : '#F4F6FB';
    const text     = dk ? '#E2E8F0' : '#0F1623';
    const textSec  = dk ? '#8896B3' : '#64748B';
    const textMuted= dk ? '#5A6483' : '#94A3B8';

    return (
        <div style={{ padding: '16px 24px', maxWidth: '980px', margin: '0 auto' }}>
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
                background: surface,
                borderRadius: '22px',
                border: `1.5px solid ${border}`,
                padding: '10px 16px',
                boxShadow: dk ? 'none' : '0 4px 24px rgba(43,115,255,0.08)',
            }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted, width: '15px', height: '15px' }}/>
                    <input
                        type="text"
                        name="results-search-input"
                        id="results-search-input"
                        placeholder={searchType === 'instances' ? 'Search instances…' : 'Search users…'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', height: '36px', borderRadius: '12px',
                            border: `1.5px solid ${border}`,
                            background: inputBg, color: text,
                            paddingLeft: '36px', paddingRight: '12px',
                            fontSize: '13px', outline: 'none',
                            transition: 'border-color 0.15s',
                            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                            boxSizing: 'border-box',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = border; }}
                    />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', padding: '4px', background: inputBg, borderRadius: '14px', border: `1px solid ${border}` }}>
                    {[{ id: 'instances', icon: BookOpen, label: 'Instances' }, { id: 'users', icon: Users, label: 'Users' }].map(({ id, icon: Icon, label }) => {
                        const active = searchType === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setSearchType(id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '5px 12px', borderRadius: '10px', border: 'none',
                                    fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                                    background: active ? surface : 'transparent',
                                    color: active ? '#2B73FF' : textSec,
                                    boxShadow: active ? (dk ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.1)') : 'none',
                                    border: active ? `1px solid ${border}` : '1px solid transparent',
                                    transition: 'all 0.15s',
                                    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                                }}
                            >
                                <Icon size={13}/> {label}
                            </button>
                        );
                    })}
                </div>

                <span style={{ fontSize: '12px', fontWeight: '500', color: textMuted, whiteSpace: 'nowrap' }}>
                    {resultsCount} results
                </span>
            </div>
        </div>
    );
};

// =============================================================
// LISTY
// =============================================================

const EmptyState = ({title = 'No Results found', subtitle = 'Search for Instance or User.'}) => {
    const { darkMode: dk } = useAppContext();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 24px' }}>
            <div style={{
                textAlign: 'center', padding: '64px 32px', width: '100%', maxWidth: '360px', marginTop: '40px',
                background: dk ? '#171B2D' : '#FFFFFF', borderRadius: '24px',
                border: `1px solid ${dk ? '#2A2F45' : '#E4E6EB'}`,
                boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)',
            }}>
                <Inbox size={44} style={{ margin: '0 auto', color: dk ? '#5A6483' : '#BEC3C9' }}/>
                <h3 style={{ marginTop: '16px', fontSize: '15px', fontWeight: '600', color: dk ? '#E2E8F0' : '#0F1623' }}>{title}</h3>
                <p style={{ marginTop: '4px', fontSize: '13px', color: dk ? '#8896B3' : '#64748B' }}>{subtitle}</p>
            </div>
        </div>
    );
};


const fmt2 = (v, locale = 'en-US') => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(n);
};

const getPercentColor = (percentage) => {
    if (percentage >= 80) return '#22C55E';
    if (percentage >= 50) return '#F59E0B';
    return '#EF4444';
};

const SearchResultsList = ({results, searchType, onInstanceClick, onUserClick, config}) => {
    const { darkMode: dk } = useAppContext();
    if (!Array.isArray(results) || results.length === 0) return <EmptyState/>;

    const isInstanceMode = searchType === 'instances';

    const Card = ({item, index}) => {
        const [hovered, setHovered] = React.useState(false);
        const surface  = dk ? '#171B2D' : '#FFFFFF';
        const border   = dk ? (hovered ? '#4D7FFF' : '#2A2F45') : (hovered ? '#C7D9FF' : '#EDF0F7');
        const surface2 = dk ? '#1E2237' : '#F8FAFF';
        const border2  = dk ? '#2A2F45' : '#EDF0F7';
        const text     = dk ? '#E2E8F0' : '#0F1623';
        const textSec  = dk ? '#8896B3' : '#64748B';
        const textMuted= dk ? '#5A6483' : '#94A3B8';
        const created = formatDate(item.created_at);
        const updated = formatDate(item.updated_at || item.last_activity_at);
        const participants = item.participants_count ?? item.users_count ?? item.participants?.length ?? null;
        const avg = item.avg_score ?? item.average_score ?? null;
        const fullName = item.user_surname && item.user_name ? `${item.user_surname} ${item.user_name}` : item.full_name;
        const initials = ((item.user_surname?.[0] || item.surname?.[0] || '') + (item.user_name?.[0] || item.name?.[0] || '')).toUpperCase();
        const handleClick = () => (isInstanceMode ? onInstanceClick(item) : onUserClick(item));
        const isActive = item.is_active;
        const completionPct = typeof item.completed_ratio === 'number'
            ? Math.round(item.completed_ratio * 100)
            : typeof item.progress === 'number'
                ? Math.round(item.progress * 100)
                : null;

        return (
            <div
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="card-enter"
                style={{
                    animationDelay: `${index * 35}ms`,
                    background: surface,
                    borderRadius: '22px',
                    border: `1.5px solid ${border}`,
                    boxShadow: hovered
                        ? '0 6px 24px rgba(43,115,255,0.11), 0 2px 8px rgba(0,0,0,0.08)'
                        : dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'border-color 0.18s, box-shadow 0.18s',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Top accent bar for active instances */}
                {isInstanceMode && (
                    <div style={{
                        height: '3px',
                        background: isActive
                            ? 'linear-gradient(90deg, #2B73FF 0%, #3F99FF 100%)'
                            : border2,
                    }}/>
                )}

                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {!isInstanceMode && (
                                item.photo_url
                                    ? <img src={item.photo_url} alt={fullName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
                                    : (
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                            background: dk ? 'rgba(43,115,255,0.18)' : 'linear-gradient(135deg, #EEF4FF, #DDE9FF)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: '700', color: '#2B73FF',
                                        }}>
                                            {initials || 'U'}
                                        </div>
                                    )
                            )}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                                    {isInstanceMode ? item.instance_name : fullName}
                                </div>
                                {!isInstanceMode && item.user_index && config.use_index && (
                                    <div style={{ fontSize: '11px', color: textMuted, marginTop: '1px' }}>#{item.user_index}</div>
                                )}
                            </div>
                        </div>

                        {/* Status badge */}
                        {isInstanceMode ? (
                            <div style={{
                                flexShrink: 0,
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '3px 10px', borderRadius: '999px',
                                background: isActive ? (dk ? 'rgba(34,197,94,0.15)' : '#F0FDF4') : (dk ? 'rgba(239,68,68,0.15)' : '#FEF2F2'),
                                border: `1px solid ${isActive ? (dk ? 'rgba(34,197,94,0.3)' : '#BBF7D0') : (dk ? 'rgba(239,68,68,0.3)' : '#FECACA')}`,
                                fontSize: '11px', fontWeight: '600',
                                color: isActive ? '#22C55E' : '#EF4444',
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#22C55E' : '#EF4444', flexShrink: 0 }}/>
                                {isActive ? 'Active' : 'Inactive'}
                            </div>
                        ) : (
                            item.role && (
                                <div style={{
                                    flexShrink: 0,
                                    padding: '3px 10px', borderRadius: '999px',
                                    background: item.role === 'admin' ? (dk ? 'rgba(43,115,255,0.15)' : '#EEF4FF') : (dk ? 'rgba(255,255,255,0.06)' : '#F4F6FB'),
                                    border: `1px solid ${item.role === 'admin' ? (dk ? 'rgba(43,115,255,0.3)' : '#B8D0FF') : border2}`,
                                    fontSize: '11px', fontWeight: '600',
                                    color: item.role === 'admin' ? '#2B73FF' : textSec,
                                }}>
                                    {item.role}
                                </div>
                            )
                        )}
                    </div>

                    {/* Stats row – big numbers for instance mode */}
                    {isInstanceMode && (participants != null || avg != null) && (
                        <div style={{
                            display: 'flex', gap: '0',
                            background: surface2,
                            borderRadius: '14px',
                            border: `1px solid ${border2}`,
                            overflow: 'hidden',
                        }}>
                            {participants != null && (
                                <div style={{ flex: 1, padding: '10px 14px', borderRight: avg != null ? `1px solid ${border2}` : 'none' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: text, letterSpacing: '-0.03em', lineHeight: 1 }}>{participants}</div>
                                    <div style={{ fontSize: '11px', color: textMuted, marginTop: '3px', fontWeight: '500' }}>Participants</div>
                                </div>
                            )}
                            {avg != null && (
                                <div style={{ flex: 1, padding: '10px 14px' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: text, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt2(avg)}</div>
                                    <div style={{ fontSize: '11px', color: textMuted, marginTop: '3px', fontWeight: '500' }}>Avg score</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Completion bar */}
                    {isInstanceMode && completionPct !== null && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: textMuted, fontWeight: '500' }}>Completion</span>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: getPercentColor(completionPct) }}>{completionPct}%</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '999px', background: border2, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: '999px',
                                    background: completionPct >= 80
                                        ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                                        : completionPct >= 50
                                            ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                            : 'linear-gradient(90deg, #EF4444, #F87171)',
                                    width: `${completionPct}%`,
                                    transition: 'width 0.4s ease',
                                }}/>
                            </div>
                        </div>
                    )}

                    {/* Date metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {created && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CalendarDays size={12} style={{ color: textMuted, flexShrink: 0 }}/>
                                <span style={{ fontSize: '11px', color: textMuted }}>Created {created}</span>
                            </div>
                        )}
                        {updated && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={12} style={{ color: textMuted, flexShrink: 0 }}/>
                                <span style={{ fontSize: '11px', color: textMuted }}>Last activity {updated}</span>
                            </div>
                        )}
                        {!isInstanceMode && updated && !created && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={12} style={{ color: textMuted, flexShrink: 0 }}/>
                                <span style={{ fontSize: '11px', color: textMuted }}>Last active {updated}</span>
                            </div>
                        )}
                    </div>

                    {/* Arrow hint on hover */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        opacity: hovered ? 1 : 0, transition: 'opacity 0.18s',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', fontWeight: '600', color: '#2B73FF',
                        }}>
                            View details <ArrowRight size={12}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:       dk ? '#0F1117' : '#F4F6FB',
        surface:  dk ? '#171B2D' : '#FFFFFF',
        surface2: dk ? '#1E2237' : '#F8FAFC',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#BEC3C9',
        hoverBg:  dk ? 'rgba(255,255,255,0.06)' : '#F0F2F5',
    };
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
            <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: dk ? 'rgba(43,115,255,0.18)' : '#EEF4FF',
                color: '#2B73FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '600', fontSize: '13px',
            }}>
                {initials}
            </div>
        );
    };

    const barColor = (pct) => pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }} className="card-enter">
            {/* HEADER */}
            <header style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={onBack}
                            style={{ width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSec, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <ChevronLeft size={18}/>
                        </button>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>{instance.instance_name}</h2>
                            <p style={{ fontSize: '13px', color: T.textSec, marginTop: '2px' }}>Participants: {users.length}</p>
                        </div>
                    </div>

                    {activeTab === 'participants' && users.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ position: 'relative' }} ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setOpenSort((v) => !v)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        borderRadius: '999px', border: `1.5px solid ${T.border}`,
                                        background: T.surface, padding: '7px 14px',
                                        fontSize: '13px', fontWeight: '500', color: T.text,
                                        cursor: 'pointer', boxShadow: dk ? 'none' : '0 2px 6px rgba(0,0,0,0.06)',
                                    }}
                                >
                                    <ArrowUpDown size={14}/>
                                    <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSortLabel}</span>
                                    <ChevronDown size={14} style={{ color: T.textSec, transform: openSort ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}/>
                                </button>
                                <AnimatePresence>
                                    {openSort && (
                                        <motion.div
                                            initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}}
                                            exit={{opacity: 0, y: -5}}
                                            style={{
                                                position: 'absolute', zIndex: 20, marginTop: '8px', width: '220px',
                                                borderRadius: '18px', border: `1px solid ${T.border}`,
                                                background: T.surface, padding: '4px',
                                                boxShadow: dk ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
                                            }}
                                        >
                                            {sortOptions.map((opt) => {
                                                const active = opt.value === sortKey;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { setSortKey(opt.value); setOpenSort(false); }}
                                                        style={{
                                                            width: '100%', textAlign: 'left', padding: '8px 12px',
                                                            borderRadius: '12px', fontSize: '13px', border: 'none',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            cursor: 'pointer', transition: 'all 0.12s',
                                                            background: active ? (dk ? 'rgba(43,115,255,0.15)' : '#EEF4FF') : 'transparent',
                                                            color: active ? '#2B73FF' : T.text,
                                                        }}
                                                    >
                                                        <span>{opt.label}</span>
                                                        {active && <Check size={14}/>}
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
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: T.surface2, padding: '4px', borderRadius: '14px', width: 'fit-content', border: `1px solid ${T.border}` }}>
                {[
                    { id: 'participants', icon: Users, label: 'Participants' },
                    { id: 'stats', icon: BarChart2, label: 'Statistics' },
                ].map(({ id, icon: Icon, label }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 14px', borderRadius: '10px', border: active ? `1px solid ${T.border}` : '1px solid transparent',
                                fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s',
                                background: active ? T.surface : 'transparent',
                                color: active ? '#2B73FF' : T.textSec,
                                boxShadow: active ? (dk ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)') : 'none',
                            }}
                        >
                            <Icon size={13}/> {label}
                        </button>
                    );
                })}
            </div>

            {/* PARTICIPANTS */}
            {activeTab === 'participants' && (
                users.length === 0 ? (
                    <EmptyState title="No participants yet" subtitle="This test instance has no participants."/>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {viewUsers.map((user) => {
                            const score = Number(user.score) || 0;
                            const maxScore = Number(user.max_score) || 0;
                            const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

                            return (
                                <div
                                    key={user.activity_id || `${user.user_id}-${user.user_index}`}
                                    onClick={() => onUserClick(user, {fromInstance: true})}
                                    style={{
                                        background: T.surface, padding: '16px', borderRadius: '18px',
                                        border: `1.5px solid ${T.border}`, cursor: 'pointer',
                                        boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                                        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(43,115,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                                            <Avatar user={user}/>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontWeight: '600', color: T.text, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {user.user_surname} {user.user_name}
                                                </p>
                                                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: T.textSec }}>
                                                    {config?.use_index && user.user_index && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <Hash size={11} style={{ color: T.textMuted }}/> {user.user_index}
                                                        </span>
                                                    )}
                                                    <span>{fmt2(score)} / {fmt2(maxScore)} pts</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: getPercentColor(percent) }}>{percent}%</span>
                                            <ArrowRight style={{ color: T.textMuted }} size={15}/>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ height: '6px', width: '100%', borderRadius: '999px', background: T.surface2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', borderRadius: '999px', background: barColor(percent), width: `${percent}%`, transition: 'width 0.4s ease' }}/>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
                        <Loader size={32} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
                    </div>
                ) : !questionStats || questionStats.length === 0 ? (
                    <EmptyState title="No statistics yet" subtitle="Statistics appear once students complete the test."/>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {questionStats.map((q, idx) => (
                            <div key={q.question_id} style={{ background: T.surface, borderRadius: '18px', border: `1px solid ${T.border}`, boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: '11px', fontWeight: '600', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                                            Q{idx + 1} · {q.question_type}
                                        </p>
                                        <p style={{ fontWeight: '600', color: T.text, fontSize: '14px' }}>{q.question_text}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontSize: '24px', fontWeight: '700', color: getPercentColor(q.correct_percent) }}>
                                            {q.correct_percent}%
                                        </p>
                                        <p style={{ fontSize: '12px', color: T.textSec }}>{q.correct_count}/{q.total_responses} correct</p>
                                    </div>
                                </div>
                                <div style={{ height: '6px', width: '100%', borderRadius: '999px', background: T.surface2, marginBottom: '16px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '999px', background: barColor(q.correct_percent), width: `${q.correct_percent}%`, transition: 'width 0.4s ease' }}/>
                                </div>
                                {q.answers && q.answers.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: `1px solid ${T.border}`, paddingTop: '12px' }}>
                                        {q.answers.map(a => (
                                            <div key={a.answer_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ flexShrink: 0, width: '10px', height: '10px', borderRadius: '3px', background: a.is_correct ? '#22C55E' : T.border }}/>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
                                                        <span style={{ color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text}</span>
                                                        <span style={{ color: T.textSec, marginLeft: '8px', flexShrink: 0 }}>{a.chosen_count} ({a.chosen_percent}%)</span>
                                                    </div>
                                                    <div style={{ height: '4px', width: '100%', borderRadius: '999px', background: T.surface2, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', borderRadius: '999px', background: a.is_correct ? '#22C55E' : (dk ? '#3A4060' : '#CBD5E1'), width: `${a.chosen_percent}%` }}/>
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
    const { darkMode: dk } = useAppContext();
    const T = {
        surface:  dk ? '#171B2D' : '#FFFFFF',
        surface2: dk ? '#1E2237' : '#F8FAFC',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#BEC3C9',
        hoverBg:  dk ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
    };
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
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }} className="card-enter">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={onBack}
                        style={{ width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSec, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <ChevronLeft size={18}/>
                    </button>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>
                            {userDetails.user_name} {userDetails.user_surname}
                        </h2>
                        <p style={{ fontSize: '13px', color: T.textSec, marginTop: '2px' }}>
                            {config.use_index && userDetails.user_index && `Index: ${userDetails.user_index} · `}
                            {userDetails.instance_name}
                        </p>
                    </div>
                </div>
                <div style={{ textAlign: 'right', background: T.surface, borderRadius: '18px', border: `1px solid ${T.border}`, boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)', padding: '10px 18px' }}>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: getPercentColor(percent) }}>{percent}%</p>
                    <p style={{ fontSize: '12px', color: T.textSec }}>
                        {fmt2(userDetails.user_score)} / {fmt2(userDetails.max_score_for_activity)} pts
                    </p>
                </div>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userDetails.questions.map((q, index) => {
                    const isCorrect = q.points_collected === q.points_value;
                    const isExpanded = expandedQuestions.includes(q.question_id);

                    return (
                        <div key={q.question_id} style={{ background: T.surface, borderRadius: '18px', border: `1px solid ${T.border}`, boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                            <div
                                style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                                onClick={() => toggleQuestion(q.question_id)}
                                onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isCorrect ? (dk ? 'rgba(34,197,94,0.15)' : '#F0FDF4') : (dk ? 'rgba(239,68,68,0.15)' : '#FEF2F2'),
                                    }}>
                                        {isCorrect
                                            ? <Check size={13} style={{ color: '#22C55E' }}/>
                                            : <X size={13} style={{ color: '#EF4444' }}/>
                                        }
                                    </div>
                                    <p style={{ fontWeight: '500', color: T.text, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Q{index + 1}: {q.question_text}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '13px', color: isCorrect ? '#22C55E' : '#EF4444' }}>
                                        {fmt2(q.points_collected)} / {fmt2(q.points_value)} pts
                                    </span>
                                    <motion.div animate={{rotate: isExpanded ? 180 : 0}}>
                                        <ChevronDown size={16} style={{ color: T.textMuted }}/>
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
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ padding: '16px 20px', borderTop: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', background: dk ? 'rgba(255,255,255,0.02)' : 'rgba(248,250,252,0.8)' }}>
                                            <div>
                                                <p style={{ fontWeight: '600', color: T.textSec, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Your Answer</p>
                                                <div style={{ background: T.surface, borderRadius: '12px', padding: '12px', border: `1px solid ${T.border}` }}>
                                                    <RenderUserAnswer result={q}/>
                                                </div>
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '600', color: T.textSec, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Correct Answer</p>
                                                <div style={{ background: T.surface, borderRadius: '12px', padding: '12px', border: `1px solid ${T.border}` }}>
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
    const { darkMode: dk } = useAppContext();
    const T = {
        surface:  dk ? '#171B2D' : '#FFFFFF',
        surface2: dk ? '#1E2237' : '#F8FAFC',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#BEC3C9',
        hoverBg:  dk ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
    };
    const barColor = (pct) => pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';

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
        <div style={{ borderRadius: '18px', background: T.surface, border: `1px solid ${T.border}`, boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.04)', padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: T.textSec }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: T.text }}>{value}</div>
        </div>
    );

    const StatusPill = ({finished}) => (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '999px',
            padding: '2px 8px', fontSize: '11px', fontWeight: '600',
            background: finished ? (dk ? 'rgba(34,197,94,0.15)' : '#F0FDF4') : (dk ? 'rgba(245,158,11,0.15)' : '#FFFBEB'),
            color: finished ? '#22C55E' : '#F59E0B',
        }}>
            {finished ? <><Check size={11}/> Finished</> : <><X size={11}/> In Progress</>}
        </span>
    );

    const BackBtn = () => (
        <button
            onClick={onBack}
            style={{ width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSec, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
            <ChevronLeft size={18}/>
        </button>
    );

    if (!Array.isArray(history) || history.length === 0) {
        return (
            <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }} className="card-enter">
                <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <BackBtn/>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>{user.user_surname} {user.user_name}</h2>
                        {config?.use_index && user.user_index && (
                            <p style={{ fontSize: '13px', color: T.textSec }}>Index: {user.user_index}</p>
                        )}
                    </div>
                </header>
                <EmptyState title="No attempts yet" subtitle="This user has no test history."/>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }} className="card-enter">
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BackBtn/>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>{user.user_surname} {user.user_name}</h2>
                        <p style={{ fontSize: '13px', color: T.textSec, marginTop: '2px' }}>
                            {config?.use_index && user.user_index && `Index: ${user.user_index} · `}
                            {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Stat label="Average" value={`${avgPercent}%`}/>
                    <Stat label="Best" value={`${bestPercent}%`}/>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {history.map((item) => {
                    const s = Number(item.score) || 0;
                    const m = Number(item.max_score) || 0;
                    const pct = m > 0 ? Math.round((s / m) * 100) : 0;

                    return (
                        <div
                            key={item.activity_id}
                            onClick={() => onInstanceClick(item)}
                            style={{
                                background: T.surface, padding: '16px', borderRadius: '18px',
                                border: `1.5px solid ${T.border}`, cursor: 'pointer',
                                boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
                                transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(43,115,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontWeight: '600', color: T.text, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.instance_name}</p>
                                    <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '12px', color: T.textSec }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <CalendarDays size={11} style={{ color: T.textMuted }}/> {formatDate(item.timestamp)}
                                        </span>
                                        <span style={{ color: T.textMuted }}>·</span>
                                        <span>{fmt2(s)} / {fmt2(m)} pts</span>
                                        <span style={{ color: T.textMuted }}>·</span>
                                        <StatusPill finished={item.is_finished}/>
                                    </div>
                                </div>
                                <ArrowRight style={{ color: T.textMuted, flexShrink: 0 }} size={15}/>
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: T.textSec, marginBottom: '4px' }}>
                                    <span>Score</span>
                                    <span style={{ fontWeight: '600', color: T.text }}>{pct}%</span>
                                </div>
                                <div style={{ height: '6px', width: '100%', borderRadius: '999px', background: T.surface2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '999px', background: barColor(pct), width: `${pct}%`, transition: 'width 0.4s ease' }}/>
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
// MAIN COMPONENT
// =============================================================

function ResultsPanel({reset}) {
    const {config, darkMode: dk} = useAppContext();
    const T = {
        bg:   dk ? '#0F1117' : '#F4F6FB',
        text: dk ? '#E2E8F0' : '#0F1623',
    };

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
                toast.error('Missing activity_id for the selected attempt.');
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

        // LIST (instances / users)
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
        <div style={{ background: T.bg, minHeight: '100%' }}>
            <style>{`.card-enter { animation: fadeInUp 0.4s ease-out both; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <div style={{ padding: '24px 24px 4px', maxWidth: '980px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, marginBottom: '4px', letterSpacing: '-0.02em' }}>Results</h1>
            </div>

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
