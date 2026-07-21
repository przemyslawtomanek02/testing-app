import React, {useState} from 'react';
import {useAppContext} from "../../AppContext.jsx";
import SuspensePage from "../Suspense.jsx";
import {toast} from 'react-toastify';
import {Moon, Users, IdCard} from 'lucide-react';

function SettingToggle({icon, label, description, value, onChange, disabled}) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E6EB] last:border-b-0">
            <div className="flex items-center gap-4">
                <div className="text-[#606770]">{icon}</div>
                <div className="flex flex-col">
                    <h3 className="font-semibold text-[#1C1E21] text-sm">{label}</h3>
                    <p className="text-xs text-[#65676B] mt-0.5">{description}</p>
                </div>
            </div>

            <button
                type="button"
                onClick={onChange}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                    value ? 'bg-[#0866FF]' : 'bg-[#CED0D4]'
                }`}
                aria-checked={value}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}


export default function SettingsPanel() {
    const {config, setConfig, getBackendConfig, setBackendConfig} = useAppContext();
    const [loadingKey, setLoadingKey] = useState(null);

    if (!config || Object.keys(config).length === 0) {
        return (
            <div className="flex w-full h-64 justify-center items-center">
                <SuspensePage/>
            </div>
        );
    }

    const handleChange = async (key) => {
        setLoadingKey(key);
        const optimisticState = {...config, [key]: !config[key]};
        setConfig(optimisticState);

        try {
            const response = await setBackendConfig(optimisticState);
            const freshConfig = await getBackendConfig();
            setConfig(freshConfig);
            toast.success(response.message || 'Settings saved successfully!');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to save settings.');
            setConfig(config);
        } finally {
            setLoadingKey(null);
        }
    };

    return (
        <div className="p-6 bg-[#F0F2F5] min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm">
                    <header className="px-6 py-4 border-b border-[#E4E6EB]">
                        <h2 className="text-[15px] font-semibold text-[#1C1E21]">Application Settings</h2>
                    </header>
                    <div className="space-y-0">
                        <SettingToggle
                            icon={<Moon size={20}/>}
                            label="Dark Mode"
                            description="Enable or disable dark theme for the application."
                            value={config.dark_mode}
                            onChange={() => handleChange('dark_mode')}
                            disabled={loadingKey === 'dark_mode'}
                        />
                        <SettingToggle
                            icon={<Users size={20}/>}
                            label="Open Mode"
                            description="Allows new users to start tests without logging in."
                            value={config.open_mode}
                            onChange={() => handleChange('open_mode')}
                            disabled={loadingKey === 'open_mode'}
                        />
                        <SettingToggle
                            icon={<IdCard size={20}/>}
                            label="Use Index Number"
                            description="Requires users in open mode to provide an index number."
                            value={config.use_index}
                            onChange={() => handleChange('use_index')}
                            disabled={loadingKey === 'use_index'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}