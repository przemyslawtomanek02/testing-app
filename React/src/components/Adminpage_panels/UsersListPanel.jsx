import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {toast} from 'react-toastify';
import {
    Loader2,
    UserPlus,
    UserCircle,
    X,
    Search,
    Trash2,
    Edit,
    User,
    Mail,
    Hash,
    Lock,
    Save,
    Wand2,
    Eye,
    EyeOff,
    Copy,
    IdCard, ChevronDownIcon, CheckIcon, KeyRound, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import {AvatarUploadField} from "../Reusable/AvatarUploadField.jsx";
import DeletePopup from "./OverlayComponents/DeletePopup.jsx";
import {useAppContext} from '../../AppContext.jsx';
import {Menu, Transition} from "@headlessui/react";
import ConfirmationPopup from "./OverlayComponents/ConfirmationPopup.jsx";
import {RoleFilterMenu} from "../Reusable/RoleFilterMenu.jsx";

const InputField = ({name, type, placeholder, value, onChange, icon: IconComponent, required = false}) => (
    <div>
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                {IconComponent && <IconComponent className="h-5 w-5 text-slate-400 dark:text-darkCustom-400"/>}
            </div>
            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="w-full pr-4 rounded-md border border-slate-300 bg-slate-50 p-2 pl-10 text-slate-800 transition-colors duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:bg-darkCustom-800 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
            />
        </div>
    </div>
);

const PasswordInputField = ({value, onChange, onGenerate, placeholder, required}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const toggleVisibility = () => setIsPasswordVisible(prevState => !prevState);

    const copyToClipboard = () => {
        if (!value) {
            toast.warn('The password field is empty!');
            return;
        }
        navigator.clipboard.writeText(value);
        toast.success('The password has been copied to the clipboard!');
    };

    return (
        <div className="flex items-center justify-between gap-2">
            <div className="relative grow">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400 dark:text-darkCustom-400"/>
                </div>
                <input
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    className="w-full rounded-md border border-slate-300 bg-slate-50 p-2 pl-10 pr-20 text-slate-800 transition-colors duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:placeholder:text-darkCustom-400 dark:focus:bg-darkCustom-800 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button type="button" onClick={copyToClipboard}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:text-darkCustom-400 dark:hover:text-darkCustom-200">
                        <Copy size={16}/>
                    </button>
                    <button type="button" onClick={toggleVisibility}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:text-darkCustom-400 dark:hover:text-darkCustom-200">
                        {isPasswordVisible ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                </div>
            </div>
            <div>
                <button
                    type="button"
                    onClick={onGenerate}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                >
                    <Wand2 size={14}/>
                    Generate
                </button>
            </div>
        </div>
    );
};

const UserForm = ({onCancel, onSuccess, initialData = null}) => {
    const isEditMode = Boolean(initialData);
    const [formData, setFormData] = useState({
        login: '', password: '', role: 'user', name: '', surname: '', user_index: '', email: ''
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const {config} = useAppContext();

    useEffect(() => {
        if (isEditMode && initialData) {
            setFormData({
                login: initialData.login || '',
                password: '',
                role: initialData.role || 'user',
                name: initialData.name || '',
                surname: initialData.surname || '',
                user_index: initialData.user_index || '',
                email: initialData.email || '',
            });
            setPhotoPreview(initialData.photo_url || '');
        }
    }, [initialData, isEditMode]);

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleFileSelect = (file) => {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({...prev, password}));
        toast.success('A new password has been generated!');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.role || !['user', 'admin'].includes(formData.role)) {
            toast.error('Select a role: user or admin.');
            return;
        }
        setIsLoading(true);

        const data = new FormData();
        Object.entries(formData).forEach(([key, val]) => {
            if (isEditMode && key === 'password' && !formData.password) return;
            if (['name', 'surname', 'email', 'user_index'].includes(key) && (val === '' || val === null || val === undefined)) return;
            data.append(key, val);
        });
        if (photoFile) {
            data.append('avatar_file', photoFile);
        }

        const endpoint = isEditMode ? `/api/admin/update_profile/${initialData.user_id}` : '/api/admin/create_profile';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(endpoint, {method, body: data});
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || 'Wystąpił nieznany błąd serwera.');
            }
            toast.success(isEditMode ? 'User updated!' : 'User created!');
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = [
        {value: 'user', label: 'User'},
        {value: 'admin', label: 'Admin'},
    ];

    const selectedLabel = roleOptions.find(opt => opt.value === formData.role)?.label || 'Select a role';

    const handleRoleChange = (roleValue) => {
        setFormData(prev => ({...prev, role: roleValue}));
    };

    return (
        <div className="w-full max-w-md rounded-xl bg-white dark:bg-darkCustom-900 p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
                {isEditMode ? <Save className="h-7 w-7 text-slate-600 dark:text-darkCustom-300"/> :
                    <UserPlus className="h-7 w-7 text-slate-600 dark:text-darkCustom-300"/>}
                <h2 className="text-2xl font-bold text-slate-800 dark:text-darkCustom-100">{isEditMode ? 'Edit User' : 'Create User'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <AvatarUploadField onFileSelect={handleFileSelect} previewUrl={photoPreview}
                                   initialImageUrl={initialData?.photo_url}/>
                <InputField
                    name="login"
                    placeholder="Login*"
                    value={formData.login}
                    onChange={handleChange}
                    icon={User}
                    required
                />

                <PasswordInputField
                    value={formData.password}
                    onChange={handleChange}
                    onGenerate={generateRandomPassword}
                    placeholder={isEditMode ? "New Password " : "Password*"}
                    required={!isEditMode}
                />

                <Menu as="div" className="relative inline-block text-left w-full">
                    <div>
                        <Menu.Button
                            className="inline-flex w-full justify-between items-center rounded-md border border-slate-300 bg-slate-50 p-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 dark:bg-darkCustom-700 dark:border-darkCustom-600 dark:text-darkCustom-100 dark:hover:bg-darkCustom-600">
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
                        <Menu.Items
                            className="absolute right-0 mt-2 w-full origin-top-right divide-y divide-slate-100 dark:divide-darkCustom-700 rounded-md bg-white dark:bg-darkCustom-900 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-darkCustom-700 focus:outline-none dark:text-darkCustom-100 z-10">
                            <div className="px-1 py-1">
                                {roleOptions.map((option) => (
                                    <Menu.Item key={option.value}>
                                        {({focus}) => (
                                            <button
                                                type="button"
                                                onClick={() => handleRoleChange(option.value)}
                                                className={`${
                                                    focus ? 'bg-slate-100 dark:bg-darkCustom-700' : 'text-slate-900 dark:text-darkCustom-100'
                                                } group flex w-full items-center justify-between rounded-md px-2 py-2 text-sm`}
                                            >
                                                <span>{option.label}</span>
                                                {formData.role === option.value && (
                                                    <CheckIcon
                                                        className="h-5 w-5 text-indigo-600 dark:text-indigo-400"/>
                                                )}
                                            </button>
                                        )}
                                    </Menu.Item>
                                ))}
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>


                <div className="grid mt-12 grid-cols-1 gap-4 md:grid-cols-2">
                    <InputField name="name" placeholder="Name" value={formData.name} onChange={handleChange}
                                icon={UserCircle}/>
                    <InputField name="surname" placeholder="Surname" value={formData.surname}
                                onChange={handleChange}
                                icon={IdCard}/>
                </div>
                <InputField name="email" type="email" placeholder="Email" value={formData.email}
                            onChange={handleChange}
                            icon={Mail}/>
                {config && config.use_index && (
                    <InputField name="user_index" type="number" placeholder="Index Number" value={formData.user_index}
                                onChange={handleChange} icon={Hash}/>
                )}


                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onCancel}
                            className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 dark:bg-darkCustom-700 dark:text-darkCustom-200 dark:hover:bg-darkCustom-600">
                        <X size={16}/> Cancel
                    </button>
                    <button type="submit" disabled={isLoading}
                            className="flex items-center gap-2 rounded-md bg-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:disabled:bg-darkCustom-600">
                        {isLoading ? <Loader2 className="animate-spin" size={20}/> : (isEditMode ? <Save size={16}/> :
                            <UserPlus size={16}/>)}
                        {isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save changes' : 'Create user')}
                    </button>
                </div>
            </form>
        </div>
    );
};

const SortableHeader = ({children, columnKey, sortConfig, onSort}) => {
    const isSorted = sortConfig.key === columnKey;
    const isAsc = sortConfig.direction === 'asc';

    const Icon = isSorted ? (isAsc ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <th className="px-4 py-3 text-xs font-semibold text-[#65676B] uppercase tracking-wider cursor-pointer hover:bg-[#F0F2F5] transition-colors"
            onClick={() => onSort(columnKey)}>
            <div className="flex items-center gap-1.5">
                <span>{children}</span>
                <Icon size={12} className="text-[#BEC3C9]"/>
            </div>
        </th>
    );
};

export default function UsersListPanel({setOverlay, onRefresh}) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [roleFilter, setRoleFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({key: 'surname', direction: 'asc'});

    const fetchUsers = useCallback(async () => {
        if (!loading) setLoading(true);
        try {
            const response = await fetch('/api/admin/get_profiles');
            if (!response.ok) throw new Error('Failed to fetch users');
            setUsers(await response.json());
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        console.log(users)
    }, [users]);


    useEffect(() => {
        void fetchUsers();
    }, []);

    const filteredAndSortedUsers = useMemo(() => {
        let processedUsers = Array.isArray(users) ? [...users] : [];

        if (roleFilter !== 'all') {
            processedUsers = processedUsers.filter(user => user.role === roleFilter);
        }

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            processedUsers = processedUsers.filter(user =>
                `${user.name} ${user.surname}`.toLowerCase().includes(lowercasedFilter) ||
                user.login.toLowerCase().includes(lowercasedFilter) ||
                user.email?.toLowerCase().includes(lowercasedFilter)
            );
        }

        if (sortConfig.key) {
            processedUsers.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

                const primaryCompare = aValue.toString().localeCompare(bValue.toString(), 'pl', { numeric: true });

                if (primaryCompare !== 0) {
                    return sortConfig.direction === 'asc' ? primaryCompare : -primaryCompare;
                }

                if (sortConfig.key === 'surname') {
                    const aName = a.name || '';
                    const bName = b.name || '';
                    const secondaryCompare = aName.localeCompare(bName, 'pl');
                    return sortConfig.direction === 'asc' ? secondaryCompare : -secondaryCompare;
                }
                return 0;
            });
        }

        return processedUsers;
    }, [users, searchTerm, roleFilter, sortConfig]);

    const handleSort = (columnKey) => {
        setSortConfig(prevConfig => {
            const isAsc = prevConfig.key === columnKey && prevConfig.direction === 'asc';
            return {
                key: columnKey,
                direction: isAsc ? 'desc' : 'asc'
            };
        });
    };

    const handleSuccess = useCallback(() => {
        setOverlay(null);
        void fetchUsers();
    }, [setOverlay, fetchUsers]);

    const handleCancel = useCallback(() => {
        setOverlay(null);
    }, [setOverlay]);

    const openCreateForm = () => {
        setOverlay(
            <UserForm
                onCancel={handleCancel}
                onSuccess={handleSuccess}
            />
        );
    };

    const openEditForm = (user) => {
        setOverlay(
            <UserForm
                onCancel={handleCancel}
                onSuccess={handleSuccess}
                initialData={user}
            />
        );
    };

    const handleConfirmPasswordReset = async (userId) => {
        try {
            const response = await fetch(`/api/admin/force_password_reset/${userId}`, {
                method: 'POST'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to force password reset.');
            }
            toast.success('Password reset has been successfully forced for the user.');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setOverlay(null);
        }
    };

    const handleRequestPasswordReset = (user) => {
        setOverlay(
            <ConfirmationPopup
                icon={<KeyRound size={24} className="text-amber-500 dark:text-amber-400"/>}
                title="Confirm Password Reset"
                message={<>Are you sure you want to force a password reset
                    for <strong>{user.name} {user.surname}</strong> on their next login?</>}
                onConfirm={() => handleConfirmPasswordReset(user.user_id)}
                onCancel={() => setOverlay(null)}
                confirmText="Reset Password"
                confirmColor="amber"
            />
        );
    };

    const handleDelete = (userId) => {
        const executeDelete = async () => {
            try {
                const response = await fetch(`/api/admin/delete_profile/${userId}`, {method: 'DELETE'});
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error while deleting user.');
                }
                toast.success('User deleted successfully.');
                void fetchUsers();
            } catch (error) {
                toast.error(error.message);
            } finally {
                setOverlay(null);
            }
        };
        setOverlay(
            <DeletePopup
                onConfirm={executeDelete}
                onCancel={() => setOverlay(null)}
            />
        );
    };

    const capitalize = (word) => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
    }


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#F0F2F5]">
                <Loader2 className="animate-spin h-8 w-8 text-[#BEC3C9]"/>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#F0F2F5] min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-5">
                    <div className="relative w-full md:mr-auto md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#BEC3C9]"/>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full py-2 pl-9 pr-3 bg-white border border-[#E4E6EB] rounded-xl text-sm text-[#1C1E21] focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] outline-none transition-all placeholder:text-[#BEC3C9] shadow-sm"
                        />
                    </div>

                    <div className="flex w-full md:w-auto md:max-w-xs items-center gap-2">
                        <RoleFilterMenu selectedRole={roleFilter} onSelectRole={setRoleFilter}/>
                    </div>

                    <button onClick={openCreateForm}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#0866FF] text-white font-semibold py-2 px-4 rounded-xl hover:bg-[#0757D9] transition-colors text-sm shadow-sm">
                        <UserPlus size={16}/>
                        <span>Add New User</span>
                    </button>
                </div>

                <div className="bg-white border border-[#E4E6EB] rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-[#E4E6EB]">
                            <tr>
                                <SortableHeader columnKey="surname" sortConfig={sortConfig} onSort={handleSort}>User</SortableHeader>
                                <SortableHeader columnKey="login" sortConfig={sortConfig} onSort={handleSort}>Login</SortableHeader>
                                <SortableHeader columnKey="email" sortConfig={sortConfig} onSort={handleSort}>Email</SortableHeader>
                                <SortableHeader columnKey="role" sortConfig={sortConfig} onSort={handleSort}>Role</SortableHeader>
                                <SortableHeader columnKey="user_index" sortConfig={sortConfig} onSort={handleSort}>Index</SortableHeader>
                                <th className="px-4 py-3 text-xs font-semibold text-[#65676B] uppercase tracking-wider">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E4E6EB]">
                            {filteredAndSortedUsers.map(user => (
                                <tr key={user.user_id} className="hover:bg-[#F0F2F5] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {user.photo_url ? (
                                                <img src={user.photo_url} alt={`${user.name} ${user.surname}`}
                                                     className="h-9 w-9 rounded-full object-cover"/>
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center font-semibold rounded-full bg-[#E7F3FF] text-[#0866FF] text-sm">
                                                    <span>{(user?.surname?.[0] || '').toUpperCase()}{(user?.name?.[0] || '').toUpperCase()}</span>
                                                </div>
                                            )}
                                            <p className="font-medium text-[#1C1E21] text-sm">{user.surname} {user.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[#65676B] text-sm">{user.login}</td>
                                    <td className="px-4 py-3 text-[#65676B] text-sm">{user.email || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-[#E7F3FF] text-[#0866FF]' : 'bg-[#F0F2F5] text-[#65676B]'}`}>
                                            {capitalize(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#65676B] text-sm">{user.user_index || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <button onClick={() => openEditForm(user)} title="Edit user"
                                                    className="p-1.5 rounded-lg text-[#606770] hover:text-green-600 hover:bg-green-50 transition-colors">
                                                <Edit size={15}/>
                                            </button>
                                            <button onClick={() => handleRequestPasswordReset(user)} title="Force password reset"
                                                    className="p-1.5 rounded-lg text-[#606770] hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                                <KeyRound size={15}/>
                                            </button>
                                            <button onClick={() => handleDelete(user.user_id)} title="Delete user"
                                                    className="p-1.5 rounded-lg text-[#606770] hover:text-red-500 hover:bg-red-50 transition-colors">
                                                <Trash2 size={15}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
