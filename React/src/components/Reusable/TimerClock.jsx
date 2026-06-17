import React, {useEffect, useRef, useState} from 'react';
import {motion} from 'framer-motion';

export default function TimerClock({totalTime, onTimeEnd}) {
    const [timeLeft, setTimeLeft] = useState(totalTime);
    const intervalRef = useRef(null);
    const startTimestampRef = useRef(Date.now());
    const totalDurationRef = useRef(totalTime);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTimestampRef.current) / 1000);
            const newTimeLeft = totalDurationRef.current - elapsedSeconds;

            if (newTimeLeft <= 0) {
                clearInterval(intervalRef.current);
                setTimeLeft(0);
                onTimeEnd();
            } else {
                setTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, []);

    const percentage = timeLeft / totalDurationRef.current;
    const isDanger = percentage <= 0.2;

    const getProgressBarColorClass = () => {
        if (isDanger) {
            return 'stroke-red-600';
        }
        if (percentage > 0.5) {
            return 'stroke-green-500';
        }
        return 'stroke-yellow-500';
    };

    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage * circumference);

    return (
        <svg
            viewBox="-60 -60 120 120"
            width="100"
            height="100"
            className="block w-20 h-20 sm:w-24 sm:h-24"
        >
            <motion.g
                initial={{opacity: 0}}
                animate={isDanger ? {opacity: [1, 0.5, 1]} : {opacity: 1}}
                transition={isDanger ? {duration: 1, repeat: Infinity} : {}}
            >
                <circle
                    r={radius}
                    strokeWidth={10}
                    className="fill-slate-100 stroke-slate-100 dark:fill-darkCustom-700 dark:stroke-darkCustom-700"
                />
                <circle
                    r={radius}
                    fill="none"
                    strokeWidth={10}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={`${getProgressBarColorClass()} transition-[stroke-dashoffset] duration-1000 linear`}
                />
            </motion.g>
            <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="30"
                className="fill-slate-800 dark:fill-darkCustom-100 text-2xl sm:text-3xl font-bold md:font-normal"
            >
                {`${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`}
            </text>
        </svg>
    );
}
