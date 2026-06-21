import React from "react";
import { Circle, CheckCircle } from "lucide-react";

export default function SingleChoiceQuestion({
  question,
  answer,
  onAnswerChange,
  hideQuestionText = false,
}) {
  const handleKeyDown = (e, ans) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onAnswerChange(ans);
    }
  };

  return (
    <div className="flex flex-col gap-4 my-6">
      {!hideQuestionText && (
        <p className="mt-5 text-lg sm:text-xl text-gray-800 dark:text-darkCustom-100">
          {question.question}
        </p>
      )}

      <div className="space-y-3 mt-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-300">
          Choose one answer
        </label>
        <div role="radiogroup" className="space-y-3">
          {question.answers.map((ans) => {
            const isSelected = answer?.[0]?.answer_id === ans.answer_id;

            return (
              <div
                key={ans.answer_id}
                onClick={() => onAnswerChange(ans)}
                onKeyDown={(e) => handleKeyDown(e, ans)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                className={`flex items-center gap-3 p-3 sm:p-4 border border-transparent rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-300
                                    ${
                                      isSelected
                                        ? "bg-green-100 border border-green-300 dark:bg-green-500/10 dark:border-green-500/30"
                                        : "bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-darkCustom-700 dark:hover:bg-darkCustom-600"
                                    }`}
              >
                {isSelected ? (
                  <CheckCircle
                    size={22}
                    className="text-green-600 dark:text-green-400 flex-shrink-0"
                  />
                ) : (
                  <Circle
                    size={22}
                    className="text-slate-400 dark:text-darkCustom-500 flex-shrink-0"
                  />
                )}

                <span className="text-base text-slate-800 dark:text-darkCustom-100">
                  {ans.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
