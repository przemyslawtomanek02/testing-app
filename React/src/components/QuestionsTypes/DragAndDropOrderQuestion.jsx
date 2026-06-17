import React, {useState, useEffect, useRef} from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// --- Komponent pomocniczy (adaptacja z edytora) ---

const SortablePill = ({ id, text, isDragging = false, isOverlay = false}) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: isOverlay ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.5 : 1,
    };

    const baseClasses = `flex items-center gap-3 p-2 pl-3 rounded-md border dark:bg-darkCustom-700 dark:border-darkCustom-600`;
    const layoutClasses = isOverlay ? 'w-auto' : 'w-full';
    const stateClasses = isDragging || isOverlay
        ? 'bg-white shadow-lg border-blue-500 z-10 dark:bg-darkCustom-600 dark:border-blue-400'
        : 'bg-white border-slate-200 dark:border-darkCustom-700';

    const pillStyle = `${baseClasses} ${layoutClasses} ${stateClasses}`;

    return (
        <div ref={setNodeRef} style={style} className={pillStyle}>
            <span
                {...attributes}
                {...listeners}
                className="cursor-grab text-slate-400 hover:text-slate-600 dark:text-darkCustom-500 dark:hover:text-darkCustom-200 p-1 touch-none">
                <GripVertical size={20} />
            </span>
            <span className="flex-grow text-sm sm:text-base text-slate-800 dark:text-darkCustom-100">{text}</span>
        </div>
    );
};


// --- Główny komponent pytania ---

export default function DragAndDropOrderQuestion({ question, answer, onAnswerChange }) {
    const [items, setItems] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (answer && Array.isArray(answer) && answer.length > 0) {
            setItems(answer);
        } else {
            const shuffled = [...question.answers].sort(() => Math.random() - 0.5);
            setItems(shuffled);
            onAnswerChange(shuffled);
        }
    }, [question.question_id]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (items.length > 0) {
            onAnswerChange(items);
        }
    }, [items]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 10,
                tolerance: 1,
            },
        })
    );

    const handleDragEnd = ({ active, over }) => {
        setActiveId(null);
        if (over && active.id !== over.id) {
            setItems((currentItems) => {
                const oldIndex = currentItems.findIndex((item) => item.answer_id === active.id);
                const newIndex = currentItems.findIndex((item) => item.answer_id === over.id);
                return arrayMove(currentItems, oldIndex, newIndex);
            });
        }
    };

    const activeItem = activeId ? items.find(item => item.answer_id === activeId) : null;

    return (
        <div className="flex flex-col gap-4 my-6">
            <p className="mt-5 text-lg sm:text-xl text-gray-800 dark:text-darkCustom-100">{question.question}</p>

            <p className="mt-2 text-sm text-gray-500 dark:text-darkCustom-400">
                Arrange the items in the correct order.
            </p>

            <div className="space-y-3 mt-4">
                <DndContext
                    sensors={sensors}
                    onDragStart={({ active }) => setActiveId(active.id)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={items.map(item => item.answer_id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {items.map(item => (
                                <SortablePill
                                    key={item.answer_id}
                                    id={item.answer_id}
                                    text={item.text}
                                    isDragging={activeId === item.answer_id}
                                />
                            ))}
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeItem ? <SortablePill id={activeItem.answer_id} text={activeItem.text} isOverlay={true} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}