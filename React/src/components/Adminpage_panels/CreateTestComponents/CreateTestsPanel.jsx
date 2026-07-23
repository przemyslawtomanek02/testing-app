import React, { useState, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { Plus, Save, FileJson, Loader } from "lucide-react";
import QuestionEditor from "./QuestionEditor.jsx";
import { QuestionDefaults } from "./EditorQuestionTypes/QuestionDefaults.jsx";
import { useAppContext } from "../../../AppContext.jsx";

function CreateTestsPanel({ setOverlayImage }) {
  const { darkMode: dk } = useAppContext();
  const T = {
    bg:       dk ? '#0F1117' : '#F4F6FB',
    surface:  dk ? '#171B2D' : '#FFFFFF',
    border:   dk ? '#2A2F45' : '#E4E6EB',
    text:     dk ? '#E2E8F0' : '#0F1623',
    textSec:  dk ? '#8896B3' : '#64748B',
    textMuted:dk ? '#5A6483' : '#BEC3C9',
    inputBg:  dk ? '#1E2237' : '#FFFFFF',
    divider:  dk ? '#2A2F45' : '#EDF0F7',
  };

  const [images, setImages] = useState([]);
  const [jsonFileName, setJsonFileName] = useState("");
  const jsonFileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionRefs = useRef([]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      test_name: "",
      test_description: "",
      questions: [JSON.parse(JSON.stringify(QuestionDefaults.SingleChoice))],
    },
  });

  const {
    fields: questions,
    append,
    remove,
  } = useFieldArray({ control, name: "questions", keyName: "key" });

  const watchedQuestions = watch("questions");

  const removeQuestion = (indexToRemove) => {
    const current = getValues("questions");
    setValue("questions", current.filter((_, i) => i !== indexToRemove));
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const addNewQuestion = (type = "SingleChoice") => {
    append(JSON.parse(JSON.stringify(QuestionDefaults[type] || QuestionDefaults.SingleChoice)));
  };

  const handleImageDelete = useCallback((qIndex) => {
    setImages((prev) => { const u = [...prev]; u[qIndex] = null; return u; });
    setValue(`questions.${qIndex}.image_path`, null, { shouldDirty: true });
  }, [setValue]);

  const handleJsonFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        if (!jsonData.test_name || !Array.isArray(jsonData.questions)) {
          toast.error("Invalid JSON structure. Required: 'test_name' and 'questions' array.");
          return;
        }
        const validatedQuestions = jsonData.questions.map((q) => {
          const defaults = QuestionDefaults[q.type] || QuestionDefaults.SingleChoice;
          return { ...defaults, ...q, answers: Array.isArray(q.answers) ? q.answers : defaults.answers, extra_data: q.extra_data ?? defaults.extra_data ?? [] };
        });
        reset({ test_name: jsonData.test_name, test_description: jsonData.test_description || "", questions: validatedQuestions });
        setJsonFileName(file.name);
        toast.success("Test imported successfully!");
      } catch (err) {
        toast.error("Failed to parse or process the JSON file.");
      } finally {
        if (jsonFileInputRef.current) jsonFileInputRef.current.value = null;
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = useCallback((qIndex, file) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`Image for question ${qIndex + 1} is too large. Max: 2MB.`);
      return;
    }
    setImages((prev) => { const u = [...prev]; u[qIndex] = file; return u; });
    setValue(`questions.${qIndex}.image_path`, null, { shouldDirty: true });
  }, [setValue]);

  const validateQuestions = (questions) => {
    const errors = [];
    let firstInvalidIndex = null;
    if (!Array.isArray(questions) || questions.length === 0) {
      return { valid: false, errors: ["No questions in the test."], firstInvalidIndex: 0 };
    }
    questions.forEach((q, index) => {
      const prefix = `Question ${index + 1}`;
      let hasError = false;
      if (!q.question || q.question.trim().length === 0) {
        errors.push(`${prefix}: No question content.`); hasError = true;
      }
      if (q.type === "FillInTheBlank") {
        if (!q.answers?.every(a => a.text?.trim().length > 0)) { errors.push(`${prefix}: All answers must contain text.`); hasError = true; }
        const blanks = Array.isArray(q.extra_data) ? q.extra_data.filter(p => p.type === "blank").length : 0;
        if (q.answers?.length > 0 && q.answers.length !== blanks) { errors.push(`${prefix}: gaps ≠ answers (${blanks} ≠ ${q.answers.length}).`); hasError = true; }
      } else if (q.type === "MatchingMultiple") {
        if (!q.answers?.every(a => a.left?.text?.trim() && a.right?.text?.trim())) { errors.push(`${prefix}: Each match needs left and right text.`); hasError = true; }
      } else {
        if (!q.answers?.every(a => a.text?.trim().length > 0)) { errors.push(`${prefix}: Answers must contain text.`); hasError = true; }
      }
      if (hasError && firstInvalidIndex === null) firstInvalidIndex = index;
    });
    return { valid: errors.length === 0, errors, firstInvalidIndex };
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const { test_name, test_description, questions } = data;
    const { valid, errors: validationErrors, firstInvalidIndex } = validateQuestions(questions);
    if (!valid) {
      validationErrors.forEach(err => toast.error(err));
      if (firstInvalidIndex !== null && questionRefs.current[firstInvalidIndex]) {
        questionRefs.current[firstInvalidIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setIsSubmitting(false);
      return;
    }
    const formData = new FormData();
    formData.append("test_name", test_name);
    formData.append("test_description", test_description);
    questions.forEach((q, i) => {
      formData.append("questions", JSON.stringify(q));
      if (images[i]) formData.append(`question_image_${i}`, images[i]);
    });
    try {
      const response = await fetch("/api/admin/create_new_test", { method: "POST", body: formData });
      if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.message || "Submission failed."); }
      toast.success("Test created successfully!");
      reset();
      setImages([]);
      setJsonFileName("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '12px',
    border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    transition: 'border-color 0.15s',
  };

  const canAddQuestion = validateQuestions(watchedQuestions).valid;

  return (
    <div style={{ padding: '28px', background: T.bg, minHeight: '100%' }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: T.text, letterSpacing: '-0.02em' }}>Create Test</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input ref={jsonFileInputRef} id="ct_files" type="file" accept=".json" style={{ display: 'none' }} onChange={handleJsonFileUpload}/>
            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                border: `1.5px solid ${T.border}`, background: T.surface,
                color: T.textSec, fontWeight: '500', padding: '7px 16px',
                borderRadius: '999px', cursor: 'pointer', fontSize: '13px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.06)' : '#EEF4FF'; e.currentTarget.style.color = '#2B73FF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textSec; }}
            >
              <FileJson size={15}/>
              <span>Import JSON</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                minWidth: '140px', background: isSubmitting ? T.textMuted : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                color: '#FFFFFF', fontWeight: '600', padding: '7px 20px',
                borderRadius: '999px', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '13px', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(43,115,255,0.35)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {isSubmitting ? <Loader size={15} className="animate-spin"/> : <Save size={15}/>}
              <span>{isSubmitting ? "Creating…" : "Create Test"}</span>
            </button>
          </div>
        </div>

        {jsonFileName && (
          <p style={{ fontSize: '13px', color: T.textSec, marginBottom: '16px', marginTop: '-8px' }}>
            Imported: <span style={{ fontWeight: '600', color: T.text }}>{jsonFileName}</span>
          </p>
        )}

        {/* Card */}
        <div style={{ background: T.surface, borderRadius: '22px', border: `1px solid ${T.border}`, boxShadow: dk ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)' }}>
          {/* Test info */}
          <div style={{ padding: '24px', borderBottom: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label htmlFor="test_name" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Test Name</label>
              <input
                id="test_name" type="text" placeholder="e.g., Algebra Basics"
                {...register("test_name", { required: "Test name is required." })}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,115,255,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.test_name && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.test_name.message}</p>}
            </div>
            <div>
              <label htmlFor="test_description" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '6px' }}>Description</label>
              <input
                id="test_description" type="text" placeholder="Short description of the test"
                {...register("test_description", { required: "Description is required." })}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#2B73FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43,115,255,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.test_description && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.test_description.message}</p>}
            </div>
          </div>

          {/* Questions */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatePresence>
              {questions.map((q, index) => (
                <motion.div
                  key={q.key}
                  ref={(el) => (questionRefs.current[index] = el)}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", transition: { duration: 0.3 } }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                  style={{ overflow: 'hidden', paddingTop: index > 0 ? '24px' : 0, borderTop: index > 0 ? `1px solid ${T.divider}` : 'none' }}
                >
                  <QuestionEditor
                    question={q} qIndex={index}
                    register={register} control={control}
                    setValue={setValue} getValues={getValues} watch={watch}
                    onImageUpload={handleImageUpload} onImageDelete={handleImageDelete}
                    image={images[index]} showOverlay={setOverlayImage}
                    removeQuestion={() => removeQuestion(index)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <div style={{ paddingTop: '8px', borderTop: `1px solid ${T.divider}` }}>
              <button
                type="button"
                onClick={() => addNewQuestion()}
                disabled={!canAddQuestion}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: canAddQuestion ? 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)' : T.textMuted,
                  color: '#FFFFFF', fontWeight: '600', padding: '8px 18px',
                  borderRadius: '999px', border: 'none',
                  cursor: canAddQuestion ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  boxShadow: canAddQuestion ? '0 4px 14px rgba(43,115,255,0.35)' : 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { if (canAddQuestion) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <Plus size={15}/>
                <span>Add New Question</span>
              </button>
              {!canAddQuestion && (
                <p style={{ color: T.textSec, fontSize: '12px', marginTop: '8px' }}>
                  Fill all fields and place all answers before adding a new question.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateTestsPanel;
