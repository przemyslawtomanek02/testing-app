import React, { useEffect, useRef, useState } from 'react';
import CreateInstancePopup from './OverlayComponents/CreateInstancePopup.jsx';
import DeletePopup from './OverlayComponents/DeletePopup.jsx';
import formatDate from '../Reusable/FormatDate.jsx';
import { toast } from 'react-toastify';
import {
    PlusSquare, Edit, Trash2, CheckSquare, Square,
    Inbox, RefreshCw, Loader, Eye, Download, Upload, FilePlus2,
} from 'lucide-react';
import { useAppContext } from '../../AppContext.jsx';

const Tip = ({ label, children, dk }) => (
    <div style={{ position: 'relative', display: 'inline-flex' }}
        onMouseEnter={e => { const t = e.currentTarget.querySelector('[data-tip]'); if (t) t.style.opacity = '1'; }}
        onMouseLeave={e => { const t = e.currentTarget.querySelector('[data-tip]'); if (t) t.style.opacity = '0'; }}
    >
        {children}
        <span data-tip style={{
            pointerEvents: 'none',
            position: 'absolute',
            right: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px 10px',
            borderRadius: '6px',
            background: dk ? '#2A2F45' : '#0F1623',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            opacity: 0,
            transition: 'opacity 0.15s',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
            {label}
        </span>
    </div>
);

const IconBtn = ({ onClick, title, children, hoverColor = '#2B73FF', hoverBg = '#EEF4FF', danger, dk }) => {
    const [h, setH] = useState(false);
    const defaultColor = dk ? '#5A6483' : '#94A3B8';
    const resolvedHoverBg = dk ? 'rgba(255,255,255,0.06)' : hoverBg;
    const dangerHoverBg = dk ? 'rgba(239,68,68,0.12)' : '#FEF2F2';
    return (
        <Tip label={title} dk={dk}>
            <button
                onClick={onClick}
                onMouseEnter={() => setH(true)}
                onMouseLeave={() => setH(false)}
                style={{
                    width: '34px', height: '34px', borderRadius: '999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer',
                    background: h ? (danger ? dangerHoverBg : resolvedHoverBg) : 'transparent',
                    color: h ? (danger ? '#EF4444' : hoverColor) : defaultColor,
                    transition: 'background 0.15s, color 0.15s',
                }}
            >
                {children}
            </button>
        </Tip>
    );
};

export default function TestsPanel({ data, setOverlay, setOverlayImage, onRefresh, onEditTest, onPreviewTest, onExportTest, onImportTest, onCreateTest }) {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:       dk ? '#0F1117' : '#F4F6FB',
        surface:  dk ? '#171B2D' : '#FFFFFF',
        border:   dk ? '#2A2F45' : '#EDF0F7',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#94A3B8',
        inputBg:  dk ? '#1E2237' : '#F4F6FB',
        hoverBg:  dk ? 'rgba(255,255,255,0.05)' : '#EEF4FF',
        statsBg:  dk ? '#1E2237' : '#F8FAFF',
        statsBorder: dk ? '#2A2F45' : '#EDF0F7',
        divider:  dk ? '#2A2F45' : '#EDF0F7',
    };

    const [selectedRows, setSelectedRows] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const importInputRef = useRef(null);

    useEffect(() => {
        if (data) setSelectedRows(new Array(data.length).fill(false));
    }, [data]);

    const toggleRow    = i => setSelectedRows(r => r.map((v, j) => j === i ? !v : v));
    const toggleAll    = () => { const all = selectedRows.every(Boolean); setSelectedRows(new Array(data.length).fill(!all)); };
    const selectedIds  = () => data.filter((_, i) => selectedRows[i]).map(r => r.test_id);
    const selectedCount = selectedRows.filter(Boolean).length;
    const allSelected   = data?.length > 0 && selectedCount === data.length;

    const confirmDelete = ids => setOverlay(<DeletePopup onConfirm={() => doDelete(ids)} onCancel={() => setOverlay(null)}/>);
    const doDelete = async ids => {
        try {
            for (const id of ids) {
                const r = await fetch(`/api/admin/delete_test/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
                if (!r.ok) throw new Error();
            }
            toast.success(`${ids.length} test(s) deleted.`);
            onRefresh?.();
        } catch { toast.error('Delete failed.'); }
        finally { setOverlay(null); }
    };

    const handleImport = e => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => { try { onImportTest?.(JSON.parse(ev.target.result)); } catch { toast.error('Invalid JSON.'); } };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try { await onRefresh?.(); } catch { toast.error('Refresh failed.'); }
        finally { setTimeout(() => setIsRefreshing(false), 500); }
    };

    if (!data) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
            <Loader size={36} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
        </div>
    );

    return (
        <div style={{ padding: '28px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', minHeight: '100%', background: T.bg }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, marginBottom: '20px', letterSpacing: '-0.02em' }}>
                    Tests
                </h1>

                {/* ── Toolbar ─────────────────────────────────── */}
                <div style={{
                    background: T.surface,
                    borderRadius: '20px',
                    border: `1px solid ${T.border}`,
                    padding: '10px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: dk ? 'none' : '0 2px 12px rgba(43,115,255,0.07)',
                }}>
                    {/* Left: select all + count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={toggleAll}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        >
                            {allSelected
                                ? <CheckSquare size={20} style={{ color: '#2B73FF' }}/>
                                : <Square size={20} style={{ color: T.textMuted }}/>
                            }
                        </button>
                        <span style={{ fontSize: '13px', color: T.textSec, fontWeight: '500' }}>
                            {selectedCount > 0 ? `${selectedCount} of ${data.length} selected` : `${data.length} test${data.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Refresh */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            style={{
                                width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`,
                                background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: T.textMuted, transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.borderColor = dk ? '#3D4F6B' : '#B8D0FF'; e.currentTarget.style.color = '#2B73FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'is-refreshing' : ''}/>
                        </button>

                        <div style={{ width: '1px', height: '22px', background: T.divider, margin: '0 4px' }}/>

                        {/* Delete selected */}
                        <button
                            onClick={() => { const ids = selectedIds(); if (!ids.length) { toast.warn('Select tests first.'); return; } confirmDelete(ids); }}
                            disabled={selectedCount === 0}
                            style={{
                                height: '36px', borderRadius: '999px', border: 'none',
                                padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '13px', fontWeight: '500', cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                                background: selectedCount > 0 ? (dk ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : (dk ? T.surface : '#F8FAFC'),
                                color: selectedCount > 0 ? '#EF4444' : T.textMuted,
                                transition: 'all 0.15s',
                                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                            }}
                        >
                            <Trash2 size={14}/> Delete
                        </button>

                        {/* Import */}
                        <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport}/>
                        <button
                            onClick={() => importInputRef.current?.click()}
                            style={{
                                height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`,
                                padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                                background: 'transparent', color: T.textSec,
                                transition: 'all 0.15s',
                                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = dk ? '#3D4F6B' : '#C8D3E0'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSec; e.currentTarget.style.borderColor = T.border; }}
                        >
                            <Upload size={14}/> Import
                        </button>

                        {/* New Test – gradient pill */}
                        <button
                            onClick={() => onCreateTest?.()}
                            style={{
                                height: '36px', borderRadius: '999px', border: 'none',
                                padding: '0 18px', display: 'flex', alignItems: 'center', gap: '7px',
                                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                color: '#FFFFFF',
                                boxShadow: '0 4px 14px rgba(43,115,255,0.35)',
                                transition: 'opacity 0.15s, box-shadow 0.15s',
                                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(43,115,255,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(43,115,255,0.35)'; }}
                        >
                            <FilePlus2 size={14}/> New Test
                        </button>
                    </div>
                </div>

                {/* ── Test cards ───────────────────────────────── */}
                {data.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {data.map((row, index) => {
                            const selected = selectedRows[index];
                            return (
                                <div
                                    key={row.test_id}
                                    style={{
                                        animationDelay: `${index * 40}ms`,
                                        background: T.surface,
                                        borderRadius: '22px',
                                        border: `1.5px solid ${selected ? '#2B73FF' : T.border}`,
                                        boxShadow: selected
                                            ? '0 0 0 4px rgba(43,115,255,0.10), 0 4px 20px rgba(43,115,255,0.12)'
                                            : dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px 20px',
                                        gap: '14px',
                                        transition: 'border-color 0.18s, box-shadow 0.18s',
                                    }}
                                    className="card-enter"
                                >
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleRow(index)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', flexShrink: 0, padding: '2px',
                                        }}
                                    >
                                        {selected
                                            ? <CheckSquare size={20} style={{ color: '#2B73FF' }}/>
                                            : <Square size={20} style={{ color: T.textMuted }}/>
                                        }
                                    </button>

                                    {/* Blue accent dot */}
                                    <div style={{
                                        width: '4px', height: '40px', borderRadius: '2px', flexShrink: 0,
                                        background: selected
                                            ? 'linear-gradient(180deg, #2B73FF, #3F99FF)'
                                            : T.border,
                                        transition: 'background 0.15s',
                                    }}/>

                                    {/* Text */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {row.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: T.textSec, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {row.description || 'No description'}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0, paddingRight: '16px', borderRight: `1px solid ${T.border}` }}>
                                        <Stat label="Questions" value={row.number_of_questions} T={T}/>
                                        <Stat label="Instances" value={row.instance_count} T={T}/>
                                        <Stat label="Created" value={formatDate(row.created_at)} small T={T}/>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                        <IconBtn onClick={() => setOverlay(<CreateInstancePopup test_id={row.test_id} max_score={row.number_of_questions} setOverlay={setOverlay} onRefresh={onRefresh}/>)} title="Create Instance" hoverColor="#2B73FF" hoverBg="#EEF4FF" dk={dk}>
                                            <PlusSquare size={16}/>
                                        </IconBtn>
                                        <IconBtn onClick={() => onPreviewTest?.(row.test_id)} title="Preview" hoverColor="#F59E0B" hoverBg="#FFFBEB" dk={dk}>
                                            <Eye size={16}/>
                                        </IconBtn>
                                        <IconBtn onClick={() => onEditTest?.(row.test_id)} title="Edit" hoverColor="#22C55E" hoverBg="#F0FDF4" dk={dk}>
                                            <Edit size={16}/>
                                        </IconBtn>
                                        <IconBtn onClick={() => onExportTest?.(row.test_id, row.name)} title="Export JSON" hoverColor="#8B5CF6" hoverBg="#F5F3FF" dk={dk}>
                                            <Download size={16}/>
                                        </IconBtn>
                                        <IconBtn onClick={() => confirmDelete([row.test_id])} title="Delete" danger dk={dk}>
                                            <Trash2 size={16}/>
                                        </IconBtn>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{
                        background: T.surface,
                        borderRadius: '24px',
                        border: `1px solid ${T.border}`,
                        padding: '72px 24px',
                        textAlign: 'center',
                        boxShadow: dk ? 'none' : '0 2px 12px rgba(43,115,255,0.05)',
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '20px',
                            background: 'linear-gradient(135deg, #EEF4FF, #DDE9FF)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 18px',
                            boxShadow: '0 4px 14px rgba(43,115,255,0.12)',
                        }}>
                            <Inbox size={26} style={{ color: '#2B73FF' }}/>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: T.text, marginBottom: '6px' }}>No tests yet</div>
                        <div style={{ fontSize: '13px', color: T.textSec, marginBottom: '24px' }}>Create your first test to get started.</div>
                        <button
                            onClick={() => onCreateTest?.()}
                            style={{
                                height: '40px', borderRadius: '999px', border: 'none',
                                padding: '0 24px', display: 'inline-flex', alignItems: 'center', gap: '7px',
                                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                color: '#FFFFFF', boxShadow: '0 4px 14px rgba(43,115,255,0.35)',
                                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                            }}
                        >
                            <FilePlus2 size={15}/> Create Test
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const Stat = ({ label, value, small, T }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: small ? '12px' : '17px', fontWeight: '700', color: T ? T.text : '#0F1623', lineHeight: 1 }}>
            {value}
        </div>
        <div style={{ fontSize: '11px', color: T ? T.textMuted : '#94A3B8', marginTop: '3px', fontWeight: '500' }}>
            {label}
        </div>
    </div>
);
