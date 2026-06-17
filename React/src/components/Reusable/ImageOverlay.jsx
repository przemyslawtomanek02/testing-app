import React, {useEffect, useState, useRef} from "react";

function ImageOverlay({setOverlayImage, image}) {
    const [isVisible, setIsVisible] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const imageUrlRef = useRef(null);

    useEffect(() => {
        if (image instanceof Blob || image instanceof File) {
            imageUrlRef.current = URL.createObjectURL(image);
            setImageUrl(imageUrlRef.current);
        } else if (typeof image === "string") {
            imageUrlRef.current = image;
            setImageUrl(image);
        } else {
            console.error("Image is of unknown type:", image);
        }
    }, [image]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsVisible(true);
        }, 10);
        return () => clearTimeout(timeout);
    }, []);

    const closeOverlay = () => {
        setIsVisible(false);
        if (imageUrlRef.current && (image instanceof Blob || image instanceof File)) {
            URL.revokeObjectURL(imageUrlRef.current);
        }
        setTimeout(() => setOverlayImage(null), 500);
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-101 transition-all duration-500 ${
                isVisible ? "bg-black/70 backdrop-blur-md" : "bg-black/0 backdrop-blur-0"
            }`}
            onClick={closeOverlay}
        >
            <div
                className={`transition-all w-fit duration-500 ease-in-out bg-white dark:bg-darkCustom-900 p-8 rounded-xl shadow-lg ${
                    isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {imageUrl && (
                    <div className="flex items-center justify-center ">
                        <img src={imageUrl} alt="Preview" className="max-w-full max-h-[80vh]"/>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImageOverlay;