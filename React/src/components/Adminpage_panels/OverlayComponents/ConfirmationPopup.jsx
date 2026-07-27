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
        red: 'bg-red-600',
        blue: 'bg-blue-600',
        amber: 'bg-amber-600',
    };
    const iconBgSchemes = {
        red: 'bg-red-50 dark:bg-red-500/10',
        blue: 'bg-[#EEF4FF] dark:bg-[#0866FF]/15',
        amber: 'bg-amber-50 dark:bg-amber-500/10',
    };

    const confirmButtonClasses = `h-10 px-5 rounded-full text-white text-sm font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.2)] hover:opacity-90 transition-opacity ${colorSchemes[confirmColor] || colorSchemes.blue}`;

    return (
        <div className="bg-white dark:bg-darkCustom-900 rounded-[28px] border border-[#E4E6EB] dark:border-darkCustom-700 shadow-2xl w-full max-w-md overflow-hidden">
            <header className="flex justify-between items-center px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconBgSchemes[confirmColor] || iconBgSchemes.blue}`}>
                        {icon}
                    </div>
                    <h2 className="text-lg font-bold text-[#0F1623] dark:text-darkCustom-100">{title}</h2>
                </div>
                <button onClick={onCancel} className="p-2 rounded-full text-[#606770] dark:text-darkCustom-400 hover:bg-[#F0F2F5] dark:hover:bg-darkCustom-700 transition-colors">
                    <X size={18} />
                </button>
            </header>

            <div className="px-6 pb-6">
                <p className="text-[#65676B] dark:text-darkCustom-300 text-sm leading-relaxed">
                    {message}
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
                    className={confirmButtonClasses}
                    onClick={onConfirm}
                >
                    {confirmText}
                </button>
            </footer>
        </div>
    );
}