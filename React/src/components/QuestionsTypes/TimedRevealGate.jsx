import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Bramka "czytanie + odpowiedź" (TimedReveal).
 *
 * Faza 1 (czytanie): widoczna jest TYLKO treść pytania + odliczanie (revealDelay).
 * Faza 2 (odpowiadanie): treść pytania znika z DOM, pojawiają się odpowiedzi.
 *                        Jeśli ustawiono answerTimeLimit > 0, leci drugie
 *                        odliczanie; po jego końcu wywołujemy onAnswerTimeout
 *                        (rodzic robi auto-przejście do następnego pytania).
 *
 * Komponent jest keyowany przez question_id w rodzicu, więc dla każdego
 * pytania montuje się od nowa i stan resetuje się automatycznie.
 *
 * @param {object}   question         - obiekt pytania
 * @param {number}   revealDelay      - czas czytania w sekundach (domyślnie 3)
 * @param {number}   answerTimeLimit  - czas na odpowiedź w sekundach (0 = bez limitu)
 * @param {boolean}  alreadyRevealed  - czy to pytanie zostało już odsłonięte
 * @param {function} onRevealComplete - callback(question_id) po zakończeniu fazy czytania
 * @param {function} onAnswerTimeout  - callback() po zakończeniu czasu na odpowiedź
 * @param {ReactNode} children        - komponent z odpowiedziami (z hideQuestionText)
 */
export default function TimedRevealGate({
  question,
  revealDelay = 3,
  answerTimeLimit = 0,
  alreadyRevealed = false,
  onRevealComplete,
  onAnswerTimeout,
  children,
}) {
  const [readingLeft, setReadingLeft] = useState(
    alreadyRevealed ? 0 : revealDelay,
  );
  const [revealed, setRevealed] = useState(alreadyRevealed);
  const [answerLeft, setAnswerLeft] = useState(answerTimeLimit);

  // Faza 1 – odliczanie czytania
  useEffect(() => {
    if (revealed) return;

    if (readingLeft <= 0) {
      setRevealed(true);
      onRevealComplete?.(question.question_id);
      return;
    }

    const t = setTimeout(() => setReadingLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [readingLeft, revealed]);

  // Faza 2 – odliczanie czasu na odpowiedź (tylko jeśli answerTimeLimit > 0)
  useEffect(() => {
    if (!revealed || answerTimeLimit <= 0) return;

    if (answerLeft <= 0) {
      onAnswerTimeout?.();
      return;
    }

    const t = setTimeout(() => setAnswerLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [answerLeft, revealed, answerTimeLimit]);

  // Faza 1 – czytanie pytania + odliczanie
  if (!revealed) {
    return (
      <div className="flex flex-col items-center gap-6 my-8 select-none">
        <p className="text-lg sm:text-2xl text-gray-800 dark:text-darkCustom-100 text-center max-w-2xl leading-relaxed">
          {question.question}
        </p>

        <div className="relative flex items-center justify-center">
          <motion.div
            key={readingLeft}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 text-white text-3xl font-bold shadow-lg dark:bg-darkCustom-100 dark:text-darkCustom-1000"
          >
            {readingLeft}
          </motion.div>
        </div>

        <p className="text-sm text-gray-600 dark:text-darkCustom-300 text-center">
          Przeczytaj pytanie — odpowiedzi pojawią się za chwilę
        </p>
      </div>
    );
  }

  // Faza 2 – odpowiadanie (pytanie nie jest renderowane)
  const showAnswerTimer = answerTimeLimit > 0;
  const answerPct = showAnswerTimer
    ? Math.max(0, (answerLeft / answerTimeLimit) * 100)
    : 0;
  const lowTime = showAnswerTimer && answerLeft <= 5;

  return (
    <div>
      {showAnswerTimer && (
        <div className="mb-4 select-none">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600 dark:text-darkCustom-300">
              Czas na odpowiedź
            </span>
            <span
              className={`text-sm font-semibold ${lowTime ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-darkCustom-200"}`}
            >
              {answerLeft}s
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-darkCustom-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${lowTime ? "bg-red-500" : "bg-slate-700 dark:bg-darkCustom-100"}`}
              style={{ width: `${answerPct}%` }}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
