import React, {useState} from "react";
import {toast} from "react-toastify";
import {Loader2, Eye, EyeOff} from "lucide-react";

const SetNewPasswordForm = ({onCancel, onSuccess}) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            toast.error('Fields cannot be empty!');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('The password must be at least 8 characters long..');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('The passwords are not identical.!');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/set_initial_password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({new_password: newPassword})
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Unable to set password.');
            }
            toast.success('The password has been changed. Welcome!');
            onSuccess(data);

        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full p-2 pr-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div className="w-full max-w-lg rounded-xl bg-white dark:bg-darkCustom-1000 p-6 sm:p-10 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-800 dark:text-darkCustom-100">Set new password</h2>
            <p className="text-center text-slate-600 dark:text-darkCustom-300 my-4">
                This is your first login. Set your own unique password now.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4" onBlur={() => {window.scrollTo(0, 0);}}>

                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className={inputClasses}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-darkCustom-400 dark:hover:text-darkCustom-200"
                    >
                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                </div>

                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={inputClasses}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-darkCustom-400 dark:hover:text-darkCustom-200"
                    >
                        {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                    <button type="button" onClick={onCancel}
                            className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 dark:bg-darkCustom-700 dark:text-darkCustom-200 dark:hover:bg-darkCustom-600">
                        Cancel
                    </button>
                    <button type="submit" disabled={isLoading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 min-w-[150px] px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 disabled:bg-slate-400 dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:hover:bg-darkCustom-200 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400">
                        {isLoading ? <Loader2 className="animate-spin"/> : 'Set Password & Continue'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SetNewPasswordForm;