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
            <div className="flex items-center justify-center h-full p-8 bg-slate-100 dark:bg-darkCustom-800">
                <Loader className="h-12 w-12 animate-spin text-slate-500 dark:text-darkCustom-400"/>
            </div>
        );
    }

    const allSelected = data.length > 0 && selectedRowsInstances.length === data.length && selectedRowsInstances.every(Boolean);
    const selectedCount = selectedRowsInstances.filter(Boolean).length;

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-slate-100 dark:bg-darkCustom-800 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">

                <div className="bg-white dark:bg-darkCustom-900 dark:border dark:border-darkCustom-700 rounded-lg shadow-sm p-3 mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll}
                                className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors">
                            {allSelected ? <CheckSquare size={22} className="text-slate-700 dark:text-darkCustom-200"/> :
                                <Square size={22} className="text-slate-400 dark:text-darkCustom-500"/>}
                        </button>
                        <span
                            className="font-semibold text-slate-700 dark:text-darkCustom-200">{selectedCount} z {data.length} zaznaczonych</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            title="Refresh list"
                            onClick={handleRefresh}
                            className="p-2 rounded-full text-slate-500 dark:text-darkCustom-400 hover:bg-slate-200 dark:hover:bg-darkCustom-700 transition-colors disabled:cursor-not-allowed"
                            disabled={isRefreshing}
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'is-refreshing' : ''}/>
                        </button>
                        <button
                            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 font-medium py-2 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-darkCustom-600"
                            onClick={handleDeleteClick}
                            disabled={selectedCount === 0}
                        >
                            <Trash2 size={18}/>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>

                {data.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {data.map((row, index) => (
                            <div
                                key={row.instance_id}
                                className={`card-enter bg-white dark:bg-darkCustom-900 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-row items-center p-4 gap-4 ${selectedRowsInstances[index] ? 'ring-2 ring-slate-600 bg-slate-50 dark:ring-darkCustom-300 dark:bg-darkCustom-800' : ''} ${row.is_active ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}
                                style={{animationDelay: `${index * 100}ms`}}
                            >
                                <button onClick={() => handleCheckboxChange(index)}
                                        className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-darkCustom-700">
                                    {selectedRowsInstances[index] ?
                                        <CheckSquare size={22} className="text-slate-700 dark:text-darkCustom-200"/> :
                                        <Square size={22} className="text-slate-300 dark:text-darkCustom-500"/>}
                                </button>

                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-5 min-w-0">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-darkCustom-100 truncate">{row.instance_name}</h2>
                                        <p className="text-sm text-slate-500 dark:text-darkCustom-400">Test: {row.test_name}</p>
                                    </div>

                                    <div
                                        className="col-span-5 flex flex-col items-start gap-1 text-xs text-slate-500 dark:text-darkCustom-400 pl-4 border-l border-slate-200 dark:border-darkCustom-700">
                                        <span>Start: <span
                                            className="font-semibold text-slate-700 dark:text-darkCustom-200">{formatDate(row.start_time)}</span></span>
                                        <span>End: <span
                                            className="font-semibold text-slate-700 dark:text-darkCustom-200">{formatDate(row.end_time)}</span></span>
                                        <span>Time: <span
                                            className="font-semibold text-slate-700 dark:text-darkCustom-200">{row.test_time} min</span> | Questions: <span
                                            className="font-semibold text-slate-700 dark:text-darkCustom-200">{row.num_questions}</span></span>
                                    </div>

                                    <div className="col-span-2 flex justify-end">
                                        <button onClick={() => handleStatusToggle(row)}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold transition-transform duration-200 ease-in-out hover:scale-105 ${row.is_active ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                            {row.is_active ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                                            {row.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white dark:bg-darkCustom-900 dark:border dark:border-darkCustom-700 rounded-lg shadow-sm">
                        <Inbox size={48} className="mx-auto text-slate-400 dark:text-darkCustom-500"/>
                        <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-darkCustom-100">No instances found</h3>
                        <p className="mt-1 text-slate-500 dark:text-darkCustom-300">You can create new instances from the 'Tests' panel.</p>
                    </div>
                )}
            </div>
        </div>
    );
}