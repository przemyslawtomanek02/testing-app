import React, {useState, useEffect} from "react";
import {toast} from "react-toastify";
import {AnimatePresence, motion} from "framer-motion";
import {
    X, Save, Mail, ShieldCheck, KeyRound, Loader2, Pen, Check, Eye, EyeOff,
} from "lucide-react";
import {useAppContext} from "../../AppContext.jsx";
import {AvatarUploadField} from "./AvatarUploadField.jsx";

const EditableSettingRow = ({label, value, onSave, icon: Icon, type = "text"}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleSave = () => {
        console.log("handleSave() called. Current value: ", currentValue, value);
        const next = currentValue.trim();
        if (next !== value) onSave(next);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setCurrentValue(value);
        setIsEditing(false);
    }

    const variants = {
        visible: {clipPath: "inset(0 0% 0 0)"},
        hiddenRight: {clipPath: "inset(0 100% 0 0)"},
        hiddenLeft: {clipPath: "inset(0 0 0 100%)"},
    };

    return (
        <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4 flex-grow">
                <Icon className="h-5 w-5 text-slate-400 dark:text-darkCustom-500 flex-shrink-0"/>
                <div className="flex-grow">
                    <p className="text-xs text-slate-500 dark:text-darkCustom-400">{label}</p>

                    <AnimatePresence mode="wait">
                        {!isEditing ? (
                            <motion.p
                                key="display"
                                variants={variants}
                                initial="visible"
                                animate="visible"
                                exit="hiddenRight"
                                transition={{duration: 0.3, ease: 'easeInOut'}}
                                className="font-medium text-slate-800 dark:text-darkCustom-100"
                            >
                                {currentValue || '-'}
                            </motion.p>
                        ) : (
                            <motion.div
                                key="input"
                                variants={variants}
                                initial="hiddenLeft"
                                animate="visible"
                                exit="hiddenLeft"
                                transition={{duration: 0.3, ease: 'easeInOut'}}
                            >
                                <input
                                    type={type}
                                    value={currentValue}
                                    onChange={(e) => setCurrentValue(e.target.value)}
                                    className="text-sm bg-transparent outline-none border-b-2 border-slate-500 dark:border-darkCustom-400 w-[80%] dark:text-darkCustom-100"
                                    autoFocus
                                    onBlur={handleCancel}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave();
                                        if (e.key === 'Escape') handleCancel();
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="w-16 text-right">
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 dark:hover:bg-darkCustom-700 dark:text-darkCustom-400">
                        <Pen size={16}/>
                    </button>
                ) : (
                    <button onMouseDown={(e) => {
                        e.preventDefault();
                        handleSave();
                    }}
                            className="p-2 text-green-500 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-500/10 rounded-full">
                        <Check size={20}/>
                    </button>
                )}
            </div>
        </div>
    );
};

const PasswordInputWithToggle = ({label, value, onChange, autoComplete, required, inputClasses}) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div>
            <label className="text-xs font-medium text-slate-600 dark:text-darkCustom-300">{label}</label>
            <div className="relative">
                <input
                    type={isVisible ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={onChange}
                    className={inputClasses}
                    required={required}
                />
                <button
                    type="button"
                    onClick={() => setIsVisible(prev => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-darkCustom-400 dark:hover:text-darkCustom-200"
                    aria-label={isVisible ? "Hide password" : "Show password"}
                >
                    {isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
            </div>
        </div>
    );
};

export const SettingsPanel = ({user, isOpen, onClose, onProfileUpdate}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({oldPassword: '', newPassword: '', confirmPassword: ''});
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const {config} = useAppContext();

    const handleAvatarChange = async (file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("avatar_file", file);
        setIsUploading(true);
        try {
            const response = await fetch('/api/user/profile/avatar', {
                method: 'PUT',
                body: formData,
            });
            const updatedProfile = await response.json();
            if (!response.ok) {
                throw new Error(updatedProfile.detail || "Upload failed");
            }
            toast.success("Avatar updated!");
            onProfileUpdate(updatedProfile);
        } catch (error) {
            toast.error(`Błąd: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFieldUpdate = async (field, value) => {
        console.log(`[1] Initialization of the record. Field: "${field}", New value: "${value}"`);
        const originalUser = {...user};

        try {
            console.log(`[2] Sending a PATCH request to /api/user/profile/update...`);
            const response = await fetch('/api/user/profile/update', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({[field]: value})
            });

            console.log(`[3] A response was received from the server. Status: ${response.status}`);
            const updatedUserFromServer = await response.json();

            if (!response.ok) {
                onProfileUpdate(user);
                throw new Error(updatedUserFromServer.detail || 'Writing error.');
            }

            console.log("[4] Success! Server response:", updatedUserFromServer);
            onProfileUpdate(updatedUserFromServer);
            toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`);

        } catch (error) {
            toast.error(error.message);
            onProfileUpdate(originalUser);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords are not identical.");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords are not identical.");
            return;
        }

        setIsSavingPassword(true);
        try {
            const response = await fetch('/api/user/change_password', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    old_password: passwordData.oldPassword,
                    new_password: passwordData.newPassword
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || "Unable to change password.");
            }

            toast.success("Your password has been successfully changed.!");
            setIsPasswordSectionOpen(false);
            setPasswordData({oldPassword: '', newPassword: '', confirmPassword: ''});
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSavingPassword(false);
        }
    };

    const inputClasses = "mt-1 w-full p-2 pr-10 border border-slate-400 rounded-md dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-300 outline-none";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} onClick={onClose}
                                className="fixed inset-0 bg-black/50 z-40"/>
                    <motion.div
                        initial={{x: '100%'}} animate={{x: 0}} exit={{x: '100%'}}
                        transition={{type: 'spring', stiffness: 300, damping: 30}}
                        className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-50 dark:bg-darkCustom-800 z-50 shadow-2xl flex flex-col"
                    >
                        {/* --- Nagłówek Panelu --- */}
                        <header
                            className="flex items-center justify-between p-4 border-b border-slate-200 bg-white dark:bg-darkCustom-900 dark:border-darkCustom-700 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-slate-700 dark:text-darkCustom-200"/>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-darkCustom-100">Account
                                    settings</h2>
                            </div>
                            <button onClick={onClose}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkCustom-700 dark:text-darkCustom-300">
                                <X size={20}/>
                            </button>
                        </header>

                        <div className="p-6 flex-grow overflow-y-auto space-y-8">
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-darkCustom-400 mb-2">Profil</h3>
                                <div className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-sm">
                                    <div className="p-6 flex items-center gap-5">
                                        <AvatarUploadField
                                            onFileSelect={handleAvatarChange}
                                            initialImageUrl={user?.photo_url}
                                            isLoading={isUploading}
                                            size="medium"
                                            fallback={<span
                                                className="font-bold text-3xl text-slate-600 dark:text-darkCustom-200">{(user?.surname?.[0]).toUpperCase()}{(user?.name?.[0]).toUpperCase()}</span>}
                                        />
                                        <div className="ml-4">
                                            <p className="text-xl font-bold text-slate-800 dark:text-darkCustom-100">{user?.name} {user?.surname}</p>
                                            {config && config.use_index && (
                                                <p className="text-sm text-slate-500 dark:text-darkCustom-400">Index: {user?.user_index}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="rounded-lg bg-white dark:bg-darkCustom-900 px-6 mt-4 shadow-sm divide-y divide-slate-100 dark:divide-darkCustom-700">
                                    <EditableSettingRow label="Email" value={user?.email}
                                                        onSave={(val) => handleFieldUpdate('email', val)} icon={Mail}/>
                                </div>
                            </section>

                            {/* --- Sekcja Bezpieczeństwa --- */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-darkCustom-400 mb-2">Safety</h3>
                                <div className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-sm overflow-hidden">
                                    <div
                                        className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-darkCustom-700">
                                        <div className="flex items-center gap-4">
                                            <KeyRound className="h-5 w-5 text-slate-400 dark:text-darkCustom-500"/>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-darkCustom-100">Password</p>
                                                <p className="text-xs text-slate-500 dark:text-darkCustom-400">Change
                                                    your access password</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsPasswordSectionOpen(prev => !prev)}
                                                className="px-3 py-1.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 rounded-md">
                                            {isPasswordSectionOpen ? 'Cancel' : 'Change'}
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {isPasswordSectionOpen && (
                                            <motion.div
                                                initial={{height: 0, opacity: 0}}
                                                animate={{height: 'auto', opacity: 1}}
                                                exit={{height: 0, opacity: 0}}
                                                transition={{duration: 0.3, ease: 'easeInOut'}}
                                                className="overflow-hidden"
                                            >
                                                <form onSubmit={handlePasswordSave}
                                                      className="p-6 border-t border-slate-100 dark:border-darkCustom-700 bg-white dark:bg-darkCustom-900 space-y-4">
                                                    <input type="text" name="username" value={user?.email || ""}
                                                           autoComplete="username" style={{display: "none"}} readOnly/>

                                                    {/* ZASTOSOWANIE NOWEGO KOMPONENTU */}
                                                    <PasswordInputWithToggle
                                                        label="Old Password"
                                                        value={passwordData.oldPassword}
                                                        onChange={(e) => setPasswordData(p => ({...p, oldPassword: e.target.value}))}
                                                        autoComplete="current-password"
                                                        required
                                                        inputClasses={inputClasses}
                                                    />
                                                    <PasswordInputWithToggle
                                                        label="New Password"
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))}
                                                        autoComplete="new-password"
                                                        required
                                                        inputClasses={inputClasses}
                                                    />
                                                    <PasswordInputWithToggle
                                                        label="Confirm New Password"
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => setPasswordData(p => ({...p, confirmPassword: e.target.value}))}
                                                        autoComplete="new-password"
                                                        required
                                                        inputClasses={inputClasses}
                                                    />

                                                    <button type="submit" disabled={isSavingPassword}
                                                            className="w-full flex items-center justify-center gap-6 mt-8 bg-slate-800 text-white font-bold py-2.5 rounded-lg hover:bg-slate-900 transition-colors disabled:bg-slate-400 dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:hover:bg-darkCustom-200 dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400">
                                                        {isSavingPassword ? <Loader2 className="animate-spin"/> : <>
                                                            <Save size={16}/> Save New Password</>}
                                                    </button>
                                                </form>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};