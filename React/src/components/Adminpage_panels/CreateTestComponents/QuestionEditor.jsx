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
import { useAppContext } from "../../../AppContext.jsx";

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
  const { darkMode: dk } = useAppContext();
  const T = {
    surface:  dk ? '#171B2D' : '#FFFFFF',
    surface2: dk ? '#1E2237' : '#F4F6FB',
    border:   dk ? '#2A2F45' : '#E4E6EB',
    text:     dk ? '#E2E8F0' : '#0F1623',
    textSec:  dk ? '#8896B3' : '#64748B',
    textMuted:dk ? '#5A6483' : '#BEC3C9',
    inputBg:  dk ? '#1E2237' : '#FFFFFF',
  };

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
        return <p style={{ color: '#EF4444' }}>Unsupported question type: {type}</p>;
    }
  };

  const isPointsInputDisabled = type === "Rating" && !isCorrectEnabled;

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '12px',
    border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ background: T.surface, padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', position: 'relative' }}>
      {qIndex > 0 && (
        <button
          type="button"
          onClick={() => removeQuestion(qIndex)}
          style={{
            position: 'absolute', top: 0, right: '12px',
            padding: '6px', background: 'none', border: 'none', cursor: 'pointer',
            color: T.textMuted, borderRadius: '10px', display: 'flex', alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = dk ? 'rgba(239,68,68,0.12)' : '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'none'; }}
        >
          <Trash2 size={19}/>
        </button>
      )}

      {/* Left column: question editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: T.text }}>Question {qIndex + 1}</h3>
        <div>{renderQuestionBody()}</div>
      </div>

      {/* Right column: question settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: `1px solid ${T.border}`, paddingLeft: '24px', paddingTop: '4px' }}>
        <div>
          <label htmlFor={`qt-${qIndex}`} style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>
            Question Type
          </label>
          <select
            id={`qt-${qIndex}`}
            value={type}
            onChange={(e) => handleTypeChange(qIndex, e.target.value)}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
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
          <label htmlFor={`pv-${qIndex}`} style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>
            Points
          </label>
          <input
            id={`pv-${qIndex}`}
            type="number"
            min="0"
            disabled={isPointsInputDisabled}
            {...register(`questions.${qIndex}.points_value`, { valueAsNumber: true, min: 0, value: 1 })}
            style={{ ...inputStyle, opacity: isPointsInputDisabled ? 0.5 : 1, cursor: isPointsInputDisabled ? 'not-allowed' : 'auto' }}
            onFocus={e => { if (!isPointsInputDisabled) e.currentTarget.style.borderColor = '#2B73FF'; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
          />
        </div>

        {supportsTimedReveal && (
          <div style={{ borderRadius: '14px', border: `1.5px solid ${T.border}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: T.surface2 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                {...register(`questions.${qIndex}.extra_data.timed_reveal`)}
                style={{ width: '16px', height: '16px', accentColor: '#2B73FF' }}
              />
              <span style={{ fontSize: '13px', fontWeight: '500', color: T.text }}>
                Timed reveal (czytanie + odpowiedź)
              </span>
            </label>

            {isTimedReveal && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label htmlFor={`rd-${qIndex}`} style={{ display: 'block', fontSize: '13px', color: T.textSec, marginBottom: '4px' }}>
                    Czas czytania (sekundy)
                  </label>
                  <input
                    id={`rd-${qIndex}`}
                    type="number"
                    min="1"
                    max="60"
                    {...register(`questions.${qIndex}.extra_data.reveal_delay`, { valueAsNumber: true, min: 1, value: 3 })}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
                  />
                  <p style={{ fontSize: '12px', color: T.textMuted, marginTop: '4px' }}>
                    Pytanie będzie widoczne przez ten czas, potem zniknie i pojawią się odpowiedzi.
                  </p>
                </div>
                <div>
                  <label htmlFor={`at-${qIndex}`} style={{ display: 'block', fontSize: '13px', color: T.textSec, marginBottom: '4px' }}>
                    Czas na odpowiedź (sekundy)
                  </label>
                  <input
                    id={`at-${qIndex}`}
                    type="number"
                    min="0"
                    max="300"
                    {...register(`questions.${qIndex}.extra_data.answer_time_limit`, { valueAsNumber: true, min: 0, value: 15 })}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
                  />
                  <p style={{ fontSize: '12px', color: T.textMuted, marginTop: '4px' }}>
                    Po tym czasie nastąpi automatyczne przejście. Wpisz 0, aby wyłączyć limit.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Image Attachment</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="file"
              id={`img-${qIndex}`}
              accept="image/*"
              onChange={(e) => onImageUpload(qIndex, e.target.files[0])}
              style={{ display: 'none' }}
            />
            <label
              htmlFor={`img-${qIndex}`}
              style={{
                flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: T.surface2, color: T.textSec, padding: '8px 12px', borderRadius: '12px',
                cursor: 'pointer', fontSize: '13px', border: `1.5px solid ${T.border}`, transition: 'all 0.15s',
                overflow: 'hidden',
              }}
            >
              <UploadCloud size={14}/>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {image?.name || existingImagePath || "Upload Image (max 2MB)"}
              </span>
            </label>
            {image && (
              <button
                type="button"
                onClick={handleLocalImageDelete}
                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = dk ? 'rgba(239,68,68,0.12)' : '#FEF2F2'; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'none'; }}
              >
                <Trash2 size={14}/>
              </button>
            )}
          </div>
          {image && (
            <div style={{ marginTop: '8px' }}>
              <img
                src={URL.createObjectURL(image)}
                alt="Preview"
                style={{ maxHeight: '96px', width: 'auto', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${T.border}` }}
                onClick={() => showOverlay(URL.createObjectURL(image))}
              />
            </div>
          )}
          {!image && existingImagePath && (
            <div style={{ marginTop: '8px' }}>
              <img
                src={`/uploads/${existingImagePath}`}
                alt="Current image"
                style={{ maxHeight: '96px', width: 'auto', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${T.border}` }}
                onClick={() => showOverlay(`/uploads/${existingImagePath}`)}
              />
            </div>
          )}
          {question.imageError && (
            <p style={{ color: '#EF4444', fontSize: '13px', marginTop: '4px' }}>{question.imageError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionEditor;
