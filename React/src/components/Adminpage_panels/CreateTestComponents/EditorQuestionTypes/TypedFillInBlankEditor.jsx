import React, { useEffect, useRef } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { CheckCircle } from "lucide-react";

/**
 * Edytor pytania typu TypedFillInBlank.
 *
 * Nauczyciel wpisuje treść zdania/tekstu używając ___ (trzy podkreślenia)
 * jako znaczników luk. Dla każdej wykrytej luki automatycznie pojawia się
 * pole do wpisania poprawnej odpowiedzi.
 *
 * Dane przechowywane w extra_data (jako obiekt/dict):
 *   {
 *     timed_reveal: bool,
 *     reveal_delay: number,
 *     answer_time_limit: number,
 *     parts: [
 *       { type: "text", value: "The cat " },
 *       { type: "blank", correct_answer_id: "0" },
 *       { type: "text", value: " on the mat." },
 *       ...
 *     ]
 *   }
 *
 * Odpowiedzi (answers) – po jednej na każdą lukę:
 *   { id: "0", text: "sat", is_correct: true }
 */
const TypedFillInBlankEditor = ({
  qIndex,
  register,
  control,
  setValue,
  getValues,
}) => {
  const questionText =
    useWatch({ control, name: `questions.${qIndex}.question` }) ?? "";

  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${qIndex}.answers`,
    keyName: "key",
  });

  const prevBlankCount = useRef(0);

  // Synchronizuj liczbę pól odpowiedzi z liczbą luk i aktualizuj extra_data.parts
  useEffect(() => {
    const segments = questionText.split("___");
    const newBlankCount = segments.length - 1;
    const currentAnswers = getValues(`questions.${qIndex}.answers`) || [];
    const currentCount = currentAnswers.length;

    if (newBlankCount > currentCount) {
      for (let i = currentCount; i < newBlankCount; i++) {
        append({ id: i.toString(), text: "", is_correct: true });
      }
    } else if (newBlankCount < currentCount) {
      for (let i = currentCount - 1; i >= newBlankCount; i--) {
        remove(i);
      }
    }

    prevBlankCount.current = newBlankCount;

    // Zbuduj tablicę parts z temp ID = indeks (string)
    const parts = [];
    segments.forEach((seg, i) => {
      if (seg) parts.push({ type: "text", value: seg });
      if (i < newBlankCount) {
        parts.push({ type: "blank", correct_answer_id: i.toString() });
      }
    });

    setValue(
      `questions.${qIndex}.extra_data`,
      { parts },
      { shouldDirty: true },
    );
  }, [questionText]);

  const inputClasses =
    "w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

  const blankCount = questionText
    ? (questionText.match(/___/g) || []).length
    : 0;

  // Podgląd zdania z lukamy
  const renderPreview = () => {
    if (!questionText.trim()) return null;
    const segments = questionText.split("___");
    const nodes = [];
    segments.forEach((seg, i) => {
      if (seg) nodes.push(<span key={`t-${i}`}>{seg}</span>);
      if (i < segments.length - 1) {
        nodes.push(
          <span
            key={`b-${i}`}
            className="inline-block w-20 border-b-2 border-blue-400 mx-1 text-center text-slate-400 text-xs"
          >
            ({i + 1})
          </span>,
        );
      }
    });
    return nodes;
  };

  return (
    <div className="space-y-6">
      {/* Treść pytania */}
      <div>
        <label
          htmlFor={`question-text-${qIndex}`}
          className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1"
        >
          Question Text
        </label>
        <textarea
          id={`question-text-${qIndex}`}
          placeholder={`e.g., The cat ___ on the mat. It ___ there all day.`}
          {...register(`questions.${qIndex}.question`)}
          className={`${inputClasses} max-h-[400px]`}
          rows="3"
        />
        <p className="text-xs text-slate-400 dark:text-darkCustom-500 mt-1">
          Użyj <code className="bg-slate-100 dark:bg-darkCustom-700 px-1 rounded">___</code> (trzy podkreślenia) aby zaznaczyć miejsca na luki.
        </p>
      </div>

      {/* Podgląd */}
      {questionText.trim() && (
        <div className="p-3 bg-slate-50 dark:bg-darkCustom-800 border border-dashed border-slate-300 dark:border-darkCustom-600 rounded-md text-sm text-slate-700 dark:text-darkCustom-200 leading-loose">
          <span className="block text-xs text-slate-400 dark:text-darkCustom-500 mb-1 font-medium uppercase tracking-wide">
            Podgląd dla studenta
          </span>
          {renderPreview()}
        </div>
      )}

      {/* Poprawne odpowiedzi do luk */}
      {blankCount > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">
            Correct Answers{" "}
            <span className="text-slate-400 dark:text-darkCustom-500 font-normal">
              ({blankCount} {blankCount === 1 ? "blank" : "blanks"} detected)
            </span>
          </label>
          {fields.map((field, aIndex) => (
            <div key={field.key} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                {aIndex + 1}
              </span>
              <input
                type="text"
                placeholder={`Correct answer for blank ${aIndex + 1}`}
                {...register(`questions.${qIndex}.answers.${aIndex}.text`, {
                  required: "Answer cannot be empty.",
                })}
                className={`${inputClasses} flex-grow`}
              />
              <CheckCircle
                size={18}
                className="flex-shrink-0 text-green-500 dark:text-green-400"
                title="Marked as correct"
              />
              {/* Ukryte pole is_correct – zawsze true dla tego typu */}
              <input
                type="hidden"
                {...register(
                  `questions.${qIndex}.answers.${aIndex}.is_correct`,
                )}
                value="true"
              />
            </div>
          ))}
          <p className="text-xs text-slate-400 dark:text-darkCustom-500">
            Odpowiedź studenta jest porównywana bez uwzględnienia wielkości liter i białych znaków.
          </p>
        </div>
      )}

      {blankCount === 0 && questionText.trim() && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Brak luk — dodaj <code className="bg-slate-100 dark:bg-darkCustom-700 px-1 rounded">___</code> do treści pytania.
        </p>
      )}
    </div>
  );
};

export default TypedFillInBlankEditor;
