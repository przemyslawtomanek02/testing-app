import React, {useEffect, useRef, useState} from 'react';
import CreateInstancePopup from "./OverlayComponents/CreateInstancePopup.jsx";
import DeletePopup from "./OverlayComponents/DeletePopup.jsx";
import formatDate from "../Reusable/FormatDate.jsx"
import {toast} from 'react-toastify';
import {PlusSquare, Edit, Trash2, CheckSquare, Square, Inbox, RefreshCw, Loader, Eye, Download, Upload, FilePlus2} from 'lucide-react';

const Tooltip = ({label, children}) => (
    <div className="relative group/tip flex items-center justify-center">
        {children}
        <span className="pointer-events-none absolute right-full mr-2 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1C1E21] text-white whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-10 shadow-lg">
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
            <div className="flex items-center justify-center h-full p-8 bg-[#F0F2F5]">
                <Loader className="h-10 w-10 animate-spin text-[#BEC3C9]" />
            </div>
        );
    }

    const allSelected = data.length > 0 && selectedRows.length === data.length && selectedRows.every(Boolean);
    const selectedCount = selectedRows.filter(Boolean).length;

    return (
        <div className="p-6 bg-[#F0F2F5] min-h-screen">
            <div className="max-w-5xl mx-auto">

                {/* Toolbar */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E4E6EB] px-5 py-3 mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[#F0F2F5] transition-colors">
                            {allSelected
                                ? <CheckSquare size={20} className="text-[#0866FF]"/>
                                : <Square size={20} className="text-[#BEC3C9]"/>}
                        </button>
                        <span className="text-sm font-medium text-[#65676B]">
                            {selectedCount > 0 ? `${selectedCount} of ${data.length} selected` : `${data.length} tests`}
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
                            onClick={handleDeleteOfSelected}
                            disabled={selectedCount === 0}
                        >
                            <Trash2 size={15}/>
                            <span>Delete</span>
                        </button>
                        <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                        <button
                            onClick={() => importInputRef.current?.click()}
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-[#E4E6EB] text-[#606770] hover:bg-[#F0F2F5] transition-colors"
                        >
                            <Upload size={15}/>
                            <span>Import</span>
                        </button>
                        <button
                            onClick={() => onCreateTest && onCreateTest()}
                            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white bg-[#0866FF] hover:bg-[#0757D9] transition-colors shadow-sm"
                        >
                            <FilePlus2 size={15}/>
                            <span>New Test</span>
                        </button>
                    </div>
                </div>

                {data.length > 0 ? (
                    <div className="space-y-3">
                        {data.map((row, index) => (
                            <div
                                key={row.test_id}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className={`card-enter bg-white rounded-2xl border transition-all duration-200 flex flex-row items-center px-5 py-4 gap-5 shadow-sm hover:shadow-md ${selectedRows[index] ? 'border-[#0866FF] ring-1 ring-[#0866FF]/20' : 'border-[#E4E6EB]'}`}
                            >
                                <button onClick={() => handleCheckboxChange(index)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#F0F2F5] flex-shrink-0 transition-colors">
                                    {selectedRows[index]
                                        ? <CheckSquare size={20} className="text-[#0866FF]"/>
                                        : <Square size={20} className="text-[#BEC3C9]"/>}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <h2 className="text-[15px] font-semibold text-[#1C1E21] truncate">{row.name}</h2>
                                    <p className="text-[#65676B] text-sm mt-0.5 line-clamp-1">{row.description}</p>
                                </div>

                                {/* Stats */}
                                <div className="flex-shrink-0 flex items-center gap-5 text-sm text-[#65676B] pr-5 border-r border-[#E4E6EB]">
                                    <div className="text-center">
                                        <p className="text-[18px] font-bold text-[#1C1E21] leading-none">{row.number_of_questions}</p>
                                        <p className="text-xs mt-0.5">Questions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[18px] font-bold text-[#1C1E21] leading-none">{row.instance_count}</p>
                                        <p className="text-xs mt-0.5">Instances</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[13px] font-semibold text-[#1C1E21] leading-none">{formatDate(row.created_at)}</p>
                                        <p className="text-xs mt-0.5">Created</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex-shrink-0 flex items-center gap-0.5">
                                    <Tooltip label="Create Instance">
                                        <button onClick={() => handleInstance(row.test_id, row.number_of_questions)} className="p-2 text-[#606770] hover:text-[#0866FF] hover:bg-[#E7F3FF] rounded-xl transition-colors">
                                            <PlusSquare size={18}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Preview Test">
                                        <button onClick={() => onPreviewTest && onPreviewTest(row.test_id)} className="p-2 text-[#606770] hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors">
                                            <Eye size={18}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Edit Test">
                                        <button onClick={() => handleEdit(row.test_id)} className="p-2 text-[#606770] hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                                            <Edit size={18}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Export as JSON">
                                        <button onClick={() => onExportTest && onExportTest(row.test_id, row.name)} className="p-2 text-[#606770] hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                                            <Download size={18}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip label="Delete Test">
                                        <button onClick={() => handleDelete(row.test_id)} className="p-2 text-[#606770] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 size={18}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
                        <Inbox size={44} className="mx-auto text-[#BEC3C9]"/>
                        <h3 className="mt-4 text-base font-semibold text-[#1C1E21]">No tests found</h3>
                        <p className="mt-1 text-sm text-[#65676B]">Get started by creating a new test.</p>
                    </div>
                )}
            </div>
        </div>
    );
}