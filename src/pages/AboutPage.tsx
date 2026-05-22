import {useLocale} from "../i18n/LocaleContext";
import {useAppTheme} from "../theme/ThemeContext";

import overviewTextZh from "../assets/text/DevelopmentOverview.txt?raw";
import overviewTextEn from "../assets/text/DevelopmentOverview_En.txt?raw";
import feedbackGuidanceZh from "../assets/text/ProblemFeedback_guidance.txt?raw";
import feedbackGuidanceEn from "../assets/text/ProblemFeedback_guidance_En.txt?raw";

export const AboutPage = () => {
    const {locale, t} = useLocale();
    const {theme} = useAppTheme();
    const isDark = theme === "dark";
    const isZh = locale === "zh";

    const overviewText = isZh ? overviewTextZh : overviewTextEn;
    const feedbackGuidance = isZh ? feedbackGuidanceZh : feedbackGuidanceEn;

    return (
        <div className={`flex flex-1 flex-col items-center gap-8 overflow-y-auto p-10 transition-colors duration-300 ${
            isDark ? "text-white/85" : "text-gray-700"
        }`}>
            {/* Title */}
            <h1 className={`m-0 text-3xl font-bold transition-colors duration-300 ${
                isDark ? "text-white" : "text-gray-800"
            }`}>
                {t("about.title")}
            </h1>

            {/* Development Overview */}
            <div className={`w-full max-w-3xl rounded-xl p-6 transition-colors duration-300 ${
                isDark ? "bg-white/5" : "bg-white shadow-sm"
            }`}>
                <h2 className={`m-0 mb-3 text-xl font-semibold ${
                    isDark ? "text-white/90" : "text-gray-800"
                }`}>
                    {isZh ? "网页与开发介绍" : "Development Overview"}
                </h2>
                <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">
                    {overviewText}
                </p>
            </div>

            {/* Problem Feedback */}
            <div className={`w-full max-w-3xl rounded-xl p-6 transition-colors duration-300 ${
                isDark ? "bg-white/5" : "bg-white shadow-sm"
            }`}>
                <h2 className={`m-0 mb-3 text-xl font-semibold ${
                    isDark ? "text-white/90" : "text-gray-800"
                }`}>
                    {isZh ? "问题反馈" : "Feedback"}
                </h2>
                <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">
                    {feedbackGuidance}
                </p>
            </div>
        </div>
    );
};