import React, {useState} from 'react';
import GradingSchemeList from '../Grading/GradingSchemeList.jsx';
import CreateGradingScheme from '../Grading/CreateGradingScheme';

const GradingSchemePanel = ({setOverlay}) => {
    const [editingId, setEditingId] = useState(null);

    const handleEdit = (scheme_id) => setEditingId(scheme_id);

    const handleSaved = () => {
        setEditingId(null);
    };

    return (
        <div>
            {editingId === null ? (
                <GradingSchemeList onEdit={handleEdit} setOverlay={setOverlay}/>
            ) : (
                <CreateGradingScheme scheme_id={editingId} onBack={handleSaved}/>
            )}
        </div>
    );
};

export default GradingSchemePanel;
