import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// --- Komponent pomocniczy (bez zmian) ---

const SortablePill = ({ id, text, isDragging = false, isOverlay = false }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: isOverlay ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.5 : 1,
    };

    const baseClasses = "flex items-center p-3 sm:p-4 rounded-lg border transition-all cursor-grab";
    const layoutClasses = isOverlay ? 'w-auto' : 'w-full';
    const normalStateClasses = "bg-white shadow-sm border-gray-300 dark:bg-darkCustom-700 dark:border-darkCustom-600";
    const draggingStateClasses = "bg-white shadow-xl border-blue-500 dark:bg-darkCustom-600 dark:border-blue-400";

    const pillStyle = `${baseClasses} ${layoutClasses} ${isDragging || isOverlay ? draggingStateClasses : normalStateClasses}`;
    return (
        <div ref={setNodeRef} style={style} className={pillStyle}>
            <span
                {...attributes}
                {...listeners}
                className="text-gray-400 dark:text-darkCustom-400 mr-3 sm:mr-4 p-1 touch-none"
            >
                <GripVertical size={20} />
            </span>
            <span className="text-slate-800 dark:text-darkCustom-100 text-sm sm:text-base">{text}</span>
        </div>
    );
};

// --- Główny komponent pytania ---
export default function MatchingMultipleQuestion({ question, answer, onAnswerChange }) {
    const [leftItems, setLeftItems] = useState([]);
    const [rightItems, setRightItems] = useState([]);
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        if (!question || !question.answers || question.answers.length === 0) {
            return;
        }

        const initialLeft = question.answers.filter(ans => ans.side === 'left');
        const initialRight = question.answers.filter(ans => ans.side === 'right');

        if (answer?.left_order && answer?.right_order) {
            const reorder = (list, order) => order.map(id => list.find(item => item.answer_id === id)).filter(Boolean);
            setLeftItems(reorder(initialLeft, answer.left_order));
            setRightItems(reorder(initialRight, answer.right_order));
        } else {
            setLeftItems(initialLeft);
            setRightItems(initialRight.sort(() => Math.random() - 0.5));
        }
    }, [question]);

    useEffect(() => {
        if (leftItems.length > 0 || rightItems.length > 0) {
            const formattedAnswer = {
                left_order: leftItems.map(item => item.answer_id),
                right_order: rightItems.map(item => item.answer_id),
            };
            onAnswerChange(formattedAnswer);
        }
    }, [leftItems, rightItems]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 100, tolerance: 5 },
        })
    );
    const activeItem = activeId ? [...leftItems, ...rightItems].find(item => item.answer_id === activeId) : null;

    const handleDragEnd = ({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;
        const isLeft = leftItems.some(item => item.answer_id === active.id);
        if (isLeft) {
            setLeftItems(items => {
                const oldIndex = items.findIndex(item => item.answer_id === active.id);
                const newIndex = items.findIndex(item => item.answer_id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        } else {
            setRightItems(items => {
                const oldIndex = items.findIndex(item => item.answer_id === active.id);
                const newIndex = items.findIndex(item => item.answer_id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    if (leftItems.length === 0 || rightItems.length === 0) {
        return (
            <div className="my-6">
                <h3 className="mt-5 text-xl text-gray-800 dark:text-darkCustom-100">{question.question}</h3>
                <p className="mt-4 text-center text-gray-500 dark:text-darkCustom-400">Error while loading answers ;(</p>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
            <div className="my-6">
                <h3 className="mt-5 text-lg sm:text-xl text-gray-800 dark:text-darkCustom-100">{question.question}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-darkCustom-400">Drag the items in the right and/or left columns to match them in pairs</p>

                <div className="grid grid-cols-2 gap-4 md:gap-8 mt-8">
                    <SortableContext items={leftItems.map(i => i.answer_id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {leftItems.map(item => <SortablePill key={item.answer_id} id={item.answer_id} text={item.text} />)}
                        </div>
                    </SortableContext>
                    <SortableContext items={rightItems.map(i => i.answer_id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {rightItems.map(item => <SortablePill key={item.answer_id} id={item.answer_id} text={item.text} />)}
                        </div>
                    </SortableContext>
                </div>
            </div>
            <DragOverlay>
                {activeId && activeItem ? <SortablePill id={activeItem.answer_id} text={activeItem.text} isOverlay={true} /> : null}
            </DragOverlay>
        </DndContext>
    );
}