import {createContext, useContext, useState, type ReactNode} from "react";
import type {Locale} from "./translations";
import {translations} from "./translations";

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export const LocaleProvider = ({children}: {children: ReactNode}) => {
    const [locale, setLocale] = useState<Locale>("zh");

    const t = (key: string): string => {
        return translations[locale]?.[key as keyof typeof translations[typeof locale]] ?? key;
    };

    return (
        <LocaleContext.Provider value={{locale, setLocale, t}}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = (): LocaleContextType => {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
    return ctx;
};