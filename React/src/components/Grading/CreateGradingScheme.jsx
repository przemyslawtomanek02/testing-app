import React, {useEffect, useState, useCallback} from 'react';
import {Save, AlertCircle, Loader, ArrowLeft, RefreshCw} from 'lucide-react';
import {toast} from 'react-toastify';

const CreateGradingScheme = ({scheme_id, onBack}) => {
    const isEditing = !!scheme_id;

    // --- State Management ---
    const [schemeName, setSchemeName] = useState('');
    const [schemeDescription, setSchemeDescription] = useState('');
    const [minScale, setMinScale] = useState(2);
    const [maxScale, setMaxScale] = useState(5);
    const [gradingThresholds, setGradingThresholds] = useState([]);
    const [thresholdErrors, setThresholdErrors] = useState({});
    const [partialCredit, setPartialCredit] = useState(false);
    const [penalizeWrong, setPenalizeWrong] = useState(false);
    const [penaltyPerWrong, setPenaltyPerWrong] = useState(1);
    const [allowNegativePoints, setAllowNegativePoints] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditing);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const generateThresholds = useCallback((min, max) => {
        if (min === '' || max === '' || Number(min) > Number(max)) {
            return [];
        }

        const range = Number(max) - Number(min) + 1;
        if (range <= 0) return [];

        const thresholds = [];
        let currentMin = 0;

        for (let i = 0; i < range; i++) {
            const grade = min + i;
            const currentMax = (i === range - 1)
                ? 100
                : Math.round(100 / range * (i + 1)) - 1;

            thresholds.push({
                percentage_min: currentMin,
                percentage_max: currentMax,
                grade: grade,
            });
            currentMin = currentMax + 1;
        }
        return thresholds;
    }, []);

    useEffect(() => {
        if (isEditing) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/admin/get_grading_scheme/${scheme_id}`);
                    if (!res.ok) throw new Error("Failed to fetch data");
                    const data = await res.json();
                    const [min, max] = data.scale_type.split('-').map(Number);
                    setSchemeName(data.name);
                    setSchemeDescription(data.description);
                    setMinScale(min);
                    setMaxScale(max);
                    setGradingThresholds(data.grading_thresholds);
                    setPartialCredit(data.partial_credit);
                    setPenalizeWrong(data.penalize_wrong);
                    setPenaltyPerWrong(data.penalty_per_wrong);
                    setAllowNegativePoints(data.allow_negative_points);
                } catch (err) {
                    console.error('Failed to load grading scheme:', err);
                    toast.error("Failed to load the template.");
                    if (onBack) onBack();
                } finally {
                    setIsLoading(false);
                }
            };
            void fetchData();
        }
    }, [scheme_id, isEditing, onBack]);

    useEffect(() => {
        setGradingThresholds(generateThresholds(minScale, maxScale));
    }, [minScale, maxScale, isEditing, generateThresholds]);

    const validateThresholds = (thresholds) => {
        const errs = {};
        if (!thresholds || thresholds.length === 0) return true;

        for (let i = 0; i < thresholds.length; i++) {
            const current = thresholds[i];
            const prev = i > 0 ? thresholds[i - 1] : null;

            const min = parseFloat(current.percentage_min);
            const max = parseFloat(current.percentage_max);

            if (isNaN(min) || isNaN(max)) {
                errs[i] = 'Values must be numbers.';
            } else if (min >= max) {
                errs[i] = 'Min % must be less than Max %';
            } else if (prev && min !== parseFloat(prev.percentage_max) + 1) {
                errs[i] = `Min % should be ${parseFloat(prev.percentage_max) + 1}`;
            }
        }
        setThresholdErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleThresholdChange = (i, field, value) => {
        const updated = [...gradingThresholds];
        updated[i] = {...updated[i], [field]: value};
        setGradingThresholds(updated);
        validateThresholds(updated);
    };

    const handleRegenerateThresholds = () => {
        if (minScale > maxScale) {
            toast.warn("Minimum grade cannot be greater than maximum grade.");
            return;
        }

        setIsRegenerating(true);

        setTimeout(() => {
            setGradingThresholds(generateThresholds(minScale, maxScale));
            setThresholdErrors({});
            toast.info("Thresholds have been regenerated based on the current scale.");
            setIsRegenerating(false);
        }, 300);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateThresholds(gradingThresholds)) {
            toast.warn("Please correct the errors in the percentage thresholds.");
            return;
        }
        if (!schemeName.trim()) {
            toast.warn("Template name is required.");
            return;
        }

        setIsSubmitting(true);

        const gradingSchemeData = {
            name: schemeName,
            description: schemeDescription,
            scale_type: `${minScale}-${maxScale}`,
            grading_thresholds: gradingThresholds.map(t => ({
                grade: t.grade,
                percentage_min: parseFloat(t.percentage_min),
                percentage_max: parseFloat(t.percentage_max)
            })),
            partial_credit: partialCredit,
            penalize_wrong: penalizeWrong,
            penalty_per_wrong: penaltyPerWrong,
            allow_negative_points: allowNegativePoints
        };

        const url = isEditing ? `/api/admin/update_grading_scheme/${scheme_id}` : '/api/admin/create_grading_scheme';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(gradingSchemeData),
            });

            if (res.ok) {
                toast.success(isEditing ? 'Template updated!' : 'Template created!');
                if (onBack) onBack();
            } else {
                const errorData = await res.json().catch(() => ({message: 'Failed to save the template.'}));
                toast.error(errorData.message || 'An error occurred.');
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error('Connection error while saving.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8 bg-slate-50 dark:bg-darkCustom-800">
                <Loader className="h-12 w-12 animate-spin text-slate-500 dark:text-darkCustom-400"/>
            </div>
        );
    }

    const inputClasses = "p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";
    const toggleBaseClasses = "w-11 h-6 bg-slate-300 rounded-full peer dark:bg-darkCustom-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-400 dark:peer-focus:ring-offset-darkCustom-900 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600";

    return (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-darkCustom-800 font-sans">
            <div className="mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button type="button" onClick={onBack}
                                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-darkCustom-700 transition-colors">
                                <ArrowLeft size={22} className="text-slate-600 dark:text-darkCustom-100"/>
                            </button>
                        )}
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-darkCustom-100">
                            {isEditing ? 'Edit Grading Template' : 'Create Grading Template'}
                        </h1>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-900 font-medium py-2 px-6 rounded-lg transition-all shadow-sm disabled:bg-slate-400 disabled:cursor-wait dark:bg-darkCustom-500 dark:text-darkCustom-50 dark:hover:bg-darkCustom-300 dark:hover:text-white dark:disabled:bg-darkCustom-600 dark:disabled:text-darkCustom-400"
                    >
                        {isSubmitting ? <Loader size={20} className="animate-spin"/> : <Save size={20}/>}
                        <span>{isEditing ? 'Save Changes' : 'Create Template'}</span>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white dark:bg-darkCustom-900 p-6 rounded-lg shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="schemeName"
                                       className="font-medium text-slate-700 dark:text-darkCustom-200">Template
                                    Name</label>
                                <input
                                    type="text" id="schemeName" value={schemeName}
                                    onChange={(e) => setSchemeName(e.target.value)}
                                    className={inputClasses}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="schemeDescription"
                                       className="font-medium text-slate-700 dark:text-darkCustom-200">Description</label>
                                <input
                                    type="text" id="schemeDescription" value={schemeDescription}
                                    onChange={(e) => setSchemeDescription(e.target.value)}
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Scale & Rules Card */}
                    <div
                        className="bg-white dark:bg-darkCustom-900 p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {/* Scale */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-darkCustom-100 border-b border-slate-200 dark:border-darkCustom-700 pb-2">Grading
                                Scale</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col space-y-1 flex-1">
                                    <label htmlFor="minScale"
                                           className="font-medium text-slate-700 dark:text-darkCustom-200">Minimum
                                        Grade</label>
                                    <input type="number" id="minScale" value={minScale}
                                           onChange={(e) => setMinScale(Math.max(1, Number(e.target.value)))} min="1"
                                           max="10" className={`${inputClasses} w-full`}/>
                                </div>
                                <div className="flex flex-col space-y-1 flex-1">
                                    <label htmlFor="maxScale"
                                           className="font-medium text-slate-700 dark:text-darkCustom-200">Maximum
                                        Grade</label>
                                    <input type="number" id="maxScale" value={maxScale}
                                           onChange={(e) => setMaxScale(Math.max(minScale, Number(e.target.value)))}
                                           min={minScale} max="10" className={`${inputClasses} w-full`}/>
                                </div>
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-darkCustom-100 border-b border-slate-200 dark:border-darkCustom-700 pb-2">Scoring
                                Rules</h3>
                            <div className="flex justify-between items-center">
                                <span
                                    className="font-medium text-slate-700 dark:text-darkCustom-200">Use partial points</span>
                                <label className="relative inline-flex items-center cursor-pointer"><input
                                    type="checkbox" checked={partialCredit}
                                    onChange={(e) => setPartialCredit(e.target.checked)} className="sr-only peer"/>
                                    <div className={toggleBaseClasses}></div>
                                </label>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-700 dark:text-darkCustom-200">Penalize wrong answers</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox" checked={penalizeWrong}
                                        onChange={(e) => setPenalizeWrong(e.target.checked)} className="sr-only peer"/>
                                    <div className={toggleBaseClasses}></div>
                                </label>
                            </div>
                            {penalizeWrong && (
                                <div className="flex justify-between items-center pl-4">
                                    <label htmlFor="select-penality-per-wrong" className="text-sm text-slate-600 dark:text-darkCustom-300">Penalty per wrong
                                        answer</label>
                                    <select value={penaltyPerWrong}
                                            id="select-penality-per-wrong"
                                            name="select-penality-per-wrong"
                                            onChange={(e) => setPenaltyPerWrong(Number(e.target.value))}
                                            className={`${inputClasses} text-sm`}>
                                        <option value={0.25}>0.25</option>
                                        <option value={0.5}>0.5</option>
                                        <option value={1}>1</option>
                                        <option value={1.5}>1.5</option>
                                        <option value={2}>2</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-700 dark:text-darkCustom-200">Allow negative points</span>
                                <label className="relative inline-flex items-center cursor-pointer"><input
                                    type="checkbox" checked={allowNegativePoints}
                                    onChange={(e) => setAllowNegativePoints(e.target.checked)}
                                    className="sr-only peer"/>
                                    <div className={toggleBaseClasses}></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Thresholds Card */}
                    <div className="bg-white dark:bg-darkCustom-900 p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-darkCustom-100">Percentage
                                Thresholds for Grades</h3>

                            <button
                                type="button"
                                onClick={handleRegenerateThresholds}
                                disabled={isRegenerating}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium p-2 rounded-md hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10 transition-colors"
                            >
                                <RefreshCw
                                    size={16}
                                    className={isRegenerating ? 'animate-spin' : ''}
                                />
                                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Header */}
                            <div
                                className="grid grid-cols-12 gap-4 px-2 text-sm font-medium text-slate-500 dark:text-darkCustom-300">
                                <span className="col-span-2">Grade</span>
                                <span className="col-span-3">Min %</span>
                                <span className="col-span-3">Max %</span>
                                <span className="col-span-4"></span>
                            </div>

                            {/* Rows */}
                            {gradingThresholds.map((threshold, i) => {
                                const error = thresholdErrors[i];
                                return (
                                    <div key={i} className="grid grid-cols-12 gap-4 items-center">
                                        <label
                                            className="col-span-2 p-2 font-bold text-slate-700 dark:text-darkCustom-100 text-center bg-slate-100 dark:bg-darkCustom-700 rounded-md">{threshold.grade}</label>
                                        <div className="col-span-3">
                                            <input type="number" step="any" value={threshold.percentage_min}
                                                   onChange={(e) => handleThresholdChange(i, 'percentage_min', e.target.value)}
                                                   className={`w-full p-2 border rounded-md transition ${inputClasses} ${error ? 'border-red-500 ring-1 ring-red-500 dark:border-red-400 dark:ring-red-400' : 'border-slate-300'}`}/>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="number" step="any" value={threshold.percentage_max}
                                                   onChange={(e) => handleThresholdChange(i, 'percentage_max', e.target.value)}
                                                   className={`w-full p-2 border rounded-md transition ${inputClasses} ${error ? 'border-red-500 ring-1 ring-red-500 dark:border-red-400 dark:ring-red-400' : 'border-slate-300'}`}/>
                                        </div>
                                        {error && <span
                                            className="col-span-4 flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                                            <AlertCircle size={16}/> {error}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default CreateGradingScheme;
