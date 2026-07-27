import React, {memo, useEffect, useState} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';
import {DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter} from '@dnd-kit/core';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {PlusCircle, Trash2, GripVertical} from 'lucide-react';

const SortableItem = ({field, aIndex, qIndex, control, setValue, onRemove, isDragging, isOverlay = false, inputCls}) => {
    const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id: field.id});

    const itemValueFromForm = useWatch({control, name: `questions.${qIndex}.answers.${aIndex}.text`});
    const [localItemValue, setLocalItemValue] = useState(itemValueFromForm || '');

    useEffect(() => {
        const handler = setTimeout(() => {
            if (itemValueFromForm !== localItemValue) {
                setValue(`questions.${qIndex}.answers.${aIndex}.text`, localItemValue, {shouldDirty: true});
            }
        }, 400);
        return () => clearTimeout(handler);
    }, [localItemValue, itemValueFromForm, setValue, qIndex, aIndex]);

    useEffect(() => {
        if (itemValueFromForm !== undefined) setLocalItemValue(itemValueFromForm || '');
    }, [itemValueFromForm, aIndex]);

    const style = {transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !isOverlay ? 0.5 : 1};

    const classes = `flex items-center gap-3 p-2 rounded-xl border transition-shadow ${
        isDragging || isOverlay
            ? 'bg-white shadow-lg border-[#0866FF] z-10'
            : 'bg-white border-[#E4E6EB]'
    }`;

    return (
        <div ref={setNodeRef} style={style} className={classes}>
            <span {...attributes} {...listeners} className="cursor-grab text-[#BEC3C9] hover:text-[#65676B] p-1">
                <GripVertical size={18}/>
            </span>
            <input
                type="text"
                value={localItemValue}
                onChange={(e) => setLocalItemValue(e.target.value)}
                placeholder={`Item ${aIndex + 1}`}
                className={`${inputCls} flex-grow`}
            />
            <button
                type="button"
                onClick={() => onRemove(aIndex)}
                className="p-1.5 text-[#BEC3C9] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
                <Trash2 size={16}/>
            </button>
        </div>
    );
};

const DragAndDropOrderEditor = ({qIndex, control, register, setValue}) => {
    const {fields, append, remove, move} = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
        keyName: "key",
    });

    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 5}}));

    const answers = useWatch({control, name: `questions.${qIndex}.answers`}) || [];
    const questionFromForm = useWatch({control, name: `questions.${qIndex}.question`});
    const [localQuestion, setLocalQuestion] = useState(questionFromForm || '');

    useEffect(() => {
        const handler = setTimeout(() => {
            if (questionFromForm !== localQuestion) {
                setValue(`questions.${qIndex}.question`, localQuestion, {shouldDirty: true});
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [localQuestion, qIndex, setValue, questionFromForm]);

    useEffect(() => { setLocalQuestion(questionFromForm || ''); }, [questionFromForm]);

    useEffect(() => {
        if (answers && answers.length > 0) {
            setValue(`questions.${qIndex}.extra_data.correct_order`, answers.map(a => a.answer_id), {shouldDirty: true});
        }
    }, [answers, qIndex, setValue]);

    function handleDragStart(event) { setActiveId(event.active.id); }

    function handleDragEnd(event) {
        const {active, over} = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex(item => item.id === active.id);
            const newIndex = fields.findIndex(item => item.id === over.id);
            move(oldIndex, newIndex);
        }
        setActiveId(null);
    }

    const handleAddItem = () => {
        if (fields.length < 8) {
            const highestId = answers.reduce((maxId, item) => Math.max(maxId, parseInt(item.id, 10)), -1);
            append({text: "", id: (highestId + 1).toString()});
        }
    };

    const handleRemoveItem = (index) => { if (fields.length > 2) remove(index); };

    const activeField = activeId ? fields.find(f => f.id === activeId) : null;
    const activeIndex = activeId ? fields.findIndex(f => f.id === activeId) : -1;

    const inputCls = "px-3 py-2 border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] bg-white placeholder:text-[#BEC3C9] focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] transition-all";

    return (
        <div className="space-y-5">
            <div>
                <label htmlFor={`qt-${qIndex}`} className="block text-sm font-medium text-[#1C1E21] mb-1.5">
                    Question / Instruction
                </label>
                <textarea
                    id={`qt-${qIndex}`}
                    value={localQuestion}
                    onChange={(e) => setLocalQuestion(e.target.value)}
                    placeholder="e.g., Arrange the following steps in the correct order."
                    className={`${inputCls} w-full max-h-[400px]`}
                    rows={3}
                />
            </div>

            <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#1C1E21]">Items to Order</label>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {fields.map((field, aIndex) => (
                                <SortableItem
                                    key={field.key}
                                    field={field}
                                    aIndex={aIndex}
                                    qIndex={qIndex}
                                    control={control}
                                    setValue={setValue}
                                    onRemove={handleRemoveItem}
                                    isDragging={activeId === field.id}
                                    inputCls={inputCls}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeField ? (
                            <SortableItem
                                field={activeField}
                                aIndex={activeIndex}
                                qIndex={qIndex}
                                control={control}
                                setValue={setValue}
                                onRemove={() => {}}
                                isDragging={true}
                                isOverlay={true}
                                inputCls={inputCls}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <button
                type="button"
                onClick={handleAddItem}
                disabled={fields.length >= 8}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0866FF] hover:text-[#0757D9] dark:hover:text-[#3F99FF] disabled:text-[#BEC3C9] disabled:cursor-not-allowed transition-colors"
            >
                <PlusCircle size={16}/>
                Add Item
            </button>
        </div>
    );
};

export default memo(DragAndDropOrderEditor);
