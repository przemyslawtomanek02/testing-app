import React, {useState, useEffect} from 'react';
import {DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable} from '@dnd-kit/core';
import {motion, AnimatePresence} from 'framer-motion';
import {XCircle} from 'lucide-react';

// --- Komponenty pomocnicze ---

/** Prosty komponent wizualny dla pigułki */
const Pill = ({text, isAnswer, isOverlay, showRemoveButton = false, onRemove = () => {}}) => {

    const baseClasses = "flex items-center justify-between gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-shadow";
    const answerClasses = "bg-blue-100 text-blue-800 border border-blue-300 cursor-grab active:cursor-grabbing dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/20";
    const textClasses = "bg-white text-slate-800 border border-slate-300 dark:bg-darkCustom-800 dark:text-darkCustom-100 dark:border-darkCustom-600";
    const overlayClasses = isOverlay ? 'shadow-lg' : '';

    const finalClasses = `${baseClasses} ${isAnswer ? answerClasses : textClasses} ${overlayClasses}`;

    return (
        <div className={finalClasses}>
            <span>{text}</span>
            {showRemoveButton && (
                <button type="button" onClick={onRemove} className="text-blue-500 hover:text-red-600 dark:text-blue-400 dark:hover:text-red-400">
                    <XCircle size={16}/>
                </button>
            )}
        </div>
    );
};

/** Przeciągana pigułka z banku odpowiedzi */
const BankAnswer = ({answer}) => {
    const {attributes, listeners, setNodeRef} = useDraggable({
        id: answer.answer_id,
        data: {answer, from: 'bank'},
    });
    return (
        <motion.div layout initial={{opacity: 0, scale: 0.8}} animate={{opacity: 1, scale: 1}}>
            <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
                <Pill text={answer.text} isAnswer={true}/>
            </div>
        </motion.div>
    );
};

/** Element (tekst lub odpowiedź) w zdaniu */
const SentencePart = ({part, onRemove}) => {
    const {attributes, listeners, setNodeRef} = useDraggable({
        id: part.id,
        data: {part, from: 'sentence'},
        disabled: part.type === 'text',
    });

    return (
        <motion.div
            layout
            initial={{opacity: 0, scale: 0.8}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.5}}
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={part.type === 'answer' ? 'touch-none' : ''}
        >
            <Pill
                text={part.text || part.value}
                isAnswer={part.type === 'answer'}
                showRemoveButton={part.type === 'answer'}
                onRemove={() => onRemove(part)}
            />
        </motion.div>
    );
};

/** Niewidzialna strefa zrzutu między elementami zdania */
const DropZone = ({id}) => {
    const {setNodeRef, isOver} = useDroppable({id});
    return <div ref={setNodeRef} className={`w-2 h-6 sm:h-8 rounded transition-colors ${isOver ? 'bg-blue-200 dark:bg-blue-500/20' : ''}`}/>;
};


// --- Główny komponent pytania ---
export default function FillInTheBlankQuestion({question, answer, onAnswerChange}) {
    const [sentenceParts, setSentenceParts] = useState([]);
    const [bankAnswers, setBankAnswers] = useState([]);
    const [activeDraggable, setActiveDraggable] = useState(null);

    // ... (Cała logika DND i stanu pozostaje bez zmian) ...
    useEffect(() => {
        if (answer && Array.isArray(answer) && answer.length > 0) {
            setSentenceParts(answer);
            const placedIds = new Set(answer.map(p => p.answer_id));
            setBankAnswers(question.answers.filter(a => !placedIds.has(a.answer_id)));
        } else {
            const initialParts = question.question.split(/\s+/).filter(Boolean).map((word, index) => ({
                id: `text_${index}`,
                type: 'text',
                value: word
            }));
            setSentenceParts(initialParts);
            setBankAnswers(question.answers);
        }
    }, [question, answer]);
    useEffect(() => {
        if (sentenceParts.length > 0) onAnswerChange(sentenceParts);
    }, [sentenceParts]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 100, tolerance: 5 },
        })
    );

    const handleRemove = (partToRemove) => {
        setSentenceParts(prev => prev.filter(p => p.id !== partToRemove.id));
        const correspondingAnswer = question.answers.find(a => a.answer_id === partToRemove.answer_id);
        if (correspondingAnswer) {
            setBankAnswers(prev => [...prev, correspondingAnswer]);
        }
    };

    const handleDragEnd = ({active, over}) => {
        setActiveDraggable(null);
        if (!over) return;
        const activeData = active.data.current;
        const droppedOnBank = over.id === 'bank';
        const droppedOnZone = String(over.id).startsWith('drop-zone-');
        if (droppedOnBank && activeData.from === 'sentence') {
            handleRemove(activeData.part);
            return;
        }
        if (droppedOnZone) {
            const dropIndex = parseInt(String(over.id).split('-')[2], 10);
            if (activeData.from === 'bank') {
                const newPart = {...activeData.answer, id: activeData.answer.answer_id, type: 'answer'};
                setSentenceParts(prev => {
                    const newParts = [...prev];
                    newParts.splice(dropIndex, 0, newPart);
                    return newParts;
                });
                setBankAnswers(prev => prev.filter(a => a.answer_id !== active.id));
            } else if (activeData.from === 'sentence') {
                setSentenceParts(prev => {
                    const activeIndex = prev.findIndex(p => p.id === active.id);
                    const overIndex = dropIndex > activeIndex ? dropIndex - 1 : dropIndex;
                    const newParts = prev.filter(p => p.id !== active.id);
                    newParts.splice(overIndex, 0, activeData.part);
                    return newParts;
                });
            }
        }
    };
    const {setNodeRef: bankRef} = useDroppable({id: 'bank'});

    return (
        <DndContext sensors={sensors} onDragStart={({active}) => setActiveDraggable(active)} onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveDraggable(null)}>
            <div className="my-6 space-y-8">
                <div className="space-y-2">
                    <label className="block text-sm sm:text-base font-medium text-slate-700 dark:text-darkCustom-200">Construct the correct sentence by
                        dragging words from the answer bank.</label>
                    <div
                        className="flex flex-wrap items-center p-2 min-h-[70px] bg-slate-50 border-2 border-dashed border-slate-300 rounded-md dark:bg-darkCustom-800 dark:border-darkCustom-600">
                        <AnimatePresence>
                            {sentenceParts.flatMap((part, index) => [
                                <DropZone key={`drop-${index}`} id={`drop-zone-${index}`}/>,
                                <SentencePart key={part.id} part={part} onRemove={handleRemove}/>,
                            ])}
                            <DropZone key="drop-last" id={`drop-zone-${sentenceParts.length}`}/>
                        </AnimatePresence>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm sm:text-base font-medium text-slate-700 dark:text-darkCustom-200">Answer Bank:</label>
                    <div ref={bankRef}
                         className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-4 min-h-[52px] sm:min-h-[60px] bg-gray-100 border border-gray-200 rounded-md dark:bg-darkCustom-800 dark:border-darkCustom-700">
                        <AnimatePresence>
                            {bankAnswers.map(answer => <BankAnswer key={answer.answer_id} answer={answer}/>)}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <DragOverlay>
                {activeDraggable ? <Pill
                    text={activeDraggable.data.current.answer?.text || activeDraggable.data.current.part?.text || ''}
                    isAnswer={true} isOverlay={true}/> : null}
            </DragOverlay>
        </DndContext>
    );
}