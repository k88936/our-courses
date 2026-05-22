import {useState, useRef, useCallback, useMemo} from "react";
import {useLocale} from "../i18n/LocaleContext";
import {useAppTheme} from "../theme/ThemeContext";
import planMd from "@/assets/doc/培养方案.md?raw";
import teachMd from "@/assets/doc/教学计划.md?raw";

interface Tab {
  id: string;
  label: string;
  content: string;
}

const DEFAULT_TABS: Tab[] = [
  {id: "plan", label: "培养方案", content: planMd},
  {id: "teach", label: "教学计划", content: teachMd},
  {id: "cross", label: "交叉培养指南", content: ""},
  {id: "intro", label: "培养方案解读", content: ""},
];

/** Simple inline markdown → JSX renderer */
const SimpleMarkdown = ({text, isDark}: {text: string; isDark: boolean}) => {
  const linkCls = isDark ? "text-blue-300" : "text-blue-600";
  const tableBorder = isDark ? "border-white/10" : "border-gray-300";
  const tableBg = isDark ? "bg-white/[0.02]" : "bg-gray-50";
  const tableBgAlt = isDark ? "bg-white/[0.06]" : "bg-white";

  const rendered = useMemo(() => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let key = 0;

    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
      if (!inTable) return;
      inTable = false;
      const hdr = tableHeaders;
      const rows = [...tableRows];
      tableHeaders = [];
      tableRows = [];

      if (hdr.length === 0) return;
      elements.push(
        <div key={`t${tableKey++}`} className="overflow-x-auto my-2">
          <table className={`w-full text-xs border-collapse ${tableBorder}`}>
            <thead>
              <tr className={tableBg}>
                {hdr.map((h, i) => (
                  <th key={i} className={`border px-2 py-1 text-left font-medium ${tableBorder}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? tableBg : tableBgAlt}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`border px-2 py-0.5 ${tableBorder}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cells = trimmed.split("|").filter((c) => c.trim()).map((c) => c.trim());
        if (cells.every((c) => /^-+$/.test(c))) continue;
        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      } else {
        flushTable();
      }

      if (!trimmed) {
        elements.push(<div key={key++} className="h-2" />);
        continue;
      }

      if (trimmed.startsWith("###### ")) {
        elements.push(<h6 key={key++} className={`text-xs font-semibold mt-2 mb-1 ${isDark ? "text-white/90" : "text-gray-800"}`}>{trimmed.slice(7)}</h6>);
      } else if (trimmed.startsWith("##### ")) {
        elements.push(<h5 key={key++} className={`text-sm font-semibold mt-2 mb-1 ${isDark ? "text-white/90" : "text-gray-800"}`}>{trimmed.slice(6)}</h5>);
      } else if (trimmed.startsWith("#### ")) {
        elements.push(<h4 key={key++} className={`text-sm font-semibold mt-2 mb-1 ${isDark ? "text-white/90" : "text-gray-800"}`}>{trimmed.slice(5)}</h4>);
      } else if (trimmed.startsWith("### ")) {
        elements.push(<h3 key={key++} className={`text-base font-semibold mt-3 mb-1 ${isDark ? "text-white/90" : "text-gray-800"}`}>{trimmed.slice(4)}</h3>);
      } else if (trimmed.startsWith("## ")) {
        elements.push(<h2 key={key++} className={`text-lg font-semibold mt-3 mb-1 ${isDark ? "text-white/90" : "text-gray-800"}`}>{trimmed.slice(3)}</h2>);
      } else if (trimmed.startsWith("# ")) {
        elements.push(<h1 key={key++} className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{trimmed.slice(2)}</h1>);
      } else {
        let html = trimmed
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" class="${linkCls} underline">$1</a>`);
        elements.push(
          <p key={key++} className={`text-xs leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}
             dangerouslySetInnerHTML={{__html: html}} />
        );
      }
    }
    flushTable();
    return elements;
  }, [text, isDark, linkCls, tableBorder, tableBg, tableBgAlt]);

  return <>{rendered}</>;
};

export const CurriculumPage = () => {
  const {locale} = useLocale();
  const {theme} = useAppTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState("plan");
  const [leftWidth, setLeftWidth] = useState(40);
  const isDragging = useRef(false);

  const tabs = DEFAULT_TABS;
  const activeContent = tabs.find((t) => t.id === activeTab)?.content ?? "";

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const container = document.getElementById("curriculum-split");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(20, Math.min(60, pct)));
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [leftWidth]);

  const bgPanel = isDark ? "bg-[#14141e]" : "bg-white";
  const textMuted = isDark ? "text-white/50" : "text-gray-500";
  const textDark = isDark ? "text-white/90" : "text-gray-800";
  const borderCls = isDark ? "border-white/10" : "border-gray-200";
  const tabActiveBg = isDark ? "bg-white/10" : "bg-gray-100";
  const tabActiveText = isDark ? "text-white" : "text-gray-900";

  return (
    <div className={`flex h-full flex-col ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
      <div id="curriculum-split" className="flex flex-1 overflow-hidden">
        {/* ===== LEFT: Mind Map placeholder ===== */}
        <div
          className="h-full flex flex-col overflow-hidden"
          style={{width: `${leftWidth}%`}}
        >
          <div className={`flex h-full flex-col ${bgPanel} ${borderCls} border-r`}>
            <div className={`flex items-center px-4 py-2 border-b text-xs font-medium shrink-0 ${borderCls} ${textMuted}`}>
              {locale === "zh" ? "培养方案导图" : "Curriculum Map"}
            </div>
            <div className={`flex flex-1 items-center justify-center ${isDark ? "text-white/30" : "text-gray-400"}`}>
              <div className="text-center">
                <div className="text-4xl mb-2">🧠</div>
                <div className="text-xs">{locale === "zh" ? "培养方案导图（开发中）" : "Curriculum Map (Coming Soon)"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Draggable divider ===== */}
        <div
          className={`w-1 cursor-col-resize shrink-0 relative transition-colors ${
            isDark ? "hover:bg-blue-500/30 bg-white/5" : "hover:bg-blue-400/40 bg-gray-200"
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full ${
            isDark ? "bg-white/20" : "bg-gray-300"
          }`} />
        </div>

        {/* ===== RIGHT: Tabbed document viewer ===== */}
        <div
          className="h-full flex flex-col overflow-hidden"
          style={{width: `${100 - leftWidth}%`}}
        >
          <div className={`flex items-center border-b shrink-0 ${borderCls} ${bgPanel}`}>
            <div className="flex items-center overflow-x-auto flex-1 px-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`cursor-pointer border-none px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? `${tabActiveBg} ${tabActiveText}`
                      : `${textMuted} hover:${isDark ? "bg-white/5" : "bg-gray-100"}`
                  }`}
                >
                  {tab.label}
                  {!tab.content && (
                    <span className={`ml-1 text-[9px] ${isDark ? "text-white/30" : "text-gray-400"}`}>⏳</span>
                  )}
                </button>
              ))}
              <button className={`cursor-pointer border-none px-2 py-2 text-xs font-medium transition-colors ${
                isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"
              }`}>
                +
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-auto px-4 py-3 ${bgPanel}`}>
            {activeContent ? (
              <SimpleMarkdown text={activeContent} isDark={isDark} />
            ) : (
              <div className={`flex h-full items-center justify-center text-xs ${textMuted}`}>
                {locale === "zh" ? "文档加载中..." : "Loading document..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};