import React, { memo, useState, useEffect } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';

const MatchingItemRow = ({ field, index, qIndex, register, onRemove, isDragging, isOverlay, isOrderImportant, inputClasses}) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: field.id,
        disabled: !isOrderImportant,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.5 : 1,
    };

    const baseClasses = "flex items-center gap-4 p-2 rounded-md border";
    const normalStateClasses = "bg-white border-slate-200 dark:bg-darkCustom-900 dark:border-darkCustom-700";
    const draggingStateClasses = "bg-white shadow-lg border-blue-500 z-10 dark:bg-darkCustom-800 dark:border-blue-400";

    const classes = `${baseClasses} ${isDragging || isOverlay ? draggingStateClasses : normalStateClasses}`;


    return (
        <div ref={setNodeRef} style={style} className={classes}>
            {/* Lewa strona (Left) */}
            <input
                type="text"
                placeholder={`Left Item ${index + 1}`}
                {...register(`questions.${qIndex}.answers.${index}.left.text`)}
                className={`${inputClasses} flex-grow`}
            />
            {/* Prawa strona (Right) z uchwytem do przeciągania */}
            <div className="flex items-center gap-2 flex-grow">
                <span
                    {...attributes}
                    {...listeners}
                    className={`p-1 pr-2 ${isOrderImportant ? 'cursor-grab text-slate-400 hover:text-slate-600 dark:text-darkCustom-500 dark:hover:text-darkCustom-200' : 'cursor-not-allowed text-slate-300 dark:text-darkCustom-600'}`}
                >
                    <GripVertical size={20} />
                </span>
                <input
                    type="text"
                    placeholder={`Right Item ${index + 1}`}
                    {...register(`questions.${qIndex}.answers.${index}.right.text`)}
                    className={`${inputClasses} w-full`}
                />
            </div>
            {/* Przycisk usuwania wiersza */}
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-2 text-slate-400 hover:text-red-600 dark:text-darkCustom-400 dark:hover:text-red-500 rounded-md"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};

const MatchingMultipleEditor = ({ qIndex, control, register, setValue }) => {
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
        keyName: 'key',
    });

    const hasCorrectOrder = useWatch({
        control,
        name: `questions.${qIndex}.extra_data.hasCorrectOrder`,
        defaultValue: false,
    });

    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        if (hasCorrectOrder) {
            const newOrder = fields.map(field => field.id);
            setValue(`questions.${qIndex}.extra_data.correct_order`, newOrder, { shouldDirty: true });
        } else {
            setValue(`questions.${qIndex}.extra_data.correct_order`, [], { shouldDirty: true });
        }
    }, [fields, hasCorrectOrder, qIndex, setValue]);

    function handleDragStart(event) {
        if (hasCorrectOrder) {
            setActiveId(event.active.id);
        }
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (hasCorrectOrder && over && active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over.id);
            move(oldIndex, newIndex);
        }
        setActiveId(null);
    }

    const handleAddItem = () => {
        const highestId = fields.reduce((maxId, item) => Math.max(maxId, parseInt(item.id, 10)), -1);
        const newId = (highestId + 1).toString();
        append({ id: newId, left: "", right: "" });
    };

    const handleRemoveItem = (index) => {
        if (fields.length > 2) {
            remove(index);
        }
    };

    const activeField = activeId ? fields.find(field => field.id === activeId) : null;
    const activeIndex = activeId ? fields.findIndex(field => field.id === activeId) : -1;

    const inputClasses = "p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 transition dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:ring-slate-300 dark:focus:border-slate-300";

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">Question / Instruction</label>
                <textarea
                    placeholder="e.g., Match the capital city to the country."
                    {...register(`questions.${qIndex}.question`)}
                    className={`${inputClasses} w-full`}
                    rows="3"
                />
            </div>

            <div className="flex items-center justify-between p-3 rounded-md border border-slate-200 bg-slate-50 dark:border-darkCustom-700 dark:bg-darkCustom-700">
                <label htmlFor={`order-matters-toggle-${qIndex}`} className="text-sm font-medium text-slate-700 dark:text-darkCustom-200 pr-4">
                    Order matters (user must match items in the correct top-to-bottom order)
                </label>
                <button
                    type="button"
                    id={`order-matters-toggle-${qIndex}`}
                    onClick={() => setValue(`questions.${qIndex}.extra_data.hasCorrectOrder`, !hasCorrectOrder, { shouldDirty: true })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-darkCustom-800 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                        hasCorrectOrder ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-darkCustom-400'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            hasCorrectOrder ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 mb-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-darkCustom-200">Left Column</label>
                    <label className="block text-sm font-bold text-slate-700 dark:text-darkCustom-200">Right Column</label>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <MatchingItemRow
                                    key={field.key}
                                    field={field}
                                    index={index}
                                    qIndex={qIndex}
                                    register={register}
                                    onRemove={handleRemoveItem}
                                    isDragging={activeId === field.id}
                                    isOrderImportant={hasCorrectOrder}
                                    inputClasses={inputClasses}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeField ? (
                            <MatchingItemRow
                                field={activeField}
                                index={activeIndex}
                                qIndex={qIndex}
                                register={register}
                                onRemove={() => {}}
                                isDragging={true}
                                isOverlay={true}
                                isOrderImportant={hasCorrectOrder}
                                inputClasses={inputClasses}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <div>
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-darkCustom-500"
                >
                    <PlusCircle size={18} />
                    Add Pair
                </button>
            </div>
        </div>
    );
};

export default memo(MatchingMultipleEditor);
