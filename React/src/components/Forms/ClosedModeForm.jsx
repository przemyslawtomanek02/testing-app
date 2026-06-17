import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAppContext} from "../../AppContext.jsx";
import {toast} from "react-toastify";
import {LogIn, User, Lock, Eye, EyeOff, Loader2} from "lucide-react";

const ClosedModeForm = ({onPasswordChangeRequired}) => {
    const [loginData, setLoginData] = useState({login: '', password: ''});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const {login} = useAppContext();

    const handleChange = (e) => {
        setLoginData({...loginData, [e.target.name]: e.target.value});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('/api/new_user', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(loginData),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Nieprawidłowy login lub hasło.");
            }

            if (data.action === 'FORCE_PASSWORD_CHANGE') {
                onPasswordChangeRequired();
            } else {
                login(data.user);
                navigate('/exams');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full pl-10 pr-3 py-3 rounded-md border border-slate-300 dark:border-darkCustom-600 bg-white dark:bg-darkCustom-800 text-slate-800 dark:text-darkCustom-100 placeholder-slate-400 dark:placeholder-darkCustom-400 focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-300 focus:border-slate-500 dark:focus:border-slate-300 focus:outline-none transition-colors [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_white_inset] dark:[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#181a1b_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F5F5F5]";

    return (
        <>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-darkCustom-50 mb-4">Login</h1>
            <p className="text-slate-500 dark:text-darkCustom-50 mb-10">Please enter your credentials to continue.</p>
            <form id="login-form" className="w-full" onSubmit={handleSubmit} onBlur={() => {window.scrollTo(0, 0);}}>
                <div className="flex flex-col justify-center items-center gap-3 mb-8">
                    <div className="relative w-full md:w-2/3">
                        <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-50"
                            size={20}/>
                        <input
                            id="login"
                            name="login"
                            type="text"
                            value={loginData.login}
                            onChange={handleChange}
                            autoComplete="login"
                            required
                            placeholder="Login"
                            className={inputClasses}
                        />
                    </div>

                    <div className="relative w-full md:w-2/3">
                        <Lock
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-50"
                            size={20}/>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={loginData.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                            required
                            placeholder="Password"
                            className={`${inputClasses} pr-10`}
                        />
                        <button
                            type="button"
                            aria-label="toggle-password-visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-50 hover:text-slate-600 dark:hover:text-darkCustom-100"
                        >
                            {showPassword ? <Eye size={20}/> : <EyeOff size={20}/>}
                        </button>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        disabled={isLoading}
                        className="group flex items-center justify-center gap-2 px-8 py-3 bg-slate-800 dark:bg-darkCustom-900 text-white dark:text-darkCustom-100 font-bold rounded-lg hover:bg-slate-900 dark:hover:text-darkCustom-50 dark:hover:bg-darkCustom-1000 transition-all duration-300"
                        type="submit"
                    >
                        <span>{isLoading ? "Signing in..." : "Sign In"}</span>
                        {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="transition-transform group-hover:translate-x-1" size={20}/>}
                    </button>
                </div>
            </form>
        </>
    );
};

export default ClosedModeForm