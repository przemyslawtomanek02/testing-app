import React, {useEffect, useState} from 'react';
import {Loader, X} from 'lucide-react';
import {useAppContext} from '../AppContext.jsx';
import OpenModeForm from './Forms/OpenModeForm.jsx';
import ClosedModeForm from './Forms/ClosedModeForm.jsx';
import SetNewPasswordForm from "./Forms/SetNewPasswordForm.jsx";
import {useNavigate} from "react-router-dom";
import {AnimatePresence, motion} from "framer-motion";

function Welcomepage() {
    const {config, login, darkMode} = useAppContext();
    const navigate = useNavigate();
    const [isPopupVisible, setIsPopupVisible] = useState(true);
    const [isPasswordChangeRequired, setIsPasswordChangeRequired] = useState(false);

    const handlePasswordChangeRequired = () => {
        setIsPasswordChangeRequired(true);
    };

    const handlePasswordChangeSuccess = (userData) => {
        setIsPasswordChangeRequired(false);
        login(userData.user);
        navigate('/exams');
    };

    const handleCancelPasswordChange = () => {
        setIsPasswordChangeRequired(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsPopupVisible(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const renderForm = () => {
        if (!config) {
            return (
                <div className="flex flex-col items-center justify-center h-48">
                    <Loader className="h-12 w-12 animate-spin text-slate-500 dark:text-darkCustom-300"/>
                    <p className="mt-4 text-slate-500 dark:text-darkCustom-300">Loading config...</p>
                </div>
            );
        }
        return config.open_mode ? <OpenModeForm config={config}/> :
            <ClosedModeForm onPasswordChangeRequired={handlePasswordChangeRequired}/>;
    };

    useEffect(() => {
        const videoElement = document.getElementById('welcome-video');
        if (videoElement) {
            videoElement.style.filter = darkMode ? 'brightness(0.7)' : 'brightness(1)';
        }
    }, [darkMode]);

    return (
        <div className="flex flex-col w-screen h-screen bg-cover bg-center overflow-hidden pt-20 px-4 justify-start md:items-center md:justify-center md:pt-0 md:px-0">

            {/* Popup Cookies */}
            <AnimatePresence>
                {isPopupVisible && (
                    <motion.section
                        initial={{opacity: 0, y: 100}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: 100}}
                        transition={{duration: 0.5, ease: "easeInOut"}}
                        className="fixed max-w-md p-4 mx-auto bg-white dark:bg-darkCustom-800 border border-gray-200 dark:border-darkCustom-700 md:left-12 md:bottom-16 bottom-4 left-4 right-4 rounded-2xl z-20 shadow-lg"
                    >
                        <div>
                            <h2 className="font-semibold text-gray-800 dark:text-darkCustom-100">🍪 Cookies
                                Information</h2>
                            <div className="absolute top-2 right-2">
                                <button
                                    type="button"
                                    aria-label="close-popup"
                                    className="p-1 rounded-full text-gray-500 dark:text-darkCustom-400 hover:text-gray-800 dark:hover:text-darkCustom-200 hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors"
                                    onClick={() => setIsPopupVisible(false)}>
                                    <X size={18}/>
                                </button>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-800 dark:text-darkCustom-200">We use cookies to make this
                            website even work.</p>
                    </motion.section>
                )}
            </AnimatePresence>

            <div className="fixed top-0 left-0 w-screen h-screen z-[-1] overflow-hidden">
                <video
                    className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2"
                    autoPlay muted loop>
                    <source src="/media/snowy.mp4" type="video/mp4"/>
                </video>
            </div>

            <div
                className="w-full max-w-2xl bg-white/80 dark:bg-darkCustom-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 text-center transition-all duration-500">
                {renderForm()}
            </div>

            <AnimatePresence>
                {isPasswordChangeRequired && (
                    <motion.div
                        key="backdrop"
                        initial={{opacity: 0}}
                        animate={{opacity: 1, backdropFilter: 'blur(4px)'}}
                        exit={{opacity: 0}}
                        transition={{duration: 0.4, ease: "easeInOut"}}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                        onClick={handleCancelPasswordChange}
                    >
                        <motion.div
                            key="popup"
                            initial={{opacity: 0, scale: 0.95}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.90}}
                            transition={{duration: 0.3, ease: "easeInOut"}}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <SetNewPasswordForm
                                onSuccess={handlePasswordChangeSuccess}
                                onCancel={handleCancelPasswordChange}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Welcomepage;