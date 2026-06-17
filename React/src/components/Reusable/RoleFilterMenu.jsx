import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';

const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
];

export function RoleFilterMenu({ selectedRole, onSelectRole }) {

    const selectedLabel = roleOptions.find(opt => opt.value === selectedRole)?.label || 'Select a role';

    return (
        <Menu as="div" className="relative inline-block text-left w-full md:max-w-xs">
            <div>
                <Menu.Button
                    className="inline-flex w-full justify-between items-center rounded-lg bg-white dark:bg-darkCustom-900 p-2.5 text-base font-medium text-black dark:text-darkCustom-100 shadow-md hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-slate-600 dark:focus:ring-darkCustom-300"
                >
                    {selectedLabel}
                    <ChevronDownIcon
                        className="ml-2 -mr-1 h-5 w-5 text-slate-400 dark:text-darkCustom-400"
                        aria-hidden="true"
                    />
                </Menu.Button>
            </div>

            <Transition
                as={React.Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 w-full origin-top-right divide-y divide-slate-100 dark:divide-darkCustom-700 rounded-md bg-white dark:bg-darkCustom-900 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="px-1 py-1">

                        {roleOptions.map((option) => (
                            <Menu.Item key={option.value}>
                                {({ active }) => (
                                    <button
                                        type="button"
                                        onClick={() => onSelectRole(option.value)}
                                        className={`${
                                            active ? 'bg-slate-100 dark:bg-darkCustom-700' : 'text-slate-900 dark:text-darkCustom-100'
                                        } group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm`}
                                    >
                                        <span>{option.label}</span>
                                        {selectedRole === option.value && (
                                            <CheckIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        )}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}

                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}