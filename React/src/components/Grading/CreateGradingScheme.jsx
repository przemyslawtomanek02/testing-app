import React, {useEffect, useState, useCallback} from 'react';
import {Save, AlertCircle, Loader, ArrowLeft, RefreshCw} from 'lucide-react';
import {toast} from 'react-toastify';
import {useAppContext} from '../../AppContext.jsx';

const CreateGradingScheme = ({scheme_id, onBack}) => {
    const { darkMode: dk } = useAppContext();
    const T = {
        bg:       dk ? '#0F1117' : '#F4F6FB',
        surface:  dk ? '#171B2D' : '#FFFFFF',
        surface2: dk ? '#1E2237' : '#F8FAFC',
        border:   dk ? '#2A2F45' : '#E4E6EB',
        text:     dk ? '#E2E8F0' : '#0F1623',
        textSec:  dk ? '#8896B3' : '#64748B',
        textMuted:dk ? '#5A6483' : '#94A3B8',
        inputBg:  dk ? '#1E2237' : '#FFFFFF',
        accent:   '#2B73FF',
    };

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.bg }}>
                <Loader size={36} style={{ color: T.textMuted, animation: 'spin 1s linear infinite' }}/>
            </div>
        );
    }

    const inputStyle = {
        width: '100%', padding: '8px 12px', borderRadius: '12px',
        border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        transition: 'border-color 0.15s',
    };

    const Toggle = ({checked, onChange}) => (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            style={{
                position: 'relative', display: 'inline-flex', flexShrink: 0,
                width: '44px', height: '24px', borderRadius: '999px', border: 'none',
                cursor: 'pointer', transition: 'background 0.2s',
                background: checked ? 'linear-gradient(135deg, #2B73FF, #3F99FF)' : (dk ? '#3A4060' : '#CBD5E1'),
            }}
            aria-checked={checked}
        >
            <span style={{
                position: 'absolute', top: '2px',
                left: checked ? 'calc(100% - 22px)' : '2px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}/>
        </button>
    );

    const SectionCard = ({children, style = {}}) => (
        <div style={{
            background: T.surface, borderRadius: '22px',
            border: `1px solid ${T.border}`,
            boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)',
            padding: '24px', ...style,
        }}>
            {children}
        </div>
    );

    const SectionLabel = ({children}) => (
        <div style={{ fontSize: '11px', fontWeight: '600', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            {children}
        </div>
    );

    const FieldLabel = ({htmlFor, children}) => (
        <label htmlFor={htmlFor} style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>
            {children}
        </label>
    );

    return (
        <form onSubmit={handleSubmit} style={{ padding: '28px', background: T.bg, minHeight: '100%' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '999px', border: `1.5px solid ${T.border}`,
                                    background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', color: T.textSec, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.06)' : '#EEF4FF'; e.currentTarget.style.color = T.accent; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSec; }}
                            >
                                <ArrowLeft size={18}/>
                            </button>
                        )}
                        <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>
                            {isEditing ? 'Edit Grading Template' : 'Create Grading Template'}
                        </h1>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            height: '38px', padding: '0 20px', borderRadius: '999px', border: 'none',
                            background: isSubmitting ? T.textMuted : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                            color: '#FFFFFF', fontSize: '13px', fontWeight: '600',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(43,115,255,0.35)',
                            transition: 'opacity 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                        {isSubmitting ? <Loader size={15} className="animate-spin"/> : <Save size={15}/>}
                        <span>{isEditing ? 'Save Changes' : 'Create Template'}</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Basic Info */}
                    <SectionCard>
                        <SectionLabel>Basic Information</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <FieldLabel htmlFor="schemeName">Template Name</FieldLabel>
                                <input
                                    type="text" id="schemeName" value={schemeName}
                                    onChange={e => setSchemeName(e.target.value)}
                                    style={inputStyle} placeholder="e.g. Standard 2-5" required
                                    onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,115,255,0.1)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div>
                                <FieldLabel htmlFor="schemeDescription">Description</FieldLabel>
                                <input
                                    type="text" id="schemeDescription" value={schemeDescription}
                                    onChange={e => setSchemeDescription(e.target.value)}
                                    style={inputStyle} placeholder="Optional description"
                                    onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,115,255,0.1)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Scale & Rules */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Scale */}
                        <SectionCard>
                            <SectionLabel>Grading Scale</SectionLabel>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <FieldLabel htmlFor="minScale">Minimum Grade</FieldLabel>
                                    <input
                                        type="number" id="minScale" value={minScale}
                                        onChange={e => setMinScale(Math.max(1, Number(e.target.value)))}
                                        min="1" max="10" style={inputStyle}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <FieldLabel htmlFor="maxScale">Maximum Grade</FieldLabel>
                                    <input
                                        type="number" id="maxScale" value={maxScale}
                                        onChange={e => setMaxScale(Math.max(minScale, Number(e.target.value)))}
                                        min={minScale} max="10" style={inputStyle}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Rules */}
                        <SectionCard>
                            <SectionLabel>Scoring Rules</SectionLabel>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                    { label: 'Use partial points', checked: partialCredit, onChange: setPartialCredit },
                                    { label: 'Penalize wrong answers', checked: penalizeWrong, onChange: setPenalizeWrong },
                                    { label: 'Allow negative points', checked: allowNegativePoints, onChange: setAllowNegativePoints },
                                ].map(({ label, checked, onChange }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '500', color: T.text }}>{label}</span>
                                        <Toggle checked={checked} onChange={onChange}/>
                                    </div>
                                ))}
                                {penalizeWrong && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '12px', borderLeft: `2px solid ${T.border}` }}>
                                        <label htmlFor="penalty-select" style={{ fontSize: '13px', color: T.textSec }}>Penalty per wrong answer</label>
                                        <select
                                            id="penalty-select"
                                            value={penaltyPerWrong}
                                            onChange={e => setPenaltyPerWrong(Number(e.target.value))}
                                            style={{
                                                fontSize: '13px', border: `1.5px solid ${T.border}`, borderRadius: '10px',
                                                padding: '4px 8px', color: T.text, background: T.inputBg, outline: 'none',
                                            }}
                                        >
                                            <option value={0.25}>0.25</option>
                                            <option value={0.5}>0.5</option>
                                            <option value={1}>1</option>
                                            <option value={1.5}>1.5</option>
                                            <option value={2}>2</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    </div>

                    {/* Thresholds */}
                    <SectionCard>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <SectionLabel>Percentage Thresholds</SectionLabel>
                            <button
                                type="button"
                                onClick={handleRegenerateThresholds}
                                disabled={isRegenerating}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '13px', fontWeight: '500', color: '#2B73FF',
                                    background: dk ? 'rgba(43,115,255,0.12)' : '#EEF4FF',
                                    border: 'none', cursor: 'pointer', padding: '6px 12px',
                                    borderRadius: '999px', opacity: isRegenerating ? 0.5 : 1,
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                <RefreshCw size={13} className={isRegenerating ? 'is-refreshing' : ''}/>
                                <span>{isRegenerating ? 'Regenerating…' : 'Regenerate'}</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: '12px', padding: '0 4px' }}>
                                {['Grade', 'Min %', 'Max %', ''].map(h => (
                                    <span key={h} style={{ fontSize: '11px', fontWeight: '600', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                                ))}
                            </div>

                            {gradingThresholds.map((threshold, i) => {
                                const error = thresholdErrors[i];
                                return (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            height: '38px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                                            background: dk ? 'rgba(43,115,255,0.15)' : '#EEF4FF',
                                            color: '#2B73FF',
                                        }}>
                                            {threshold.grade}
                                        </div>
                                        <input
                                            type="number" step="any" value={threshold.percentage_min}
                                            onChange={e => handleThresholdChange(i, 'percentage_min', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                border: `1.5px solid ${error ? '#EF4444' : T.border}`,
                                                boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                                            }}
                                        />
                                        <input
                                            type="number" step="any" value={threshold.percentage_max}
                                            onChange={e => handleThresholdChange(i, 'percentage_max', e.target.value)}
                                            style={{
                                                ...inputStyle,
                                                border: `1.5px solid ${error ? '#EF4444' : T.border}`,
                                                boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                                            }}
                                        />
                                        {error && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontSize: '12px' }}>
                                                <AlertCircle size={13}/> {error}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </form>
    );
};

export default CreateGradingScheme;
