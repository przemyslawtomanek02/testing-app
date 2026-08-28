import {lazy, Suspense} from 'react';
import {Outlet, Route, Routes} from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import SuspensePage from "./components/Suspense";
import {TestProvider} from "./components/Context/TestContext";
import {ToastContainer} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import SessionGuard from "./components/Validators/SessionGuard.jsx";
import {useAppContext} from "./AppContext.jsx";
import StudentLayout from "./components/Layouts/StudentLayout.jsx";


const Welcomepage = lazy(() => import('./components/Welcomepage'));
const Examspage = lazy(() => import('./components/Examspage'));
const LoginToAdminpage = lazy(() => import('./components/LoginToAdminpage'));
const Adminpage = lazy(() => import('./components/Adminpage'));
const Solvingtestpage = lazy(() => import('./components/Solvingtestpage'));
const ResultPage = lazy(() => import('./components/ResultPage'));
const UserPage = lazy(() => import('./components/UserPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const CoursesListPage = lazy(() => import('./components/CoursesListPage'));
const CourseReaderPage = lazy(() => import('./components/CourseReaderPage'));

const TestLayout = () => (
    <TestProvider>
        <Outlet/>
    </TestProvider>
);

const App = () => {

    const {config, darkMode} = useAppContext();

    return (
        <Suspense fallback={<SuspensePage/>}>
            <Routes>
                {/* --- Trasy Publiczne --- */}
                <Route path="/" element={<Welcomepage/>}/>
                <Route path="/admin" element={<LoginToAdminpage/>}/>

                {/* --- Chronione Trasy Użytkownika --- */}
                <Route element={<SessionGuard/>}>
                    <Route element={<TestLayout/>}>

                        {/* Strony z bocznym panelem nawigacyjnym */}
                        <Route element={<StudentLayout/>}>
                            <Route path="/exams" element={<Examspage/>}/>
                            <Route path="/result" element={<ResultPage/>}/>
                            {config && !config.open_mode && (
                                <Route path="/profile" element={<UserPage/>}/>
                            )}
                            <Route path="/courses" element={<CoursesListPage/>}/>
                        </Route>

                        {/* Strona egzaminu — bez sidebara */}
                        <Route path="/test" element={<Solvingtestpage/>}/>
                        {/* Czytnik kursu — bez sidebara, pełny ekran jak /test */}
                        <Route path="/courses/:courseId" element={<CourseReaderPage/>}/>

                    </Route>
                </Route>

                {/* --- Chroniona Trasa Admina --- */}
                <Route path="/admin_panel" element={<PrivateRoute><Adminpage/></PrivateRoute>}/>

                {/* --- Trasa 404 --- */}
                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>

            <ToastContainer position="top-right" autoClose={3000} theme={darkMode ? "dark" : "light"} className="my-toast-container"/>
        </Suspense>
    )
};
export default App;
