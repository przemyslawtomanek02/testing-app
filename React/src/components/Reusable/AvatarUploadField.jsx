import React, {useRef, useState} from 'react';
import {Loader2, UploadCloud, User} from 'lucide-react';
import {toast} from 'react-toastify';

export const AvatarUploadField = ({
                                      onFileSelect,
                                      previewUrl,
                                      initialImageUrl,
                                      isLoading = false,
                                      size = 'large',
                                      fallback
                                  }) => {
    const fileInputRef = useRef(null);
    const imageUrl = previewUrl || initialImageUrl;
    const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
    const [avatarFailed, setAvatarFailed] = useState(false);


    const sizeClasses = {
        large: 'h-28 w-28',
        medium: 'h-24 w-24',
    };

    const iconSize = size === 'large' ? 'h-14 w-14' : 'h-12 w-12';
    const buttonIconSize = size === 'large' ? 18 : 16;

    const handleContainerClick = () => {
        if (!isLoading) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error('The file is too large! The maximum size is 2 MB.');

            e.target.value = null;
            return;
        }
        onFileSelect(file);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className={`relative ${sizeClasses[size]} cursor-pointer rounded-full bg-slate-100 dark:bg-darkCustom-700 ring-2 ring-slate-200 dark:ring-darkCustom-600 ring-offset-2 dark:ring-offset-darkCustom-900 transition-all hover:ring-slate-500 dark:hover:ring-indigo-500`}
                onClick={handleContainerClick}
            >
                <div className="flex h-full w-full items-center justify-center rounded-full overflow-hidden">
                    {isLoading ? (
                        <Loader2 className="animate-spin text-slate-500 dark:text-darkCustom-400" size={32}/>
                    ) : imageUrl && !avatarFailed ? (
                        <img src={imageUrl} alt="Avatar Preview" onError={() => setAvatarFailed(true)} className="h-full w-full object-cover"/>
                    ) : fallback ? (
                        fallback
                    ) : (
                        <User className={`${iconSize} text-slate-400`}/>
                    )}
                </div>
                {!isLoading && (
                    <div
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 dark:bg-indigo-600 text-white shadow-md ring-4 ring-white dark:ring-darkCustom-900">
                        <UploadCloud size={buttonIconSize}/>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
            />
            <button type="button" onClick={handleContainerClick}
                    className="text-sm font-semibold text-slate-600 hover:underline dark:text-darkCustom-300 dark:hover:text-indigo-400">
                {imageUrl ? 'Change picture' : 'Select picture'}
            </button>
        </div>
    );
};