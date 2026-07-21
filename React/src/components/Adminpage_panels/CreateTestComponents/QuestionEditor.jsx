import React, { useEffect } from "react";
import { Trash2, UploadCloud } from "lucide-react";
import { QuestionDefaults } from "./EditorQuestionTypes/QuestionDefaults.jsx";
import SingleChoiceEditor from "./EditorQuestionTypes/SingleChoiceEditor";
import MultipleChoiceEditor from "./EditorQuestionTypes/MultipleChoiceEditor";
import TrueFalseEditor from "./EditorQuestionTypes/TrueFalseEditor";
import DragAndDropOrderEditor from "./EditorQuestionTypes/DragAndDropOrderEditor";
import FillInTheBlankEditor from "./EditorQuestionTypes/FillInTheBlankEditor";
import RatingEditor from "./EditorQuestionTypes/RatingEditor.jsx";
import MatchingMultipleEditor from "./EditorQuestionTypes/MatchingMultipleEditor.jsx";
import TypedFillInBlankEditor from "./EditorQuestionTypes/TypedFillInBlankEditor.jsx";

const QuestionEditor = ({
  question,
  qIndex,
  register,
  control,
  setValue,
  getValues,
  watch,
  image,
  existingImagePath,
  onImageUpload,
  onImageDelete,
  removeQuestion,
  showOverlay,
}) => {
  const handleTypeChange = (index, newType) => {
    const current = getValues(`questions.${index}`);
    const base = JSON.parse(JSON.stringify(QuestionDefaults[newType]));
    const updated = {
      ...base,
      question: current.question || "",
      points_value: current.points_value || 1,
      key: current.key,
    };
    setValue(`questions.${index}`, updated, { shouldDirty: true });
  };

  const handleLocalImageDelete = () => {
    onImageDelete(qIndex);
    const currentQuestion = getValues(`questions.${qIndex}`);
    if (currentQuestion.imageError) {
      setValue(`questions.${qIndex}.imageError`, "");
    }
  };

  const type = watch(`questions.${qIndex}.type`);
  const isCorrectEnabled = watch(`questions.${qIndex}.extra_data.correct_enabled`);
  const isTimedReveal = watch(`questions.${qIndex}.extra_data.timed_reveal`);
  const supportsTimedReveal = type === "SingleChoice" || type === "MultipleChoice";

  useEffect(() => {
    const currentPoints = getValues(`questions.${qIndex}.points_value`);
    if (type === "Rating") {
      if (isCorrectEnabled === false && currentPoints !== 0) {
        setValue(`questions.${qIndex}.points_value`, 0, { shouldDirty: true });
      } else if (isCorrectEnabled === true && currentPoints === 0) {
        setValue(`questions.${qIndex}.points_value`, 1, { shouldDirty: true });
      }
    }
  }, [type, isCorrectEnabled, qIndex, setValue, getValues]);

  const renderQuestionBody = () => {
    const props = { qIndex, register, control, setValue, getValues, watch };
    switch (type) {
      case "SingleChoice":    return <SingleChoiceEditor {...props} />;
      case "MultipleChoice":  return <MultipleChoiceEditor {...props} />;
      case "TrueFalse":       return <TrueFalseEditor {...props} />;
      case "DragAndDropOrder": return <DragAndDropOrderEditor {...props} />;
      case "FillInTheBlank":  return <FillInTheBlankEditor {...props} />;
      case "Rating":          return <RatingEditor {...props} />;
      case "MatchingMultiple": return <MatchingMultipleEditor {...props} />;
      case "TypedFillInBlank": return <TypedFillInBlankEditor {...props} />;
      default:
        return <p className="text-red-500">Unsupported question type: {type}</p>;
    }
  };

  const isPointsInputDisabled = type === "Rating" && !isCorrectEnabled;

  const inputCls = "w-full px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

  return (
    <div className="bg-white p-4 grid md:grid-cols-3 gap-6 relative">
      {qIndex > 0 && (
        <button
          type="button"
          onClick={() => removeQuestion(qIndex)}
          className="absolute top-0 right-3 p-1.5 text-[#BEC3C9] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={20} />
        </button>
      )}

      {/* Left column: question editor */}
      <div className="md:col-span-2 space-y-4">
        <h3 className="text-base font-semibold text-[#1C1E21]">Question {qIndex + 1}</h3>
        <div>{renderQuestionBody()}</div>
      </div>

      {/* Right column: question settings */}
      <div className="space-y-4 md:border-l md:border-[#E4E6EB] md:pl-6 md:pt-1">
        <div>
          <label htmlFor={`qt-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
            Question Type
          </label>
          <select
            id={`qt-${qIndex}`}
            value={type}
            onChange={(e) => handleTypeChange(qIndex, e.target.value)}
            className={inputCls}
          >
            <option value="SingleChoice">Single Choice</option>
            <option value="MultipleChoice">Multiple Choice</option>
            <option value="TrueFalse">True/False</option>
            <option value="DragAndDropOrder">Drag and Drop Order</option>
            <option value="FillInTheBlank">Fill In The Blank</option>
            <option value="Rating">Rating</option>
            <option value="MatchingMultiple">Matching Multiple</option>
            <option value="TypedFillInBlank">Typed Fill in the Blank</option>
          </select>
        </div>

        <div>
          <label htmlFor={`pv-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
            Points
          </label>
          <input
            id={`pv-${qIndex}`}
            type="number"
            min="0"
            disabled={isPointsInputDisabled}
            {...register(`questions.${qIndex}.points_value`, { valueAsNumber: true, min: 0, value: 1 })}
            className={`${inputCls} ${isPointsInputDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </div>

        {supportsTimedReveal && (
          <div className="rounded-xl border border-[#E4E6EB] p-3 space-y-3 bg-[#F0F2F5]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register(`questions.${qIndex}.extra_data.timed_reveal`)}
                className="w-4 h-4 rounded border-[#E4E6EB] text-[#0866FF] focus:ring-[#0866FF]/20 accent-[#0866FF]"
              />
              <span className="text-sm font-medium text-[#1C1E21]">
                Timed reveal (czytanie + odpowiedź)
              </span>
            </label>

            {isTimedReveal && (
              <div className="space-y-3">
                <div>
                  <label htmlFor={`rd-${qIndex}`} className="block text-sm text-[#65676B] mb-1">
                    Czas czytania (sekundy)
                  </label>
                  <input
                    id={`rd-${qIndex}`}
                    type="number"
                    min="1"
                    max="60"
                    {...register(`questions.${qIndex}.extra_data.reveal_delay`, { valueAsNumber: true, min: 1, value: 3 })}
                    className={inputCls}
                  />
                  <p className="text-xs text-[#BEC3C9] mt-1">
                    Pytanie będzie widoczne przez ten czas, potem zniknie i pojawią się odpowiedzi.
                  </p>
                </div>
                <div>
                  <label htmlFor={`at-${qIndex}`} className="block text-sm text-[#65676B] mb-1">
                    Czas na odpowiedź (sekundy)
                  </label>
                  <input
                    id={`at-${qIndex}`}
                    type="number"
                    min="0"
                    max="300"
                    {...register(`questions.${qIndex}.extra_data.answer_time_limit`, { valueAsNumber: true, min: 0, value: 15 })}
                    className={inputCls}
                  />
                  <p className="text-xs text-[#BEC3C9] mt-1">
                    Po tym czasie nastąpi automatyczne przejście. Wpisz 0, aby wyłączyć limit.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#1C1E21] mb-1.5">Image Attachment</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              id={`img-${qIndex}`}
              accept="image/*"
              onChange={(e) => onImageUpload(qIndex, e.target.files[0])}
              className="hidden"
            />
            <label
              htmlFor={`img-${qIndex}`}
              className="flex-grow flex items-center justify-center gap-2 bg-[#F0F2F5] text-[#65676B] px-3 py-2 rounded-xl cursor-pointer hover:bg-[#E4E6EB] text-sm truncate transition-colors border border-[#E4E6EB]"
            >
              <UploadCloud size={15} />
              <span className="truncate">
                {image?.name || existingImagePath || "Upload Image (max 2MB)"}
              </span>
            </label>
            {image && (
              <button type="button" onClick={handleLocalImageDelete} className="p-1.5 text-[#BEC3C9] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={15} />
              </button>
            )}
          </div>
          {image && (
            <div className="mt-2">
              <img
                src={URL.createObjectURL(image)}
                alt="Preview"
                className="max-h-24 w-auto rounded-xl cursor-pointer border border-[#E4E6EB]"
                onClick={() => showOverlay(URL.createObjectURL(image))}
              />
            </div>
          )}
          {!image && existingImagePath && (
            <div className="mt-2">
              <img
                src={`/uploads/${existingImagePath}`}
                alt="Current image"
                className="max-h-24 w-auto rounded-xl cursor-pointer border border-[#E4E6EB]"
                onClick={() => showOverlay(`/uploads/${existingImagePath}`)}
              />
            </div>
          )}
          {question.imageError && (
            <p className="text-red-500 text-sm mt-1">{question.imageError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionEditor;
