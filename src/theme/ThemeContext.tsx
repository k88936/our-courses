import {createContext, useContext, useState, type ReactNode} from "react";

export type ThemeMode = "dark" | "light";

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const AppThemeProvider = ({children}: {children: ReactNode}) => {
    const [theme, setTheme] = useState<ThemeMode>("dark");

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    return (
        <ThemeContext.Provider value={{theme, setTheme, toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = (): ThemeContextType => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
    return ctx;
};