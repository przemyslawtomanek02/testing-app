import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeletePopup({ onConfirm, onCancel }) {
    return (
        <div className="bg-white dark:bg-darkCustom-900 rounded-[28px] border border-[#E4E6EB] dark:border-darkCustom-700 shadow-2xl w-full max-w-md overflow-hidden">
            <header className="flex justify-between items-center px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
                        <AlertTriangle size={20} className="text-red-500 dark:text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#0F1623] dark:text-darkCustom-100">Confirm Deletion</h2>
                </div>
                <button onClick={onCancel} className="p-2 rounded-full text-[#606770] dark:text-darkCustom-400 hover:bg-[#F0F2F5] dark:hover:bg-darkCustom-700 transition-colors">
                    <X size={18} />
                </button>
            </header>

            <div className="px-6 pb-6">
                <p className="text-[#65676B] dark:text-darkCustom-300 text-sm leading-relaxed">
                    Are you sure you want to delete this item? This action cannot be undone.
                </p>
            </div>

            <footer className="flex justify-end items-center gap-2 px-6 py-4 border-t border-[#E4E6EB] dark:border-darkCustom-700">
                <button
                    className="h-10 px-5 rounded-full border border-[#E4E6EB] dark:border-darkCustom-600 text-[#65676B] dark:text-darkCustom-300 text-sm font-semibold hover:bg-[#F0F2F5] dark:hover:bg-darkCustom-700 transition-colors"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    className="h-10 px-5 rounded-full bg-red-600 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(220,38,38,0.35)] hover:opacity-90 transition-opacity"
                    onClick={onConfirm}
                >
                    Delete
                </button>
            </footer>
        </div>
    );
}