import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'react-toastify';
import {
    BookOpen,
    Hash,
    BarChart3,
    Percent,
    ListChecks,
    PlusSquare,
    Settings,
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    FilePlus2,
    Users,
} from 'lucide-react';

import {useAppContext} from '../AppContext.jsx';
import TestsPanel from './Adminpage_panels/TestsPanel';
import InstancesPanel from './Adminpage_panels/InstancesPanel';
import CreateTestsPanel from './Adminpage_panels/CreateTestComponents/CreateTestsPanel.jsx';
import ResultsPanel from './Adminpage_panels/ResultsPanel';
import FullPageOverlay from "./Reusable/FullPageOverlay.jsx";
import ImageOverlay from "./Reusable/ImageOverlay.jsx";
import CreateGradingScheme from "./Grading/CreateGradingScheme.jsx";
import GradingSchemePanel from "./Adminpage_panels/GradingSchemePanel.jsx";
import SettingsPanel from "./Adminpage_panels/SettingsPanel.jsx";
import EditTestPanel from "./Adminpage_panels/CreateTestComponents/EditTestPanel.jsx";
import UsersListPanel from "./Adminpage_panels/UsersListPanel.jsx";
import DarkModeSwitcher from "./Reusable/DarkModeSwitcher.jsx";
import TestPreviewPanel from "./Adminpage_panels/TestPreviewPanel.jsx";

export default function Adminpage() {
    const navigate = useNavigate();
    const [activePanel, setActivePanel] = useState('tests');
    const [tests, setTests] = useState([]);
    const [editingTestId, setEditingTestId] = useState(null);
    const [previewTestId, setPreviewTestId] = useState(null);
    const [instances, setInstances] = useState([]);
    const [overlay, setOverlay] = useState(null);
    const [overlayImage, setOverlayImage] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const panelTitles = {
        tests: 'Tests Panel',
        instances: 'Instances Panel',
        results: 'Results',
        grading_schemes: 'Grading Templates',
        create_test: '',
        create_grading_schemes: '',
        users_list: 'Users List',
        settings: 'Settings',
        edit_test: 'Edit Test',
        preview_test: 'Test Preview',
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
            if (activePanel === 'tests') {
                const testsData = await fetchTests();
                setTests(testsData);
            } else if (activePanel === 'instances') {
                const instancesData = await fetchInstances();
                setInstances(instancesData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Error fetching data. Please try again later.');
        }
    };

    // todo
    const fetchTests = async () => {
        const response = await fetch('/api/admin/get_admin_tests', {
            method: 'GET',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
        });
        if (response.status === 303) navigate('/admin', {replace: true});
        if (!response.ok) console.log(`HTTP error! Status: ${response.status}`);
        return response.json();
    };

    const fetchInstances = async () => {
        const response = await fetch('/api/admin/get_admin_instances', {
            method: 'GET',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
        });
        if (response.status === 303) navigate('/admin', {replace: true});
        if (!response.ok) console.log(`HTTP error! Status: ${response.status}`);
        return response.json();
    };

    const handleEditTest = (testId) => {
        setEditingTestId(testId);
        setActivePanel('edit_test');
    };

    const handlePreviewTest = (testId) => {
        setPreviewTestId(testId);
        setActivePanel('preview_test');
    };

    const handleExportTest = async (testId, testName) => {
        try {
            const res = await fetch(`/api/admin/export_test/${testId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Export failed');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${testName.replace(/[^a-z0-9]/gi, '_')}_export.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Test exported successfully!');
        } catch {
            toast.error('Failed to export test.');
        }
    };

    const handleImportTest = async (jsonData) => {
        try {
            const res = await fetch('/api/admin/import_test', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData),
            });
            if (!res.ok) throw new Error('Import failed');
            toast.success('Test imported successfully!');
            if (activePanel === 'tests') await fetchData();
        } catch {
            toast.error('Failed to import test.');
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const logout = async () => {
        try {
            const response = await fetch('/api/logout', {method: 'POST', headers: {'Content-Type': 'application/json'}});
            const data = await response.json();
            if (data.redirect) {
                navigate("/admin");
            } else {
                console.log(data.message);
                toast.error('Error Logging Out');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const renderContent = () => {
        switch (activePanel) {
            case 'tests':
                return <TestsPanel data={tests} setOverlay={setOverlay} setOverlayImage={setOverlayImage}
                                   onRefresh={fetchData} onEditTest={handleEditTest}
                                   onPreviewTest={handlePreviewTest}
                                   onExportTest={handleExportTest}
                                   onImportTest={handleImportTest}
                                   onCreateTest={() => setActivePanel('create_test')}/>
            case 'instances':
                return <InstancesPanel data={instances} setOverlay={setOverlay} onRefresh={fetchData}/>;
            case 'results':
                return <ResultsPanel reset={activePanel === null}/>;
            case 'grading_schemes':
                return <GradingSchemePanel setOverlay={setOverlay}/>
            case 'create_test':
                return <CreateTestsPanel setOverlayImage={setOverlayImage}/>
            case 'create_grading_schemes':
                return <CreateGradingScheme scheme_id={null}/>
            case 'users_list':
                return <UsersListPanel setOverlay={setOverlay} onRefresh={"nic"}/>
            case 'settings':
                return <SettingsPanel/>
            case 'edit_test':
                return <EditTestPanel testId={editingTestId} setOverlayImage={setOverlayImage}
                                      setActivePanel={setActivePanel}/>
            case 'preview_test':
                return <TestPreviewPanel testId={previewTestId} onBack={() => setActivePanel('tests')} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-[#F0F2F5]">
            {/* ── SIDEBAR ── */}
            <aside className={`flex h-screen flex-col bg-white border-r border-[#E4E6EB] flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[240px]' : 'w-[64px]'}`}>

                {/* Logo */}
                <div className={`flex items-center h-[60px] border-b border-[#E4E6EB] flex-shrink-0 ${isSidebarOpen ? 'px-5 gap-3' : 'justify-center'}`}>
                    <img src="/media/logo.png" alt="Logo" className="h-8 w-8 object-contain flex-shrink-0"/>
                    {isSidebarOpen && (
                        <span className="text-[#1C1E21] text-[15px] font-semibold whitespace-nowrap tracking-tight">
                            Admin Panel
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-grow overflow-y-auto py-3 px-3 space-y-0.5">
                    {isSidebarOpen && (
                        <p className="px-2 pt-2 pb-1.5 text-[11px] font-semibold text-[#65676B] uppercase tracking-widest">
                            General
                        </p>
                    )}
                    <SidebarLink icon={<BookOpen size={17}/>} text="Tests"
                                 isActive={['tests', 'edit_test', 'preview_test'].includes(activePanel)}
                                 onClick={() => setActivePanel('tests')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<Hash size={17}/>} text="Instances"
                                 isActive={activePanel === 'instances'}
                                 onClick={() => setActivePanel('instances')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<BarChart3 size={17}/>} text="Results"
                                 isActive={activePanel === 'results'}
                                 onClick={() => setActivePanel('results')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<Percent size={17}/>} text="Grading"
                                 isActive={activePanel === 'grading_schemes'}
                                 onClick={() => setActivePanel('grading_schemes')} isSidebarOpen={isSidebarOpen}/>

                    {isSidebarOpen && (
                        <p className="px-2 pt-4 pb-1.5 text-[11px] font-semibold text-[#65676B] uppercase tracking-widest">
                            Creation
                        </p>
                    )}
                    {!isSidebarOpen && <div className="my-2 border-t border-[#E4E6EB]"/>}
                    <SidebarLink icon={<PlusSquare size={17}/>} text="Create Test"
                                 isActive={activePanel === 'create_test'}
                                 onClick={() => setActivePanel('create_test')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<FilePlus2 size={17}/>} text="Create Grading"
                                 isActive={activePanel === 'create_grading_schemes'}
                                 onClick={() => setActivePanel('create_grading_schemes')} isSidebarOpen={isSidebarOpen}/>
                </nav>

                {/* Bottom links */}
                <div className="px-3 py-3 border-t border-[#E4E6EB] space-y-0.5">
                    <SidebarLink icon={<ListChecks size={17}/>} text="Go to Exams"
                                 isActive={false} onClick={() => navigate('/exams')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<Users size={17}/>} text="Users"
                                 isActive={activePanel === 'users_list'}
                                 onClick={() => setActivePanel('users_list')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<Settings size={17}/>} text="Settings"
                                 isActive={activePanel === 'settings'}
                                 onClick={() => setActivePanel('settings')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<LogOut size={17}/>} text="Log out"
                                 isActive={false} onClick={logout} isSidebarOpen={isSidebarOpen} danger/>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Top bar */}
                <header className="flex-shrink-0 flex items-center justify-between h-[60px] px-6 bg-white border-b border-[#E4E6EB]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 rounded-full text-[#606770] hover:bg-[#F0F2F5] transition-colors"
                        >
                            {isSidebarOpen ? <ChevronsLeft size={18}/> : <ChevronsRight size={18}/>}
                        </button>
                        {panelTitles[activePanel] && (
                            <h2 className="text-[#1C1E21] text-[15px] font-semibold">
                                {panelTitles[activePanel]}
                            </h2>
                        )}
                    </div>
                    <DarkModeSwitcher/>
                </header>

                <main className="flex-1 overflow-y-auto bg-[#F0F2F5]">
                    {renderContent()}
                </main>
            </div>

            {overlay && <FullPageOverlay setOverlay={setOverlay} component={overlay}/>}
            {overlayImage && <ImageOverlay setOverlayImage={setOverlayImage} image={overlayImage}/>}
        </div>
    );
}

const SidebarLink = ({icon, text, isActive, onClick, isSidebarOpen, danger = false}) => (
    <button
        onClick={onClick}
        title={!isSidebarOpen ? text : undefined}
        className={`relative flex items-center w-full h-9 rounded-lg transition-colors duration-150 text-[14px] font-medium
            ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center'}
            ${isActive
                ? 'bg-[#E7F3FF] text-[#0866FF]'
                : danger
                    ? 'text-[#65676B] hover:bg-[#FFF0F0] hover:text-[#FA383E]'
                    : 'text-[#606770] hover:bg-[#F0F2F5] hover:text-[#1C1E21]'
            }`}
    >
        {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#0866FF] rounded-r-full"/>
        )}
        <span className={`flex-shrink-0 ${isActive ? 'text-[#0866FF]' : ''}`}>{icon}</span>
        {isSidebarOpen && <span className="truncate">{text}</span>}
    </button>
);
