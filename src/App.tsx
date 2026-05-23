import {useState} from "react";
import Theme, {ThemeProvider as RingThemeProvider} from "@jetbrains/ring-ui-built/components/global/theme";
import {LocaleProvider} from "./i18n/LocaleContext";
import {AppThemeProvider, useAppTheme} from "./theme/ThemeContext";
import {SemesterProvider} from "./hooks/SemesterContext";
import {Navbar, type NavPage} from "./components/Navbar";
import {HomePage} from "./pages/HomePage";
import {Workspace} from "./pages/Workspace";
import {CurriculumPage} from "./pages/CurriculumPage";
import {ToolsPage} from "./pages/ToolsPage";
import {AboutPage} from "./pages/AboutPage";

const AppShell = () => {
    const [page, setPage] = useState<NavPage>("home");
    const {theme} = useAppTheme();
    const isDark = theme === "dark";

    const renderNavbar = () => <Navbar currentPage={page} onNavigate={setPage} />;

    const renderPage = () => {
        switch (page) {
            case "home":
                return <HomePage onNavigate={setPage} />;
            case "workspace":
                return <Workspace onNavigate={setPage} />;
            case "curriculum":
                return (
                    <div className={`flex h-full flex-col transition-colors duration-300 ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
                        {renderNavbar()}
                        <CurriculumPage />
                    </div>
                );
            case "about":
                return (
                    <div className={`flex h-full flex-col transition-colors duration-300 ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
                        {renderNavbar()}
                        <AboutPage />
                    </div>
                );
            case "tools":
                return (
                    <div className={`flex h-full flex-col transition-colors duration-300 ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
                        {renderNavbar()}
                        <ToolsPage />
                    </div>
                );
        }
    };

    return (
        <div className={`flex h-full flex-col transition-colors duration-300 ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
            {renderPage()}
        </div>
    );
};

const AppInner = () => {
    const {theme} = useAppTheme();
    return (
        <RingThemeProvider theme={theme === "dark" ? Theme.DARK : Theme.LIGHT} className="h-full">
            <LocaleProvider>
                <SemesterProvider>
                    <AppShell />
                </SemesterProvider>
            </LocaleProvider>
        </RingThemeProvider>
    );
};

export const App = () => (
    <AppThemeProvider>
        <AppInner />
    </AppThemeProvider>
);