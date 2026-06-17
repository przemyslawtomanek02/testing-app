import React, {createContext, useContext, useEffect, useState, useCallback} from 'react';
import {toast} from "react-toastify";
import {useNavigate} from "react-router-dom";

const AppContext = createContext(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};

export const AppContextProvider = ({children}) => {
    const [config, setConfig] = useState(null);
    const [user, setUser] = useState(null);
    const [isSessionValid, setIsSessionValid] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [avatarFailed, setAvatarFailed] = useState(false);
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(null);

    useEffect(() => {
        if (darkMode === null) {
            return;
        }

        const root = document.documentElement;

        root.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        document.cookie = `dark_mode=${darkMode}; path=/; max-age=${60 * 60 * 24 * 365}`;

        console.log("APP CONTEXT: ✅ Motyw i ciasteczko zaktualizowane na:", darkMode);
    }, [darkMode]);

    function getCookie(name) {
        const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
        return match ? match[2] : null;
    }

    const toggleDarkMode = () => setDarkMode(prev => !prev);

    const getBackendConfig = useCallback(async () => {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error("Error fetching config");
        return await response.json();
    }, []);

    const setBackendConfig = useCallback(async (newConfig) => {
        const response = await fetch('/api/update_config', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newConfig),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Error updating config');
        }
        return await response.json();
    }, []);

    const validateSession = useCallback(async () => {
        console.log("Wywołanie validateSession z AppContextProvider.")
        try {
            const response = await fetch('/api/user/session_check', {
                method: 'GET',
                credentials: 'include',
                headers: {'Accept': 'application/json'},
            });
            const isValid = response.ok;
            setIsSessionValid(isValid);
            return isValid;
        } catch {
            setIsSessionValid(false);
            return false;
        }
    }, []);

    const fetchCurrentUser = useCallback(async () => {
        console.log("Wywołanie fetchCurrentUser z AppContextProvider.")
        try {
            const response = await fetch('/api/user/profile/me', {credentials: 'include'});
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                return userData;
            } else {
                setUser(null);
                setIsSessionValid(false);
            }
        } catch (error) {
            console.error("Błąd podczas pobierania danych użytkownika:", error);
            setUser(null);
            setIsSessionValid(false);
        }
    }, []);

    const login = (userData) => {
        console.log("LOGIN (from API data): Ustawiam użytkownika na:", userData);
        if (userData) {
            setUser(userData);
            setIsSessionValid(true);
        } else {
            setUser(null);
            setIsSessionValid(false);
        }
    };

    const logout = useCallback(async () => {
        try {
            const response = await fetch('/api/user/logout', {method: 'POST'});

            if (!response.ok) {
                throw new Error('Logout on server failed.');
            }

            setUser(null);
            setIsSessionValid(false);
            toast.success("Successfully Logged out.");

            navigate('/');

        } catch (error) {
            setUser(null);
            setIsSessionValid(false);
            navigate('/');
            console.error(error.message);
        }
    }, [navigate]);

    useEffect(() => {
        const initialize = async () => {
            console.log("APP CONTEXT: 🟡 Inicjalizacja rozpoczęta...");
            setIsLoading(true);
            try {
                const cookiePref = getCookie("dark_mode");

                if (cookiePref !== null) {
                    console.log(`APP CONTEXT: 🍪 Znaleziono preferencje w ciasteczku: ${cookiePref}`);
                    setDarkMode(cookiePref === 'true');
                    getBackendConfig().then(data => setConfig(data));
                } else {
                    console.log("APP CONTEXT: 🍪 Brak ciasteczka. Pobieranie konfiguracji z backendu...");
                    const backendConfig = await getBackendConfig();
                    setConfig(backendConfig);
                    setDarkMode(backendConfig.dark_mode);
                    console.log(`APP CONTEXT: ✅ Ustawiono motyw z backendu: ${backendConfig.dark_mode}`);
                }

                console.log("APP CONTEXT: 🟡 Sprawdzanie sesji...");
                const sessionIsValid = await validateSession();
                console.log(`APP CONTEXT: Sesja jest ${sessionIsValid ? '✅ ważna' : '❌ nieważna'}.`);

                if (sessionIsValid) {
                    console.log("APP CONTEXT: 🟡 Pobieranie danych użytkownika...");
                    await fetchCurrentUser();
                    console.log("APP CONTEXT: ✅ Dane użytkownika pobrane.");
                } else {
                    console.log("APP CONTEXT: ⏩ Pomijanie pobierania danych użytkownika.");
                }

            } catch (error) {
                console.error("APP CONTEXT: ❌ Błąd inicjalizacji aplikacji:", error);
                toast.error("Nie udało się załadować ustawień aplikacji.");
                setDarkMode(false);
            } finally {
                setIsLoading(false);
                console.log("APP CONTEXT: 🏁 Inicjalizacja zakończona, isLoading: false.");
            }
        };
        void initialize();
    }, [getBackendConfig, validateSession, fetchCurrentUser]);

    useEffect(() => {
        console.log("APP CONTEXT: Stan `user` został zaktualizowany:", user);
    }, [user]);

    const value = {
        config,
        setConfig,
        isSessionValid,
        isLoading,
        getBackendConfig,
        setBackendConfig,
        validateSession,
        login,
        logout,
        user,
        setUser,
        avatarFailed,
        setAvatarFailed,
        fetchCurrentUser,
        darkMode,
        toggleDarkMode,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
