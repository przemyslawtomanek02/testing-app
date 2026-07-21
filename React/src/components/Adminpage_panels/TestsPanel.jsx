import React, {useEffect, useRef, useState} from 'react';
import CreateInstancePopup from "./OverlayComponents/CreateInstancePopup.jsx";
import DeletePopup from "./OverlayComponents/DeletePopup.jsx";
import formatDate from "../Reusable/FormatDate.jsx"
import {toast} from 'react-toastify';
import {PlusSquare, Edit, Trash2, CheckSquare, Square, Inbox, RefreshCw, Loader, Eye, Download, Upload, FilePlus2} from 'lucide-react';

const Tooltip = ({label, children}) => (
    <div className="relative group/tip flex items-center justify-center">
        {children}
        <span className="pointer-events-none absolute right-full mr-2 px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-white dark:bg-darkCustom-100 dark:text-darkCustom-900 whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-10">
            {label}
        </span>
    </div>
);

export default function TestsPanel({data, setOverlay, setOverlayImage, onRefresh, onEditTest, onPreviewTest, onExportTest, onImportTest, onCreateTest}) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const importInputRef = useRef(null);

    useEffect(() => {
        if (data) {
            const initialSelection = new Array(data.length).fill(false);
            setSelectedRows(initialSelection);
        }
    }, [data]);

    const handleCheckboxChange = (index) => {
        const updatedSelectedRows = [...selectedRows];
        updatedSelectedRows[index] = !updatedSelectedRows[index];
        setSelectedRows(updatedSelectedRows);
    };

    const handleSelectAll = () => {
        const allSelected = selectedRows.length > 0 && selectedRows.every(Boolean);
        const updatedSelectedRows = new Array(data.length).fill(!allSelected);
        setSelectedRows(updatedSelectedRows);
    };

    const handleDeleteOfSelected = async () => {
        const selectedIds = data
            .filter((_, index) => selectedRows[index])
            .map(row => row.test_id);

        if (selectedIds.length === 0) {
            toast.warn("Please select tests to delete.");
            return;
        }

        setOverlay(<DeletePopup onConfirm={() => handleConfirmDelete(selectedIds)} onCancel={() => setOverlay(null)} />);
    };

    const handleInstance = (test, max_score) => {
        setOverlay(<CreateInstancePopup test_id={test} max_score={max_score} setOverlay={setOverlay} onRefresh={onRefresh}/>)
    }

    const handleEdit = (testId) => {
        if (onEditTest) {
            onEditTest(testId);
        }
    };

    const handleDelete = (testId) => {
        setOverlay(<DeletePopup onConfirm={() => handleConfirmDelete([testId])} onCancel={() => setOverlay(null)} />);
    };

    const handleConfirmDelete = async (idsToDelete) => {
        try {
            for (const id of idsToDelete) {
                const response = await fetch(`/api/admin/delete_test/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete test with ID ${id}. Status: ${response.status}`);
                }
            }

            toast.success(`${idsToDelete.length} test(s) deleted successfully`);
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while deleting the test(s).");
        }
        finally {
            setOverlay(null);
        }
    };

    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                if (onImportTest) onImportTest(json);
            } catch {
                toast.error('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
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
            <div className="flex items-center justify-center h-full p-8 dark:bg-darkCustom-800">
                <Loader className="h-12 w-12 animate-spin text-slate-500 dark:text-darkCustom-400" />
            </div>
        );
    }

    const allSelected = data.length > 0 && selectedRows.length === data.length && selectedRows.every(Boolean);
    const selectedCount = selectedRows.filter(Boolean).length;

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-slate-100 dark:bg-darkCustom-800 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">

                <div className="bg-white dark:bg-darkCustom-900 dark:border dark:border-darkCustom-700 rounded-lg shadow-sm px-4 py-3 mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <button onClick={handleSelectAll} className="flex items-center gap-2 rounded-md hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors">
                            {allSelected ? <CheckSquare size={22} className="text-slate-700 dark:text-darkCustom-200"/> : <Square size={22} className="text-slate-400 dark:text-darkCustom-500"/>}
                         </button>
                        <span className="font-semibold text-slate-700 dark:text-darkCustom-200">{selectedCount} z {data.length} selected</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            title="Refresh list"
                            onClick={handleRefresh}
                            className="p-2 rounded-full text-slate-500 dark:text-darkCustom-400 hover:bg-slate-200 dark:hover:bg-darkCustom-700 transition-colors"
                            disabled={isRefreshing}
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'is-refreshing' : ''}/>
                        </button>

                         <button
                            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 font-medium py-2 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-darkCustom-600"
                            onClick={handleDeleteOfSelected}
                            disabled={selectedCount === 0}
                        >
                            <Trash2 size={18} />
                            <span>Delete</span>
                        </button>
                        <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                        <button
                            onClick={() => importInputRef.current?.click()}
                            className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-sm"
                        >
                            <Upload size={18} />
                            <span>Import</span>
                        </button>
                        <button
                            onClick={() => onCreateTest && onCreateTest()}
                            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 font-medium py-2 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-sm"
                        >
                            <FilePlus2 size={18} />
                            <span>New Test</span>
                        </button>
                    </div>
                </div>

                {data.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {data.map((row, index) => (
                            <div
                                key={row.test_id}
                                style={{ animationDelay: `${index * 100}ms` }}
                                className={`card-enter bg-white dark:bg-darkCustom-900 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-row items-center px-4 py-2 gap-4 border-2 ${selectedRows[index] ? 'border-slate-600 bg-slate-50 dark:border-darkCustom-300 dark:bg-darkCustom-800' : 'border-transparent dark:border-darkCustom-700'}`}
                            >
                                <button onClick={() => handleCheckboxChange(index)} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-darkCustom-700">
                                    {selectedRows[index] ? <CheckSquare size={22} className="text-slate-700 dark:text-darkCustom-200"/> : <Square size={22} className="text-slate-300 dark:text-darkCustom-500"/>}
                                </button>

                                <div className="w-1/2 min-w-0 pr-4">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-darkCustom-100 mb-2 truncate">{row.name}</h2>
                                    <p className="text-slate-600 dark:text-darkCustom-300 text-sm break-words">{row.description}</p>
                                </div>

                                {/* Column 2: Stats */}
                                <div className="w-1/4 flex flex-col items-start gap-1 text-sm text-slate-500 dark:text-darkCustom-400 py-2 pl-4 border-l border-slate-200 dark:border-darkCustom-700">
                                    <span>Number of Questions: <span className="font-semibold text-slate-700 dark:text-darkCustom-200">{row.number_of_questions}</span></span>
                                    <span>Instances: <span className="font-semibold text-slate-700 dark:text-darkCustom-200">{row.instance_count}</span></span>
                                    <span>Created: <span className="font-semibold text-slate-700 dark:text-darkCustom-200">{formatDate(row.created_at)}</span></span>
                                </div>

                                {/* Column 3: Action Buttons */}
                                <div className="w-1/4 flex justify-end">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-1 self-center">
                                    <Tooltip label="Create Instance">
                                        <button onClick={() => handleInstance(row.test_id, row.number_of_questions)} className="px-2 py-1 text-slate-500 dark:text-darkCustom-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:text-blue-400 dark:hover:bg-darkCustom-700 rounded-full transition-colors">
                                            <PlusSquare size={20}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Preview Test">
                                        <button onClick={() => onPreviewTest && onPreviewTest(row.test_id)} className="px-2 py-1 text-slate-500 dark:text-darkCustom-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:text-amber-400 dark:hover:bg-darkCustom-700 rounded-full transition-colors">
                                            <Eye size={20}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Edit Test">
                                        <button onClick={() => handleEdit(row.test_id)} className="px-2 py-1 text-slate-500 dark:text-darkCustom-400 hover:text-green-600 hover:bg-green-100 dark:hover:text-green-400 dark:hover:bg-darkCustom-700 rounded-full transition-colors">
                                            <Edit size={20}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Export as JSON">
                                        <button onClick={() => onExportTest && onExportTest(row.test_id, row.name)} className="px-2 py-1 text-slate-500 dark:text-darkCustom-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:text-indigo-400 dark:hover:bg-darkCustom-700 rounded-full transition-colors">
                                            <Download size={20}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Delete Test">
                                        <button onClick={() => handleDelete(row.test_id)} className="px-2 py-1 text-slate-500 dark:text-darkCustom-400 hover:text-red-600 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-darkCustom-700 rounded-full transition-colors">
                                            <Trash2 size={20}/>
                                        </button>
                                    </Tooltip>
                                </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white dark:bg-darkCustom-900 dark:border dark:border-darkCustom-700 rounded-lg shadow-sm">
                        <Inbox size={48} className="mx-auto text-slate-400 dark:text-darkCustom-500"/>
                        <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-darkCustom-100">No tests found</h3>
                        <p className="mt-1 text-slate-500 dark:text-darkCustom-300">Get started by creating a new test.</p>
                    </div>
                )}
            </div>
        </div>
    );
}