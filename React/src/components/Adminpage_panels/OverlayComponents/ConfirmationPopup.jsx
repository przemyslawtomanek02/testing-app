import React from 'react';
import { X } from 'lucide-react';

export default function ConfirmationPopup({
    icon,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    confirmColor = 'blue'
}) {
    const colorSchemes = {
        red: 'bg-red-600 hover:bg-red-700',
        blue: 'bg-blue-600 hover:bg-blue-700',
        amber: 'bg-amber-700 hover:bg-amber-600',
    };

    const confirmButtonClasses = `px-4 py-2 text-white font-bold rounded-lg transition-colors ${colorSchemes[confirmColor] || colorSchemes.blue}`;

    return (
        <div className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-xl w-full max-w-md">
            <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-darkCustom-700">
                <div className="flex items-center gap-3">
                    {icon}
                    <h2 className="text-xl font-bold text-slate-800 dark:text-darkCustom-100">{title}</h2>
                </div>
                <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkCustom-700">
                    <X size={20} className="text-slate-500 dark:text-darkCustom-400" />
                </button>
            </header>

            <div className="p-6">
                <p className="text-slate-600 dark:text-darkCustom-300 text-center text-base">
                    {message}
                </p>
            </div>

            <footer className="flex justify-end items-center p-4 border-t border-slate-200 dark:border-darkCustom-700 space-x-3">
                <button
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors dark:bg-darkCustom-700 dark:text-darkCustom-200 dark:hover:bg-darkCustom-600"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    className={confirmButtonClasses}
                    onClick={onConfirm}
                >
                    {confirmText}
                </button>
            </footer>
        </div>
    );
}