import React, {useEffect, useState} from 'react';
import formatDate from "../Reusable/FormatDate.jsx"
import DeletePopup from "./OverlayComponents/DeletePopup.jsx";
import {toast} from 'react-toastify';
import {Trash2, CheckSquare, Square, Inbox, Loader, RefreshCw, ToggleLeft, ToggleRight} from 'lucide-react';
import {useAppContext} from '../../AppContext.jsx';


export default function InstancesPanel({data, setOverlay, onRefresh}) {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:      dk ? '#0F1117' : '#F4F6FB',
        surface: dk ? '#171B2D' : '#FFFFFF',
        border:  dk ? '#2A2F45' : '#EDF0F7',
        text:    dk ? '#E2E8F0' : '#0F1623',
        textSec: dk ? '#8896B3' : '#64748B',
        textMuted: dk ? '#5A6483' : '#94A3B8',
        hoverBg: dk ? 'rgba(255,255,255,0.05)' : '#F4F6FB',
    };
    const [selectedRowsInstances, setSelectedRowsInstances] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (data) {
            const initialSelection = new Array(data.length).fill(false);
            setSelectedRowsInstances(initialSelection);
        }
    }, [data]);

    const handleCheckboxChange = (index) => {
        const updatedSelectedRows = [...selectedRowsInstances];
        updatedSelectedRows[index] = !updatedSelectedRows[index];
        setSelectedRowsInstances(updatedSelectedRows);
    };

    const handleSelectAll = () => {
        const allSelected = data && selectedRowsInstances.length > 0 && selectedRowsInstances.every(Boolean);
        const updatedSelectedRows = new Array(data.length).fill(!allSelected);
        setSelectedRowsInstances(updatedSelectedRows);
    };

    const handleDeleteClick = () => {
        const selectedIds = data
            .filter((_, index) => selectedRowsInstances[index])
            .map(row => row.instance_id);

        if (selectedIds.length === 0) {
            toast.warn("Please select instances to delete.");
            return;
        }
        setOverlay(<DeletePopup onConfirm={() => handleConfirmDelete(selectedIds)} onCancel={() => setOverlay(null)}/>);
    };

    const handleConfirmDelete = async (idsToDelete) => {
        try {
            for (const instance_id of idsToDelete) {
                const response = await fetch(`/api/admin/delete_instance/${instance_id}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`Failed to delete instance with ID ${instance_id}`);
                }
            }
            toast.success("Instances deleted successfully");
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while deleting the instances.");
        } finally {
            setOverlay(null);
        }
    };

    const handleStatusToggle = async (row) => {
        const isActive = !row.is_active;
        try {
            const response = await fetch(`/api/admin/switch_instance_status/${row.instance_id}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({is_active: isActive})
            });

            if (!response.ok) {
                throw new Error(`Failed to switch instance status with ID ${row.instance_id}`);
            }
            toast.success(`Instance status switched to ${isActive ? 'Active' : 'Inactive'}`);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error, 'Error Status Toggle catch');
            toast.error("An error occurred while switching the instance status.");
        }
    };

    const handleRefresh = async () => {
        if (!onRefresh) {
            window.location.reload();
            return;
        }
        setIsRefreshing(true);
        try {
            await onRefresh();
        } catch (error) {
            toast.error("Failed to refresh data.");
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    if (!data) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
                <Loader size={36} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
            </div>
        );
    }

    const allSelected = data.length > 0 && selectedRowsInstances.length === data.length && selectedRowsInstances.every(Boolean);
    const selectedCount = selectedRowsInstances.filter(Boolean).length;

    return (
        <div style={{ padding: '28px', background: T.bg, minHeight: '100%' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, marginBottom: '20px', letterSpacing: '-0.02em' }}>Instances</h1>

                {/* Toolbar */}
                <div style={{ background: T.surface, borderRadius: '20px', border: `1px solid ${T.border}`, padding: '10px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: dk ? 'none' : '0 2px 12px rgba(43,115,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll} className="p-1.5 rounded-lg hover:bg-[#F0F2F5] transition-colors">
                            {allSelected
                                ? <CheckSquare size={20} className="text-[#0866FF]"/>
                                : <Square size={20} className="text-[#BEC3C9]"/>}
                        </button>
                        <span className="text-sm font-medium text-[#65676B]">
                            {selectedCount > 0 ? `${selectedCount} of ${data.length} selected` : `${data.length} instances`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 rounded-lg text-[#606770] hover:bg-[#F0F2F5] transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={17} className={isRefreshing ? 'is-refreshing' : ''}/>
                        </button>
                        <button
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={handleDeleteClick}
                            disabled={selectedCount === 0}
                        >
                            <Trash2 size={15}/>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>

                {data.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {data.map((row, index) => {
                            const selected = selectedRowsInstances[index];
                            return (
                                <div
                                    key={row.instance_id}
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
                                        padding: '16px 20px', gap: '14px',
                                        overflow: 'hidden', position: 'relative',
                                        transition: 'border-color 0.18s, box-shadow 0.18s',
                                    }}
                                >
                                    {/* Active indicator strip */}
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                                        background: row.is_active ? '#22C55E' : '#EF4444',
                                        borderRadius: '22px 0 0 22px',
                                    }}/>

                                    <button
                                        onClick={() => handleCheckboxChange(index)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, padding: '2px', marginLeft: '8px' }}
                                    >
                                        {selected
                                            ? <CheckSquare size={20} style={{ color: '#2B73FF' }}/>
                                            : <Square size={20} style={{ color: T.textMuted }}/>}
                                    </button>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.instance_name}</div>
                                        <div style={{ fontSize: '12px', color: T.textSec, marginTop: '2px' }}>Test: {row.test_name}</div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0, paddingRight: '16px', borderRight: `1px solid ${T.border}` }}>
                                        {[
                                            { label: 'Start',     val: formatDate(row.start_time) },
                                            { label: 'End',       val: formatDate(row.end_time) },
                                            { label: 'Time',      val: `${row.test_time} min` },
                                            { label: 'Questions', val: row.num_questions },
                                        ].map(({ label, val }) => (
                                            <div key={label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '11px', color: T.textMuted, marginBottom: '2px', fontWeight: '500' }}>{label}</div>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: T.text }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleStatusToggle(row)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '5px 12px', borderRadius: '999px',
                                            border: 'none', cursor: 'pointer', flexShrink: 0,
                                            fontSize: '12px', fontWeight: '600',
                                            background: row.is_active
                                                ? (dk ? 'rgba(34,197,94,0.15)' : '#F0FDF4')
                                                : (dk ? 'rgba(239,68,68,0.15)' : '#FEF2F2'),
                                            color: row.is_active ? '#22C55E' : '#EF4444',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {row.is_active ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
                                        {row.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 24px', background: T.surface, borderRadius: '24px', border: `1px solid ${T.border}` }}>
                        <Inbox size={44} style={{ margin: '0 auto', color: T.textMuted }}/>
                        <div style={{ marginTop: '16px', fontSize: '15px', fontWeight: '600', color: T.text }}>No instances found</div>
                        <div style={{ marginTop: '4px', fontSize: '13px', color: T.textSec }}>You can create new instances from the 'Tests' panel.</div>
                    </div>
                )}
            </div>
        </div>
    );
}