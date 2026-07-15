import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ListChecks, User, LogOut, ChevronsLeft, ChevronsRight, Palette } from 'lucide-react';
import { useAppContext } from '../../AppContext.jsx';
import DarkModeSwitcher from '../Reusable/DarkModeSwitcher.jsx';

const SidebarLink = ({ icon, text, to, onClick, isSidebarOpen }) => {
    const baseClass = `flex items-center w-full h-12 text-base font-medium rounded-lg transition-colors duration-200 ${
        isSidebarOpen ? 'px-4' : 'justify-center'
    }`;
    const activeClass = 'bg-slate-700 dark:bg-darkCustom-700 text-white';
    const inactiveClass =
        'text-slate-400 hover:bg-slate-700/50 hover:text-white dark:text-darkCustom-50 hover:dark:text-white';

    if (to) {
        return (
            <NavLink
                to={to}
                className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
            >
                {icon}
                {isSidebarOpen && <span className="ml-4 whitespace-nowrap">{text}</span>}
            </NavLink>
        );
    }

    return (
        <button onClick={onClick} className={`${baseClass} ${inactiveClass}`}>
            {icon}
            {isSidebarOpen && <span className="ml-4 whitespace-nowrap">{text}</span>}
        </button>
    );
};

export default function StudentLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { user, logout, config, avatarFailed, setAvatarFailed } = useAppContext();

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-darkCustom-800 font-sans">
            {/* Sidebar */}
            <aside
                className={`flex h-screen flex-col bg-[#1c2434] dark:bg-darkCustom-900 text-white transition-all duration-300 ease-in-out flex-shrink-0 ${
                    isSidebarOpen ? 'w-64' : 'w-20'
                }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-4 px-4 h-20 border-b border-slate-700 dark:border-darkCustom-600">
                    <img src="/media/logo.png" alt="Logo" className="h-10 w-auto flex-shrink-0" />
                    {isSidebarOpen && (
                        <h1 className="text-xl font-bold whitespace-nowrap">Student Panel</h1>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-grow p-4 space-y-2">
                    {isSidebarOpen && (
                        <h2 className="px-4 pt-2 pb-2 text-xs font-bold text-slate-500 dark:text-darkCustom-400 uppercase tracking-wider">
                            Navigation
                        </h2>
                    )}
                    <SidebarLink
                        icon={<ListChecks size={20} />}
                        text="Exams"
                        to="/exams"
                        isSidebarOpen={isSidebarOpen}
                    />
                    {!config?.open_mode && (
                        <SidebarLink
                            icon={<User size={20} />}
                            text="My Profile"
                            to="/profile"
                            isSidebarOpen={isSidebarOpen}
                        />
                    )}
                </nav>

                {/* Bottom */}
                <div className="p-4 border-t border-slate-700 dark:border-darkCustom-600 space-y-2">
                    {/* User */}
                    {user && (
                        <div
                            className={`flex items-center gap-3 px-2 py-2 ${
                                !isSidebarOpen && 'justify-center'
                            }`}
                        >
                            {user.photo_url && !avatarFailed ? (
                                <img
                                    src={user.photo_url}
                                    alt="Avatar"
                                    onError={() => setAvatarFailed(true)}
                                    className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-600 flex-shrink-0"
                                />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <span className="font-bold text-sm text-white">
                                        {user.surname?.[0]?.toUpperCase()}
                                        {user.name?.[0]?.toUpperCase()}
                                    </span>
                                </div>
                            )}
                            {isSidebarOpen && (
                                <span className="text-sm font-medium text-slate-200 truncate">
                                    {user.surname} {user.name}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Theme */}
                    <div
                        className={`flex items-center h-12 rounded-lg text-slate-400 ${
                            isSidebarOpen ? 'px-4' : 'justify-center'
                        }`}
                    >
                        <Palette size={20} className={isSidebarOpen ? 'mr-4' : ''} />
                        {isSidebarOpen && (
                            <span className="text-base font-medium mr-auto">Theme</span>
                        )}
                        <DarkModeSwitcher />
                    </div>

                    {/* Logout */}
                    <SidebarLink
                        icon={<LogOut size={20} />}
                        text="Logout"
                        onClick={logout}
                        isSidebarOpen={isSidebarOpen}
                    />
                </div>
            </aside>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex items-center bg-white dark:bg-darkCustom-900 h-16 px-4 border-b border-slate-200 dark:border-darkCustom-600 flex-shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen((v) => !v)}
                        className="p-2 rounded-full text-slate-500 dark:text-darkCustom-50 hover:bg-slate-100 dark:hover:bg-darkCustom-700 transition-colors"
                    >
                        {isSidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
                    </button>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
