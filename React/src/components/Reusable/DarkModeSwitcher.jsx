import {Moon, Sun} from "lucide-react";
import {useAppContext} from "../../AppContext";

export default function DarkModeSwitcher() {
    const {darkMode, toggleDarkMode} = useAppContext();

    return (
        <label
            htmlFor="dark-mode-toggle"
            onClick={(e) => e.stopPropagation()}
            className="relative inline-flex items-center cursor-pointer"
        >
            <input
                type="checkbox"
                name="dark-mode-toggle"
                id="dark-mode-toggle"
                checked={darkMode}
                onChange={toggleDarkMode}
                className="sr-only peer"
            />
            <div className="w-16 h-7 bg-slate-300 peer-checked:bg-slate-700 rounded-full transition-colors relative">
        <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                darkMode ? "translate-x-9" : ""
            }`}
        >
          {darkMode ? (
              <Moon className="h-4 w-4 text-slate-700"/>
          ) : (
              <Sun className="h-4 w-4 text-yellow-400"/>
          )}
        </span>
            </div>
        </label>
    );
}
