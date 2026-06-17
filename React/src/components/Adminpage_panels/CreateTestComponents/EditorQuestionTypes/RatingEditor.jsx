import React, {memo} from 'react';
import {useWatch} from 'react-hook-form';
import {Circle, CheckCircle} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import * as Slider from '@radix-ui/react-slider';

const RatingEditor = memo(({qIndex, control, register, setValue}) => {
    const extra = useWatch({control, name: `questions.${qIndex}.extra_data`}) || {};

    // --- Stany i wartości pochodne ---
    const hasCorrect = extra.correct_enabled || false;
    const useRange = extra.use_range || false;
    const min = extra.available_range?.[0] ?? 1;
    const max = extra.available_range?.[1] ?? 10;
    const correctValue = extra.correct_value ?? min;
    const correctRange = extra.correct_range ?? [min, max];

    const MAX_SCALE_LIMIT = 10;

    const updateAvailableRange = (side, value) => {
        let num = parseInt(value, 10);
        if (isNaN(num)) num = (side === 'min') ? 1 : 10;
        let newMin = min, newMax = max;
        if (side === 'min') {
            if (num < 1) num = 1;
            if (num >= max) num = max - 1;
            newMin = num;
        } else {
            if (num > MAX_SCALE_LIMIT) num = MAX_SCALE_LIMIT;
            if (num <= min) num = min + 1;
            newMax = num;
        }
        setValue(`questions.${qIndex}.extra_data.available_range`, [newMin, newMax]);
        if (correctRange[0] < newMin || correctRange[1] > newMax) setValue(`questions.${qIndex}.extra_data.correct_range`, [newMin, newMax]);
        if (correctValue < newMin || correctValue > newMax) setValue(`questions.${qIndex}.extra_data.correct_value`, newMin);
    };

    const inputClasses = "w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    const ToggleButton = ({checked, onChange}) => (
        <button type="button" onClick={onChange}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-darkCustom-900 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-darkCustom-400'
                }`}
                aria-checked={checked}>
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-all duration-200 ease-in-out ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}/>
        </button>
    );

    return (
        <div className="space-y-6 pb-4">
            <div>
                <label
                    className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Question</label>
                <textarea {...register(`questions.${qIndex}.question`, {required: "Question text cannot be empty."})}
                          className={inputClasses} rows="3"/>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-2">
                    Scale Settings</label>
                <div
                    className="flex justify-center items-center gap-4 p-4 rounded-md border border-slate-200 dark:border-darkCustom-700">
                    <div className="w-20">
                        <label
                            className="flex justify-center text-xs font-medium text-slate-500 dark:text-darkCustom-400 mb-1">Min</label>
                        <input type="number" value={min} onChange={(e) => updateAvailableRange('min', e.target.value)}
                               className={inputClasses}/>
                    </div>
                    <div className="px-4 mx-1 pt-4 text-center text-sm text-slate-700 dark:text-darkCustom-300">Scale
                        from {min} to {max}</div>
                    <div className="w-20">
                        <label
                            className="flex justify-center text-xs font-medium text-slate-500 dark:text-darkCustom-400 mb-1">Max</label>
                        <input type="number" value={max} onChange={(e) => updateAvailableRange('max', e.target.value)}
                               className={inputClasses}/>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div
                    className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-darkCustom-700">
                    <label className="text-sm font-medium text-slate-700 dark:text-darkCustom-200">This question can be
                        scored</label>
                    <ToggleButton checked={hasCorrect} onChange={() => setValue(`questions.${qIndex}.extra_data.correct_enabled`, !hasCorrect)} />
                </div>

                <AnimatePresence initial={false}>
                    {hasCorrect && (
                        <motion.div
                            key="content"
                            initial={{opacity: 0, height: 0, marginTop: 0}}
                            animate={{opacity: 1, height: 'auto', marginTop: '0.75rem'}}
                            exit={{opacity: 0, height: 0, marginTop: 0}}
                            transition={{duration: 0.3, ease: 'easeInOut'}}
                            className="p-4 border border-slate-200 dark:border-darkCustom-700 rounded-md space-y-4 overflow-hidden"
                        >

                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-darkCustom-200">
                                    Use a range for the correct answer
                                </label>
                                <ToggleButton checked={useRange}
                                              onChange={() => setValue(`questions.${qIndex}.extra_data.use_range`, !useRange)}/>
                            </div>

                            <AnimatePresence mode="wait">
                                {useRange ? (
                                    <motion.div
                                        key="slider"
                                        initial={{opacity: 0}}
                                        animate={{opacity: 1}}
                                        exit={{opacity: 0}}
                                        transition={{duration: 0.2}}
                                    >
                                        <div className="pt-6 px-4">
                                            <Slider.Root
                                                className="relative flex items-center select-none touch-none w-full h-5"
                                                value={correctRange}
                                                onValueChange={(newRange) => setValue(`questions.${qIndex}.extra_data.correct_range`, newRange)}
                                                min={min}
                                                max={max}
                                                step={1}
                                            >
                                                <Slider.Track
                                                    className="bg-slate-200 dark:bg-darkCustom-600 relative grow rounded-full h-1.5">
                                                    <Slider.Range
                                                        className="absolute bg-blue-500 dark:bg-blue-400 rounded-full h-full"/>
                                                </Slider.Track>
                                                <Slider.Thumb
                                                    className="block w-5 h-5 bg-white dark:bg-darkCustom-100 shadow-md rounded-full border-2 border-blue-500 dark:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                    aria-label="Value"
                                                />
                                                <Slider.Thumb
                                                    className="block w-5 h-5 bg-white dark:bg-darkCustom-100 shadow-md rounded-full border-2 border-blue-500 dark:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                    aria-label="Value"
                                                />
                                            </Slider.Root>
                                            <div
                                                className="text-sm text-center mt-2 text-slate-600 dark:text-darkCustom-400">Correct
                                                range: {correctRange[0]} to {correctRange[1]}</div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="buttons"
                                        initial={{opacity: 0}}
                                        animate={{opacity: 1}}
                                        exit={{opacity: 0}}
                                        transition={{duration: 0.2}}
                                    >
                                        <div className="flex justify-center items-center flex-wrap gap-2 py-2">
                                            {Array.from({length: max - min + 1}, (_, i) => min + i).map(val => (
                                                <button key={val} type="button"
                                                        onClick={() => setValue(`questions.${qIndex}.extra_data.correct_value`, val)}
                                                        className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkCustom-700">
                                                    {correctValue === val ?
                                                        <CheckCircle className="text-green-600 dark:text-green-400"/> :
                                                        <Circle className="text-slate-400 dark:text-darkCustom-500"/>}
                                                    <span className="font-medium dark:text-darkCustom-100">{val}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});

export default RatingEditor;