import React, { useState, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { Plus, Save, FileJson, Loader } from "lucide-react";
import QuestionEditor from "./QuestionEditor.jsx";
import { QuestionDefaults } from "./EditorQuestionTypes/QuestionDefaults.jsx";

function CreateTestsPanel({ setOverlayImage }) {
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

  const inputCls = "w-full px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

  return (
    <div className="p-6 bg-[#F0F2F5] min-h-screen">
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-[#1C1E21]">Create Test</h1>
          <div className="flex items-center gap-2">
            <input ref={jsonFileInputRef} id="ct_files" type="file" accept=".json" className="hidden" onChange={handleJsonFileUpload}/>
            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-2 border border-[#E4E6EB] bg-white text-[#606770] font-medium py-2 px-4 rounded-xl hover:bg-[#F0F2F5] transition-colors text-sm"
            >
              <FileJson size={16}/>
              <span>Import JSON</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 min-w-[140px] bg-[#0866FF] text-white hover:bg-[#0757D9] font-semibold py-2 px-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
            >
              {isSubmitting ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>}
              <span>{isSubmitting ? "Creating…" : "Create Test"}</span>
            </button>
          </div>
        </div>

        {jsonFileName && (
          <p className="text-sm text-[#65676B] mb-4 -mt-2">
            Imported: <span className="font-medium text-[#1C1E21]">{jsonFileName}</span>
          </p>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
          {/* Test info */}
          <div className="p-6 border-b border-[#E4E6EB] grid md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="test_name" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Test Name</label>
              <input
                id="test_name" type="text" placeholder="e.g., Algebra Basics"
                {...register("test_name", { required: "Test name is required." })}
                className={inputCls}
              />
              {errors.test_name && <p className="text-red-500 text-xs mt-1">{errors.test_name.message}</p>}
            </div>
            <div>
              <label htmlFor="test_description" className="block text-sm font-medium text-[#1C1E21] mb-1.5">Description</label>
              <input
                id="test_description" type="text" placeholder="Short description of the test"
                {...register("test_description", { required: "Description is required." })}
                className={inputCls}
              />
              {errors.test_description && <p className="text-red-500 text-xs mt-1">{errors.test_description.message}</p>}
            </div>
          </div>

          {/* Questions */}
          <div className="p-6 divide-y divide-[#E4E6EB] space-y-6">
            <AnimatePresence>
              {questions.map((q, index) => (
                <motion.div
                  key={q.key}
                  ref={(el) => (questionRefs.current[index] = el)}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", transition: { duration: 0.3 } }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                  className="pt-6 first:pt-0 pb-6 overflow-hidden"
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

            <div className="pt-6">
              <button
                type="button"
                onClick={() => addNewQuestion()}
                disabled={!validateQuestions(watchedQuestions).valid}
                className="flex items-center gap-2 bg-[#0866FF] text-white font-semibold py-2 px-4 rounded-xl hover:bg-[#0757D9] transition-colors disabled:bg-[#BEC3C9] disabled:cursor-not-allowed text-sm shadow-sm"
              >
                <Plus size={16}/>
                <span>Add New Question</span>
              </button>
              {!validateQuestions(watchedQuestions).valid && (
                <p className="text-[#65676B] text-xs mt-2">
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
