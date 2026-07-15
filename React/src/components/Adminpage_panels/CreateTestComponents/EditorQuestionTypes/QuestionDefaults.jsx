export const QuestionDefaults = {
  SingleChoice: {
    question: "",
    type: "SingleChoice",
    answers: [
      { id: "0", text: "", is_correct: true },
      { id: "1", text: "", is_correct: false },
      { id: "2", text: "", is_correct: false },
    ],
    extra_data: {
      timed_reveal: false,
      reveal_delay: 3,
      answer_time_limit: 15,
    },
    points_value: 1,
  },

  MultipleChoice: {
    question: "",
    type: "MultipleChoice",
    answers: [
      { id: "0", text: "", is_correct: true },
      { id: "1", text: "", is_correct: false },
      { id: "2", text: "", is_correct: false },
    ],
    extra_data: {
      timed_reveal: false,
      reveal_delay: 3,
      answer_time_limit: 15,
    },
    points_value: 1,
  },

  TrueFalse: {
    question: "",
    type: "TrueFalse",
    answers: [
      { id: "0", text: "", is_correct: true },
      { id: "1", text: "", is_correct: false },
      { id: "2", text: "", is_correct: false },
    ],
    points_value: 1,
  },

  FillInTheBlank: {
    question: "",
    type: "FillInTheBlank",
    answers: [
      { id: "0", text: "" },
      { id: "1", text: "" },
      { id: "2", text: "" },
    ],
    extra_data: [],
    points_value: 1,
  },

  DragAndDropOrder: {
    question: "",
    type: "DragAndDropOrder",
    answers: [
      { id: "0", text: "" },
      { id: "1", text: "" },
      { id: "2", text: "" },
    ],
    extra_data: {
      correct_order: [0, 1, 2],
    },
    points_value: 1,
  },

  Rating: {
    question: "",
    type: "Rating",
    answers: [],
    extra_data: {
      available_range: [1, 5],
      correct_enabled: false,
    },
    points_value: 1,
  },

  MatchingMultiple: {
    question: "",
    type: "MatchingMultiple",
    answers: [
      { id: "0", left: { text: "" }, right: { text: "" } },
      { id: "1", left: { text: "" }, right: { text: "" } },
      { id: "2", left: { text: "" }, right: { text: "" } },
    ],
    extra_data: {
      correct_order: ["0", "1", "2"],
      hasCorrectOrder: false,
    },
    points_value: 1,
  },

  TypedFillInBlank: {
    question: "",
    type: "TypedFillInBlank",
    answers: [],
    extra_data: {
      parts: [],
    },
    points_value: 1,
  },
};
