import React, {useEffect, useState} from 'react';
import {Edit, Trash2, Square, CheckSquare, Inbox, RefreshCw, Loader, FilePlus2} from 'lucide-react';
import {toast} from 'react-toastify';
import DeletePopup from "../Adminpage_panels/OverlayComponents/DeletePopup.jsx";
import {useAppContext} from '../../AppContext.jsx';

const GradingSchemeList = ({onEdit, onCreateNew, setOverlay}) => {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:      dk ? '#0F1117' : '#F4F6FB',
        surface: dk ? '#171B2D' : '#FFFFFF',
        border:  dk ? '#2A2F45' : '#E4E6EB',
        text:    dk ? '#E2E8F0' : '#0F1623',
        textSec: dk ? '#8896B3' : '#65676B',
        textMuted: dk ? '#5A6483' : '#BEC3C9',
        hoverBg: dk ? 'rgba(255,255,255,0.06)' : '#F0F2F5',
        pillSlate: { bg: dk ? 'rgba(255,255,255,0.08)' : '#F0F2F5', color: dk ? '#8896B3' : '#65676B' },
        pillGreen: { bg: dk ? 'rgba(34,197,94,0.15)' : '#F0FDF4', color: dk ? '#4ADE80' : '#16A34A' },
        pillRed:   { bg: dk ? 'rgba(239,68,68,0.15)'  : '#FEF2F2', color: dk ? '#F87171' : '#DC2626' },
        pillAmber: { bg: dk ? 'rgba(245,158,11,0.15)' : '#FFFBEB', color: dk ? '#FCD34D' : '#B45309' },
        pillBlue:  { bg: dk ? 'rgba(43,115,255,0.15)' : '#EEF4FF', color: dk ? '#6EA8FE' : '#2B73FF' },
    };

    const [schemes, setSchemes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    const fetchSchemes = async () => {
        if (!isRefreshing) setIsLoading(true);
        try {
            const res = await fetch('/api/admin/list_grading_schemes');
            if (!res.ok) throw new Error(`Network error: ${res.status}`);
            const data = await res.json();
            setSchemes(data);
            setSelectedRows(new Array(data.length).fill(false));
        } catch (error) {
            console.error("Unable to download assessment templates:", error);
            toast.error("Unable to load data. Please try refreshing the page.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchSchemes(); }, []);

    const handleCheckboxChange = (index) => {
        const updated = [...selectedRows];
        updated[index] = !updated[index];
        setSelectedRows(updated);
    };

    const handleSelectAll = () => {
        const allSelected = selectedRows.length > 0 && selectedRows.every(Boolean);
        setSelectedRows(new Array(schemes.length).fill(!allSelected));
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchSchemes();
        toast.info("The list has been refreshed.");
    };

    const handleConfirmDelete = async (idsToDelete) => {
        if (!idsToDelete || idsToDelete.length === 0) return;
        try {
            const responses = await Promise.all(
                idsToDelete.map(id => fetch(`/api/admin/delete_grading_scheme/${id}`, {method: 'DELETE'}))
            );
            if (responses.some(r => !r.ok)) throw new Error('Some deletions failed.');
            toast.success(`${idsToDelete.length} template(s) successfully deleted.`);
            await fetchSchemes();
        } catch (error) {
            toast.error("An error occurred during deletion. Please try again.");
        } finally {
            if (setOverlay) setOverlay(null);
        }
    };

    const handleDeleteRequest = (schemeIds) => {
        setOverlay(
            <DeletePopup
                onConfirm={() => handleConfirmDelete(schemeIds)}
                onCancel={() => setOverlay(null)}
            />
        );
    };

    const selectedCount = selectedRows.filter(Boolean).length;
    const allSelected = schemes.length > 0 && selectedCount === schemes.length;

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg }}>
                <Loader size={36} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
            </div>
        );
    }

    const MetaPill = ({ tone = "slate", children }) => {
        const style = T[`pill${tone.charAt(0).toUpperCase() + tone.slice(1)}`] || T.pillSlate;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: '600',
                background: style.bg, color: style.color,
            }}>
                {children}
            </span>
        );
    };

    return (
        <div style={{ padding: '28px', background: T.bg, minHeight: '100%' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, marginBottom: '20px', letterSpacing: '-0.02em' }}>Grading Templates</h1>

                {/* Toolbar */}
                <div style={{
                    background: T.surface, borderRadius: '20px', border: `1px solid ${T.border}`,
                    padding: '10px 16px', marginBottom: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    boxShadow: dk ? 'none' : '0 2px 12px rgba(43,115,255,0.07)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={handleSelectAll}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                        >
                            {allSelected
                                ? <CheckSquare size={20} style={{ color: '#2B73FF' }}/>
                                : <Square size={20} style={{ color: T.textMuted }}/>}
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: T.textSec }}>
                            {selectedCount > 0 ? `${selectedCount} of ${schemes.length} selected` : `${schemes.length} templates`}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            style={{
                                width: '36px', height: '36px', borderRadius: '999px',
                                border: `1.5px solid ${T.border}`, background: 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: T.textSec, transition: 'all 0.15s', opacity: isRefreshing ? 0.5 : 1,
                            }}
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'is-refreshing' : ''}/>
                        </button>

                        <div style={{ width: '1px', height: '22px', background: T.border, margin: '0 4px' }}/>

                        <button
                            onClick={() => handleDeleteRequest(schemes.filter((_, i) => selectedRows[i]).map(s => s.scheme_id))}
                            disabled={selectedCount === 0}
                            style={{
                                height: '36px', borderRadius: '999px', border: 'none',
                                padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '13px', fontWeight: '500',
                                cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                                background: selectedCount > 0 ? (dk ? 'rgba(239,68,68,0.15)' : '#FEF2F2') : (dk ? 'rgba(255,255,255,0.04)' : '#F8FAFC'),
                                color: selectedCount > 0 ? '#EF4444' : T.textMuted,
                                transition: 'all 0.15s',
                            }}
                        >
                            <Trash2 size={14}/> Delete
                        </button>

                        <button
                            onClick={() => onCreateNew?.()}
                            style={{
                                height: '36px', borderRadius: '999px', border: 'none',
                                padding: '0 18px', display: 'flex', alignItems: 'center', gap: '7px',
                                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                color: '#FFFFFF',
                                boxShadow: '0 4px 14px rgba(43,115,255,0.35)',
                                transition: 'opacity 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(43,115,255,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(43,115,255,0.35)'; }}
                        >
                            <FilePlus2 size={14}/> New Template
                        </button>
                    </div>
                </div>

                {schemes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {schemes.map((s, index) => {
                            const selected = selectedRows[index];
                            const penalty = s.penalize_wrong && typeof s.penalty_per_wrong === 'number'
                                ? Number(s.penalty_per_wrong).toLocaleString() : null;
                            return (
                                <div
                                    key={s.scheme_id}
                                    className="card-enter"
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        background: T.surface,
                                        borderRadius: '22px',
                                        border: `1.5px solid ${selected ? '#2B73FF' : T.border}`,
                                        boxShadow: selected
                                            ? '0 0 0 4px rgba(43,115,255,0.10), 0 4px 20px rgba(43,115,255,0.12)'
                                            : dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)',
                                        display: 'flex', flexDirection: 'row', alignItems: 'center',
                                        padding: '14px 18px', gap: '14px',
                                        transition: 'border-color 0.18s, box-shadow 0.18s',
                                    }}
                                >
                                    <button
                                        onClick={() => handleCheckboxChange(index)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, padding: '2px' }}
                                    >
                                        {selected
                                            ? <CheckSquare size={20} style={{ color: '#2B73FF' }}/>
                                            : <Square size={20} style={{ color: T.textMuted }}/>}
                                    </button>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                        {s.description && (
                                            <div style={{ fontSize: '12px', color: T.textSec, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description}</div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', padding: '0 16px', borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
                                        {s.scale_type && <MetaPill tone="slate">Scale: {s.scale_type}</MetaPill>}
                                        {s.partial_credit && <MetaPill tone="green">Partial credit</MetaPill>}
                                        {s.penalize_wrong && <MetaPill tone="red">Penalty −{penalty ?? '1'}</MetaPill>}
                                        {s.allow_negative_points && <MetaPill tone="amber">Negative pts</MetaPill>}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        <button
                                            title="Edit template"
                                            onClick={() => onEdit(s.scheme_id)}
                                            style={{
                                                padding: '7px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                                background: 'none', color: T.textSec, display: 'flex', alignItems: 'center',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = dk ? 'rgba(34,197,94,0.15)' : '#F0FDF4'; e.currentTarget.style.color = '#22C55E'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.textSec; }}
                                        >
                                            <Edit size={17}/>
                                        </button>
                                        <button
                                            title="Delete template"
                                            onClick={() => handleDeleteRequest([s.scheme_id])}
                                            style={{
                                                padding: '7px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                                background: 'none', color: T.textSec, display: 'flex', alignItems: 'center',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = dk ? 'rgba(239,68,68,0.15)' : '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.textSec; }}
                                        >
                                            <Trash2 size={17}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 24px', background: T.surface, borderRadius: '24px', border: `1px solid ${T.border}` }}>
                        <Inbox size={44} style={{ margin: '0 auto', color: T.textMuted }}/>
                        <div style={{ marginTop: '16px', fontSize: '15px', fontWeight: '600', color: T.text }}>No grading templates found</div>
                        <div style={{ marginTop: '4px', fontSize: '13px', color: T.textSec }}>Create a new template to get started.</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradingSchemeList;
