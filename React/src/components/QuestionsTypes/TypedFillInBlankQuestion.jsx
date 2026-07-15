import React, { useState, useEffect } from "react";

export default function TypedFillInBlankQuestion({
  question,
  answer,
  onAnswerChange,
  hideQuestionText,
}) {
  const parts = question.extra_data?.parts || [];
  const blanks = parts.filter((p) => p.type === "blank");

  // inputs: { [answer_id]: typed_text }
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    if (Array.isArray(answer) && answer.length > 0) {
      const restored = {};
      answer.forEach((item) => {
        if (item.answer_id) restored[item.answer_id] = item.typed_text || "";
      });
      setInputs(restored);
    } else {
      const init = {};
      blanks.forEach((b) => {
        init[b.correct_answer_id] = "";
      });
      setInputs(init);
    }
  }, [question.question_id]);

  const handleChange = (answerId, value) => {
    const updated = { ...inputs, [answerId]: value };
    setInputs(updated);
    const response = blanks.map((b) => ({
      answer_id: b.correct_answer_id,
      typed_text: updated[b.correct_answer_id] || "",
    }));
    onAnswerChange(response);
  };

  let blankCounter = 0;

  return (
    <div className="my-6 space-y-4">
      {!hideQuestionText && (
        <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-darkCustom-200">
          Fill in the blanks:
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-y-3 gap-x-1 text-base leading-relaxed text-slate-800 dark:text-darkCustom-100">
        {parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <span key={index} className="whitespace-pre-wrap">
                {part.value}
              </span>
            );
          }
          if (part.type === "blank") {
            blankCounter++;
            const answerId = part.correct_answer_id;
            return (
              <input
                key={index}
                type="text"
                value={inputs[answerId] || ""}
                onChange={(e) => handleChange(answerId, e.target.value)}
                placeholder={`(${blankCounter})`}
                className="inline-block w-28 sm:w-36 border-0 border-b-2 border-blue-400 bg-transparent px-1 py-0.5 text-center text-slate-800 dark:text-darkCustom-100 placeholder-slate-400 dark:placeholder-darkCustom-500 focus:outline-none focus:border-blue-600 dark:border-blue-400 dark:focus:border-blue-200 transition-colors"
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
