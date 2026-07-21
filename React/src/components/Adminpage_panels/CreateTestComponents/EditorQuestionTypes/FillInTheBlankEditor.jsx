import React, {memo, useEffect, useRef, useState} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    pointerWithin, useDraggable, useDroppable
} from '@dnd-kit/core';
import {SortableContext, arrayMove, rectSortingStrategy, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {PlusCircle, Trash2, XCircle} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const SortablePill = ({part, onRemove, isOverlay = false}) => {
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: part.id,
        disabled: part.type === 'text',
        data: {part}
    });

    const style = {transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !isOverlay ? 0.5 : 1};

    const baseClasses = "flex items-center m-1 gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-shadow";
    const answerClasses = "bg-[#E7F3FF] text-[#0866FF] border border-[#0866FF]/20 cursor-grab";
    const textClasses = "bg-white text-[#1C1E21] border border-[#E4E6EB]";
    const draggingClasses = isDragging || isOverlay ? 'shadow-lg' : '';

    const finalClasses = `${baseClasses} ${part.type === 'answer' ? answerClasses : textClasses} ${draggingClasses}`;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={finalClasses}>
            {part.text}
            {part.type === 'answer' && !isOverlay && (
                <button type="button" onClick={() => onRemove(part.id)} className="text-[#0866FF] hover:text-red-500 transition-colors">
                    <XCircle size={15}/>
                </button>
            )}
        </div>
    );
};

const DraggableInputPill = ({field, qIndex, register, onRemove, getValues}) => {
    const item = {id: `answer-${field.id}`, text: field.text, type: 'answer'};
    const {attributes, listeners, setNodeRef} = useDraggable({id: item.id, data: {part: item}});

    const answers = getValues(`questions.${qIndex}.answers`);
    const currentIndex = answers.findIndex(a => a.id === field.id);
    if (currentIndex === -1) return null;

    return (
        <motion.div layout initial={{opacity: 0, scale: 0.5}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.5}}>
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                className="flex items-center gap-2 p-1 pl-3 rounded-xl border border-[#E4E6EB] bg-white text-[#1C1E21] cursor-grab shadow-sm"
            >
                <input
                    type="text"
                    placeholder="New answer"
                    {...register(`questions.${qIndex}.answers.${currentIndex}.text`)}
                    className="bg-transparent outline-none w-32 text-sm text-[#1C1E21] placeholder:text-[#BEC3C9]"
                />
                <button type="button" onClick={() => onRemove(field.id)} className="p-1 text-[#BEC3C9] hover:text-red-500 transition-colors">
                    <Trash2 size={15}/>
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

    const question = useWatch({control, name: `questions.${qIndex}`});
    const questionText = useWatch({control, name: `questions.${qIndex}.question`});
    const debouncedQuestionText = useDebounce(questionText, 300);
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}));

    useEffect(() => {
        if (firstEffectInitialized.current) return;
        if (!question) return;
        const {answers = [], extra_data = [], question: questionText = ''} = question;

        if (Array.isArray(extra_data) && extra_data.length > 0) {
            const reconstructedParts = extra_data.map((part, index) => {
                if (part.type === 'blank') {
                    const answerDetails = answers.find(a => a.id === part.correct_answer_id);
                    return {id: `answer-${part.correct_answer_id}`, type: 'answer', text: answerDetails?.text || `Answer ${part.correct_answer_id}`};
                }
                return {id: `text-${part.value}-${index}`, type: 'text', text: part.value};
            });
            setEditorParts(reconstructedParts);
        } else if (questionText.trim()) {
            setEditorParts(questionText.split(/\s+/).filter(Boolean).map((word, index) => ({
                id: `text-${word}-${index}`, type: 'text', text: word,
            })));
        }
        firstEffectInitialized.current = true;
    }, [question]);

    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
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
            finalParts.splice(textPartsBefore + offset, 0, part);
            offset++;
        });

        if (JSON.stringify(finalParts) !== JSON.stringify(editorParts)) setEditorParts(finalParts);
    }, [debouncedQuestionText, editorParts]);

    useEffect(() => {
        const new_extra_data = editorParts.map(part => {
            if (part.type === 'answer') return {type: 'blank', correct_answer_id: part.id.replace('answer-', '')};
            return {type: 'text', value: part.text};
        });
        setValue(`questions.${qIndex}.extra_data`, new_extra_data, {shouldDirty: true});
    }, [editorParts, setValue, qIndex]);

    function handleDragStart(event) {
        const partData = event.active.data.current?.part;
        if (partData?.type === 'answer') {
            const freshAnswers = getValues(`questions.${qIndex}.answers`);
            const answerId = partData.id.replace('answer-', '');
            const freshData = freshAnswers.find(a => a.id === answerId);
            if (freshData) setActivePart({...partData, text: freshData.text});
        } else {
            setActivePart(partData || null);
        }
    }

    function handleDragOver(event) {
        const {active, over} = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id;
        const overId = over.id;
        const isActiveInEditor = editorParts.some(p => p.id === activeId);
        const isOverEditorArea = over.id === 'sentence-area-droppable' || editorParts.some(p => p.id === overId);

        if (!isOverEditorArea) return;

        if (!isActiveInEditor) {
            const activeData = active.data.current?.part;
            if (!activeData || activeData.type !== 'answer') return;
            setEditorParts(currentParts => {
                if (currentParts.some(p => p.id === activeId)) return currentParts;
                const freshAnswers = getValues(`questions.${qIndex}.answers`);
                const answerId = activeId.toString().replace('answer-', '');
                const freshData = freshAnswers.find(a => a.id === answerId);
                const newItem = {...activeData, text: freshData?.text || ''};
                const overIndex = currentParts.findIndex(p => p.id === overId);
                const newParts = [...currentParts];
                if (overIndex !== -1) newParts.splice(overIndex, 0, newItem);
                else newParts.push(newItem);
                return newParts;
            });
        } else {
            const oldIndex = editorParts.findIndex(p => p.id === activeId);
            const newIndex = editorParts.findIndex(p => p.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) setEditorParts(parts => arrayMove(parts, oldIndex, newIndex));
        }
    }

    function handleDragEnd() { setActivePart(null); }

    const addAnswer = () => {
        const currentAnswers = getValues(`questions.${qIndex}.answers`) || [];
        const existingIds = currentAnswers.map(a => parseInt(a.id, 10)).filter(Number.isFinite);
        const newId = (existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0).toString();
        append({id: newId, text: ''});
    };

    const removeAnswerFromBank = (answerIdToRemove) => {
        const currentAnswers = getValues(`questions.${qIndex}.answers`);
        const indexToRemove = currentAnswers.findIndex(a => a.id === answerIdToRemove);
        if (indexToRemove !== -1) remove(indexToRemove);
        setEditorParts(prev => prev.filter(p => p.id !== `answer-${answerIdToRemove}`));
    };

    const removeAnswerFromSentence = (partIdToRemove) => {
        setEditorParts(prev => prev.filter(p => p.id !== partIdToRemove));
    };

    const isAnswerPlaced = (answerId) => editorParts.some(p => p.id === `answer-${answerId}`);

    const {setNodeRef: sentenceAreaRef} = useDroppable({id: 'sentence-area-droppable'});

    const inputCls = "px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActivePart(null)}
        >
            <div className="space-y-5">
                <div>
                    <label htmlFor={`qt-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
                        Question Base Text
                    </label>
                    <textarea
                        id={`qt-${qIndex}`}
                        {...register(`questions.${qIndex}.question`)}
                        className={`${inputCls} w-full max-h-[400px]`}
                        rows="3"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1C1E21]">Sentence Construction Area</label>
                    <div
                        ref={sentenceAreaRef}
                        className="flex flex-wrap items-start p-3 min-h-[50px] bg-[#F0F2F5] border-2 border-dashed border-[#E4E6EB] rounded-xl"
                    >
                        <SortableContext items={editorParts.map(p => p.id)} strategy={rectSortingStrategy}>
                            {editorParts.map(part => (
                                <SortablePill key={part.id} part={part} onRemove={removeAnswerFromSentence}/>
                            ))}
                        </SortableContext>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1C1E21]">Answer Bank</label>
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F0F2F5] rounded-xl border border-[#E4E6EB] min-h-[50px]">
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
                    <button
                        type="button"
                        onClick={addAnswer}
                        className="flex items-center gap-1.5 text-sm font-medium text-[#0866FF] hover:text-[#0757D9] transition-colors"
                    >
                        <PlusCircle size={16}/> Add Answer
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
