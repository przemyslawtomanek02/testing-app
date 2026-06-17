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
            if (!res.ok) {
                throw new Error(`Network error: ${res.status}`);
            }
            const data = await res.json();
            setSchemes(data);
            console.log("Data:", data);
            setSelectedRows(new Array(data.length).fill(false));
        } catch (error) {
            console.error("Unable to download assessment templates:", error);
            toast.error("Unable to load data. Please try refreshing the page..");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSchemes();
    }, []);

    const handleCheckboxChange = (index) => {
        const updatedSelectedRows = [...selectedRows];
        updatedSelectedRows[index] = !updatedSelectedRows[index];
        setSelectedRows(updatedSelectedRows);
    };

    const handleSelectAll = () => {
        const allSelected = selectedRows.length > 0 && selectedRows.every(Boolean);
        const updatedSelectedRows = new Array(schemes.length).fill(!allSelected);
        setSelectedRows(updatedSelectedRows);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchSchemes();
        toast.info("The list has been refreshed.");
    };

    const handleConfirmDelete = async (idsToDelete) => {
        if (!idsToDelete || idsToDelete.length === 0) return;

        try {
            const deletePromises = idsToDelete.map(id =>
                fetch(`/api/admin/delete_grading_scheme/${id}`, {method: 'DELETE'})
            );
            const responses = await Promise.all(deletePromises);
            const failedResponses = responses.filter(res => !res.ok);
            if (failedResponses.length > 0) {
                throw new Error(`Failed to remove ${failedResponses.length} items.`);
            }
            toast.success(`${idsToDelete.length} template(s) successfully deleted.`);
            await fetchSchemes();
        } catch (error) {
            console.error("Error while deleting templates:", error);
            toast.error("An error occurred during deletion. Please try again.");
        } finally {
            if (setOverlay) {
                setOverlay(null);
            }
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
            <div
                className="flex items-center justify-center h-full p-8 bg-slate-50 dark:bg-darkCustom-800 min-h-screen">
                <Loader className="h-12 w-12 animate-spin text-slate-500 dark:text-darkCustom-400"/>
            </div>
        );
    }

    const TONES = {
        slate: "bg-slate-100 text-slate-700 dark:bg-darkCustom-700 dark:text-darkCustom-200",
        green: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
        red: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };

    const MetaPill = ({tone = "slate", children}) => (
        <span
            className={`inline-flex w-fit whitespace-nowrap items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
            {children}
        </span>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-darkCustom-800 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">

                <div
                    className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-sm px-4 py-3 mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll}
                                className="flex items-center gap-2 rounded-md hover:bg-slate-100 dark:hover:bg-darkCustom-700 p-1 transition-colors">
                            {allSelected ?
                                <CheckSquare size={22} className="text-slate-700 dark:text-darkCustom-200"/> :
                                <Square size={22} className="text-slate-400 dark:text-darkCustom-500"/>}
                        </button>
                        <span
                            className="font-semibold text-slate-700 dark:text-darkCustom-200 text-sm">{selectedCount} z {schemes.length} selected</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            title="Refresh list"
                            onClick={handleRefresh}
                            className="p-2 rounded-full text-slate-500 dark:text-darkCustom-400 hover:bg-slate-200 dark:hover:bg-darkCustom-700 hover:text-slate-800 dark:hover:text-darkCustom-100 transition-colors"
                            disabled={isRefreshing}
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''}/>
                        </button>
                        <button
                            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 font-medium py-2 px-3 sm:px-4 rounded-lg transition-all duration-300 ease-in-out shadow-sm disabled:bg-slate-400 dark:disabled:bg-darkCustom-600 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteRequest(schemes.filter((_, index) => selectedRows[index]).map(s => s.scheme_id))}
                            disabled={selectedCount === 0}
                        >
                            <Trash2 size={18}/>
                            <span className="hidden sm:inline">Delete selected</span>
                        </button>
                    </div>
                </div>

                {schemes.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {schemes.map((s, index) => {
                            const selected = selectedRows[index];
                            const penalty =
                                s.penalize_wrong && typeof s.penalty_per_wrong === 'number'
                                    ? Number(s.penalty_per_wrong).toLocaleString()
                                    : null;
                            return (
                                <article
                                    key={s.scheme_id}
                                    style={{animationDelay: `${index * 100}ms`}}
                                    className={`card-enter bg-white dark:bg-darkCustom-900 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-row items-center p-4 gap-4 border-2
                                    ${selected ? 'border-slate-600 bg-slate-50 dark:border-darkCustom-300 dark:bg-darkCustom-800' : 'border-transparent dark:border-darkCustom-700'}`}
                                >
                                    <button
                                        onClick={() => handleCheckboxChange(index)}
                                        className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-darkCustom-700"
                                        aria-pressed={selected}
                                        aria-label={selected ? 'Unselect' : 'Select'}
                                    >
                                        {selected ? (
                                            <CheckSquare size={20} className="text-slate-700 dark:text-darkCustom-200"/>
                                        ) : (
                                            <Square size={20} className="text-slate-400 dark:text-darkCustom-500"/>
                                        )}
                                    </button>

                                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-5 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-darkCustom-100 truncate">{s.name}</h3>
                                            {s.description && (
                                                <span
                                                    className="text-slate-700 dark:text-darkCustom-300 text-sm truncate">{s.description}</span>
                                            )}
                                        </div>
                                        <div
                                            className="col-span-5 grid grid-cols-1 sm:grid-cols-[max-content_max-content] gap-x-3 gap-y-2 justify-start pl-4 border-l border-slate-200 dark:border-darkCustom-700">
                                            {s.scale_type && <MetaPill tone="slate">Scale: {s.scale_type}</MetaPill>}
                                            {s.partial_credit && <MetaPill tone="green">Partial credit</MetaPill>}
                                            {s.penalize_wrong &&
                                                <MetaPill tone="red">Penalty −{penalty ?? '1'}</MetaPill>}
                                            {s.allow_negative_points &&
                                                <MetaPill tone="amber">Negative points</MetaPill>}
                                        </div>

                                        {/* prawa: akcje */}
                                        <div className="col-span-2 flex justify-end">
                                            <div className="flex-shrink-0 flex flex-col items-center gap-1 self-center">
                                                <button
                                                    title="Edit template"
                                                    onClick={() => onEdit(s.scheme_id)}
                                                    className="p-2 rounded-full text-slate-500 dark:text-darkCustom-400 hover:text-green-600 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-500/10 transition-colors"
                                                >
                                                    <Edit size={20}/>
                                                </button>
                                                <button
                                                    title="Delete template"
                                                    onClick={() => handleDeleteRequest([s.scheme_id])}
                                                    className="p-2 rounded-full text-slate-500 dark:text-darkCustom-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 size={20}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white dark:bg-darkCustom-900 rounded-lg shadow-sm">
                        <Inbox size={48} className="mx-auto text-slate-400 dark:text-darkCustom-500"/>
                        <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-darkCustom-100">No assessment
                            templates found.</h3>
                        <p className="mt-1 text-slate-500 dark:text-darkCustom-300">Create a new template to get
                            started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradingSchemeList;

