import React, {useEffect, useRef} from "react";
import {useFieldArray, useWatch} from "react-hook-form";
import {CheckCircle} from "lucide-react";

const TypedFillInBlankEditor = ({qIndex, register, control, setValue, getValues}) => {
    const questionText = useWatch({control, name: `questions.${qIndex}.question`}) ?? "";
    const {fields, append, remove} = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
        keyName: "key",
    });
    const prevBlankCount = useRef(0);

    useEffect(() => {
        const segments = questionText.split("___");
        const newBlankCount = segments.length - 1;
        const currentAnswers = getValues(`questions.${qIndex}.answers`) || [];
        const currentCount = currentAnswers.length;

        if (newBlankCount > currentCount) {
            for (let i = currentCount; i < newBlankCount; i++) {
                append({id: i.toString(), text: "", is_correct: true});
            }
        } else if (newBlankCount < currentCount) {
            for (let i = currentCount - 1; i >= newBlankCount; i--) {
                remove(i);
            }
        }
        prevBlankCount.current = newBlankCount;

        const parts = [];
        segments.forEach((seg, i) => {
            if (seg) parts.push({type: "text", value: seg});
            if (i < newBlankCount) parts.push({type: "blank", correct_answer_id: i.toString()});
        });
        setValue(`questions.${qIndex}.extra_data`, {parts}, {shouldDirty: true});
    }, [questionText]);

    const inputCls = "w-full px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    const blankCount = questionText ? (questionText.match(/___/g) || []).length : 0;

    const renderPreview = () => {
        if (!questionText.trim()) return null;
        const segments = questionText.split("___");
        const nodes = [];
        segments.forEach((seg, i) => {
            if (seg) nodes.push(<span key={`t-${i}`}>{seg}</span>);
            if (i < segments.length - 1) {
                nodes.push(
                    <span key={`b-${i}`} className="inline-block w-20 border-b-2 border-[#0866FF] mx-1 text-center text-[#BEC3C9] text-xs">
                        ({i + 1})
                    </span>
                );
            }
        });
        return nodes;
    };

    return (
        <div className="space-y-5">
            <div>
                <label htmlFor={`qt-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
                    Question Text
                </label>
                <textarea
                    id={`qt-${qIndex}`}
                    placeholder="e.g., The cat ___ on the mat. It ___ there all day."
                    {...register(`questions.${qIndex}.question`)}
                    className={`${inputCls} max-h-[400px]`}
                    rows="3"
                />
                <p className="text-xs text-[#BEC3C9] mt-1">
                    Użyj <code className="bg-[#F0F2F5] px-1 rounded text-[#65676B]">___</code> (trzy podkreślenia) aby zaznaczyć miejsca na luki.
                </p>
            </div>

            {questionText.trim() && (
                <div className="p-3 bg-[#F0F2F5] border border-dashed border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] leading-loose">
                    <span className="block text-xs text-[#BEC3C9] mb-1 font-medium uppercase tracking-wide">Podgląd dla studenta</span>
                    {renderPreview()}
                </div>
            )}

            {blankCount > 0 && (
                <div className="space-y-2.5">
                    <label className="block text-sm font-medium text-[#1C1E21]">
                        Correct Answers{" "}
                        <span className="text-[#BEC3C9] font-normal">({blankCount} {blankCount === 1 ? "blank" : "blanks"} detected)</span>
                    </label>
                    {fields.map((field, aIndex) => (
                        <div key={field.key} className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E7F3FF] text-[#0866FF] text-xs font-bold flex items-center justify-center">
                                {aIndex + 1}
                            </span>
                            <input
                                type="text"
                                placeholder={`Correct answer for blank ${aIndex + 1}`}
                                {...register(`questions.${qIndex}.answers.${aIndex}.text`, {required: "Answer cannot be empty."})}
                                className={`${inputCls} flex-grow`}
                            />
                            <CheckCircle size={18} className="flex-shrink-0 text-green-500" title="Marked as correct"/>
                            <input type="hidden" {...register(`questions.${qIndex}.answers.${aIndex}.is_correct`)} value="true"/>
                        </div>
                    ))}
                    <p className="text-xs text-[#BEC3C9]">
                        Odpowiedź studenta jest porównywana bez uwzględnienia wielkości liter i białych znaków.
                    </p>
                </div>
            )}

            {blankCount === 0 && questionText.trim() && (
                <p className="text-sm text-amber-600">
                    Brak luk — dodaj <code className="bg-[#F0F2F5] px-1 rounded">___</code> do treści pytania.
                </p>
            )}
        </div>
    );
};

export default TypedFillInBlankEditor;
