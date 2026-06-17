import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'react-toastify';
import {User, Lock, Eye, EyeOff, LogIn} from 'lucide-react';
import {useAppContext} from "../AppContext.jsx";
import SuspensePage from "./Suspense.jsx";

const Login = () => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const { login: ContextLogin } = useAppContext();
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/check_admin_status', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.is_admin) {
                        toast.info("You are already logged in.");
                        navigate('/admin_panel', { replace: true });
                        return;
                    }
                }
                setIsCheckingSession(false);

            } catch (error) {
                setIsCheckingSession(false);
            }
        };
        void checkSession();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin_login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({login, password}),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed.');
            }
            if (data.admin) {
                console.log('Admin logged in:', data.admin);
                ContextLogin(data.admin);
            }
            if (data.redirect) {
                navigate("/admin_panel");
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingSession) {
        return <SuspensePage />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-darkCustom-1000">
            {/* Tło wideo */}
            <div className="fixed inset-0 w-full h-full z-0">
                <video
                    className="w-full h-full object-cover"
                    autoPlay muted loop playsInline
                >
                    <source src="media/snowy.mp4" type="video/mp4"/>
                    Your browser does not support the video tag.
                </video>
            </div>
            <div className="w-full max-w-sm bg-white dark:bg-darkCustom-1000/80 backdrop-blur-sm rounded-xl shadow-2xl p-8 z-1 transition-all duration-500">
                <form className="w-full" onSubmit={handleLogin}>
                    <span className="block text-center text-3xl font-bold text-slate-800 dark:text-darkCustom-50 pb-10">
                        Admin Panel
                    </span>

                    <div className="relative mb-6">
                        <User className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 dark:text-darkCustom-50" size={20} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-3 py-3 rounded-md border border-slate-300 dark:border-darkCustom-600 bg-white dark:bg-darkCustom-800 text-slate-800 dark:text-darkCustom-50 placeholder-slate-400 dark:placeholder-darkCustom-50 focus:ring-2 focus:ring-slate-500 dark:focus:ring-darkCustom-600 focus:border-slate-500 dark:focus:border-darkCustom-600 focus:outline-none dark:[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#2b2d30_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F5F5F5]"
                            placeholder="Username"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            required
                            autoComplete="name"
                        />
                    </div>

                    <div className="relative mb-8">
                        <Lock className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 dark:text-darkCustom-50" size={20} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full pl-10 pr-3 py-3 rounded-md border border-slate-300 dark:border-darkCustom-600 bg-white dark:bg-darkCustom-800 text-slate-800 dark:text-darkCustom-50 placeholder-slate-400 dark:placeholder-darkCustom-50 focus:ring-2 focus:ring-slate-500 dark:focus:ring-darkCustom-600 focus:border-slate-500 dark:focus:border-darkCustom-600 focus:outline-none dark:[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#2b2d30_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F5F5F5]"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 dark:text-darkCustom-50 hover:text-slate-600 dark:hover:text-white"
                        >
                            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    </div>

                    <button
                        disabled={isLoading}
                        className="group flex items-center justify-center gap-2 w-full h-12 px-8 py-3 bg-slate-800 dark:bg-darkCustom-800 text-white dark:text-darkCustom-50 font-bold rounded-lg hover:bg-slate-900 dark:hover:bg-darkCustom-900 transition-all duration-300"
                        type="submit"
                    >
                        <span>{isLoading ? "Signing in..." : "Sign In"}</span>
                        <LogIn className="transition-transform group-hover:translate-x-1" size={20}/>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;