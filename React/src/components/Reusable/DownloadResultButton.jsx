import {useEffect, useRef, useState} from "react";
import {ChevronLeft,Download, FileText, FileDown } from 'lucide-react';


const DownloadResultButton = ({ id, entityType }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleDownload = async (fileType) => {
        setIsOpen(false);
        try {
            const response = await fetch("/api/admin/download_result", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: id,
                    file_type: fileType,
                    entity_type: entityType,
                }),
            });

            if (!response.ok) throw new Error("Error downloading file");

            const blob = await response.blob();
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = `results.${fileType}`;

            if (contentDisposition) {
                const utf8Match = contentDisposition.match(/filename\*?=['"]?UTF-8['"]?''(.+)/);
                if (utf8Match && utf8Match[1]) {
                    filename = decodeURIComponent(utf8Match[1]);
                } else {
                    const asciiMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                    if (asciiMatch) filename = asciiMatch[1];
                }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Download Error:", error.message);
        }
    };
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400 dark:focus:ring-offset-darkCustom-800"
                >
                    <FileDown size={16} />
                    <span>Download</span>
                    <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '-rotate-90' : 'rotate-0'}`} />
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30 dark:bg-darkCustom-900 dark:ring-1 dark:ring-darkCustom-700"
                >
                    <div className="py-1">
                        <button
                            onClick={() => handleDownload("pdf")}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-darkCustom-50 dark:hover:bg-darkCustom-700"
                        >
                           <FileText size={16} className="text-red-500 dark:text-red-400" /> Download PDF
                        </button>
                        <button
                           onClick={() => handleDownload("docx")}
                           className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-darkCustom-50 dark:hover:bg-darkCustom-700"
                        >
                            <FileText size={16} className="text-blue-500 dark:text-blue-400"/> Download DOCX
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DownloadResultButton;