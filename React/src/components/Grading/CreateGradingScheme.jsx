import React, {useEffect, useState, useCallback} from 'react';
import {Save, AlertCircle, Loader, ArrowLeft, RefreshCw} from 'lucide-react';
import {toast} from 'react-toastify';

const CreateGradingScheme = ({scheme_id, onBack}) => {
    const isEditing = !!scheme_id;

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
        if (min === '' || max === '' || Number(min) > Number(max)) return [];
        const range = Number(max) - Number(min) + 1;
        if (range <= 0) return [];
        const thresholds = [];
        let currentMin = 0;
        for (let i = 0; i < range; i++) {
            const grade = min + i;
            const currentMax = (i === range - 1) ? 100 : Math.round(100 / range * (i + 1)) - 1;
            thresholds.push({percentage_min: currentMin, percentage_max: currentMax, grade});
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
            toast.info("Thresholds regenerated.");
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
        const payload = {
            name: schemeName,
            description: schemeDescription,
            scale_type: `${minScale}-${maxScale}`,
            grading_thresholds: gradingThresholds.map(t => ({
                grade: t.grade,
                percentage_min: parseFloat(t.percentage_min),
                percentage_max: parseFloat(t.percentage_max),
            })),
            partial_credit: partialCredit,
            penalize_wrong: penalizeWrong,
            penalty_per_wrong: penaltyPerWrong,
            allow_negative_points: allowNegativePoints,
        };
        const url = isEditing ? `/api/admin/update_grading_scheme/${scheme_id}` : '/api/admin/create_grading_scheme';
        try {
            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(isEditing ? 'Template updated!' : 'Template created!');
                if (onBack) onBack();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'An error occurred.');
            }
        } catch {
            toast.error('Connection error while saving.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8 bg-[#F0F2F5] min-h-screen">
                <Loader className="h-10 w-10 animate-spin text-[#BEC3C9]"/>
            </div>
        );
    }

    const inputCls = "w-full px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    const Toggle = ({checked, onChange}) => (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-[#0866FF]' : 'bg-[#CED0D4]'}`}
            aria-checked={checked}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}/>
        </button>
    );

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-[#F0F2F5] min-h-screen">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button type="button" onClick={onBack}
                                    className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-[#E4E6EB] text-[#606770] transition-all">
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        <h1 className="text-xl font-bold text-[#1C1E21]">
                            {isEditing ? 'Edit Grading Template' : 'Create Grading Template'}
                        </h1>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-[#0866FF] text-white hover:bg-[#0757D9] font-semibold py-2 px-5 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait text-sm"
                    >
                        {isSubmitting ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>}
                        <span>{isEditing ? 'Save Changes' : 'Create Template'}</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-6">
                        <h2 className="text-sm font-semibold text-[#65676B] uppercase tracking-wider mb-4">Basic Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="schemeName" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Template Name</label>
                                <input type="text" id="schemeName" value={schemeName}
                                       onChange={e => setSchemeName(e.target.value)}
                                       className={inputCls} placeholder="e.g. Standard 2-5" required/>
                            </div>
                            <div>
                                <label htmlFor="schemeDescription" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Description</label>
                                <input type="text" id="schemeDescription" value={schemeDescription}
                                       onChange={e => setSchemeDescription(e.target.value)}
                                       className={inputCls} placeholder="Optional description"/>
                            </div>
                        </div>
                    </div>

                    {/* Scale & Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Scale */}
                        <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-6">
                            <h2 className="text-sm font-semibold text-[#65676B] uppercase tracking-wider mb-4">Grading Scale</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label htmlFor="minScale" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Minimum Grade</label>
                                    <input type="number" id="minScale" value={minScale}
                                           onChange={e => setMinScale(Math.max(1, Number(e.target.value)))}
                                           min="1" max="10" className={inputCls}/>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="maxScale" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Maximum Grade</label>
                                    <input type="number" id="maxScale" value={maxScale}
                                           onChange={e => setMaxScale(Math.max(minScale, Number(e.target.value)))}
                                           min={minScale} max="10" className={inputCls}/>
                                </div>
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-6">
                            <h2 className="text-sm font-semibold text-[#65676B] uppercase tracking-wider mb-4">Scoring Rules</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-[#1C1E21]">Use partial points</span>
                                    <Toggle checked={partialCredit} onChange={setPartialCredit}/>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-[#1C1E21]">Penalize wrong answers</span>
                                    <Toggle checked={penalizeWrong} onChange={setPenalizeWrong}/>
                                </div>
                                {penalizeWrong && (
                                    <div className="flex justify-between items-center pl-4 border-l-2 border-[#E4E6EB]">
                                        <label htmlFor="penalty-select" className="text-sm text-[#65676B]">Penalty per wrong answer</label>
                                        <select
                                            id="penalty-select"
                                            value={penaltyPerWrong}
                                            onChange={e => setPenaltyPerWrong(Number(e.target.value))}
                                            className="text-sm border border-[#E4E6EB] rounded-lg px-2 py-1.5 text-[#1C1E21] bg-white focus:outline-none focus:border-[#0866FF]"
                                        >
                                            <option value={0.25}>0.25</option>
                                            <option value={0.5}>0.5</option>
                                            <option value={1}>1</option>
                                            <option value={1.5}>1.5</option>
                                            <option value={2}>2</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-[#1C1E21]">Allow negative points</span>
                                    <Toggle checked={allowNegativePoints} onChange={setAllowNegativePoints}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thresholds */}
                    <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-sm font-semibold text-[#65676B] uppercase tracking-wider">Percentage Thresholds</h2>
                            <button
                                type="button"
                                onClick={handleRegenerateThresholds}
                                disabled={isRegenerating}
                                className="flex items-center gap-1.5 text-sm text-[#0866FF] hover:text-[#0757D9] font-medium px-3 py-1.5 rounded-lg hover:bg-[#E7F3FF] transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''}/>
                                <span>{isRegenerating ? 'Regenerating…' : 'Regenerate'}</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-3 px-1 text-xs font-semibold text-[#65676B] uppercase tracking-wider">
                                <span className="col-span-2">Grade</span>
                                <span className="col-span-4">Min %</span>
                                <span className="col-span-4">Max %</span>
                                <span className="col-span-2"></span>
                            </div>

                            {gradingThresholds.map((threshold, i) => {
                                const error = thresholdErrors[i];
                                return (
                                    <div key={i} className="grid grid-cols-12 gap-3 items-center">
                                        <div className="col-span-2 flex items-center justify-center h-9 bg-[#E7F3FF] text-[#0866FF] font-bold text-sm rounded-xl">
                                            {threshold.grade}
                                        </div>
                                        <div className="col-span-4">
                                            <input type="number" step="any" value={threshold.percentage_min}
                                                   onChange={e => handleThresholdChange(i, 'percentage_min', e.target.value)}
                                                   className={`${inputCls} ${error ? 'border-red-400 ring-1 ring-red-400' : ''}`}/>
                                        </div>
                                        <div className="col-span-4">
                                            <input type="number" step="any" value={threshold.percentage_max}
                                                   onChange={e => handleThresholdChange(i, 'percentage_max', e.target.value)}
                                                   className={`${inputCls} ${error ? 'border-red-400 ring-1 ring-red-400' : ''}`}/>
                                        </div>
                                        {error && (
                                            <span className="col-span-2 flex items-center gap-1 text-red-500 text-xs">
                                                <AlertCircle size={13}/> {error}
                                            </span>
                                        )}
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
