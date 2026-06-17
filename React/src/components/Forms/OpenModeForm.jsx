import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAppContext} from "../../AppContext.jsx";
import {toast} from "react-toastify";
import {ArrowRight, User, IdCard, Loader2} from "lucide-react";

const OpenModeForm = ({config}) => {
    const [formData, setFormData] = useState({name: '', surname: '', index: ''});
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const {login} = useAppContext();

    const validateInput = (e) => {
        const cleanedValue = e.target.value.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż\s]+/g, '');
        setFormData({...formData, [e.target.name]: cleanedValue});
    };

    const validateNumber = (e) => {
        const numericValue = e.target.value.replace(/[^0-9]/g, '');
        setFormData({...formData, [e.target.name]: numericValue});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('/api/new_user', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Wystąpił błąd.");
            }

            login(data.user);
            navigate('/exams');

        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full pl-10 pr-3 py-3 rounded-md border border-slate-300 dark:border-darkCustom-600 bg-white dark:bg-darkCustom-800 text-slate-800 dark:text-darkCustom-100 placeholder-slate-400 dark:placeholder-darkCustom-400 focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-300 focus:border-slate-500 dark:focus:border-slate-300 focus:outline-none transition-colors [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_white_inset] dark:[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#2b2d30_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#F5F5F5]";

    return (
        <>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-darkCustom-50 mb-4">Welcome!</h1>
            <p className="text-slate-500 dark:text-darkCustom-50 mb-10">Please enter your details to proceed.</p>
            <form
                id="start-form"
                className="w-full"
                onSubmit={handleSubmit}
                onBlur={() => {window.scrollTo(0, 0);}}
            >
                <div className="flex flex-col md:flex-row justify-center items-center gap-3 mb-8">

                    {/* Name */}
                    <div className="relative w-full md:w-auto md:flex-1">
                        <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-50"
                            size={18}/>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Name"
                            value={formData.name}
                            onChange={validateInput}
                            required
                            className={inputClasses}
                        />
                    </div>

                    {/* Surname */}
                    <div className="relative w-full md:w-auto md:flex-1">
                        <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-50"
                            size={18}/>
                        <input
                            id="surname"
                            name="surname"
                            type="text"
                            placeholder="Surname"
                            value={formData.surname}
                            onChange={validateInput}
                            required
                            className={inputClasses}
                        />
                    </div>

                    {/* Index */}
                    {config?.use_index && (
                        <div className="relative w-full md:w-auto md:flex-1">
                            <IdCard
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-50"
                                size={18}/>
                            <input
                                id="index"
                                name="index"
                                type="text"
                                placeholder="Index"
                                value={formData.index}
                                onChange={validateNumber}
                                minLength="4"
                                maxLength="4"
                                required
                                className={inputClasses}
                            />
                        </div>
                    )}
                </div>

                {/* Submit button */}
                <div className="flex justify-center">
                    <button
                        disabled={isLoading}
                        className="group flex items-center justify-center gap-2 px-8 py-3 bg-slate-800 dark:bg-darkCustom-800 text-white dark:text-darkCustom-50 font-bold rounded-lg hover:bg-slate-900 dark:hover:bg-darkCustom-900 transition-all duration-300 disabled:opacity-50"
                        type="submit"
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin"/>
                        ) : (
                            <ArrowRight className="transition-transform group-hover:translate-x-1" size={20}/>
                        )}
                        <span>{isLoading ? "Processing..." : "Proceed to Exams"}</span>
                    </button>
                </div>
            </form>
        </>
    );
};

export default OpenModeForm