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
        <div className="flex h-screen bg-slate-100 dark:bg-darkCustom-800 font-sans">
            {/* Sidebar */}
            <aside
                className={`flex h-screen flex-col bg-[#1c2434] dark:bg-darkCustom-900 text-white transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                {/* Sidebar Header */}
                <div className="flex items-center gap-4 px-4 h-20 border-b border-slate-700 dark:border-darkCustom-600">
                    {/*<LayoutDashboard size={28} className="text-white flex-shrink-0" />*/}
                    <img src="/media/logo.png" alt="Logo" className="h-10 w-auto flex-shrink-0"/>
                    {isSidebarOpen && <h1 className="text-xl font-bold whitespace-nowrap">Admin Panel</h1>}
                </div>

                {/* Main Navigation */}
                <nav className="flex-grow p-4 space-y-2 ">
                    {isSidebarOpen &&
                        <h2 className="px-4 pt-2 pb-2 text-xs font-bold text-slate-500 dark:text-darkCustom-100 uppercase tracking-wider">General</h2>}
                    <SidebarLink icon={<BookOpen size={20}/>} text="Tests"
                                 isActive={['tests', 'edit_test'].includes(activePanel)}
                                 onClick={() => setActivePanel('tests')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<Hash size={20}/>} text="Instances" isActive={activePanel === 'instances'}
                                 onClick={() => setActivePanel('instances')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<BarChart3 size={20}/>} text="Results" isActive={activePanel === 'results'}
                                 onClick={() => setActivePanel('results')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<Percent size={20}/>} text="Grading" isActive={activePanel === 'grading_schemes'}
                                 onClick={() => setActivePanel('grading_schemes')} isSidebarOpen={isSidebarOpen}/>

                    {isSidebarOpen &&
                        <h2 className="px-4 pt-4 pb-2 text-xs font-bold text-slate-500 dark:text-darkCustom-100 uppercase tracking-wider">Creation</h2>}
                    <SidebarLink icon={<PlusSquare size={20}/>} text="Create Test"
                                 isActive={activePanel === 'create_test'} onClick={() => setActivePanel('create_test')}
                                 isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<FilePlus2 size={20}/>} text="Create Grading"
                                 isActive={activePanel === 'create_grading_schemes'}
                                 onClick={() => setActivePanel('create_grading_schemes')}
                                 isSidebarOpen={isSidebarOpen}/>
                </nav>

                <div className="p-4 border-t border-slate-700 dark:border-darkCustom-600 space-y-2">
                    <SidebarLink icon={<ListChecks size={20}/>} text="Go to Exams" isActive={false}
                                 onClick={() => navigate('/exams')} isSidebarOpen={isSidebarOpen}/>

                    <SidebarLink icon={<Users size={20}/>} text="Users List" isActive={activePanel === 'users_list'}
                                 onClick={() => setActivePanel('users_list')} isSidebarOpen={isSidebarOpen}/>

                    <SidebarLink icon={<Settings size={20}/>} text="Settings" isActive={activePanel === 'settings'}
                                 onClick={() => setActivePanel('settings')} isSidebarOpen={isSidebarOpen}/>
                    <SidebarLink icon={<LogOut size={20}/>} text="Logout" onClick={logout}
                                 isSidebarOpen={isSidebarOpen}/>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header
                    className="flex justify-between items-center bg-white dark:bg-darkCustom-900 h-20 px-8 border-b border-slate-200 dark:border-darkCustom-600 flex-shrink-0 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-darkCustom-50">{panelTitles[activePanel] || 'Dashboard'}</h2>
                    <div className="gap-4 flex items-center text-slate-500 dark:text-darkCustom-400">
                        <DarkModeSwitcher></DarkModeSwitcher>
                        <button onClick={toggleSidebar}
                                className="p-2 rounded-full text-slate-500 dark:text-darkCustom-50 hover:bg-slate-200 dark:hover:bg-darkCustom-700 transition-colors">
                            {isSidebarOpen ? <ChevronsLeft size={20}/> : <ChevronsRight size={20}/>}
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>

            {overlay && <FullPageOverlay setOverlay={setOverlay} component={overlay}/>}
            {overlayImage && <ImageOverlay setOverlayImage={setOverlayImage} image={overlayImage}/>}
        </div>
    );
}

const SidebarLink = ({icon, text, isActive, onClick, isSidebarOpen}) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full h-12 text-base font-medium rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-slate-700 dark:bg-darkCustom-700 text-white dark:text-darkCustom-50'
                : 'text-slate-400 hover:bg-slate-700/[0.5] hover:dark:bg-darkCustom-600  hover:text-white dark:text-darkCustom-50 hover:dark:text-darkCustom-50'
        } ${isSidebarOpen ? 'px-4' : 'justify-center'}`}
    >
        {icon}
        {isSidebarOpen && <span className="ml-4 transition-opacity duration-200">{text}</span>}
    </button>
);
