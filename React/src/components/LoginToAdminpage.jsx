import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAppContext } from '../AppContext.jsx';
import SuspensePage from './Suspense.jsx';

const Login = () => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [focusedField, setFocusedField] = useState(null);
    const { login: ContextLogin, darkMode } = useAppContext();
    const navigate = useNavigate();

    const dk = darkMode;
    const T = {
        pageBg:       dk ? '#0F1117' : '#F4F6FB',
        surface:      dk ? '#171B2D' : '#FFFFFF',
        text:         dk ? '#E2E8F0' : '#0F1623',
        textSec:      dk ? '#8896B3' : '#64748B',
        inputBg:      dk ? '#1E2237' : '#FAFAFA',
        inputBgFocus: dk ? '#1A2040' : '#F8FBFF',
        border:       dk ? '#2A2F45' : '#E2E8F0',
        label:        dk ? '#8896B3' : '#64748B',
        textMuted:    dk ? '#5A6483' : '#94A3B8',
    };

    useEffect(() => {
        const check = async () => {
            try {
                const r = await fetch('/api/check_admin_status', { credentials: 'include' });
                if (r.ok) {
                    const d = await r.json();
                    if (d.is_admin) { toast.info('Already logged in.'); navigate('/admin_panel', { replace: true }); return; }
                }
            } catch {}
            setIsCheckingSession(false);
        };
        void check();
    }, [navigate]);

    const handleLogin = async e => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const r = await fetch('/api/admin_login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ login, password }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message || 'Login failed.');
            if (d.admin) ContextLogin(d.admin);
            if (d.redirect) navigate('/admin_panel');
        } catch (err) {
            toast.error(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingSession) return <SuspensePage/>;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: T.pageBg,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        }}>
            {/* Left panel – branding */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
                background: 'linear-gradient(145deg, #2B73FF 0%, #3F99FF 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
                <div style={{ position: 'absolute', bottom: '-40px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
                <div style={{ position: 'absolute', top: '40%', left: '60%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '340px' }}>
                    <img src="/media/logo.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}/>
                </div>
            </div>

            {/* Right panel – form */}
            <div style={{
                width: '440px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 40px',
                background: T.surface,
                boxShadow: dk ? 'none' : '-8px 0 40px rgba(0,0,0,0.06)',
            }}>
                <div style={{ width: '100%', maxWidth: '340px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: T.text, margin: '0 0 6px', letterSpacing: '-0.025em' }}>
                        Sign in
                    </h2>
                    <p style={{ fontSize: '14px', color: T.textSec, margin: '0 0 32px' }}>
                        Enter your credentials to continue
                    </p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Username */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: T.label, marginBottom: '6px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                Username
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: focusedField === 'login' ? '#2B73FF' : T.textMuted,
                                    transition: 'color 0.15s',
                                }}/>
                                <input
                                    type="text"
                                    value={login}
                                    onChange={e => setLogin(e.target.value)}
                                    onFocus={() => setFocusedField('login')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    autoComplete="username"
                                    placeholder="admin"
                                    style={{
                                        width: '100%',
                                        height: '44px',
                                        borderRadius: '14px',
                                        border: `1.5px solid ${focusedField === 'login' ? '#2B73FF' : T.border}`,
                                        background: focusedField === 'login' ? T.inputBgFocus : T.inputBg,
                                        paddingLeft: '40px',
                                        paddingRight: '14px',
                                        fontSize: '14px',
                                        color: T.text,
                                        outline: 'none',
                                        transition: 'border-color 0.15s, background 0.15s',
                                        boxSizing: 'border-box',
                                        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                                        boxShadow: focusedField === 'login' ? '0 0 0 3px rgba(43,115,255,0.1)' : 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: T.label, marginBottom: '6px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{
                                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: focusedField === 'password' ? '#2B73FF' : T.textMuted,
                                    transition: 'color 0.15s',
                                }}/>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        height: '44px',
                                        borderRadius: '14px',
                                        border: `1.5px solid ${focusedField === 'password' ? '#2B73FF' : T.border}`,
                                        background: focusedField === 'password' ? T.inputBgFocus : T.inputBg,
                                        paddingLeft: '40px',
                                        paddingRight: '44px',
                                        fontSize: '14px',
                                        color: T.text,
                                        outline: 'none',
                                        transition: 'border-color 0.15s, background 0.15s',
                                        boxSizing: 'border-box',
                                        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                                        boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(43,115,255,0.1)' : 'none',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: T.textMuted, display: 'flex', alignItems: 'center',
                                        padding: '4px',
                                    }}
                                >
                                    {showPassword ? <Eye size={16}/> : <EyeOff size={16}/>}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                marginTop: '8px',
                                width: '100%',
                                height: '46px',
                                borderRadius: '999px',
                                border: 'none',
                                background: isLoading ? '#94A3B8' : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'opacity 0.15s',
                                letterSpacing: '-0.01em',
                                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                            }}
                            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.9'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                            {isLoading ? 'Signing in…' : 'Sign In'}
                            {!isLoading && <ArrowRight size={16}/>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
