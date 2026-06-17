import React, {useEffect} from 'react';
import {useTestContext} from './Context/TestContext.jsx';
import {useNavigate} from "react-router-dom";
import {Header} from "./Layouts/Header.jsx";
import ResultTemplate from "./Layouts/ResultTemplate.jsx";

const ResultPage = () => {
    const navigate = useNavigate()
    const {userResults} = useTestContext();

    useEffect(() => {
        const handlePopState = () => {
            navigate('/exams');
        };
        window.history.pushState(null, "", window.location.href);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navigate]);


    // To Debug: Uncomment the following line to fetch results on component mount
    // useEffect(() => {
    //     if (fetchUserResults) {
    //         fetchUserResults();
    //     }
    // }, []);

    return (
        <div className="bg-slate-100 dark:bg-darkCustom-900 min-h-screen">
            <Header variant="result"/>
            <main className="container mx-auto px-4 sm:px-6 py-16">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-slate-900 dark:text-darkCustom-100">Exam Results</h1>
                    <p className="text-center text-lg text-slate-500 dark:text-darkCustom-400 mb-12">{userResults?.[0]?.instance_name || "Brakuje nazwy"}</p>

                    <ResultTemplate
                        results={userResults}
                        loading={!userResults}
                        asPage
                        useGsap
                        onBack={() => navigate("/exams")}
                    />
                </div>
            </main>
        </div>
    );
};

export default ResultPage;