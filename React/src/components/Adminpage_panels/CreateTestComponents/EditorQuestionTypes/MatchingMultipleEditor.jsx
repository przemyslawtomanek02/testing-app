import React, {memo, useState, useEffect} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';
import {DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {PlusCircle, Trash2, GripVertical} from 'lucide-react';

const MatchingItemRow = ({field, index, qIndex, register, onRemove, isDragging, isOverlay, isOrderImportant, inputCls}) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
        id: field.id,
        disabled: !isOrderImportant,
    });

    const style = {transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !isOverlay ? 0.5 : 1};

    const classes = `flex items-center gap-4 p-2 rounded-xl border transition-shadow ${
        isDragging || isOverlay ? 'bg-white shadow-lg border-[#0866FF] z-10' : 'bg-white border-[#E4E6EB]'
    }`;

    return (
        <div ref={setNodeRef} style={style} className={classes}>
            <input
                type="text"
                placeholder={`Left Item ${index + 1}`}
                {...register(`questions.${qIndex}.answers.${index}.left.text`)}
                className={`${inputCls} flex-grow`}
            />
            <div className="flex items-center gap-2 flex-grow">
                <span
                    {...attributes}
                    {...listeners}
                    className={`p-1 pr-2 ${isOrderImportant ? 'cursor-grab text-[#BEC3C9] hover:text-[#65676B]' : 'cursor-not-allowed text-[#E4E6EB] dark:text-darkCustom-700'}`}
                >
                    <GripVertical size={18}/>
                </span>
                <input
                    type="text"
                    placeholder={`Right Item ${index + 1}`}
                    {...register(`questions.${qIndex}.answers.${index}.right.text`)}
                    className={`${inputCls} w-full`}
                />
            </div>
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-1.5 text-[#BEC3C9] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
                <Trash2 size={16}/>
            </button>
        </div>
    );
};

const MatchingMultipleEditor = ({qIndex, control, register, setValue}) => {
    const {fields, append, remove, move} = useFieldArray({
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
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}));

    useEffect(() => {
        if (hasCorrectOrder) {
            setValue(`questions.${qIndex}.extra_data.correct_order`, fields.map(f => f.id), {shouldDirty: true});
        } else {
            setValue(`questions.${qIndex}.extra_data.correct_order`, [], {shouldDirty: true});
        }
    }, [fields, hasCorrectOrder, qIndex, setValue]);

    function handleDragStart(event) {
        if (hasCorrectOrder) setActiveId(event.active.id);
    }

    function handleDragEnd(event) {
        const {active, over} = event;
        if (hasCorrectOrder && over && active.id !== over.id) {
            const oldIndex = fields.findIndex(item => item.id === active.id);
            const newIndex = fields.findIndex(item => item.id === over.id);
            move(oldIndex, newIndex);
        }
        setActiveId(null);
    }

    const handleAddItem = () => {
        const highestId = fields.reduce((maxId, item) => Math.max(maxId, parseInt(item.id, 10)), -1);
        append({id: (highestId + 1).toString(), left: "", right: ""});
    };

    const handleRemoveItem = (index) => { if (fields.length > 2) remove(index); };

    const activeField = activeId ? fields.find(f => f.id === activeId) : null;
    const activeIndex = activeId ? fields.findIndex(f => f.id === activeId) : -1;

    const inputCls = "px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-[#1C1E21] mb-1.5">Question / Instruction</label>
                <textarea
                    placeholder="e.g., Match the capital city to the country."
                    {...register(`questions.${qIndex}.question`)}
                    className={`${inputCls} w-full`}
                    rows="3"
                />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E4E6EB] bg-[#F0F2F5]">
                <label className="text-sm font-medium text-[#1C1E21] pr-4">
                    Order matters (user must match items in the correct top-to-bottom order)
                </label>
                <button
                    type="button"
                    onClick={() => setValue(`questions.${qIndex}.extra_data.hasCorrectOrder`, !hasCorrectOrder, {shouldDirty: true})}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${hasCorrectOrder ? 'bg-[#0866FF]' : 'bg-[#CED0D4] dark:bg-darkCustom-600'}`}
                >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${hasCorrectOrder ? 'translate-x-5' : 'translate-x-0'}`}/>
                </button>
            </div>

            <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-4 mb-1 px-1">
                    <label className="block text-sm font-semibold text-[#65676B]">Left Column</label>
                    <label className="block text-sm font-semibold text-[#65676B]">Right Column</label>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
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
                                    inputCls={inputCls}
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
                                inputCls={inputCls}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0866FF] hover:text-[#0757D9] dark:hover:text-[#3F99FF] transition-colors"
            >
                <PlusCircle size={16}/>
                Add Pair
            </button>
        </div>
    );
};

export default memo(MatchingMultipleEditor);
