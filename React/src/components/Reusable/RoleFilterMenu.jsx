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
                    className="inline-flex w-full justify-between items-center gap-2 rounded-full border border-[#E4E6EB] dark:border-darkCustom-600 bg-white dark:bg-darkCustom-900 px-4 py-2.5 text-sm font-medium text-[#1C1E21] dark:text-darkCustom-100 shadow-sm hover:bg-[#F4F6FB] dark:hover:bg-darkCustom-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF]"
                >
                    {selectedLabel}
                    <ChevronDownIcon
                        className="ml-2 -mr-1 h-5 w-5 text-[#94A3B8] dark:text-darkCustom-400"
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
                <Menu.Items className="absolute right-0 mt-2 w-full origin-top-right divide-y divide-[#E4E6EB] dark:divide-darkCustom-700 rounded-2xl border border-[#E4E6EB] dark:border-darkCustom-700 bg-white dark:bg-darkCustom-900 shadow-lg focus:outline-none z-10 overflow-hidden">
                    <div className="px-1 py-1">

                        {roleOptions.map((option) => (
                            <Menu.Item key={option.value}>
                                {({ active }) => (
                                    <button
                                        type="button"
                                        onClick={() => onSelectRole(option.value)}
                                        className={`${
                                            active ? 'bg-[#F4F6FB] dark:bg-darkCustom-800' : ''
                                        } text-[#1C1E21] dark:text-darkCustom-100 group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors`}
                                    >
                                        <span>{option.label}</span>
                                        {selectedRole === option.value && (
                                            <CheckIcon className="h-4 w-4 text-[#2B73FF] dark:text-[#4D8EFF]" />
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