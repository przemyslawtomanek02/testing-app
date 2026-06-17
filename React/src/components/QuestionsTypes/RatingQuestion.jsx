import React from 'react';
import * as Slider from '@radix-ui/react-slider';

export default function RatingQuestion({ question, answer, onAnswerChange }) {
    const extraData = question.extra_data || {};
    const isRangeSelection = extraData.use_range === true;
    const min = extraData.available_range?.[0] ?? 1;
    const max = extraData.available_range?.[1] ?? 5;

    if (isRangeSelection) {
        const selectedRange = answer?.[0]?.selected_range ?? [min, max];
        const handleRangeChange = (newRange) => {
            onAnswerChange({ selected_range: newRange });
        };

        return (
            <div className="my-6">
                <h3 className="mt-5 text-xl text-center text-gray-800 dark:text-darkCustom-100">{question.question}</h3>
                <div className="py-10 px-4 sm:px-8">
                    <Slider.Root
                        className="relative flex items-center select-none touch-none w-full h-5"
                        value={selectedRange}
                        onValueChange={handleRangeChange}
                        min={min}
                        max={max}
                        step={1}
                    >
                        <Slider.Track className="bg-slate-200 dark:bg-darkCustom-600 relative grow rounded-full h-1.5">
                            <Slider.Range className="absolute bg-blue-500 dark:bg-blue-400 rounded-full h-full" />
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
                    <div className="text-center text-lg mt-6 text-gray-700 dark:text-darkCustom-300">
                        Wybrano zakres: <span className="font-bold text-gray-900 dark:text-darkCustom-100">{selectedRange[0]}</span> - <span className="font-bold text-gray-900 dark:text-darkCustom-100">{selectedRange[1]}</span>
                    </div>
                </div>
            </div>
        );
    }

    // SCENARIUSZ 2: Użytkownik wybiera JEDNĄ WARTOŚĆ
    else {
        const selectedValue = answer?.[0]?.chosen_value;
        const scaleOptions = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        const handleRatingSelect = (value) => {
            onAnswerChange({ chosen_value: value });
        };

        return (
            <div className="my-6">
                <h3 className="mt-5 text-xl text-center text-gray-800 dark:text-darkCustom-100">{question.question}</h3>
                <div className="relative pt-8 pb-6">
                    <div className="flex justify-center items-center flex-wrap gap-2 sm:gap-4">
                        {scaleOptions.map((value) => {
                            const isSelected = selectedValue === value;
                            const buttonClasses = `
                                w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
                                text-lg font-bold rounded-full border-2 transition-all duration-200 ease-in-out
                                transform hover:scale-110
                                ${isSelected 
                                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-darkCustom-100 dark:text-darkCustom-1000 dark:border-darkCustom-100 shadow-lg scale-110' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 dark:bg-darkCustom-700 dark:text-darkCustom-200 dark:border-darkCustom-600 dark:hover:border-darkCustom-400'
                                }`;
                            return (
                                <button key={value} type="button" onClick={() => handleRatingSelect(value)} className={buttonClasses} aria-pressed={isSelected}>
                                    {value}
                                </button>
                            );
                        })}
                    </div>
                    <span className="absolute bottom-0 left-0 text-sm text-gray-500 dark:text-darkCustom-400">Minimum</span>
                    <span className="absolute bottom-0 right-0 text-sm text-gray-500 dark:text-darkCustom-400">Maksimum</span>
                </div>
            </div>
        );
    }
}