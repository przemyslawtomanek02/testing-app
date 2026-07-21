import React, {useEffect, useState} from 'react';
import {Edit, Trash2, Square, CheckSquare, Inbox, RefreshCw, Loader} from 'lucide-react';
import {toast} from 'react-toastify';
import DeletePopup from "../Adminpage_panels/OverlayComponents/DeletePopup.jsx";

const GradingSchemeList = ({onEdit, setOverlay}) => {
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
            <div className="flex items-center justify-center h-full p-8 bg-[#F0F2F5] min-h-screen">
                <Loader className="h-10 w-10 animate-spin text-[#BEC3C9]"/>
            </div>
        );
    }

    const PILL = {
        slate:  "bg-[#F0F2F5] text-[#65676B]",
        green:  "bg-green-50 text-green-700",
        red:    "bg-red-50 text-red-600",
        indigo: "bg-[#E7F3FF] text-[#0866FF]",
        amber:  "bg-amber-50 text-amber-700",
    };

    const MetaPill = ({tone = "slate", children}) => (
        <span className={`inline-flex w-fit whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL[tone]}`}>
            {children}
        </span>
    );

    return (
        <div className="p-6 bg-[#F0F2F5] min-h-screen">
            <div className="max-w-5xl mx-auto">

                {/* Toolbar */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E4E6EB] px-5 py-3 mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll} className="p-1.5 rounded-lg hover:bg-[#F0F2F5] transition-colors">
                            {allSelected
                                ? <CheckSquare size={20} className="text-[#0866FF]"/>
                                : <Square size={20} className="text-[#BEC3C9]"/>}
                        </button>
                        <span className="text-sm font-medium text-[#65676B]">
                            {selectedCount > 0 ? `${selectedCount} of ${schemes.length} selected` : `${schemes.length} templates`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 rounded-lg text-[#606770] hover:bg-[#F0F2F5] transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''}/>
                        </button>
                        <button
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteRequest(schemes.filter((_, i) => selectedRows[i]).map(s => s.scheme_id))}
                            disabled={selectedCount === 0}
                        >
                            <Trash2 size={15}/>
                            <span>Delete selected</span>
                        </button>
                    </div>
                </div>

                {schemes.length > 0 ? (
                    <div className="space-y-3">
                        {schemes.map((s, index) => {
                            const selected = selectedRows[index];
                            const penalty = s.penalize_wrong && typeof s.penalty_per_wrong === 'number'
                                ? Number(s.penalty_per_wrong).toLocaleString() : null;
                            return (
                                <article
                                    key={s.scheme_id}
                                    style={{animationDelay: `${index * 50}ms`}}
                                    className={`card-enter bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-row items-center px-5 py-4 gap-5 ${selected ? 'border-[#0866FF] ring-1 ring-[#0866FF]/20' : 'border-[#E4E6EB]'}`}
                                >
                                    <button
                                        onClick={() => handleCheckboxChange(index)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#F0F2F5] flex-shrink-0 transition-colors"
                                        aria-pressed={selected}
                                    >
                                        {selected
                                            ? <CheckSquare size={20} className="text-[#0866FF]"/>
                                            : <Square size={20} className="text-[#BEC3C9]"/>}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[15px] text-[#1C1E21] truncate">{s.name}</h3>
                                        {s.description && (
                                            <p className="text-[#65676B] text-sm mt-0.5 truncate">{s.description}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 items-center px-5 border-x border-[#E4E6EB]">
                                        {s.scale_type && <MetaPill tone="slate">Scale: {s.scale_type}</MetaPill>}
                                        {s.partial_credit && <MetaPill tone="green">Partial credit</MetaPill>}
                                        {s.penalize_wrong && <MetaPill tone="red">Penalty −{penalty ?? '1'}</MetaPill>}
                                        {s.allow_negative_points && <MetaPill tone="amber">Negative pts</MetaPill>}
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            title="Edit template"
                                            onClick={() => onEdit(s.scheme_id)}
                                            className="p-2 rounded-xl text-[#606770] hover:text-green-600 hover:bg-green-50 transition-colors"
                                        >
                                            <Edit size={18}/>
                                        </button>
                                        <button
                                            title="Delete template"
                                            onClick={() => handleDeleteRequest([s.scheme_id])}
                                            className="p-2 rounded-xl text-[#606770] hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
                        <Inbox size={44} className="mx-auto text-[#BEC3C9]"/>
                        <h3 className="mt-4 text-base font-semibold text-[#1C1E21]">No grading templates found</h3>
                        <p className="mt-1 text-sm text-[#65676B]">Create a new template to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradingSchemeList;
