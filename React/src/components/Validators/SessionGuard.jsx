import React from 'react';
import {Navigate, Outlet} from 'react-router-dom';
import {useAppContext} from '../../AppContext.jsx';
import SuspensePage from '../Suspense.jsx';

/**
 * Komponent-strażnik, który odczytuje stan sesji z AppContext
 * i chroni trasy wymagające aktywnej sesji.
 */
const SessionGuard = () => {
    const {isSessionValid, isLoading} = useAppContext();

    if (isLoading) {
        return <SuspensePage/>;
    }

    return isSessionValid ? <Outlet/> : <Navigate to="/" replace/>;
};

export default SessionGuard;
