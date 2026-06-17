import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import SuspensePage from './Suspense';

const useAdminFetchGuard = (onUnauthorized) => {
    const cbRef = useRef(onUnauthorized);
    cbRef.current = onUnauthorized;

    useEffect(() => {
        const originalFetch = window.fetch;
        let redirecting = false;

        window.fetch = async (...args) => {
            const res = await originalFetch(...args);

            try {
                const reqUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url;
                const {pathname} = new URL(reqUrl, window.location.origin);

                const isAdminApi = pathname.startsWith('/api/admin/');
                const shouldRedirect = [401, 403, 404, 303].includes(res.status);

                if (isAdminApi && shouldRedirect && !redirecting) {
                    redirecting = true;
                    cbRef.current?.();
                    throw new Error('Unauthorized');
                }
            } catch {
            }

            return res;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);
}

const PrivateRoute = ({children}) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useAdminFetchGuard(() => {
        navigate('/admin', {replace: true, state: {message: 'Session expired. Please log in.'}});
    });

    useEffect(() => {
        (async () => {
            try {
                const response = await fetch('/api/check_admin_status', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.is_admin) {
                        setIsAdmin(true);
                    } else {
                        navigate('/admin', {state: {message: "You do not have admin rights."}});
                    }
                } else if (response.status === 303) {
                    navigate('/admin', {state: {message: "Please log in."}});
                } else {
                    console.error("Error checking admin status:", response.status);
                    navigate('/admin', {state: {message: "An unexpected error occurred. Please log in again."}});
                }
            } catch (error) {
                console.error("Network error checking admin status:", error);
                navigate('/admin', {state: {message: "A network error occurred. Please try again."}});
            }
            setIsLoading(false);
        })();
    }, [navigate]);

    if (isLoading) {
        return <SuspensePage/>;
    }

    return isAdmin ? children : null;
};

export default PrivateRoute;