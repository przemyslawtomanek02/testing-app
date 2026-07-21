import React, {useEffect, useState} from 'react';
import formatDate from "../Reusable/FormatDate.jsx"
import DeletePopup from "./OverlayComponents/DeletePopup.jsx";
import {toast} from 'react-toastify';
import {Trash2, CheckSquare, Square, Inbox, Loader, RefreshCw, ToggleLeft, ToggleRight} from 'lucide-react';


export default function InstancesPanel({data, setOverlay, onRefresh}) {
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
            <div className="flex items-center justify-center h-full p-8 bg-[#F0F2F5]">
                <Loader className="h-10 w-10 animate-spin text-[#BEC3C9]"/>
            </div>
        );
    }

    const allSelected = data.length > 0 && selectedRowsInstances.length === data.length && selectedRowsInstances.every(Boolean);
    const selectedCount = selectedRowsInstances.filter(Boolean).length;

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
                    <div className="space-y-3">
                        {data.map((row, index) => (
                            <div
                                key={row.instance_id}
                                style={{animationDelay: `${index * 50}ms`}}
                                className={`card-enter bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-row items-center px-5 py-4 gap-5 border-l-4 ${row.is_active ? 'border-l-green-500' : 'border-l-red-400'} ${selectedRowsInstances[index] ? 'border-[#0866FF] ring-1 ring-[#0866FF]/20' : 'border-[#E4E6EB]'}`}
                            >
                                <button onClick={() => handleCheckboxChange(index)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#F0F2F5] flex-shrink-0 transition-colors">
                                    {selectedRowsInstances[index]
                                        ? <CheckSquare size={20} className="text-[#0866FF]"/>
                                        : <Square size={20} className="text-[#BEC3C9]"/>}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <h2 className="text-[15px] font-semibold text-[#1C1E21] truncate">{row.instance_name}</h2>
                                    <p className="text-sm text-[#65676B] mt-0.5">Test: {row.test_name}</p>
                                </div>

                                <div className="flex items-center gap-6 text-sm text-[#65676B] pr-5 border-r border-[#E4E6EB]">
                                    <div>
                                        <p className="text-xs text-[#BEC3C9] mb-0.5">Start</p>
                                        <p className="font-medium text-[#1C1E21] text-[13px]">{formatDate(row.start_time)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#BEC3C9] mb-0.5">End</p>
                                        <p className="font-medium text-[#1C1E21] text-[13px]">{formatDate(row.end_time)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#BEC3C9] mb-0.5">Time</p>
                                        <p className="font-medium text-[#1C1E21] text-[13px]">{row.test_time} min</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#BEC3C9] mb-0.5">Questions</p>
                                        <p className="font-medium text-[#1C1E21] text-[13px]">{row.num_questions}</p>
                                    </div>
                                </div>

                                <button onClick={() => handleStatusToggle(row)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${row.is_active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                    {row.is_active ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                                    {row.is_active ? 'Active' : 'Inactive'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 px-6 bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
                        <Inbox size={44} className="mx-auto text-[#BEC3C9]"/>
                        <h3 className="mt-4 text-base font-semibold text-[#1C1E21]">No instances found</h3>
                        <p className="mt-1 text-sm text-[#65676B]">You can create new instances from the 'Tests' panel.</p>
                    </div>
                )}
            </div>
        </div>
    );
}