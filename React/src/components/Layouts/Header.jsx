import React, {Fragment, useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Menu, Transition} from '@headlessui/react';
import {Settings, User, LogOut, ListChecks, ArrowLeft, Palette} from 'lucide-react';
import {useAppContext} from '../../AppContext';
import DarkModeSwitcher from "../Reusable/DarkModeSwitcher.jsx";


const HeaderSkeleton = () => (
    <div className="flex items-center gap-3 p-1 sm:p-2 animate-pulse">
        <div className="h-6 w-24 bg-slate-200 dark:bg-darkCustom-700 rounded-md hidden sm:block"></div>
        <div className="h-9 w-9 bg-slate-200 dark:bg-darkCustom-700 rounded-full"></div>
    </div>
);

export function Header({variant = 'default', onSettingsClick, handleBack}) {
    const {user, logout, isLoading: isAppLoading, avatarFailed, setAvatarFailed, config} = useAppContext();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <header
            className={`sticky top-0 z-40 transition-all duration-300 ${
                isScrolled
                    ? 'bg-white/80 dark:bg-darkCustom-900/80 backdrop-blur-lg shadow-sm'
                    : 'bg-white/90 dark:bg-darkCustom-800/90 backdrop-blur-lg shadow-none'
            }`}>
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-center py-4">

                    <div className="flex items-center gap-4">
                        {['profile', 'result'].includes(variant) && (
                            <button
                                onClick={() => navigate('/exams')}
                                className="flex items-center gap-2 text-md font-semibold text-slate-600 hover:text-slate-900 dark:text-darkCustom-50 dark:hover:text-darkCustom-300 transition-colors"
                            >
                                <ArrowLeft size={20}/>
                                Back to exams
                            </button>
                        )}

                        {variant === 'embedhistory' && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-md font-semibold text-slate-600 hover:text-slate-900 dark:text-darkCustom-50 dark:hover:text-darkCustom-300 transition-colors"
                            >
                                <ArrowLeft size={20}/>
                                Back to history
                            </button>
                        )}

                    </div>

                    <div className="flex items-center">
                        {isAppLoading ? (
                            <HeaderSkeleton/>
                        ) : user ? (
                            <Menu as="div" className="relative">
                                <Menu.Button
                                    className="flex items-center gap-3 rounded-full hover:bg-slate-100 dark:hover:bg-darkCustom-700 px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 dark:focus:ring-darkCustom-500 dark:focus:ring-offset-darkCustom-900">
                                <span
                                    className="font-semibold text-slate-700 dark:text-darkCustom-50 hidden sm:block">{user.surname} {user.name}</span>
                                    {user.photo_url && !avatarFailed ? (
                                        <img src={user.photo_url}
                                             alt="Avatar"
                                             onError={() => setAvatarFailed(true)}
                                             className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-darkCustom-600 flex-shrink-0"/>
                                    ) : (
                                        <div
                                            className="h-9 w-9 rounded-full bg-slate-200 dark:bg-darkCustom-700 flex items-center justify-center ring-2 ring-slate-200 dark:ring-darkCustom-500">
                                        <span
                                            className="font-bold text-slate-600 dark:text-darkCustom-50 text-sm">{(user?.surname?.[0])?.toUpperCase()}{(user?.name?.[0])?.toUpperCase()}</span>
                                        </div>
                                    )}
                                </Menu.Button>
                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items
                                        className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-darkCustom-800 rounded-md shadow-lg ring-1 ring-slate-400 dark:ring-darkCustom-600 ring-opacity-5 focus:outline-none">
                                        <div className="py-1">
                                            {(variant === 'profile' || variant === 'result') && (
                                                <Menu.Item>
                                                    {({focus}) => (
                                                        <Link to="/exams"
                                                              className={`${focus ? 'bg-slate-100 dark:bg-darkCustom-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-darkCustom-50`}>
                                                            <ListChecks className="mr-3 h-5 w-5"/> Exam list
                                                        </Link>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {(variant !== 'profile' && config.open_mode !== true) && (
                                                <Menu.Item>
                                                    {({focus}) => (
                                                        <Link to="/profile"
                                                              className={`${focus ? 'bg-slate-100 dark:bg-darkCustom-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-darkCustom-50`}>
                                                            <User className="mr-3 h-5 w-5"/> My Profile
                                                        </Link>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {(variant === 'default' && user?.role === 'admin') && (
                                                <Menu.Item>
                                                    {({focus}) => (
                                                        <Link to="/admin_panel"
                                                              className={`${focus ? 'bg-slate-100 dark:bg-darkCustom-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-darkCustom-50`}>
                                                            <Settings className="mr-3 h-5 w-5"/> Admin Panel
                                                        </Link>
                                                    )}
                                                </Menu.Item>
                                            )}
                                            {(variant === 'profile' && onSettingsClick) && (
                                                <Menu.Item>
                                                    {({focus}) => (
                                                        <button
                                                            onClick={onSettingsClick}
                                                            className={`${focus ? 'bg-slate-100 dark:bg-darkCustom-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-darkCustom-50`}>
                                                            <Settings className="mr-3 h-5 w-5"/> Settings
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            )}

                                            <div
                                                className="flex justify-between items-center px-4 py-2 text-sm text-slate-700 dark:text-darkCustom-50">
                                                <span className="flex"><Palette className="mr-3 h-5 w-5"/> Theme</span>
                                                <DarkModeSwitcher/>
                                            </div>

                                            <Menu.Item>
                                                {({focus}) => (
                                                    <button onClick={handleLogout}
                                                            className={`${focus ? 'bg-slate-100 dark:bg-darkCustom-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-darkCustom-50`}>
                                                        <LogOut className="mr-3 h-5 w-5"/> Log out
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
}
