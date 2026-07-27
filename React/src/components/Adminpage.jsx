import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    BookOpen, Hash, BarChart3, Percent,
    ListChecks, PlusSquare, Settings, LogOut,
    FilePlus2, Users, ChevronRight, Menu, X,
} from 'lucide-react';

import { useAppContext } from '../AppContext.jsx';
import TestsPanel from './Adminpage_panels/TestsPanel';
import InstancesPanel from './Adminpage_panels/InstancesPanel';
import CreateTestsPanel from './Adminpage_panels/CreateTestComponents/CreateTestsPanel.jsx';
import ResultsPanel from './Adminpage_panels/ResultsPanel';
import FullPageOverlay from './Reusable/FullPageOverlay.jsx';
import ImageOverlay from './Reusable/ImageOverlay.jsx';
import CreateGradingScheme from './Grading/CreateGradingScheme.jsx';
import GradingSchemePanel from './Adminpage_panels/GradingSchemePanel.jsx';
import SettingsPanel from './Adminpage_panels/SettingsPanel.jsx';
import EditTestPanel from './Adminpage_panels/CreateTestComponents/EditTestPanel.jsx';
import UsersListPanel from './Adminpage_panels/UsersListPanel.jsx';
import DarkModeSwitcher from './Reusable/DarkModeSwitcher.jsx';
import TestPreviewPanel from './Adminpage_panels/TestPreviewPanel.jsx';

/* ─── nav config ─────────────────────────────────────────── */
const NAV_GENERAL = [
    { id: 'tests',           icon: BookOpen,   label: 'Tests',          activeFor: ['tests','edit_test','preview_test'] },
    { id: 'instances',       icon: Hash,       label: 'Instances' },
    { id: 'results',         icon: BarChart3,  label: 'Results' },
    { id: 'grading_schemes', icon: Percent,    label: 'Grading' },
];
const NAV_CREATE = [
    { id: 'create_test',            icon: PlusSquare, label: 'Create Test' },
    { id: 'create_grading_schemes', icon: FilePlus2,  label: 'Create Grading' },
];
const NAV_BOTTOM = [
    { id: 'exams',       icon: ListChecks, label: 'Go to Exams', isNav: true },
    { id: 'users_list',  icon: Users,      label: 'Users' },
    { id: 'settings',    icon: Settings,   label: 'Settings' },
    { id: 'logout',      icon: LogOut,     label: 'Log out', danger: true },
];

const BREADCRUMBS = {
    tests:                    ['General', 'Tests'],
    instances:                ['General', 'Instances'],
    results:                  ['General', 'Results'],
    grading_schemes:          ['General', 'Grading'],
    create_test:              ['Create', 'New Test'],
    create_grading_schemes:   ['Create', 'New Grading'],
    users_list:               ['Admin', 'Users'],
    settings:                 ['Admin', 'Settings'],
    edit_test:                ['Tests', 'Edit Test'],
    preview_test:             ['Tests', 'Preview'],
};
/* ─────────────────────────────────────────────────────────── */

export default function Adminpage() {
    const navigate = useNavigate();
    const { darkMode } = useAppContext();
    const [activePanel, setActivePanel] = useState('tests');
    const [tests, setTests] = useState([]);
    const [editingTestId, setEditingTestId] = useState(null);
    const [previewTestId, setPreviewTestId] = useState(null);
    const [instances, setInstances] = useState([]);
    const [overlay, setOverlay] = useState(null);
    const [overlayImage, setOverlayImage] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const dk = darkMode;
    const T = {
        bg:            dk ? '#0F1117' : '#F4F6FB',
        surface:       dk ? '#171B2D' : '#FFFFFF',
        surface2:      dk ? '#1E2237' : '#F4F6FB',
        border:        dk ? '#2A2F45' : '#EDF0F7',
        sidebarBg:     dk ? '#12151F' : '#FFFFFF',
        sidebarBorder: dk ? '#1E2438' : '#EDF0F7',
        text:          dk ? '#E2E8F0' : '#0F1623',
        textSec:       dk ? '#8896B3' : '#64748B',
        textMuted:     dk ? '#5A6483' : '#94A3B8',
        accent:        '#2B73FF',
        accentEnd:     '#3F99FF',
    };

    useEffect(() => {
        if (activePanel !== 'edit_test') {
            setTests(null);
            setInstances(null);
            void fetchData();
        }
    }, [activePanel]);

    const fetchData = async () => {
        try {
            if (activePanel === 'tests') setTests(await fetchTests());
            else if (activePanel === 'instances') setInstances(await fetchInstances());
        } catch {
            toast.error('Error fetching data.');
        }
    };

    const fetchTests = async () => {
        const r = await fetch('/api/admin/get_admin_tests', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (r.status === 303) navigate('/admin', { replace: true });
        return r.json();
    };
    const fetchInstances = async () => {
        const r = await fetch('/api/admin/get_admin_instances', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (r.status === 303) navigate('/admin', { replace: true });
        return r.json();
    };

    const handleEditTest    = id => { setEditingTestId(id); setActivePanel('edit_test'); };
    const handlePreviewTest = id => { setPreviewTestId(id); setActivePanel('preview_test'); };

    const handleExportTest = async (testId, testName) => {
        try {
            const res = await fetch(`/api/admin/export_test/${testId}`, { credentials: 'include' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = Object.assign(document.createElement('a'), { href: url, download: `${testName.replace(/[^a-z0-9]/gi, '_')}_export.json` });
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Test exported!');
        } catch { toast.error('Export failed.'); }
    };

    const handleImportTest = async jsonData => {
        try {
            const res = await fetch('/api/admin/import_test', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jsonData) });
            if (!res.ok) throw new Error();
            toast.success('Test imported!');
            if (activePanel === 'tests') await fetchData();
        } catch { toast.error('Import failed.'); }
    };

    const logout = async () => {
        try {
            const res  = await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const data = await res.json();
            if (data.redirect) navigate('/admin');
            else toast.error('Error logging out.');
        } catch { console.error('Logout error'); }
    };

    const handleNavClick = item => {
        if (item.id === 'logout') { logout(); return; }
        if (item.isNav)           { navigate('/exams'); return; }
        setActivePanel(item.id);
    };

    const isActive = item =>
        item.activeFor ? item.activeFor.includes(activePanel) : item.id === activePanel;

    const renderContent = () => {
        switch (activePanel) {
            case 'tests':           return <TestsPanel data={tests} setOverlay={setOverlay} setOverlayImage={setOverlayImage} onRefresh={fetchData} onEditTest={handleEditTest} onPreviewTest={handlePreviewTest} onExportTest={handleExportTest} onImportTest={handleImportTest} onCreateTest={() => setActivePanel('create_test')}/>;
            case 'instances':       return <InstancesPanel data={instances} setOverlay={setOverlay} onRefresh={fetchData}/>;
            case 'results':         return <ResultsPanel reset={activePanel === null}/>;
            case 'grading_schemes': return <GradingSchemePanel setOverlay={setOverlay}/>;
            case 'create_test':     return <CreateTestsPanel setOverlayImage={setOverlayImage}/>;
            case 'create_grading_schemes': return <CreateGradingScheme scheme_id={null}/>;
            case 'users_list':      return <UsersListPanel setOverlay={setOverlay} onRefresh={'nic'}/>;
            case 'settings':        return <SettingsPanel/>;
            case 'edit_test':       return <EditTestPanel testId={editingTestId} setOverlayImage={setOverlayImage} setActivePanel={setActivePanel}/>;
            case 'preview_test':    return <TestPreviewPanel testId={previewTestId} onBack={() => setActivePanel('tests')}/>;
            default: return null;
        }
    };

    const crumbs = BREADCRUMBS[activePanel] || [];

    return (
        <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>

            {/* ══ SIDEBAR ══════════════════════════════════════════ */}
            <aside style={{
                width: sidebarOpen ? '232px' : '68px',
                flexShrink: 0,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: T.sidebarBg,
                borderRight: `1px solid ${T.sidebarBorder}`,
                transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: dk ? 'none' : '2px 0 16px rgba(43,115,255,0.04)',
            }}>
                {/* Gradient top accent */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg, #2B73FF 0%, #3F99FF 100%)',
                    borderRadius: '0 0 2px 2px',
                }}/>

                {/* Brand */}
                <div style={{
                    height: '68px', display: 'flex', alignItems: 'center',
                    padding: sidebarOpen ? '0 20px' : '0',
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    borderBottom: `1px solid ${T.sidebarBorder}`, flexShrink: 0, marginTop: '3px',
                }}>
                    {sidebarOpen ? (
                        <div>
                            <div style={{ fontSize: '21px', fontWeight: '300', color: T.text, letterSpacing: '-0.04em', lineHeight: 1 }}>omnis</div>
                            <div style={{ fontSize: '10px', fontWeight: '500', color: T.textMuted, letterSpacing: '0.09em', textTransform: 'uppercase', marginTop: '3px' }}>Admin Panel</div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '15px', fontWeight: '300', color: T.text, letterSpacing: '-0.02em' }}>o</div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <NavSection label="General" show={sidebarOpen} dk={dk} T={T}/>
                    {NAV_GENERAL.map(item => (
                        <NavItem key={item.id} item={item} active={isActive(item)} open={sidebarOpen} onClick={() => handleNavClick(item)} dk={dk}/>
                    ))}
                    <div style={{ height: '16px' }}/>
                    <NavSection label="Create" show={sidebarOpen} dk={dk} T={T}/>
                    {NAV_CREATE.map(item => (
                        <NavItem key={item.id} item={item} active={isActive(item)} open={sidebarOpen} onClick={() => handleNavClick(item)} dk={dk}/>
                    ))}
                </nav>

                {/* Bottom */}
                <div style={{ padding: '10px', borderTop: `1px solid ${T.sidebarBorder}`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {NAV_BOTTOM.map(item => (
                        <NavItem key={item.id} item={item} active={isActive(item)} open={sidebarOpen} onClick={() => handleNavClick(item)} dk={dk}/>
                    ))}
                </div>
            </aside>

            {/* ══ MAIN ═════════════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* Topbar */}
                <header style={{
                    height: '68px', flexShrink: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '0 28px',
                    background: 'transparent',
                    gap: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Toggle – circle */}
                        <button
                            onClick={() => setSidebarOpen(o => !o)}
                            style={{
                                width: '36px', height: '36px', borderRadius: '999px',
                                border: `1.5px solid ${T.border}`, background: T.surface,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: T.textSec, flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(43,115,255,0.12)',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.06)' : '#EEF4FF'; e.currentTarget.style.borderColor = dk ? '#3D4F6B' : '#B8D0FF'; e.currentTarget.style.color = '#2B73FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSec; }}
                        >
                            {sidebarOpen ? <X size={15}/> : <Menu size={15}/>}
                        </button>

                        {/* Breadcrumbs */}
                        {crumbs.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {crumbs.map((c, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <ChevronRight size={12} style={{ color: T.textMuted }}/>}
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: i === crumbs.length - 1 ? '600' : '400',
                                            color: i === crumbs.length - 1 ? T.text : T.textSec,
                                        }}>{c}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DarkModeSwitcher/>
                    </div>
                </header>

                {/* Content */}
                <main style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
                    {renderContent()}
                </main>
            </div>

            {overlay      && <FullPageOverlay setOverlay={setOverlay} component={overlay}/>}
            {overlayImage && <ImageOverlay setOverlayImage={setOverlayImage} image={overlayImage}/>}
        </div>
    );
}

/* ─── helpers ──────────────────────────────────────────────── */

function NavSection({ label, show, dk, T }) {
    if (!show) return null;
    return (
        <div style={{ padding: '4px 8px 4px', fontSize: '10px', fontWeight: '600', color: T ? T.textMuted : (dk ? '#5A6483' : '#94A3B8'), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {label}
        </div>
    );
}

function NavItem({ item, active, open, onClick, dk }) {
    const [hovered, setHovered] = useState(false);
    const Icon = item.icon;

    const bg = active
        ? 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)'
        : hovered
            ? item.danger
                ? dk ? 'rgba(239,68,68,0.12)' : '#FEF2F2'
                : dk ? 'rgba(255,255,255,0.06)' : '#EEF4FF'
            : 'transparent';

    const color = active
        ? '#FFFFFF'
        : item.danger
            ? hovered ? '#EF4444' : dk ? '#5A6483' : '#94A3B8'
            : hovered
                ? dk ? '#FFFFFF' : '#2B73FF'
                : dk ? '#8896B3' : '#64748B';

    return (
        <button
            onClick={onClick}
            title={!open ? item.label : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: '100%',
                height: '40px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: open ? 'flex-start' : 'center',
                padding: open ? '0 14px' : '0',
                gap: open ? '10px' : '0',
                fontSize: '13px',
                fontWeight: active ? '600' : '400',
                cursor: 'pointer',
                border: 'none',
                background: bg,
                color,
                transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                boxShadow: active ? '0 4px 14px rgba(43,115,255,0.32)' : 'none',
                letterSpacing: '-0.01em',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: active ? 1 : 0.75 }}>
                <Icon size={16}/>
            </span>
            {open && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
        </button>
    );
}
