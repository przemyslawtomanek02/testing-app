import React, {useState} from 'react';
import GradingSchemeList from '../Grading/GradingSchemeList.jsx';
import CreateGradingScheme from '../Grading/CreateGradingScheme';

const GradingSchemePanel = ({setOverlay}) => {
    const [editingId, setEditingId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleEdit   = (scheme_id) => { setEditingId(scheme_id); setIsCreating(false); };
    const handleCreate = () => { setEditingId(null); setIsCreating(true); };
    const handleSaved  = () => { setEditingId(null); setIsCreating(false); };

    return (
        <div>
            {!isCreating && editingId === null ? (
                <GradingSchemeList onEdit={handleEdit} onCreateNew={handleCreate} setOverlay={setOverlay}/>
            ) : (
                <CreateGradingScheme scheme_id={editingId} onBack={handleSaved}/>
            )}
        </div>
    );
};

export default GradingSchemePanel;
