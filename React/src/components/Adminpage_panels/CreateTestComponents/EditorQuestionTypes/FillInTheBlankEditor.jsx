import React, {memo, useEffect, useRef, useState} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
    useDraggable,
    useDroppable
} from '@dnd-kit/core';
import {SortableContext, arrayMove, rectSortingStrategy, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {PlusCircle, Trash2, XCircle} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

/**
 * Hook opóźniający aktualizację wartości.
 *
 * @param {*} value - Wartość wejściowa, która ma być opóźniona.
 * @param {number} delay - Opóźnienie w milisekundach.
 * @returns {*}  Opóźniona wartość.
 *
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

/**
 * Komponent SortablePill
 *
 * Reprezentuje pojedynczą "pigułkę" (element) w obszarze konstrukcji zdania.
 * Może być sortowany (przeciągany i upuszczany) za pomocą dnd-kit.
 *
 * Props:
 * @param {Object} part - Obiekt reprezentujący część zdania (tekst lub odpowiedź).
 * @param {Function} onRemove - Funkcja wywoływana po kliknięciu przycisku usuwania (tylko dla odpowiedzi).
 * @param {boolean} [isOverlay=false] - Czy komponent jest renderowany jako podgląd w DragOverlay.
 *
 * Zachowanie:
 * - Jeśli `part.type` to 'answer', wyświetla przycisk usuwania.
 * - Styl i klasy są dynamicznie dostosowywane w zależności od typu i stanu przeciągania.
 */
const SortablePill = ({part, onRemove, isOverlay = false}) => {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: part.id,
        disabled: part.type === 'text',
        data: {part}
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.5 : 1,
    };

    const baseClasses = "flex items-center m-1 gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-shadow";
    const answerClasses = "bg-blue-100 text-blue-800 border border-blue-300 cursor-grab dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
    const textClasses = "bg-white text-slate-800 border border-slate-300 dark:bg-darkCustom-800 dark:text-darkCustom-100 dark:border-darkCustom-600";
    const draggingClasses = isDragging || isOverlay ? 'shadow-lg' : '';

    const finalClasses = `${baseClasses} ${part.type === 'answer' ? answerClasses : textClasses} ${draggingClasses}`;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={finalClasses}>
            {part.text}
            {part.type === 'answer' && !isOverlay && (
                <button type="button" onClick={() => onRemove(part.id)} className="text-blue-500 hover:text-red-600 dark:text-blue-400 dark:hover:text-red-400">
                    <XCircle size={16}/>
                </button>
            )}
        </div>
    );
};

/**
 * Komponent DraggableInputPill
 *
 * Reprezentuje pojedynczą odpowiedź w banku odpowiedzi, którą można przeciągnąć do obszaru konstrukcji zdania.
 * Zawiera pole edycji tekstu odpowiedzi oraz przycisk do jej usunięcia.
 *
 * Props:
 * @param {Object} field - Obiekt odpowiedzi (zawiera id i text).
 * @param {number} qIndex - Indeks pytania w formularzu.
 * @param {Function} register - Funkcja z react-hook-form do rejestracji pola input.
 * @param {Function} onRemove - Funkcja wywoływana po kliknięciu przycisku usuwania odpowiedzi.
 * @param {Function} getValues - Funkcja z react-hook-form do pobierania aktualnych wartości formularza.
 *
 * Zachowanie:
 * - Pozwala przeciągać odpowiedź do obszaru zdania.
 * - Pozwala edytować tekst odpowiedzi.
 * - Pozwala usunąć odpowiedź z banku.
 */
const DraggableInputPill = ({field, qIndex, register, onRemove, getValues}) => {
    const item = {id: `answer-${field.id}`, text: field.text, type: 'answer'};
    const {attributes, listeners, setNodeRef} = useDraggable({id: item.id, data: {part: item}});

    const answers = getValues(`questions.${qIndex}.answers`);
    const currentIndex = answers.findIndex(a => a.id === field.id);

    if (currentIndex === -1) return null;

    return (
        <motion.div layout initial={{opacity: 0, scale: 0.5}} animate={{opacity: 1, scale: 1}}
                    exit={{opacity: 0, scale: 0.5}}>
            <div ref={setNodeRef} {...listeners} {...attributes}
                 className="flex items-center gap-2 p-1 pl-3 rounded-md border bg-white text-slate-800 cursor-grab transition-all shadow-sm dark:bg-darkCustom-800 dark:border-darkCustom-600 dark:text-darkCustom-100">
                <input
                    type="text"
                    placeholder="New answer"
                    {...register(`questions.${qIndex}.answers.${currentIndex}.text`)}
                    className="bg-transparent outline-none w-32 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400"
                />
                <button type="button" onClick={() => onRemove(field.id)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:text-darkCustom-400 dark:hover:text-red-500">
                    <Trash2 size={16} />
                </button>
            </div>
        </motion.div>
    );
};

const FillInTheBlankEditor = ({qIndex, control, register, setValue, getValues}) => {
    const [editorParts, setEditorParts] = useState([]);
    const [activePart, setActivePart] = useState(null);
    const isInitialMount = useRef(true);
    const firstEffectInitialized = useRef(false);

    const {fields: answerFields, append, remove} = useFieldArray({
        control, name: `questions.${qIndex}.answers`, keyName: 'key',
    });

    const question = useWatch({ control, name: `questions.${qIndex}` });
    const questionText = useWatch({control, name: `questions.${qIndex}.question`});
    const debouncedQuestionText = useDebounce(questionText, 300);
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}));


    /**
     * Efekt inicjalizujący układ edytora na podstawie zapisanych danych lub tekstu pytania.
     *
     * - Jeśli istnieje zapisany układ (`extra_data`), odtwarza go, mapując odpowiedzi i teksty na odpowiednie części edytora.
     * - Jeśli nie ma zapisanego układu, dzieli tekst pytania na słowa i tworzy z nich części tekstowe.
     *
     * @effect
     * Uruchamiany tylko raz przy montowaniu komponentu oraz przy zmianie answerFields, questionText, getValues lub qIndex.
     */
    useEffect(() => {
        if (firstEffectInitialized.current) return;
        if (!question) return;

        const { answers = [], extra_data = [], question: questionText = '' } = question;

        if (Array.isArray(extra_data) && extra_data.length > 0) {
            const reconstructedParts = extra_data.map((part, index) => {
                if (part.type === 'blank') {
                    const answerDetails = answers.find(a => a.id === part.correct_answer_id);
                    return {
                        id: `answer-${part.correct_answer_id}`,
                        type: 'answer',
                        text: answerDetails?.text || `Answer ${part.correct_answer_id}`
                    };
                }
                return {id: `text-${part.value}-${index}`, type: 'text', text: part.value};
            });
            setEditorParts(reconstructedParts);
        } else {
            if (questionText.trim()) {
                const partsFromText = questionText.split(/\s+/).filter(Boolean).map((word, index) => ({
                    id: `text-${word}-${index}`,
                    type: 'text',
                    text: word,
                }));
                setEditorParts(partsFromText);
            }
        }
        firstEffectInitialized.current = true;
    }, [question]);

    /**
     * Efekt aktualizujący układ edytora po zmianie tekstu pytania ("Base Text").
     *
     * - Jeśli tekst pytania (`debouncedQuestionText`) uległ zmianie, przebudowuje układ części edytora.
     * - Zachowuje odpowiedzi (`answer`), wstawiając je w odpowiednie miejsca względem nowych słów tekstowych.
     * - Odpowiedzi są umieszczane na podstawie ich poprzedniej pozycji względem tekstów.
     * - Jeśli układ się zmienił, aktualizuje stan `editorParts`.
     *
     * @effect
     * Uruchamiany przy zmianie `debouncedQuestionText` lub `editorParts`.
     */
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (debouncedQuestionText === undefined) return;

        const currentTextInEditor = editorParts.filter(p => p.type === 'text').map(p => p.text).join(' ');
        if (currentTextInEditor === debouncedQuestionText) return;

        const newTextWords = debouncedQuestionText.split(/\s+/).filter(Boolean).map((word, index) => ({
            id: `text-${word}-${index}`, type: 'text', text: word,
        }));

        const answerPositions = editorParts.reduce((acc, part, index) => {
            if (part.type === 'answer') {
                const textPartsBefore = editorParts.slice(0, index).filter(p => p.type === 'text').length;
                acc.push({part, textPartsBefore});
            }
            return acc;
        }, []);

        let finalParts = [...newTextWords];
        answerPositions.sort((a, b) => a.textPartsBefore - b.textPartsBefore);

        let offset = 0;
        answerPositions.forEach(({part, textPartsBefore}) => {
            const insertIndex = textPartsBefore + offset;
            finalParts.splice(insertIndex, 0, part);
            offset++;
        });

        if (JSON.stringify(finalParts) !== JSON.stringify(editorParts))
            setEditorParts(finalParts);

    }, [debouncedQuestionText, editorParts]);


    /**
     * Efekt synchronizujący dane edytora z backendem.
     *
     * Po każdej zmianie `editorParts` generuje nową strukturę `extra_data`:
     * - Każda część typu 'answer' jest zapisywana jako obiekt ` {type: 'blank', correct_answer_id: ...} `.
     * - Każda część tekstowa jako ` {type: 'text', value: ...} `.
     * Następnie ustawia te dane w polu formularza, aby backend otrzymał aktualny układ.
     *
     * @effect
     * Uruchamiany przy zmianie `editorParts`, `setValue` lub `qIndex`.
     */
    useEffect(() => {
        const new_extra_data = editorParts.map(part => {
            if (part.type === 'answer') return {type: 'blank', correct_answer_id: part.id.replace('answer-', '')};
            return {type: 'text', value: part.text};
        });
        setValue(`questions.${qIndex}.extra_data`, new_extra_data, {shouldDirty: true});
    }, [editorParts, setValue, qIndex]);


    /**
     * Obsługuje rozpoczęcie przeciągania elementu w edytorze.
     *
     * Jeśli przeciągany element to odpowiedź, pobiera jej najnowszy tekst z formularza,
     * aby zapewnić aktualność danych (np. gdy użytkownik edytuje odpowiedź i od razu ją przeciąga).
     * W przeciwnym razie ustawia aktywną część na przeciągany element lub null.
     *
     * @param {Object} event - Obiekt zdarzenia drag start z dnd-kit.
     */
    function handleDragStart(event) {
        const partData = event.active.data.current?.part;
        if (partData?.type === 'answer') {
            const freshAnswers = getValues(`questions.${qIndex}.answers`);
            const answerId = partData.id.replace('answer-', '');
            const freshData = freshAnswers.find(a => a.id === answerId);
            if (freshData) {
                setActivePart({...partData, text: freshData.text});
            }
        } else {
            setActivePart(partData || null);
        }
    }

    /**
     * Obsługuje zdarzenie przeciągania elementu nad obszarem edytora (drag over).
     *
     * - Sprawdza, czy przeciągany element znajduje się nad odpowiednim obszarem.
     * - Jeśli przeciągany jest nowy element z banku odpowiedzi, dodaje go do edytora w odpowiednim miejscu,
     *   upewniając się, że nie zostanie dodany duplikat.
     * - Jeśli przeciągany jest już istniejący element z edytora, zmienia jego pozycję w tablicy `editorParts`.
     *
     * @param {Object} event - Obiekt zdarzenia drag over z dnd-kit.
     */
    function handleDragOver(event) {
        const {active, over} = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id;
        const overId = over.id;

        const isActiveInEditor = editorParts.some(p => p.id === activeId);
        const isOverEditorArea = over.id === 'sentence-area-droppable' || editorParts.some(p => p.id === overId);

        if (!isOverEditorArea) return;

        if (!isActiveInEditor) { // Jeśli przeciągany element nie jest jeszcze w edytorze
            const activeData = active.data.current?.part;
            if (!activeData || activeData.type !== 'answer') return;

            setEditorParts(currentParts => {
                const alreadyExists = currentParts.some(p => p.id === activeId);
                if (alreadyExists) return currentParts;

                const freshAnswers = getValues(`questions.${qIndex}.answers`);
                const answerId = activeId.toString().replace('answer-', '');
                const freshData = freshAnswers.find(a => a.id === answerId);
                const newItem = {...activeData, text: freshData?.text || ''};

                const overIndex = currentParts.findIndex(p => p.id === overId);
                const newParts = [...currentParts];

                if (overIndex !== -1) {
                    newParts.splice(overIndex, 0, newItem);
                } else {
                    newParts.push(newItem);
                }
                return newParts;
            });
        } else { // Jeśli przeciągany element jest już w edytorze
            const oldIndex = editorParts.findIndex((p) => p.id === activeId);
            const newIndex = editorParts.findIndex((p) => p.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                setEditorParts((parts) => arrayMove(parts, oldIndex, newIndex));
            }
        }
    }

    /**
     * Obsługuje zakończenie przeciągania elementu w edytorze.
     *
     * Czyści stan aktywnej części (`activePart`), co powoduje ukrycie podglądu przeciąganego elementu.
     *
     * @function
     */
    function handleDragEnd() {
        setActivePart(null);
    }

    /**
     * Dodaje nową odpowiedź do banku odpowiedzi.
     *
     * - Pobiera aktualne odpowiedzi z formularza.
     * - Wyznacza nowe unikalne ID na podstawie istniejących identyfikatorów.
     * - Dodaje pustą odpowiedź do listy za pomocą funkcji append z react-hook-form.
     */
    const addAnswer = () => {
        const currentAnswers = getValues(`questions.${qIndex}.answers`) || [];
        const existingIds = currentAnswers.map(a => parseInt(a.id, 10)).filter(Number.isFinite);
        const newId = (existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0).toString();
        append({id: newId, text: ''});
    };

    /**
     * Usuwa odpowiedź z banku odpowiedzi oraz z obszaru konstrukcji zdania.
     *
     * @param {string|number} answerIdToRemove - ID odpowiedzi do usunięcia.
     * - Najpierw znajduje indeks odpowiedzi w aktualnej liście odpowiedzi i usuwa ją z formularza.
     * - Następnie usuwa powiązaną "pigułkę" z edytora (jeśli istnieje).
     */
    const removeAnswerFromBank = (answerIdToRemove) => {
        const currentAnswers = getValues(`questions.${qIndex}.answers`);
        const indexToRemove = currentAnswers.findIndex(a => a.id === answerIdToRemove);
        if (indexToRemove !== -1) {
            remove(indexToRemove);
        }
        setEditorParts(prev => prev.filter(p => p.id !== `answer-${answerIdToRemove}`));
    };

    /**
     * Usuwa odpowiedź z obszaru konstrukcji zdania (Sentence Construction Area).
     *
     * @param {string} partIdToRemove - ID części (pigułki) do usunięcia z edytora.
     * - Filtruje `editorParts`, usuwając element o podanym identyfikatorze.
     */
    const removeAnswerFromSentence = (partIdToRemove) => {
        setEditorParts(prev => prev.filter(p => p.id !== partIdToRemove));
    };

    /**
     * Sprawdza, czy odpowiedź o podanym ID została już umieszczona w obszarze konstrukcji zdania.
     *
     * @param {string|number} answerId - ID odpowiedzi do sprawdzenia.
     * @returns {boolean} True, jeśli odpowiedź znajduje się już w editorParts, w przeciwnym razie false.
     */
    const isAnswerPlaced = (answerId) => editorParts.some(p => p.id === `answer-${answerId}`);

    /**
     * Hook useDroppable dla obszaru konstrukcji zdania.
     *
     * Umożliwia upuszczanie elementów (pigułek) w wyznaczonym obszarze edytora.
     * Przypisuje referencję do kontenera, aby dnd-kit mógł zarządzać zdarzeniami drag-and-drop.
     */
    const {setNodeRef: sentenceAreaRef} = useDroppable({id: 'sentence-area-droppable'});

    const inputClasses = "p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActivePart(null)}
        >
            <div className="space-y-6">
                <div className="mt-4">
                    <label htmlFor={`question-text-${qIndex}`}
                           className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">
                        Question Base Text
                    </label>
                    <textarea id={`question-text-${qIndex}`} {...register(`questions.${qIndex}.question`)}
                              className={`${inputClasses} w-full max-h-[400px]`}
                              rows="3"/>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">Sentence Construction Area</label>
                    <div ref={sentenceAreaRef}
                         className="flex flex-wrap items-start p-3 min-h-[50px] bg-slate-50 border-2 border-dashed border-slate-300 rounded-md dark:bg-darkCustom-800 dark:border-darkCustom-600">
                        <SortableContext items={editorParts.map(p => p.id)} strategy={rectSortingStrategy}>
                            {editorParts.map(part => (
                                <SortablePill key={part.id} part={part} onRemove={removeAnswerFromSentence}/>
                            ))}
                        </SortableContext>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">Answer Bank</label>
                    <div
                        className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-200 min-h-[50px] dark:bg-darkCustom-800 dark:border-darkCustom-700">
                        <AnimatePresence>
                            {(answerFields || []).filter(field => !isAnswerPlaced(field.id)).map((field) => (
                                <DraggableInputPill
                                    key={field.id}
                                    field={field}
                                    qIndex={qIndex}
                                    register={register}
                                    onRemove={removeAnswerFromBank}
                                    getValues={getValues}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                    <button type="button" onClick={addAnswer}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <PlusCircle size={18}/> Add Answer
                    </button>
                </div>
            </div>

            <DragOverlay>
                {activePart ? <SortablePill part={activePart} isOverlay={true}/> : null}
            </DragOverlay>
        </DndContext>
    );
};

export default memo(FillInTheBlankEditor);