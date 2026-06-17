import React, { memo, useEffect, useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';

const SortableItem = ({ field, aIndex, qIndex, control, setValue, onRemove, isDragging, isOverlay = false, inputClasses }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: field.id });

    const itemValueFromForm = useWatch({
        control,
        name: `questions.${qIndex}.answers.${aIndex}.text`,
    });

    const [localItemValue, setLocalItemValue] = useState(itemValueFromForm || '');

    useEffect(() => {
        const handler = setTimeout(() => {
            if (itemValueFromForm !== localItemValue) {
                setValue(`questions.${qIndex}.answers.${aIndex}.text`, localItemValue, { shouldDirty: true });
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [localItemValue, itemValueFromForm, setValue, qIndex, aIndex]);

    useEffect(() => {
        if (itemValueFromForm !== undefined) {
            setLocalItemValue(itemValueFromForm || '');
        }
    }, [itemValueFromForm, aIndex]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.5 : 1,
    };

    const baseClasses = "flex items-center gap-3 p-2 rounded-md border";
    const normalStateClasses = "bg-white border-slate-200 dark:bg-darkCustom-900 dark:border-darkCustom-700";
    const draggingStateClasses = "bg-white shadow-lg border-blue-500 z-10 dark:bg-darkCustom-800 dark:border-blue-400";

    const classes = `${baseClasses} ${isDragging || isOverlay ? draggingStateClasses : normalStateClasses}`;


    return (
        <div ref={setNodeRef} style={style} className={classes}>
            <span {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 dark:text-darkCustom-300 dark:hover:text-darkCustom-200 p-1">
                <GripVertical size={20} />
            </span>
            <input
                type="text"
                value={localItemValue}
                onChange={(e) => setLocalItemValue(e.target.value)}
                placeholder={`Item ${aIndex + 1}`}
                className={`${inputClasses} flex-grow`}
            />
            <button
                type="button"
                onClick={() => onRemove(aIndex)}
                className="p-2 text-slate-400 hover:text-red-600 dark:text-darkCustom-400 dark:hover:text-red-500 rounded-md"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};


// ============================================================================
// GŁÓWNY KOMPONENT
// ============================================================================
const DragAndDropOrderEditor = ({ qIndex, control, register, setValue }) => {
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: `questions.${qIndex}.answers`,
        keyName: "key",
    });

    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const answers = useWatch({
        control,
        name: `questions.${qIndex}.answers`,
    }) || [];

    const questionFromForm = useWatch({ control, name: `questions.${qIndex}.question` });
    const [localQuestion, setLocalQuestion] = useState(questionFromForm || '');

    useEffect(() => {
        const handler = setTimeout(() => {
            if (questionFromForm !== localQuestion) {
                setValue(`questions.${qIndex}.question`, localQuestion, { shouldDirty: true });
            }
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [localQuestion, qIndex, setValue, questionFromForm]);

    useEffect(() => {
        setLocalQuestion(questionFromForm || '');
    }, [questionFromForm]);

    useEffect(() => {
        if (answers && answers.length > 0) {
            const currentOrder = answers.map(answer => answer.answer_id);
            setValue(`questions.${qIndex}.extra_data.correct_order`, currentOrder, { shouldDirty: true });
        }
    }, [answers, qIndex, setValue]);

    function handleDragStart(event) {
        setActiveId(event.active.id);
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over.id);
            move(oldIndex, newIndex);
        }
        setActiveId(null);
    }

    const handleAddItem = () => {
        if (fields.length < 8) {
            const highestId = answers.reduce((maxId, item) => Math.max(maxId, parseInt(item.id, 10)), -1);
            const newId = (highestId + 1).toString();
            append({ text: "", id: newId });
        }
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
                <label htmlFor={`question-text-${qIndex}`} className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200 mb-1">
                    Question / Instruction
                </label>
                <textarea
                    id={`question-text-${qIndex}`}
                    value={localQuestion}
                    onChange={(e) => setLocalQuestion(e.target.value)}
                    placeholder="e.g., Arrange the following steps in the correct order."
                    className={`${inputClasses} w-full max-h-[400px]`}
                    rows={3}
                />
            </div>

            <div className="space-y-3">
                <label htmlFor="" className="block text-sm font-medium text-slate-700 dark:text-darkCustom-200">Items to Order</label>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext
                        items={fields.map(field => field.id)}
                        strategy={verticalListSortingStrategy}
                    >
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
                                    inputClasses={inputClasses}
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
                    disabled={fields.length >= 8}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-darkCustom-500 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusCircle size={18} />
                    Add Item
                </button>
            </div>
        </div>
    );
};

export default memo(DragAndDropOrderEditor);
