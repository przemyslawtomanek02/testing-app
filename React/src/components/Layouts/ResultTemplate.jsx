import React, {useMemo, useRef, useState} from "react";
import {ChevronDown, CheckCircle2, XCircle} from "lucide-react";
import gsap from "gsap";
import {RenderUserAnswer, RenderCorrectAnswer} from "../Reusable/ResultBlocks.jsx";

/**
 * Stary UI opakowany w template z propsami.
 *
 * Props:
 * - results: Array<QuestionResult> | null
 * - loading: boolean
 * - title: string
 * - onBack?: () => void
 * - asPage?: boolean
 * - useGsap?: boolean
 */
export default function ResultTemplate({
                                           results,
                                           loading = false,
                                           onBack,
                                           asPage = false,
                                           useGsap = true,
                                       }) {
    const [expanded, setExpanded] = useState([]);
    const refs = useRef([]);

    const toggle = (index) => {
        if (!useGsap) return;

        const el = refs.current[index];
        if (!el) return;

        const isOpen = expanded.includes(index);
        gsap.to(el, {
            maxHeight: isOpen ? 0 : el.scrollHeight,
            opacity: isOpen ? 0 : 1,
            duration: 0.4,
            ease: "power3.inOut",
        });
        setExpanded((prev) => (isOpen ? prev.filter((i) => i !== index) : [...prev, index]));
    };

    const metrics = useMemo(() => {
        if (!Array.isArray(results) || results.length === 0) {
            return {total: 0, got: 0, pct: 0, correctCount: 0, count: 0};
        }
        const total = results.reduce((s, r) => s + (Number(r.points_value) || 0), 0);
        const got = results.reduce((s, r) => s + (Number(r.points_collected) || 0), 0);
        const pct = total > 0 ? (got / total) * 100 : 0;
        const correctCount = results.filter((r) => r.points_collected === r.points_value).length;
        return {total, got, pct, correctCount, count: results.length};
    }, [results]);

    const StatsCard = (
        <div className="bg-white dark:bg-darkCustom-800 rounded-2xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12">
            {loading ? (
                <div className="text-slate-500 dark:text-darkCustom-200">Loading...</div>
            ) : !results || results.length === 0 ? (
                <div className="text-center">
                    <p className="text-slate-500 dark:text-darkCustom-200">No results available.</p>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
                    <div className="text-center">
                        <p className="text-slate-500 dark:text-darkCustom-400 text-sm mb-1">Your Score</p>
                        <p className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-blue-600 dark:text-blue-500">
                            {Math.round(metrics.pct)}%
                        </p>
                    </div>
                    <div className="w-full sm:w-px bg-slate-200 dark:bg-darkCustom-600 h-px sm:h-24"/>
                    <div className="flex-grow grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-4 text-center">

                        <div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-darkCustom-100">
                                {metrics.got} / {metrics.total}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-darkCustom-400">Points
                                Scored</p>
                        </div>
                        <div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-darkCustom-100">
                                {metrics.correctCount} / {metrics.count}
                            </p>
                            <p className="text-sm text-slate-500 whitespace-nowrap dark:text-darkCustom-400">Correct
                                Answers</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const DetailsList =
        !loading && results && results.length > 0 ? (
            <>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-slate-800 dark:text-darkCustom-100">Detailed
                    Analysis</h2>
                <div className="space-y-4">
                    {results.map((result, index) => {
                        const isCorrect = result.points_collected === result.points_value;

                        if (!useGsap) {
                            return (
                                <details
                                    key={result.question_id || index}
                                    className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-md overflow-hidden"
                                >
                                    <summary
                                        className="p-4 sm:p-5 cursor-pointer flex justify-between items-center hover:bg-slate-50 dark:hover:bg-darkCustom-700 transition-colors list-none">
                                        <div className="flex flex-1 min-w-0 items-center gap-2 sm:gap-4 mr-4">
                                            {isCorrect ? (
                                                <CheckCircle2
                                                    className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 dark:text-green-400 shrink-0"/>
                                            ) : (
                                                <XCircle
                                                    className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 dark:text-red-400 shrink-0"/>
                                            )}
                                            <p className="font-semibold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 truncate">
                                                Question {index + 1}: {result.question_text}
                                            </p>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
                                            <span
                                                className="font-bold text-sm sm:text-base text-slate-700 dark:text-darkCustom-200 whitespace-nowrap">
                                                {result.points_collected} / {result.points_value} pts
                                            </span>
                                            <ChevronDown
                                                className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-500 transition-transform duration-300 details-arrow"/>
                                        </div>
                                    </summary>
                                    <div
                                        className="p-4 sm:p-6 border-t border-slate-200 dark:border-darkCustom-700 grid md:grid-cols-2 gap-x-6 gap-y-4 md:gap-x-8 md:gap-y-6">
                                        <div className="md:col-span-2 mb-2">
                                            <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 mb-2 sm:mb-3">Full
                                                Question Text</h4>
                                            <p className="text-sm sm:text-base text-slate-700 dark:text-darkCustom-200">{result.question_text}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-darkCustom-700 p-4 rounded-lg">
                                            <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 mb-2 sm:mb-3">Your
                                                Answer</h4>
                                            <RenderUserAnswer result={result}/>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-darkCustom-700 p-4 rounded-lg">
                                            <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 mb-2 sm:mb-3">Correct
                                                Answer</h4>
                                            <RenderCorrectAnswer result={result}/>
                                        </div>
                                    </div>
                                </details>
                            );
                        }

                        const isOpen = expanded.includes(index);
                        return (
                            <div
                                key={result.question_id || index}
                                className="bg-white dark:bg-darkCustom-800 rounded-xl shadow-md overflow-hidden"
                            >
                                <div
                                    className="p-4 sm:p-5 cursor-pointer flex justify-between items-center hover:bg-slate-50 dark:hover:bg-darkCustom-700 transition-colors"
                                    onClick={() => toggle(index)}
                                >
                                    <div className="flex flex-1 min-w-0 items-center gap-2 sm:gap-4 mr-4">
                                        {isCorrect ? (
                                            <CheckCircle2
                                                className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 dark:text-green-400 shrink-0"/>
                                        ) : (
                                            <XCircle
                                                className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 dark:text-red-400 shrink-0"/>
                                        )}
                                        <p className="font-semibold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 truncate">
                                            Question {index + 1}: {result.question_text}
                                        </p>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
                                        <span
                                            className="font-bold text-sm sm:text-base text-slate-700 dark:text-darkCustom-200 whitespace-nowrap">
                                          {result.points_collected} / {result.points_value} pts
                                        </span>
                                        <ChevronDown
                                            className={`h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-darkCustom-200 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                                        />
                                    </div>
                                </div>
                                <div ref={(el) => (refs.current[index] = el)}
                                     className="max-h-0 opacity-0 overflow-hidden">
                                    <div
                                        className="p-4 sm:p-6 border-t border-slate-200 dark:border-darkCustom-600 grid md:grid-cols-2 gap-x-6 gap-y-4 md:gap-x-8 md:gap-y-6">
                                        <div className="md:col-span-2 md:hidden mb-1 pb-2 border-b border-slate-200 dark:border-darkCustom-600">
                                            <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 mb-2 sm:mb-3">
                                                Question:</h4>
                                            <p className="text-sm sm:text-base text-slate-700 dark:text-darkCustom-200">{result.question_text}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-darkCustom-700 p-4 rounded-lg">
                                            <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 mb-2 sm:mb-3">Your
                                                Answer</h4>
                                            <RenderUserAnswer result={result}/>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-darkCustom-700 p-4 rounded-lg">
                                            <h4 className="font-bold text-base md:text-lg text-slate-800 dark:text-darkCustom-100 mb-2 sm:mb-3">Correct
                                                Answer</h4>
                                            <RenderCorrectAnswer result={result}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        ) : null;

    if (asPage) {
        return (
            <div className="container mx-auto px-4 sm:px-6 pb-16">
                <div className="max-w-4xl mx-auto">
                    {StatsCard}
                    {DetailsList}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-darkCustom-800 rounded-2xl shadow-lg">
            <div className="p-6 sm:p-8">
                {StatsCard}
                {DetailsList}
            </div>
        </div>
    );
}

