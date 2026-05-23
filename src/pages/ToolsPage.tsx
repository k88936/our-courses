import Island, {Content, Header} from "@jetbrains/ring-ui-built/components/island/island";
import {useLocale} from "../i18n/LocaleContext";
import {useAppTheme} from "../theme/ThemeContext";

export const ToolsPage = () => {
  const {t, locale} = useLocale();
  const {theme} = useAppTheme();
  const isDark = theme === "dark";

  const textDark = isDark ? "text-white/90" : "text-gray-800";
  const textBody = isDark ? "text-white/75" : "text-gray-700";
  const textMuted = isDark ? "text-white/50" : "text-gray-500";
  const bgCard = isDark ? "bg-white/5" : "bg-white";

  return (
    <div className={`flex flex-1 flex-col items-center justify-center gap-6 p-8 ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
      <Island className={`w-full max-w-2xl ${bgCard}`}>
        <Header border>
          <span className={`text-sm font-semibold ${textDark}`}>
            {locale === "zh" ? "综合工具" : "Tools"}
          </span>
        </Header>
        <Content>
          <div className="flex flex-col gap-4 px-4 py-6">
            <div className={`rounded-lg border p-4 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
              <div className={`text-sm font-medium ${textDark}`}>
                {locale === "zh" ? "学位评定" : "Degree Evaluation"}
              </div>
              <div className={`mt-1 text-xs ${textMuted}`}>
                {locale === "zh" ? "此功能正在开发中，敬请期待。" : "Coming soon."}
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
              <div className={`text-sm font-medium ${textDark}`}>
                {locale === "zh" ? "课程推荐 AI 助手" : "AI Course Assistant"}
              </div>
              <div className={`mt-1 text-xs ${textMuted}`}>
                {locale === "zh" ? "此功能正在开发中，敬请期待。" : "Coming soon."}
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
              <div className={`text-sm font-medium ${textDark}`}>
                {locale === "zh" ? "课程评价" : "Course Reviews"}
              </div>
              <div className={`mt-1 text-xs ${textMuted}`}>
                {locale === "zh" ? "此功能正在开发中，敬请期待。" : "Coming soon."}
              </div>
            </div>
          </div>
        </Content>
      </Island>
    </div>
  );
};