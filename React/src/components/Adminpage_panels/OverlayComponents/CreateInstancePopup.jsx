import React from 'react';
import {useState, useEffect, useRef} from "react";
import {toast} from 'react-toastify';
import {X, Check, Loader2, Search, Users, Shuffle} from 'lucide-react';

function CreateInstancePopup({test_id, max_score, setOverlay, onRefresh}) {
    const [isActive, setIsActive] = useState(true);
    const [instanceName, setInstanceName] = useState("");
    const [testTime, setTestTime] = useState(10);
    const [numQuestions, setNumQuestions] = useState(max_score);
    const [gradingSearch, setGradingSearch] = useState("");
    const [selectedGrading, setSelectedGrading] = useState(null);
    const [gradingSchemes, setGradingSchemes] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [useFixedPool, setUseFixedPool] = useState(true);

    const wrapperRef = useRef(null);

    useEffect(() => {
        const fetchGradingSchemes = async () => {
            try {
                const response = await fetch('/api/admin/getGradingForInstanceCreate');
                if (!response.ok) throw new Error("Error fetching grading schemes.");
                const data = await response.json();
                setGradingSchemes(data);
            } catch (error) {
                toast.error(error.message || "Could not load grading schemes.");
            }
        };
        void fetchGradingSchemes();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreateInstance = async () => {
        if (!instanceName.trim()) {
            toast.error("Instance name is required.");
            return;
        }
        if (!selectedGrading) {
            toast.error("Please select a grading scheme.");
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/create_instance', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    test_id: test_id,
                    is_active: isActive,
                    test_time: testTime,
                    instance_name: instanceName,
                    num_questions: numQuestions,
                    scheme_id: selectedGrading.scheme_id,
                    use_fixed_question_pool: useFixedPool
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create instance.");
            }
            toast.success("Instance created successfully!");
            if (onRefresh) onRefresh();
            setOverlay(null);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredSchemes = gradingSearch.trim() === ""
        ? gradingSchemes
        : gradingSchemes.filter(g => g.name.toLowerCase().includes(gradingSearch.toLowerCase()));

    return (
        <div className="bg-white dark:bg-darkCustom-900 rounded-lg shadow-xl w-full max-w-2xl">
            {/* Nagłówek */}
            <header
                className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-darkCustom-700">
                <h2 className="text-xl font-bold text-slate-800 dark:text-darkCustom-100">Create Instance</h2>
                <button onClick={() => setOverlay(null)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkCustom-700">
                    <X size={20} className="text-slate-500 dark:text-darkCustom-400"/>
                </button>
            </header>

            {/* Formularz */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lewa kolumna */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="instance-name"
                               className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Instance
                            name:</label>
                        <input
                            id="instance-name"
                            type="text"
                            placeholder="e.g., Final Exam - Group A"
                            className="w-full p-2 border border-slate-500 rounded-md focus:ring-2 focus:ring-slate-500 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-800 dark:focus:border-slate-800"
                            onChange={(e) => setInstanceName(e.target.value)}
                        />
                    </div>
                    <div className="relative" ref={wrapperRef}>
                        <label htmlFor="grading-scheme"
                               className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Grading
                            scheme:</label>
                        <div className="relative">
                            <Search size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-darkCustom-400"/>
                            <input
                                id="grading-scheme"
                                type="text"
                                value={selectedGrading ? selectedGrading.name : gradingSearch}
                                placeholder="Search grading scheme..."
                                className="w-full p-2 pl-10 border border-slate-500 rounded-md focus:ring-2 focus:ring-slate-500 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-800 dark:focus:border-slate-800"
                                onFocus={() => setShowSuggestions(true)}
                                onChange={(e) => {
                                    setGradingSearch(e.target.value);
                                    setSelectedGrading(null);
                                    setShowSuggestions(true);
                                }}
                            />
                        </div>
                        {showSuggestions && (
                            <ul className="absolute top-full mt-1 w-full bg-white dark:bg-darkCustom-800 border border-slate-200 dark:border-darkCustom-600 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                                {filteredSchemes.length > 0 ? filteredSchemes.map(g => (
                                    <li key={g.scheme_id}
                                        className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-darkCustom-700 dark:text-darkCustom-100 cursor-pointer"
                                        onClick={() => {
                                            setSelectedGrading(g);
                                            setShowSuggestions(false);
                                        }}>
                                        {g.name}
                                    </li>
                                )) : <li className="px-4 py-2 text-slate-500 dark:text-darkCustom-400">No schemes
                                    found.</li>
                                }
                            </ul>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-2">Question Pool Mode:</label>
                        <button
                            type="button"
                            onClick={() => setUseFixedPool(!useFixedPool)}
                            className={`w-full flex items-center justify-center gap-3 p-2 rounded-md border-2 transition-colors ${
                                useFixedPool
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                    : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-darkCustom-600 dark:bg-darkCustom-700 dark:text-darkCustom-300'
                            }`}
                        >
                            {useFixedPool ? <Users size={18}/> : <Shuffle size={18}/>}
                            <span className="font-semibold">
                                {useFixedPool ? 'Fixed Pool for All Users' : 'Random for Each User'}
                            </span>
                        </button>
                        <p className="text-xs text-slate-500 dark:text-darkCustom-400 mt-1 px-1">
                            {useFixedPool
                                ? "A question pool will be drawn now, and all users will get questions from it."
                                : "Each user will get a unique set of questions drawn from the main test."}
                        </p>
                    </div>
                </div>

                {/* Prawa kolumna */}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="test-time" className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Test time
                            (minutes):</label>
                        <input
                            id="test-time"
                            type="number"
                            value={testTime}
                            min={1}
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:focus:ring-slate-800 dark:focus:border-slate-800"
                            onChange={(e) => setTestTime(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        />
                    </div>
                    <div>
                        <label htmlFor="num-questions" className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Number
                            of questions:</label>
                        <div className="flex items-center gap-2">
                            <input
                                id="num-questions"
                                type="number"
                                value={numQuestions}
                                min={1}
                                max={max_score}
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:focus:ring-slate-800 dark:focus:border-slate-800"
                                onChange={(e) => setNumQuestions(Math.max(1, Math.min(max_score, parseInt(e.target.value, 10) || 1)))}
                            />
                            <span className="text-slate-500 dark:text-darkCustom-400 whitespace-nowrap">/ {max_score}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-2">Should be active:</label>
                        <button
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border-2 transition-colors ${isActive ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-darkCustom-600 dark:bg-darkCustom-700 dark:text-darkCustom-300'}`}
                        >
                            {isActive ? <Check size={18}/> : <X size={18}/>}
                            <span className="font-semibold">{isActive ? 'Yes' : 'No'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stopka */}
            <footer className="flex justify-end p-4 border-t border-slate-200 dark:border-darkCustom-700">
                <button
                    className="flex items-center justify-center gap-2 w-40 px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors disabled:bg-slate-400 dark:bg-darkCustom-700 dark:text-darkCustom-100 dark:hover:bg-darkCustom-600 dark:disabled:bg-darkCustom-800 dark:disabled:text-darkCustom-400"
                    onClick={handleCreateInstance}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : 'Create Instance'}
                </button>
            </footer>
        </div>
    );
}

export default CreateInstancePopup;