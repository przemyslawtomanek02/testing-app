import React from "react";

function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-darkCustom-1000">
            <div
                className="grid min-h-full place-items-center bg-white dark:bg-darkCustom-1000 px-6 py-24 sm:py-32 lg:px-8">
                <div className="text-center">
                    <p className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">404</p>
                    <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 dark:text-darkCustom-50 sm:text-7xl">
                        Page not found
                    </h1>
                    <p className="mt-6 text-lg font-medium text-pretty text-gray-500 dark:text-darkCustom-50 sm:text-xl/8">
                        Sorry traveler, it seems you’ve lost your way.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <a
                            href="/"
                            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500"
                        >
                            Go back home
                        </a>
                    </div>
                    <div className="mt-6">
                        <img src="/media/hamster-meme.gif" alt="Hamster not found" className="mx-auto w-1/2"/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotFoundPage;
