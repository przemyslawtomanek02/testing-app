import React, { useEffect, useState } from "react";

function Overlay({ setOverlay, component }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsVisible(true);
        }, 10);
        return () => clearTimeout(timeout);
    }, []);

    const closeOverlay = () => {
        setIsVisible(false);
        setTimeout(() => setOverlay(null), 300);
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ${
                isVisible ? "bg-black/70 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
            }`}
            onClick={closeOverlay}
        >
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {component}
            </div>
        </div>
    );
}

export default Overlay;