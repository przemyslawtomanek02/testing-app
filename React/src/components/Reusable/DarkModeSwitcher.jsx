import { Moon, Sun } from 'lucide-react';
import { useAppContext } from '../../AppContext';

export default function DarkModeSwitcher() {
    const { darkMode, toggleDarkMode } = useAppContext();

    return (
        <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
                width: '52px',
                height: '28px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                background: darkMode
                    ? 'linear-gradient(135deg, #2B73FF 0%, #3F99FF 100%)'
                    : '#E2E8F0',
                transition: 'background 0.25s',
                flexShrink: 0,
                boxShadow: darkMode ? '0 2px 10px rgba(43,115,255,0.35)' : 'none',
            }}
        >
            {/* thumb */}
            <span style={{
                position: 'absolute',
                top: '3px',
                left: darkMode ? 'calc(100% - 25px)' : '3px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}>
                {darkMode
                    ? <Moon size={12} style={{ color: '#2B73FF' }}/>
                    : <Sun  size={12} style={{ color: '#F59E0B' }}/>
                }
            </span>
        </button>
    );
}
