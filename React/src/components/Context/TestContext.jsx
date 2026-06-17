import {createContext, useCallback, useContext, useRef, useState} from 'react';
import {useNavigate} from "react-router-dom";
import {toast} from "react-toastify";

export const TestContext = createContext();

export const TestProvider = ({children}) => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [testTime, setTestTime] = useState(0);
    const [testMeta, setTestMeta] = useState({});
    const [isTestFinished, setIsTestFinished] = useState(false);
    const [userActivityId, setUserActivityId] = useState(null);
    const [userResults, setUserResults] = useState([]);
    const navigate = useNavigate();
    const answerQueue = useRef(Promise.resolve());

    const resetTestContext = () => {
        setQuestions([]);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setTestTime(0);
        setTestMeta({});
        setIsTestFinished(false);
        setUserActivityId(null);
        setUserResults([]);
        answerQueue.current = Promise.resolve();
    };

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const startTest = async (instanceId) => {
        resetTestContext();

        try {
            const res = await fetch(`/api/start_instance/${instanceId}`, {method: 'POST'});
            const data = await res.json();

            if (data.redirectToResults) {
                toast.info("You have already completed this test. Showing your results.");
                await fetchUserResults()
                navigate('/result');
                void clearActivitySession();

                return {redirected: true};
            }

            if (!res.ok) {
                return {error: data.error || 'Unexpected error occurred'};
            }

            const shuffledQuestions = data.questions.map((q) => ({
                ...q,
                answers: shuffleArray([...q.answers]),
            }));

            setQuestions(shuffledQuestions);
            setAnswers(Array(shuffledQuestions.length).fill(null));
            setTestTime(typeof data.remaining_time_seconds === 'number' ? data.remaining_time_seconds : data.test_time * 60);
            setTestMeta({
                test_instance_id: instanceId,
                name: data.instance_name,
                description: data.test_description,
                maxScore: data.max_score_for_activity,
                testName: data.test_name,
            });
            setUserActivityId(data.user_activity_id);

            navigate('/test');
            console.log(shuffledQuestions)

        } catch (error) {
            console.error('Error starting test:', error);
            resetTestContext()
            return {error: 'Network or server error. Please try again later.'};
        }
    };

    const clearActivitySession = async () => {
        try {
            await fetch('/api/clear_activity_session', {method: 'POST'});
        } catch (error) {
            console.error("Failed to clear activity session:", error);
        }
    };

    const saveAnswer = useCallback((answer) => {
        const normalized = Array.isArray(answer) ? answer : [answer];

        setAnswers((prev) => {
            const updated = [...prev];
            updated[currentQuestionIndex] = normalized;
            return updated;
        });
    }, [currentQuestionIndex]);

    const goToNextQuestion = async () => {
        if (isTestFinished) return;

        const currentQ = questions[currentQuestionIndex];
        const selectedAnswer = answers[currentQuestionIndex];

        const dataToFetch = {
            test_instance_id: testMeta.test_instance_id,
            question_id: currentQ.question_id,
            question_type: currentQ.type,
            user_response: selectedAnswer,
            question_number: currentQuestionIndex + 1,
        };

        console.log(dataToFetch);
        await fetchUserAnswer(dataToFetch);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        } else {
            void finishTest();
        }
    };

    const fetchUserAnswer = (dataToFetch, retries = 5, delay = 1000) => {
        const send = async () => {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const response = await fetch('/api/user_answer', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        credentials: 'include',
                        body: JSON.stringify(dataToFetch),
                    });

                    if (response.ok) {
                        console.log(`✅ [Answer saved] ${dataToFetch.question_id} (attempt ${attempt})`);
                        return true;
                    } else {
                        const errorData = await response.json();
                        console.warn(`❌ [Attempt ${attempt}] Upload failed:`, errorData);
                        if (response.status === 400 && errorData.detail === "Test has already been finished.") {
                        console.warn("🏁 Test already finished on server. Redirecting to results.");
                        setIsTestFinished(true);
                        await fetchUserResults();
                        navigate('/result');
                        await clearActivitySession()
                        return 'ALREADY_FINISHED';
                    }
                    }
                } catch (error) {
                    console.warn(`⚠️ [Attempt ${attempt}] Network error:`, error);
                }

                await new Promise((res) => setTimeout(res, delay));
            }

            console.error(`🚨 Failed to save answer after ${retries} attempts:`, dataToFetch);
            return false;
        };

        return answerQueue.current = answerQueue.current.then(() => send());
    };

    const fetchUserResults = async () => {
        try {
            const res = await fetch('/api/user_results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch user results');
            const data = await res.json();
            setUserResults(data);
            console.log("User results fetched:", data);
        } catch (error) {
            console.error('Error fetching user results:', error);
        }
    };

    const finishTest = async () => {
        if (isTestFinished) return;
        setIsTestFinished(true);

        const finalizationPromise = async () => {
            await answerQueue.current;

            const response = await fetch('/api/end_user_activity', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to finalize test.");
            }

            const finalResults = await response.json();
            console.log("Final results:", finalResults);
            setUserResults(finalResults);
        };

        try {
            await toast.promise(
                finalizationPromise(),
                {
                    pending: 'Finishing test. Please wait...',
                    success: 'Test finished successfully! You can now see your results!',
                    error: {
                        render({data}) {
                            return data.message || "An error occurred."
                        }
                    }
                }
            );
            navigate('/result');
        } catch (e) {
            console.error("Finalization failed:", e);
            navigate('/exams');
        }
    };

    return (
        <TestContext.Provider
            value={{
                questions,
                answers,
                currentQuestionIndex,
                goToNextQuestion,
                saveAnswer,
                startTest,
                testTime,
                testMeta,
                isTestFinished,
                finishTest,
                userActivityId,
                userResults,
                fetchUserResults,
            }}
        >
            {children}
        </TestContext.Provider>
    );
};

export const useTestContext = () => useContext(TestContext);
