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

const FIELD_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const FieldLabel = ({children, T}) => (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: T.label, marginBottom: '6px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {children}
    </label>
);

const InputField = ({name, type, placeholder, label, value, onChange, icon: IconComponent, required = false, T}) => {
    const [focused, setFocused] = useState(false);
    return (
        <div>
            {label && <FieldLabel T={T}>{label}</FieldLabel>}
            <div style={{ position: 'relative' }}>
                {IconComponent && (
                    <IconComponent size={16} style={{
                        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                        color: focused ? '#2B73FF' : T.textMuted, transition: 'color 0.15s', pointerEvents: 'none',
                    }}/>
                )}
                <input
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    required={required}
                    style={{
                        width: '100%', height: '44px', borderRadius: '14px',
                        border: `1.5px solid ${focused ? '#2B73FF' : T.border}`,
                        background: focused ? T.inputBgFocus : T.inputBg,
                        paddingLeft: IconComponent ? '40px' : '14px', paddingRight: '14px',
                        fontSize: '14px', color: T.text, outline: 'none',
                        transition: 'border-color 0.15s, background 0.15s',
                        boxSizing: 'border-box', fontFamily: FIELD_FONT,
                        boxShadow: focused ? '0 0 0 3px rgba(43,115,255,0.1)' : 'none',
                    }}
                />
            </div>
        </div>
    );
};

const PasswordInputField = ({value, onChange, onGenerate, placeholder, label, required, T}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [focused, setFocused] = useState(false);

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
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                {label && <FieldLabel T={T}>{label}</FieldLabel>}
                <button
                    type="button"
                    onClick={onGenerate}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: '#2B73FF',
                        letterSpacing: '0.02em', padding: 0,
                    }}
                >
                    <Wand2 size={12}/>
                    Generate
                </button>
            </div>
            <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: focused ? '#2B73FF' : T.textMuted, transition: 'color 0.15s', pointerEvents: 'none',
                }}/>
                <input
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    required={required}
                    style={{
                        width: '100%', height: '44px', borderRadius: '14px',
                        border: `1.5px solid ${focused ? '#2B73FF' : T.border}`,
                        background: focused ? T.inputBgFocus : T.inputBg,
                        paddingLeft: '40px', paddingRight: '76px',
                        fontSize: '14px', color: T.text, outline: 'none',
                        transition: 'border-color 0.15s, background 0.15s',
                        boxSizing: 'border-box', fontFamily: FIELD_FONT,
                        boxShadow: focused ? '0 0 0 3px rgba(43,115,255,0.1)' : 'none',
                    }}
                />
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button type="button" onClick={copyToClipboard}
                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', borderRadius: '8px' }}>
                        <Copy size={15}/>
                    </button>
                    <button type="button" onClick={toggleVisibility}
                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', borderRadius: '8px' }}>
                        {isPasswordVisible ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RoleSelect = ({value, onChange, options, T}) => {
    const selectedLabel = options.find(opt => opt.value === value)?.label || 'Select a role';
    return (
        <div>
            <FieldLabel T={T}>Role</FieldLabel>
            <Menu as="div" style={{ position: 'relative' }}>
                <Menu.Button style={{
                    width: '100%', height: '44px', borderRadius: '14px',
                    border: `1.5px solid ${T.border}`, background: T.inputBg,
                    padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '14px', fontWeight: '500', color: T.text, cursor: 'pointer',
                    fontFamily: FIELD_FONT, boxSizing: 'border-box',
                }}>
                    {selectedLabel}
                    <ChevronDownIcon style={{ width: '16px', height: '16px', color: T.textMuted }} aria-hidden="true"/>
                </Menu.Button>
                <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items style={{
                        position: 'absolute', left: 0, right: 0, marginTop: '6px', zIndex: 20,
                        background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: '6px', outline: 'none',
                    }}>
                        {options.map((option) => (
                            <Menu.Item key={option.value}>
                                {({focus}) => (
                                    <button
                                        type="button"
                                        onClick={() => onChange(option.value)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '9px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                            fontSize: '14px', fontFamily: FIELD_FONT,
                                            background: focus ? T.inputBg : 'transparent',
                                            color: T.text,
                                        }}
                                    >
                                        <span>{option.label}</span>
                                        {value === option.value && <CheckIcon style={{ width: '16px', height: '16px', color: '#2B73FF' }}/>}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                    </Menu.Items>
                </Transition>
            </Menu>
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

    const {config, darkMode: dk} = useAppContext();
    const T = {
        surface:      dk ? '#171B2D' : '#FFFFFF',
        text:         dk ? '#E2E8F0' : '#0F1623',
        textSec:      dk ? '#8896B3' : '#64748B',
        inputBg:      dk ? '#1E2237' : '#FAFAFA',
        inputBgFocus: dk ? '#1A2040' : '#F8FBFF',
        border:       dk ? '#2A2F45' : '#E2E8F0',
        label:        dk ? '#8896B3' : '#64748B',
        textMuted:    dk ? '#5A6483' : '#94A3B8',
    };

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

    const handleRoleChange = (roleValue) => {
        setFormData(prev => ({...prev, role: roleValue}));
    };

    return (
        <div style={{
            width: '100%', maxWidth: '440px', borderRadius: '28px',
            background: T.surface, border: `1px solid ${T.border}`,
            padding: '36px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            fontFamily: FIELD_FONT,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isEditMode
                        ? <Save size={26} style={{ color: '#3F99FF' }}/>
                        : <UserPlus size={26} style={{ color: '#3F99FF' }}/>}
                </div>
                <div>
                    <h2 style={{ fontSize: '19px', fontWeight: '700', color: T.text, margin: 0, letterSpacing: '-0.02em' }}>
                        {isEditMode ? 'Edit User' : 'Create User'}
                    </h2>
                    <p style={{ fontSize: '13px', color: T.textSec, margin: '2px 0 0' }}>
                        {isEditMode ? 'Update account details' : 'Add a new account to the platform'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <AvatarUploadField onFileSelect={handleFileSelect} previewUrl={photoPreview}
                                   initialImageUrl={initialData?.photo_url}/>
                <InputField
                    name="login" label="Login" placeholder="admin"
                    value={formData.login} onChange={handleChange} icon={User} required T={T}
                />

                <PasswordInputField
                    value={formData.password}
                    onChange={handleChange}
                    onGenerate={generateRandomPassword}
                    placeholder={isEditMode ? 'Leave blank to keep current' : '••••••••'}
                    label="Password"
                    required={!isEditMode}
                    T={T}
                />

                <RoleSelect value={formData.role} onChange={handleRoleChange} options={roleOptions} T={T}/>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <InputField name="name" label="Name" placeholder="John" value={formData.name} onChange={handleChange}
                                icon={UserCircle} T={T}/>
                    <InputField name="surname" label="Surname" placeholder="Doe" value={formData.surname}
                                onChange={handleChange} icon={IdCard} T={T}/>
                </div>
                <InputField name="email" type="email" label="Email" placeholder="john.doe@example.com" value={formData.email}
                            onChange={handleChange} icon={Mail} T={T}/>
                {config && config.use_index && (
                    <InputField name="user_index" type="number" label="Index Number" placeholder="e.g., 12345"
                                value={formData.user_index} onChange={handleChange} icon={Hash} T={T}/>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            height: '42px', padding: '0 18px', borderRadius: '999px',
                            border: `1.5px solid ${T.border}`, background: 'transparent',
                            color: T.textSec, fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            fontFamily: FIELD_FONT, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.color = T.text; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSec; }}
                    >
                        <X size={15}/> Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            height: '42px', padding: '0 22px', borderRadius: '999px', border: 'none',
                            background: isLoading ? '#94A3B8' : 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                            color: '#FFFFFF', fontSize: '13px', fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: isLoading ? 'none' : '0 4px 14px rgba(43,115,255,0.35)',
                            transition: 'opacity 0.15s, box-shadow 0.15s', fontFamily: FIELD_FONT,
                        }}
                        onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.88'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : (isEditMode ? <Save size={15}/> : <UserPlus size={15}/>)}
                        {isLoading ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save changes' : 'Create user')}
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
        <th className="px-4 py-3 text-xs font-semibold text-[#65676B] dark:text-darkCustom-400 uppercase tracking-wider cursor-pointer hover:bg-[#F0F2F5] dark:hover:bg-darkCustom-800 transition-colors"
            onClick={() => onSort(columnKey)}>
            <div className="flex items-center gap-1.5">
                <span>{children}</span>
                <Icon size={12} className="text-[#BEC3C9] dark:text-darkCustom-500"/>
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
            <div className="flex items-center justify-center h-full bg-[#F0F2F5] dark:bg-darkCustom-800">
                <Loader2 className="animate-spin h-8 w-8 text-[#BEC3C9] dark:text-darkCustom-500"/>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#F0F2F5] dark:bg-darkCustom-800 min-h-screen">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-5">
                    <div className="relative w-full md:mr-auto md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#BEC3C9] dark:text-darkCustom-500"/>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full py-2 pl-9 pr-3 bg-white dark:bg-darkCustom-900 border border-[#E4E6EB] dark:border-darkCustom-600 rounded-xl text-sm text-[#1C1E21] dark:text-darkCustom-100 focus:ring-2 focus:ring-[#0866FF]/20 focus:border-[#0866FF] outline-none transition-all placeholder:text-[#BEC3C9] dark:placeholder:text-darkCustom-500 shadow-sm"
                        />
                    </div>

                    <div className="flex w-full md:w-auto md:max-w-xs items-center gap-2">
                        <RoleFilterMenu selectedRole={roleFilter} onSelectRole={setRoleFilter}/>
                    </div>

                    <button
                        onClick={openCreateForm}
                        className="w-full md:w-auto"
                        style={{
                            height: '40px', borderRadius: '999px', border: 'none',
                            padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)',
                            color: '#FFFFFF',
                            boxShadow: '0 4px 14px rgba(43,115,255,0.35)',
                            transition: 'opacity 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(43,115,255,0.45)'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(43,115,255,0.35)'; }}
                    >
                        <UserPlus size={15}/>
                        <span>Add New User</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-darkCustom-900 border border-[#E4E6EB] dark:border-darkCustom-700 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-[#E4E6EB] dark:border-darkCustom-700">
                            <tr>
                                <SortableHeader columnKey="surname" sortConfig={sortConfig} onSort={handleSort}>User</SortableHeader>
                                <SortableHeader columnKey="login" sortConfig={sortConfig} onSort={handleSort}>Login</SortableHeader>
                                <SortableHeader columnKey="email" sortConfig={sortConfig} onSort={handleSort}>Email</SortableHeader>
                                <SortableHeader columnKey="role" sortConfig={sortConfig} onSort={handleSort}>Role</SortableHeader>
                                <SortableHeader columnKey="user_index" sortConfig={sortConfig} onSort={handleSort}>Index</SortableHeader>
                                <th className="px-4 py-3 text-xs font-semibold text-[#65676B] dark:text-darkCustom-400 uppercase tracking-wider">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E4E6EB] dark:divide-darkCustom-700">
                            {filteredAndSortedUsers.map(user => (
                                <tr key={user.user_id} className="hover:bg-[#F0F2F5] dark:hover:bg-darkCustom-800 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {user.photo_url ? (
                                                <img src={user.photo_url} alt={`${user.name} ${user.surname}`}
                                                     className="h-9 w-9 rounded-full object-cover"/>
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center font-semibold rounded-full bg-[#E7F3FF] dark:bg-[#0866FF]/15 text-[#0866FF] dark:text-[#4D8EFF] text-sm">
                                                    <span>{(user?.surname?.[0] || '').toUpperCase()}{(user?.name?.[0] || '').toUpperCase()}</span>
                                                </div>
                                            )}
                                            <p className="font-medium text-[#1C1E21] dark:text-darkCustom-100 text-sm">{user.surname} {user.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[#65676B] dark:text-darkCustom-400 text-sm">{user.login}</td>
                                    <td className="px-4 py-3 text-[#65676B] dark:text-darkCustom-400 text-sm">{user.email || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-[#E7F3FF] dark:bg-[#0866FF]/15 text-[#0866FF] dark:text-[#4D8EFF]' : 'bg-[#F0F2F5] dark:bg-darkCustom-700 text-[#65676B] dark:text-darkCustom-300'}`}>
                                            {capitalize(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#65676B] dark:text-darkCustom-400 text-sm">{user.user_index || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <button onClick={() => openEditForm(user)} title="Edit user"
                                                    className="p-1.5 rounded-lg text-[#606770] dark:text-darkCustom-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                                                <Edit size={15}/>
                                            </button>
                                            <button onClick={() => handleRequestPasswordReset(user)} title="Force password reset"
                                                    className="p-1.5 rounded-lg text-[#606770] dark:text-darkCustom-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                                                <KeyRound size={15}/>
                                            </button>
                                            <button onClick={() => handleDelete(user.user_id)} title="Delete user"
                                                    className="p-1.5 rounded-lg text-[#606770] dark:text-darkCustom-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
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
