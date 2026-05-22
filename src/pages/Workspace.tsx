import {useState, useMemo, useRef, useEffect} from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Input from "@jetbrains/ring-ui-built/components/input/input";
import Island, {Content, Header} from "@jetbrains/ring-ui-built/components/island/island";
import Select, {type SelectItem} from "@jetbrains/ring-ui-built/components/select/select";
import {Navbar, type NavPage} from "../components/Navbar";
import {useLocale} from "../i18n/LocaleContext";
import {useAppTheme} from "../theme/ThemeContext";
import {useSemester} from "../hooks/SemesterContext";
import {
  useCourses,
  useSemesterCourses,
  useModules,
  useAllSemesters,
  useCourseGroups,
  useTName,
} from "../hooks/useCurriculumData";
import structuredData from "@/data/structured_data.json";
import enData from "@/data/courses_en.json";
import type { Database } from "@/database.types";
type Course = Database["public"]["Tables"]["courses"]["Row"];

interface WorkspaceProps {
  onNavigate?: (page: NavPage) => void;
}

interface FilterState {
  group: string;
  semester: string;
  module: string;
  abGroup: string;
}

/** Foundation category labels — zh */
const FOUNDATION_ZH: Record<string, string> = {
  MATH_BASIS: "数学基础",
  PHY_BASIS: "物理基础",
  CS_BASIS: "信智基础",
  ME_BASIS: "机电基础",
  COMP_BASIS: "计算基础",
  OR_STAT: "运筹统计",
  MECH_BASIS: "力学基础",
  SHUYUAN_GE: "书院通识",
  SHIJIAN: "进阶实践",
};

/** Foundation category labels — en (short) */
const FOUNDATION_EN: Record<string, string> = {
  MATH_BASIS: "Math Found.",
  PHY_BASIS: "Physics Found.",
  CS_BASIS: "CS & AI Found.",
  ME_BASIS: "ME Found.",
  COMP_BASIS: "Computing",
  OR_STAT: "OR & Stat.",
  MECH_BASIS: "Mech. Found.",
  SHUYUAN_GE: "Academy GE",
  SHIJIAN: "Practice",
};

/** Abbreviate semester: "大一·开学前（军训）" → "大一夏" */
const abbreviateSemester = (sem: string): string =>
  sem
    .replace("·开学前（军训）", "军")
    .replace("·秋季", "秋")
    .replace("·春季", "春")
    .replace("·夏季", "夏");

/** Module ID → 类 label */
const moduleTypeLabel = (modId: number): string =>
  modId <= 3 ? "I" : modId <= 8 ? "II" : "III";

/** Format module option display */
const formatModuleOption = (modId: number, name: string, locale: string): string =>
  locale === "zh" ? `模块${modId}：${name}` : `Module ${modId}: ${name}`;

export const Workspace = ({onNavigate}: WorkspaceProps) => {
  const {t, locale} = useLocale();
  const {theme} = useAppTheme();
  const isDark = theme === "dark";
  const {semester: currentSemester} = useSemester();
  const {tName, tModule, tSemester, tGroup} = useTName();

  const [leftExpanded, setLeftExpanded] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    group: "all", semester: "all", module: "all", abGroup: "all",
  });
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [savedHistory, setSavedHistory] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem("oc_history") ?? "{}"); }
    catch { return {}; }
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stagingSemester, setStagingSemester] = useState<string>("");
  const [customCourses, setCustomCourses] = useState<Record<string, Array<{id: string; name: string; credits: number}>>>(() => {
    try { return JSON.parse(localStorage.getItem("oc_custom") ?? "{}"); }
    catch { return {}; }
  });
  const [customName, setCustomName] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [forceSaveData, setForceSaveData] = useState<string[] | null>(null);
  const [diagExpanded, setDiagExpanded] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data ---
  const {data: courses} = useCourses();
  const {data: semesterCourses} = useSemesterCourses();
  const {data: semesters} = useAllSemesters();
  const {data: modules} = useModules();
  const {data: allGroups} = useCourseGroups();

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.course_id, c])), [courses]);

  const currentIdx = semesters.indexOf(currentSemester);
  const historySemesters = currentIdx >= 0
    ? [...semesters.slice(0, currentIdx + 1), ...Object.keys(savedHistory).filter((s) => semesters.indexOf(s) > currentIdx).sort((a, b) => semesters.indexOf(a) - semesters.indexOf(b))]
    : [];

  // Compute available staging semesters
  const availableStagingSemesters = useMemo(() => {
    const savedSems = new Set(Object.keys(savedHistory));
    const available: string[] = [];
    for (let i = 0; i <= currentIdx; i++) {
      if (!savedSems.has(semesters[i])) available.push(semesters[i]);
    }
    let nextIdx = currentIdx + 1;
    while (nextIdx < semesters.length) {
      if (!savedSems.has(semesters[nextIdx])) { available.push(semesters[nextIdx]); break; }
      nextIdx++;
    }
    return available;
  }, [savedHistory, semesters, currentIdx]);

  useEffect(() => {
    if (!stagingSemester && availableStagingSemesters.length > 0) {
      setStagingSemester(availableStagingSemesters[0]);
    }
  }, [availableStagingSemesters, stagingSemester]);

  const persistHistory = (next: Record<string, string[]>) => {
    setSavedHistory(next);
    localStorage.setItem("oc_history", JSON.stringify(next));
  };

  const persistCustom = (next: Record<string, Array<{id: string; name: string; credits: number}>>) => {
    setCustomCourses(next);
    localStorage.setItem("oc_custom", JSON.stringify(next));
  };

  const addCustomCourse = () => {
    if (!stagingSemester || !customName.trim()) return;
    const creds = parseFloat(customCredits) || 0;
    const id = `custom_${Date.now()}`;
    const next = {...customCourses};
    if (!next[stagingSemester]) next[stagingSemester] = [];
    next[stagingSemester] = [...next[stagingSemester], {id, name: customName.trim(), credits: creds}];
    persistCustom(next);
    setCustomName("");
    setCustomCredits("");
  };

  const removeCustomCourse = (sem: string, cid: string) => {
    const next = {...customCourses};
    if (!next[sem]) return;
    next[sem] = next[sem].filter((c) => c.id !== cid);
    if (next[sem].length === 0) delete next[sem];
    persistCustom(next);
  };

  // --- Credit limits ---
  const getCreditLimit = (sem: string): {max: number; min: number} | null => {
    const isSummer = sem.includes("夏季") || sem.includes("开学前");
    const year = sem.startsWith("大一") ? 1 : sem.startsWith("大二") ? 2 : sem.startsWith("大三") ? 3 : sem.startsWith("大四") ? 4 : 0;
    const max = year <= 1 ? 23 : year <= 2 ? 27 : 30;
    const min = isSummer ? 0 : 6;
    return {max, min};
  };

  const calcSemesterCredits = (sem: string, selected: string[]): number => {
    const courseCredits = selected.reduce((s, cid) => s + (courseMap.get(cid)?.credits ?? 0), 0);
    const customCreds = (customCourses[sem] ?? []).reduce((s, c) => s + c.credits, 0);
    return courseCredits + customCreds;
  };

  // --- Prerequisite map ---
  const prereqMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of structuredData.course_prerequisites) {
      const prev = map.get(p.course_id) ?? [];
      prev.push(p.prereq_course_id);
      map.set(p.course_id, prev);
    }
    return map;
  }, []);

  // --- Choice set lookup (set_id → course_ids[]) ---
  const choiceSetCourseMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const sc of structuredData.choice_set_courses) {
      const prev = map.get(sc.set_id) ?? [];
      prev.push(sc.course_id);
      map.set(sc.set_id, prev);
    }
    return map;
  }, []);

  const choiceSetMap = useMemo(() => {
    const map = new Map<number, typeof structuredData.choice_sets[0]>();
    for (const cs of structuredData.choice_sets) {
      map.set(cs.set_id, cs);
    }
    return map;
  }, []);

  const getSemesterChecks = (sem: string, selected: string[]): Array<{type: "error" | "warning"; msg: string}> => {
    const checks: Array<{type: "error" | "warning"; msg: string}> = [];
    const total = calcSemesterCredits(sem, selected);
    const limit = getCreditLimit(sem);
    if (!limit) return checks;

    if (total > limit.max) {
      checks.push({
        type: "error",
        msg: locale === "zh" ? `学分 ${total} > 上限 ${limit.max}` : `${total} credits > max ${limit.max}`,
      });
    } else if (total > limit.max - 3) {
      checks.push({
        type: "warning",
        msg: locale === "zh" ? `学分 ${total}，接近上限 ${limit.max}` : `${total} credits, near limit ${limit.max}`,
      });
    }

    if (limit.min > 0 && total > 0 && total < limit.min) {
      checks.push({
        type: "error",
        msg: locale === "zh" ? `学分 ${total} < 下限 ${limit.min}` : `${total} credits < min ${limit.min}`,
      });
    }

    // Prerequisite checks
    const allTaken = new Set<string>();
    for (const [, ids] of Object.entries(savedHistory)) ids.forEach((id) => allTaken.add(id));
    selected.forEach((id) => allTaken.add(id));

    for (const cid of selected) {
      const prereqs = prereqMap.get(cid) ?? [];
      for (const pid of prereqs) {
        if (!allTaken.has(pid)) {
          const cName = tName(cid, courseMap.get(cid)?.name ?? cid);
          const pName = tName(pid, courseMap.get(pid)?.name ?? pid);
          checks.push({
            type: "error",
            msg: locale === "zh" ? `「${cName}」需先修「${pName}」` : `"${cName}" needs prereq "${pName}"`,
          });
        }
      }
    }

    // Choice set checks
    for (const [setId, setCourseIds] of choiceSetCourseMap.entries()) {
      const cs = choiceSetMap.get(setId);
      if (!cs) continue;
      const selectedInSet = selected.filter((cid) => setCourseIds.includes(cid));
      if (selectedInSet.length > (cs.max_select ?? 1)) {
        checks.push({
          type: "error",
          msg: locale === "zh" ? `「${cs.name}」最多选 ${cs.max_select} 门` : `"${cs.name}" max ${cs.max_select}`,
        });
      }
    }

    return checks;
  };

  // Build diagnostic data for all semesters
  const diagData = useMemo(() => {
    const entries: Array<{sem: string; checks: Array<{type: "error" | "warning"; msg: string}>}> = [];
    const allSems = [...historySemesters, ...availableStagingSemesters];
    const seen = new Set<string>();
    for (const sem of allSems) {
      if (seen.has(sem)) continue;
      seen.add(sem);
      const saved = savedHistory[sem] ?? [];
      const checks = getSemesterChecks(sem, saved);
      if (checks.length > 0) entries.push({sem, checks});
    }
    return entries;
  }, [historySemesters, availableStagingSemesters, savedHistory, customCourses]);

  // --- Import / Export ---
  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      history: savedHistory,
      customCourses,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oc_history_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.version || !data.history) {
          alert(t("workspace.importError"));
          return;
        }
        setImportPreview(JSON.stringify(data.history, null, 2).slice(0, 500) + "...");
        // Apply import
        const nextHistory = data.history as Record<string, string[]>;
        const nextCustom = (data.customCourses as typeof customCourses) ?? {};
        persistHistory(nextHistory);
        persistCustom(nextCustom);
        setShowImportModal(false);
        setImportPreview(null);
      } catch {
        alert(t("workspace.importError"));
      }
    };
    reader.readAsText(file);
  };

  const toggleSelected = (courseId: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const semesterMap = useMemo(() => {
    const m = new Map<string, typeof courses>();
    for (const sc of semesterCourses) {
      const prev = m.get(sc.semester) ?? [];
      const course = courseMap.get(sc.course_id);
      if (course) prev.push(course);
      m.set(sc.semester, prev);
    }
    return m;
  }, [semesterCourses, courseMap]);

  const courseSemesterMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const sc of semesterCourses) {
      const prev = m.get(sc.course_id) ?? [];
      prev.push(sc.semester);
      m.set(sc.course_id, prev);
    }
    return m;
  }, [semesterCourses]);

  const groupMap = useMemo(() => new Map(allGroups.map((g) => [g.group_id, g])), [allGroups]);

  const courseGroupInfo = useMemo(() => {
    const map = new Map<string, Array<{groupCode: string; moduleId: number | null; groupName: string}>>();
    for (const gc of structuredData.group_courses) {
      const group = groupMap.get(gc.group_id);
      if (!group) continue;
      for (const cid of gc.course_ids) {
        const prev = map.get(cid) ?? [];
        prev.push({groupCode: group.group_code, moduleId: group.module_id, groupName: group.name});
        map.set(cid, prev);
      }
    }
    return map;
  }, [groupMap]);

  // --- enName lookup ---
  const enNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, en] of Object.entries(enData.courses as Record<string, string>)) {
      map.set(id, en);
    }
    return map;
  }, []);

  // --- Validation logic ---
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);

  const validateSelection = (courseIds: string[]): string[] => {
    const errors: string[] = [];
    // All taken courses = all previously saved + current selection
    const allTaken = new Set<string>();
    for (const [, ids] of Object.entries(savedHistory)) {
      ids.forEach((id) => allTaken.add(id));
    }
    courseIds.forEach((id) => allTaken.add(id));

    // Check prerequisites
    for (const cid of courseIds) {
      const prereqs = prereqMap.get(cid) ?? [];
      for (const pid of prereqs) {
        if (!allTaken.has(pid)) {
          const cName = tName(cid, courseMap.get(cid)?.name ?? cid);
          const pName = tName(pid, courseMap.get(pid)?.name ?? pid);
          errors.push(
            locale === "zh"
              ? `「${cName}」需要先修「${pName}」`
              : `"${cName}" requires prerequisite "${pName}"`
          );
        }
      }
    }

    // Check choice set conflicts
    for (const [setId, setCourseIds] of choiceSetCourseMap.entries()) {
      const cs = choiceSetMap.get(setId);
      if (!cs) continue;
      const selectedInSet = courseIds.filter((cid) => setCourseIds.includes(cid));
      if (selectedInSet.length > (cs.max_select ?? 1)) {
        errors.push(
          locale === "zh"
            ? `「${cs.name}」最多选 ${cs.max_select} 门，当前选了 ${selectedInSet.length} 门`
            : `"${cs.name}" max ${cs.max_select}, selected ${selectedInSet.length}`
        );
      }
    }

    return errors;
  };

  // --- Category display (locale-aware) ---
  const CAT_LABELS = locale === "zh" ? FOUNDATION_ZH : FOUNDATION_EN;

  const getCourseCategories = (courseId: string): string[] => {
    const infos = courseGroupInfo.get(courseId) ?? [];
    const categories = infos.map((info) => {
      if (info.moduleId === null) {
        return CAT_LABELS[info.groupCode] ?? info.groupName;
      }
      const type = moduleTypeLabel(info.moduleId);
      return locale === "zh" ? `${type}类${info.groupCode}` : `${type}-${info.groupCode}`;
    });
    return [...new Set(categories)];
  };

  // --- Filter Options (i18n-aware) ---
  const unsetLabel = t("workspace.filterUnset");

  const semesterOptions: SelectItem[] = useMemo(
    () => [
      {key: "all", label: unsetLabel},
      ...semesters.map((s) => ({key: s, label: tSemester(s)})),
    ],
    [semesters, unsetLabel, tSemester]
  );

  const moduleOptions: SelectItem[] = useMemo(
    () => [
      {key: "all", label: unsetLabel},
      ...modules.map((m) => ({
        key: `mod_${m.module_id}`,
        label: formatModuleOption(m.module_id, tModule(m.module_id, m.name), locale),
      })),
      {key: "none", label: t("workspace.filterNonModule")},
    ],
    [modules, unsetLabel, tModule, locale, t]
  );

  const groupOptions: SelectItem[] = useMemo(
    () => [
      {key: "all", label: unsetLabel},
      {key: "TYPE_I", label: t("workspace.filterTypeI")},
      {key: "TYPE_II", label: t("workspace.filterTypeII")},
      {key: "TYPE_III", label: t("workspace.filterTypeIII")},
      ...allGroups.map((g) => ({key: g.group_code, label: tGroup(g.group_code, g.name)})),
    ],
    [allGroups, unsetLabel, t, tGroup]
  );

  const abOptions: SelectItem[] = useMemo(
    () => [
      {key: "all", label: unsetLabel},
      {key: "A", label: t("workspace.filterGroupA")},
      {key: "B", label: t("workspace.filterGroupB")},
    ],
    [unsetLabel, t]
  );

  // --- Filtered Courses ---
  const filteredCourses = useMemo(() => {
    let result = courses;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const isNewQuery = q === "新开课" || q === "新开" || q === "new course";
      result = result.filter((c) => {
        // "新开课"/"新开"/"new course" → show all NEW-id courses
        if (isNewQuery && c.course_id.startsWith("NEW")) return true;

        // Pure numeric query should NOT match NEW-id (e.g. "007" should not match "NEW007")
        if (c.course_id.startsWith("NEW") && /^\d+$/.test(q)) return false;

        return (
          c.course_id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          tName(c.course_id, c.name).toLowerCase().includes(q)
        );
      });
    }

    if (filters.group !== "all") {
      if (filters.group === "TYPE_I") {
        result = result.filter((c) => {
          const infos = courseGroupInfo.get(c.course_id) ?? [];
          return infos.some((i) => i.moduleId !== null && i.moduleId >= 1 && i.moduleId <= 3);
        });
      } else if (filters.group === "TYPE_II") {
        result = result.filter((c) => {
          const infos = courseGroupInfo.get(c.course_id) ?? [];
          return infos.some((i) => i.moduleId !== null && i.moduleId >= 4 && i.moduleId <= 8);
        });
      } else if (filters.group === "TYPE_III") {
        result = result.filter((c) => {
          const infos = courseGroupInfo.get(c.course_id) ?? [];
          return infos.some((i) => i.moduleId !== null && i.moduleId >= 9 && i.moduleId <= 13);
        });
      } else {
        result = result.filter((c) => {
          const infos = courseGroupInfo.get(c.course_id) ?? [];
          return infos.some((i) => i.groupCode === filters.group);
        });
      }
    }

    if (filters.module !== "all") {
      if (filters.module === "none") {
        result = result.filter((c) => {
          const infos = courseGroupInfo.get(c.course_id) ?? [];
          return infos.length === 0 || infos.every((i) => i.moduleId === null);
        });
      } else {
        const modId = parseInt(filters.module.replace("mod_", ""), 10);
        result = result.filter((c) => {
          const infos = courseGroupInfo.get(c.course_id) ?? [];
          const inModule = infos.some((i) => i.moduleId === modId);
          if (!inModule) return false;
          if (filters.abGroup !== "all") {
            return infos.some((i) => i.moduleId === modId && i.groupCode === `${modId}${filters.abGroup}`);
          }
          return true;
        });
      }
    }

    if (filters.semester !== "all") {
      const ids = semesterMap.get(filters.semester)?.map((c) => c.course_id) ?? [];
      const idSet = new Set(ids);
      result = result.filter((c) => idSet.has(c.course_id));
    }

    return result;
  }, [courses, filters, courseGroupInfo, semesterMap, searchText, tName]);

  // --- Scroll history to rightmost ---
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollLeft = historyScrollRef.current.scrollWidth;
    }
  }, [historySemesters.length, leftExpanded]);

  // --- UI helpers ---
  const textDark = isDark ? "text-white/90" : "text-gray-800";
  const textMuted = isDark ? "text-white/50" : "text-gray-500";
  const textBody = isDark ? "text-white/75" : "text-gray-700";
  const bgCard = isDark ? "bg-white/5" : "bg-white";
  const bgHeader = isDark ? "bg-[#1a1a24]" : "bg-gray-50";
  const bgHistoryCard = isDark ? "bg-white/[0.04]" : "bg-gray-50";
  const borderCls = isDark ? "border-white/10" : "border-gray-200";
  const borderLight = isDark ? "border-white/5" : "border-gray-100";
  const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-gray-100";

  const clearFilters = () => {
    setFilters({group: "all", semester: "all", module: "all", abGroup: "all"});
    setSearchText("");
  };

  const hasActiveFilters =
    filters.group !== "all" ||
    filters.semester !== "all" ||
    filters.module !== "all" ||
    searchText.trim().length > 0;

  const inputTheme = isDark ? "dark" : "light";
  const moduleEnabled = filters.module !== "all" && filters.module !== "none";

  return (
    <div className={`flex h-full flex-col ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
      <Navbar currentPage="workspace" onNavigate={onNavigate ?? (() => {})} />
      <main className="flex flex-1 gap-3 p-3 overflow-hidden">
        {/* ========== LEFT: History ========== */}
        <section
          className="h-full flex flex-col overflow-hidden transition-all duration-300"
          style={{flex: leftExpanded ? "5" : "3"}}
        >
          <Island className={`flex h-full flex-col ${bgCard}`}>
            <Header border>
              <div className="flex w-full items-center gap-4">
                <span className={`text-sm font-semibold ${textDark}`}>{t("workspace.history")}</span>
                <div className="ml-auto flex items-center gap-1">
                  <Button onClick={() => setShowImportModal(true)}>{t("workspace.importExport")}</Button>
                  <Button onClick={() => setLeftExpanded(!leftExpanded)}>
                    {leftExpanded ? t("workspace.fold") : t("workspace.unfold")}
                  </Button>
                </div>
              </div>
            </Header>
            <Content className="flex-1 overflow-hidden p-0">
              <div
                ref={historyScrollRef}
                className="h-full overflow-x-auto overflow-y-hidden"
                style={{transform: "rotateX(180deg)"}}
              >
                <div
                  className="flex gap-2 px-2 py-2"
                  style={{transform: "rotateX(180deg)"}}
                >
                  {historySemesters.length === 0 && (
                    <div className={`flex w-full items-center justify-center text-sm ${textMuted}`}>
                      {t("workspace.noHistory")}
                    </div>
                  )}
                  {historySemesters.map((sem) => {
                    // Get saved course IDs for this semester
                    const savedIds = savedHistory[sem] ?? [];
                    // Get full course objects for display
                    const savedCourses = savedIds.map((id) => courseMap.get(id)).filter(Boolean) as typeof courses;
                    const totalCredits = savedCourses.reduce((sum, c) => sum + c.credits, 0);
                    // Default courses from semesterMap (for showing default data)
                    const defaultCourses = semesterMap.get(sem) ?? [];
                    // Display: only show saved data, no default fallback
                    const displayCourses = savedIds.length > 0 ? savedCourses : [];
                    const displayCredits = displayCourses.reduce((sum, c) => sum + c.credits, 0);
                    const hasSaved = savedIds.length > 0;
                    return (
                      <div
                        key={sem}
                        className={`flex w-48 shrink-0 flex-col rounded-lg p-2 ${bgHistoryCard}`}
                        style={{height: "fit-content"}}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold ${textDark}`}>
                              {locale === "zh" ? abbreviateSemester(sem) : tSemester(sem)}
                            </span>
                            {hasSaved && semesters.indexOf(sem) > currentIdx && (
                              <span className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none ${
                                semesters.indexOf(sem) === currentIdx + 1
                                  ? isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-500/10 text-blue-600"
                                  : isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-500/10 text-purple-600"
                              }`}>
                                {semesters.indexOf(sem) === currentIdx + 1
                                  ? t("workspace.historyFutureNext")
                                  : t("workspace.historyFuturePlanned")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Edit button — recall to staging */}
                            {hasSaved && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStagingSemester(sem);
                                  setSelectedCourses(new Set(savedIds));
                                }}
                                className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none text-[10px] transition-colors ${
                                  isDark
                                    ? "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/85"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                                }`}
                                title={t("workspace.historyEdit")}
                              >✎</button>
                            )}
                            {/* Delete button — only show if has saved data */}
                            {hasSaved && (
                              <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(deleteConfirm === sem ? null : sem);
                              }}
                              className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none text-[10px] transition-colors ${
                                isDark
                                  ? "bg-red-500/15 text-red-400 hover:bg-red-500/30"
                                  : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              }`}
                              title={t("workspace.historyDelete")}
                            >✕</button>
                            )}
                          </div>
                        </div>
                        <div className={`mb-1 text-[10px] ${textMuted}`}>
                          {locale === "zh" ? `共${displayCourses.length}门，${displayCredits}学分` : `${displayCourses.length} courses, ${displayCredits} cr.`}
                        </div>

                        {/* Delete confirmation */}
                        {deleteConfirm === sem && (
                          <div className={`mb-1 rounded px-1.5 py-1 text-[10px] ${isDark ? "bg-red-500/15" : "bg-red-50"}`}>
                            <div className={`mb-1 ${isDark ? "text-red-300" : "text-red-600"}`}>
                              {t("workspace.historyDeleteConfirm")}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const next = {...savedHistory};
                                  delete next[sem];
                                  persistHistory(next);
                                  setDeleteConfirm(null);
                                }}
                                className={`cursor-pointer rounded border-none px-2 py-0.5 text-[10px] font-medium ${
                                  isDark ? "bg-red-500 text-white" : "bg-red-500 text-white"
                                }`}
                              >{t("workspace.historyDelete")}</button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className={`cursor-pointer rounded border-none px-2 py-0.5 text-[10px] ${
                                  isDark ? "bg-white/10 text-white/70" : "bg-gray-200 text-gray-600"
                                }`}
                              >{t("workspace.historyDeleteCancel")}</button>
                            </div>
                          </div>
                        )}

                        {displayCourses.length === 0 && (
                          <div className={`text-xs ${textMuted}`}>—</div>
                        )}
                        {displayCourses.map((c) => (
                          <div
                            key={c.course_id}
                            className={`flex justify-between gap-1 rounded px-1 py-0.5 text-xs ${hoverBg}`}
                          >
                            <span className={`break-words ${textBody}`} style={{wordBreak: "break-word", maxWidth: "calc(100% - 2rem)"}}>
                              {tName(c.course_id, c.name)}
                            </span>
                            <span className={`shrink-0 ${textMuted}`}>{c.credits}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Content>
          </Island>

          {/* Diagnostics below history */}
          {diagData.length > 0 && (
            <Island className={`flex flex-col ${bgCard}`} style={{flex: diagExpanded ? "1.2" : "0.6", minHeight: 0}}>
              <Header border>
                <div className="flex w-full items-center gap-2">
                  <span className={`text-sm font-semibold ${textDark}`}>
                    {locale === "zh" ? "诊断信息" : "Diagnostics"}
                  </span>
                  <span className={`text-[10px] ${textMuted}`}>({diagData.length})</span>
                  <div className="ml-auto">
                    <Button onClick={() => setDiagExpanded(!diagExpanded)}>
                      {diagExpanded ? t("workspace.fold") : t("workspace.unfold")}
                    </Button>
                  </div>
                </div>
              </Header>
              <Content className="flex-1 overflow-auto p-0" style={{minHeight: 0}}>
                <div className="flex flex-col gap-1 px-2 py-1">
                  {diagExpanded && diagData.map((entry) => {
                    const hasError = entry.checks.some((c) => c.type === "error");
                    return (
                      <div key={entry.sem} className={`rounded px-2 py-1.5 text-xs ${
                        hasError
                          ? isDark ? "bg-red-500/10" : "bg-red-50"
                          : isDark ? "bg-yellow-500/10" : "bg-yellow-50"
                      }`}>
                        <div className={`flex items-center gap-1 font-medium ${
                          hasError ? (isDark ? "text-red-300" : "text-red-600") : (isDark ? "text-yellow-300" : "text-yellow-700")
                        }`}>
                          {hasError ? "✕" : "⚠"} {locale === "zh" ? abbreviateSemester(entry.sem) : tSemester(entry.sem)}
                        </div>
                        {entry.checks.map((c, i) => (
                          <div key={i} className={`ml-3 ${
                            c.type === "error"
                              ? isDark ? "text-red-200" : "text-red-500"
                              : isDark ? "text-yellow-200" : "text-yellow-600"
                          }`}>
                            • {c.msg}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {!diagExpanded && (
                    <div className={`text-xs ${textMuted} px-2 py-2 text-center`}>
                      {locale === "zh" ? "点击展开查看诊断信息" : "Expand to view diagnostics"}
                    </div>
                  )}
                </div>
              </Content>
            </Island>
          )}
        </section>

        {/* ========== MIDDLE: Staging / Pre-selection (1/5) ========== */}
        <section className="h-full flex flex-col overflow-hidden" style={{flex: "2"}}>
          <Island className={`flex h-full flex-col ${bgCard}`}>
            <Header border>
              <span className={`text-sm font-semibold ${textDark}`}>{t("workspace.stagingCourse")}</span>
            </Header>
            <Content className="flex flex-1 flex-col p-0">
              {/* Semester selector */}
              {availableStagingSemesters.length > 0 && (
                <div className={`flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs ${textBody}`}>
                  <span className="whitespace-nowrap">{t("workspace.stagingSemester")}</span>
                  <Select
                    data={availableStagingSemesters.map((s) => ({
                      key: s,
                      label: locale === "zh" ? abbreviateSemester(s) : tSemester(s),
                    }))}
                    selected={{
                      key: stagingSemester,
                      label: locale === "zh" ? abbreviateSemester(stagingSemester) : tSemester(stagingSemester),
                    }}
                    onSelect={(opt) => opt && setStagingSemester(opt.key as string)}
                    label=""
                    filter
                  />
                </div>
              )}

              {/* Selected course list */}
              <div className="flex-1 overflow-auto px-3 py-1">
                {selectedCourses.size === 0 ? (
                  <div className={`flex h-full items-center justify-center text-xs ${textMuted}`}>
                    {t("workspace.stagingEmpty")}
                  </div>
                ) : (
                  [...selectedCourses].map((cid) => {
                    const c = courseMap.get(cid);
                    if (!c) return null;
                    return (
                      <div
                        key={cid}
                        className={`flex items-center justify-between gap-1 rounded px-1.5 py-1 text-xs ${hoverBg}`}
                      >
                        <span className="flex-1 min-w-0 truncate" title={tName(cid, c.name)}>
                          {tName(cid, c.name)}
                        </span>
                        <span className={`shrink-0 ${textMuted} mr-1`}>{c.credits}</span>
                        <button
                          onClick={() => toggleSelected(cid)}
                          className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-none text-[10px] transition-colors ${
                            isDark
                              ? "bg-red-500/15 text-red-400 hover:bg-red-500/30"
                              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          }`}
                          title={t("workspace.stagingRemove")}
                        >✕</button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Summary + Save button */}
              {selectedCourses.size > 0 && (
                <div className={`flex flex-col border-t ${borderCls}`}>
                  {stagingSemester && (() => {
                    const limit = getCreditLimit(stagingSemester);
                    const total = calcSemesterCredits(stagingSemester, [...selectedCourses]);
                    return limit ? (
                      <div className={`flex items-center gap-2 px-3 pt-1.5 pb-0.5 text-[10px] ${textMuted}`}>
                        <span>{total}/{limit.max} {t("workspace.colCredits")}</span>
                        {total > limit.max && <span className="text-red-400">⚠</span>}
                        {limit.min > 0 && <span className="ml-1">{t("workspace.creditMin")}</span>}
                      </div>
                    ) : null;
                  })()}
                  <div className={`flex items-center justify-between px-3 py-2 text-xs`}>
                    <span className={textMuted}>
                    {locale === "zh"
                      ? `共${selectedCourses.size}门，${[...selectedCourses].reduce((s, cid) => s + (courseMap.get(cid)?.credits ?? 0), 0)}学分`
                      : `${selectedCourses.size} courses, ${[...selectedCourses].reduce((s, cid) => s + (courseMap.get(cid)?.credits ?? 0), 0)} cr.`}
                  </span>
                  <Button
                    onClick={() => {
                      if (!stagingSemester) return;
                      const selected = [...selectedCourses];
                      const errors = validateSelection(selected);
                      const checks = getSemesterChecks(stagingSemester, selected);
                      const hasErrors = checks.some((c) => c.type === "error");
                      if (errors.length > 0 || hasErrors) {
                        setValidationErrors(errors.length > 0 ? errors : checks.map((c) => c.msg));
                        return;
                      }
                      const next = {...savedHistory, [stagingSemester]: selected};
                      persistHistory(next);
                      setSelectedCourses(new Set());
                      setValidationErrors(null);
                      setForceSaveData(null);
                      // Auto-advance to next available semester
                      const idx = availableStagingSemesters.indexOf(stagingSemester);
                      if (idx >= 0 && idx + 1 < availableStagingSemesters.length) {
                        setStagingSemester(availableStagingSemesters[idx + 1]);
                      } else {
                        setStagingSemester("");
                      }
                    }}
                  >{t("workspace.stagingSave")}</Button>
                    </div>
                  </div>
                )}

              {/* Force-save button when validation errors exist */}
              {validationErrors && validationErrors.length > 0 && (
                <div className={`border-t px-3 py-2 ${borderCls}`}>
                  <Button
                    onClick={() => setShowForceConfirm(true)}
                  >{t("workspace.saveAnyway")}</Button>
                </div>
              )}

              {/* ===== Custom Courses ===== */}
              <div className={`border-t ${borderCls}`}>
                <div className={`px-3 pt-2 pb-1 text-xs font-medium ${textDark}`}>
                  {t("workspace.customCourse")}
                </div>
                <div className="px-3 pb-1">
                  <div className="flex items-center gap-1 mb-1">
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={t("workspace.customCourseName")}
                      className={`flex-1 min-w-0 rounded border px-1.5 py-1 text-xs outline-none ${
                        isDark ? "bg-white/5 border-white/10 text-white/90" : "bg-white border-gray-300 text-gray-800"
                      }`}
                    />
                    <input
                      value={customCredits}
                      onChange={(e) => setCustomCredits(e.target.value)}
                      placeholder={t("workspace.customCourseCredits")}
                      className={`w-14 rounded border px-1.5 py-1 text-xs outline-none ${
                        isDark ? "bg-white/5 border-white/10 text-white/90" : "bg-white border-gray-300 text-gray-800"
                      }`}
                      type="number"
                      min="0"
                      step="0.5"
                    />
                    <button
                      onClick={addCustomCourse}
                      className={`cursor-pointer rounded border-none px-2 py-1 text-xs font-medium ${
                        isDark ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                      }`}
                    >{t("workspace.customCourseAdd")}</button>
                  </div>
                  {stagingSemester && (customCourses[stagingSemester] ?? []).length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      {(customCourses[stagingSemester] ?? []).map((cc) => (
                        <div key={cc.id} className={`flex items-center justify-between rounded px-1.5 py-0.5 text-xs ${hoverBg}`}>
                          <span className={`flex-1 min-w-0 truncate ${textBody}`}>{cc.name}</span>
                          <span className={`shrink-0 ${textMuted} mr-1`}>{cc.credits}</span>
                          <button
                            onClick={() => removeCustomCourse(stagingSemester, cc.id)}
                            className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-none text-[9px] transition-colors ${
                              isDark ? "text-white/40 hover:text-white/70" : "text-gray-400 hover:text-gray-600"
                            }`}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!stagingSemester || (customCourses[stagingSemester] ?? []).length === 0) && (
                    <div className={`text-[10px] ${textMuted} py-1`}>{t("workspace.customCourseEmpty")}</div>
                  )}
                </div>
              </div>

              {/* ===== Credit Limit Info ===== */}
              {stagingSemester && (() => {
                const limit = getCreditLimit(stagingSemester);
                if (!limit) return null;
                const total = calcSemesterCredits(stagingSemester, [...selectedCourses]);
                return (
                  <div className={`border-t px-3 py-1 text-[10px] ${borderCls} ${textMuted}`}>
                    {locale === "zh"
                      ? `当前学分：${total}，上限：${limit.max}${limit.min > 0 ? `，下限：${limit.min}` : ""}`
                      : `Credits: ${total}, max: ${limit.max}${limit.min > 0 ? `, min: ${limit.min}` : ""}`}
                  </div>
                );
              })()}

              </Content>
            </Island>
          </section>

          {/* ===== Force-save confirm modal ===== */}
          {showForceConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: "rgba(0,0,0,0.4)"}}
                 onClick={() => setShowForceConfirm(false)}>
              <div className={`w-72 rounded-xl shadow-2xl border p-4 ${isDark ? "bg-[#1e1e2a] border-white/10" : "bg-white border-gray-200"}`}
                   onClick={(e) => e.stopPropagation()}>
                <div className={`text-sm font-semibold mb-2 ${textDark}`}>{t("workspace.saveForceTitle")}</div>
                <div className={`text-xs mb-3 ${textBody}`}>{t("workspace.saveForceConfirm")}</div>
                {validationErrors && (
                  <div className={`mb-3 rounded px-2 py-1.5 text-[10px] ${isDark ? "bg-red-500/15" : "bg-red-50"}`}>
                    {validationErrors.map((err, i) => (
                      <div key={i} className={isDark ? "text-red-200" : "text-red-500"}>• {err}</div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setShowForceConfirm(false)}>{t("workspace.historyDeleteCancel")}</Button>
                  <Button onClick={() => {
                    if (!stagingSemester) return;
                    const selected = [...selectedCourses];
                    const next = {...savedHistory, [stagingSemester]: selected};
                    persistHistory(next);
                    setSelectedCourses(new Set());
                    setValidationErrors(null);
                    setShowForceConfirm(false);
                    setForceSaveData(null);
                    const idx = availableStagingSemesters.indexOf(stagingSemester);
                    if (idx >= 0 && idx + 1 < availableStagingSemesters.length) {
                      setStagingSemester(availableStagingSemesters[idx + 1]);
                    } else {
                      setStagingSemester("");
                    }
                  }}>
                    {t("workspace.stagingSave")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== Import/Export modal ===== */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: "rgba(0,0,0,0.4)"}}
                 onClick={() => { setShowImportModal(false); setImportPreview(null); }}>
              <div className={`w-80 rounded-xl shadow-2xl border p-4 ${isDark ? "bg-[#1e1e2a] border-white/10" : "bg-white border-gray-200"}`}
                   onClick={(e) => e.stopPropagation()}>
                <div className={`text-sm font-semibold mb-3 ${textDark}`}>{t("workspace.importExport")}</div>
                <div className="flex gap-2 mb-3">
                  <Button onClick={handleExport}>{t("workspace.exportBtn")}</Button>
                  <Button onClick={() => fileInputRef.current?.click()}>{t("workspace.importBtn")}</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImport(f);
                    }}
                  />
                </div>
                {importPreview && (
                  <div className={`rounded px-2 py-1.5 text-[10px] ${isDark ? "bg-white/5 text-white/70" : "bg-gray-50 text-gray-600"}`}>
                    <pre className="whitespace-pre-wrap">{importPreview}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== RIGHT: Catalog ========== */}
        <section className="h-full flex flex-col overflow-hidden" style={{flex: leftExpanded ? "3" : "5"}}>
          <Island className={`flex h-full flex-col ${bgCard}`}>
            <Header border>
              <span className={`text-sm font-semibold ${textDark}`}>{t("workspace.catalog")}</span>
            </Header>

            {/* ===== Filters ===== */}
            <Content
              className="overflow-visible border-b shrink-0"
              style={{position: "relative", zIndex: 2}}
            >
              <div className="px-3 pt-2 pb-1">
                <Input
                  label={t("workspace.searchPlaceholder")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.currentTarget.value)}
                  onClear={() => setSearchText("")}
                  theme={inputTheme}
                />
              </div>

              <div className={`px-3 pt-1 pb-1 text-xs font-medium ${textMuted}`}>
                {t("workspace.filterHeader")}
              </div>

              {/* 2-column grid so AB aligns with "按推荐学期" column */}
              <div className="grid grid-cols-2 gap-x-4 px-3 pb-1">
                {/* Col 1, Row 1: 按课程组 */}
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs ${textBody}`}>{t("workspace.filterGroup")}</span>
                  <Select
                    data={groupOptions}
                    selected={groupOptions.find((o) => o.key === filters.group) ?? groupOptions[0]}
                    onSelect={(opt) => opt && setFilters((f) => ({...f, group: opt.key as string}))}
                    label=""
                    filter
                  />
                </div>
                {/* Col 2, Row 1: 按推荐学期 */}
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs ${textBody}`}>{t("workspace.filterSemester")}</span>
                  <Select
                    data={semesterOptions}
                    selected={semesterOptions.find((o) => o.key === filters.semester) ?? semesterOptions[0]}
                    onSelect={(opt) => opt && setFilters((f) => ({...f, semester: opt.key as string}))}
                    label=""
                    filter
                  />
                </div>
                {/* Col 1, Row 2: 按模块 */}
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs ${textBody}`}>{t("workspace.filterModule")}</span>
                  <Select
                    data={moduleOptions}
                    selected={moduleOptions.find((o) => o.key === filters.module) ?? moduleOptions[0]}
                    onSelect={(opt) => opt && setFilters((f) => ({...f, module: opt.key as string, abGroup: "all"}))}
                    label=""
                    filter
                  />
                </div>
                {/* Col 2, Row 2: 课组 — always visible, disabled unless module selected */}
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs ${textBody}`}>{t("workspace.filterABGroup")}</span>
                  <Select
                    data={abOptions}
                    selected={abOptions.find((o) => o.key === filters.abGroup) ?? abOptions[0]}
                    onSelect={(opt) => opt && moduleEnabled && setFilters((f) => ({...f, abGroup: opt.key as string}))}
                    label=""
                    disabled={!moduleEnabled}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="px-3 pb-2 pt-1">
                  <Button onClick={clearFilters}>{t("workspace.filterClear")}</Button>
                </div>
              )}
            </Content>

            {/* ===== Course list ===== */}
            <div className="flex flex-col flex-1 min-h-0">
              {/* Frozen header (static row outside scroll area) */}
              <div
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b shrink-0 ${bgHeader} ${borderCls} ${textMuted}`}
              >
                <span className="w-7 shrink-0" />
                <span className="w-20 shrink-0 truncate">{t("workspace.colCode")}</span>
                <span className="flex-1 min-w-0 truncate">{t("workspace.colName")}</span>
                <span className="w-10 shrink-0 text-right">{t("workspace.colCredits")}</span>
                <span className="w-36 shrink-0 text-right">{t("workspace.colCategory")}</span>
                <span className="w-16 shrink-0 text-right">{t("workspace.colSemester")}</span>
              </div>

              {/* Scrollable rows */}
              <div className="flex-1 overflow-auto">
                {filteredCourses.map((c) => {
                  const categories = getCourseCategories(c.course_id);
                  const sems = courseSemesterMap.get(c.course_id) ?? [];
                  const semDisplay =
                    sems.length > 0
                      ? sems.map((s) => (locale === "zh" ? abbreviateSemester(s) : tSemester(s))).join(", ")
                      : "—";
                  const isSelected = selectedCourses.has(c.course_id);

                  return (
                    <div
                      key={c.course_id}
                      className={`flex items-start gap-2 px-3 py-1.5 text-xs border-b ${borderLight} ${hoverBg} ${textBody}`}
                    >
                      {/* +/- button */}
                      <button
                        onClick={() => toggleSelected(c.course_id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-none text-sm font-bold transition-colors ${
                          isSelected
                            ? isDark
                              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              : "bg-green-500/15 text-green-600 hover:bg-green-500/25"
                            : isDark
                              ? "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/85"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        }`}
                        title={isSelected ? (locale === "zh" ? "从预选移除" : "Remove") : (locale === "zh" ? "添加到预选" : "Add")}
                      >
                        {isSelected ? "✓" : "+"}
                      </button>
                      {/* Course ID */}
                      <span className={`w-20 shrink-0 truncate font-mono pt-0.5 ${textMuted}`} title={c.course_id}>
                        {c.course_id.startsWith("NEW") ? "新开课" : c.course_id}
                      </span>
                      {/* Course name — click for detail */}
                      <span
                        className="flex-1 min-w-0 truncate whitespace-nowrap pt-0.5 cursor-pointer"
                        title={tName(c.course_id, c.name)}
                        onClick={() => setDetailCourse(c)}
                      >
                        {tName(c.course_id, c.name)}
                      </span>
                      <span className={`w-10 shrink-0 text-right pt-0.5 ${textMuted}`}>{c.credits}</span>
                      <span className="w-36 shrink-0 text-right pt-0.5 break-words leading-tight" style={{wordBreak: "break-word"}}>
                        {categories.length > 0 ? categories.join(", ") : "—"}
                      </span>
                      <span className="w-16 shrink-0 text-right pt-0.5 leading-tight" style={{wordBreak: "keep-all"}}>
                        {semDisplay}
                      </span>
                    </div>
                  );
                })}

                {filteredCourses.length === 0 && (
                  <div className={`p-6 text-center text-sm ${textMuted}`}>{t("workspace.noMatch")}</div>
                )}
              </div>

              {/* ===== Result count bar ===== */}
              <div className={`flex items-center gap-2 px-3 py-1.5 text-xs border-t shrink-0 ${bgHeader} ${borderCls} ${textMuted}`}>
                {locale === "zh"
                  ? `共 ${filteredCourses.length} 门课程`
                  : `${filteredCourses.length} courses total`}
                {selectedCourses.size > 0 && (
                  <span className="ml-auto">
                    {locale === "zh"
                      ? `已选 ${selectedCourses.size} 门`
                      : `${selectedCourses.size} selected`}
                  </span>
                )}
              </div>
            </div>

              {/* ===== Detail Popup ===== */}
              {detailCourse && (() => {
                const dc = detailCourse;
                const prereqIds = prereqMap.get(dc.course_id) ?? [];
                const prereqNames = prereqIds.map((pid) => {
                  const c = courseMap.get(pid);
                  return c ? tName(pid, c.name) : pid;
                });
                const enName = enNameMap.get(dc.course_id);
                return (
                  <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-16"
                    style={{background: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)"}}
                    onClick={() => setDetailCourse(null)}
                  >
                    <div
                      className={`w-80 rounded-xl shadow-2xl border overflow-hidden ${isDark ? "bg-[#1e1e2a]" : "bg-white"} ${borderCls}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderCls}`}>
                        <span className={`text-sm font-semibold ${textDark}`}>{tName(dc.course_id, dc.name)}</span>
                        <button
                          onClick={() => setDetailCourse(null)}
                          className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none text-sm transition-colors ${
                            isDark ? "hover:bg-white/10 text-white/60" : "hover:bg-gray-100 text-gray-400"
                          }`}
                        >✕</button>
                      </div>
                      <div className="flex flex-col gap-2 px-4 py-3 text-xs">
                        <div className="flex justify-between">
                          <span className={`font-mono ${textMuted}`}>{dc.course_id.startsWith("NEW") ? "新开课" : dc.course_id}</span>
                        </div>
                        {locale === "zh" && enName && (
                          <div className="flex justify-between">
                            <span className={textBody}>{enName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className={textMuted}>{t("workspace.colCredits")}</span>
                          <span className={textDark}>{dc.credits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={textMuted}>{t("workspace.colCategory")}</span>
                          <span className={`text-right ${textDark}`} style={{maxWidth: "70%"}}>
                            {(getCourseCategories(dc.course_id).length > 0
                              ? getCourseCategories(dc.course_id).join(", ")
                              : "—")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={textMuted}>{t("workspace.filterSemester")}</span>
                          <span className={`text-right ${textDark}`}>
                            {(courseSemesterMap.get(dc.course_id) ?? []).length > 0
                              ? (courseSemesterMap.get(dc.course_id) ?? []).map((s) => locale === "zh" ? abbreviateSemester(s) : tSemester(s)).join(", ")
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className={textMuted}>
                            {locale === "zh" ? "先修课程" : "Prerequisites"}
                          </span>
                          <span className={`text-right ${textDark}`} style={{maxWidth: "70%"}}>
                            {prereqNames.length > 0 ? prereqNames.join("; ") : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </Island>
        </section>
      </main>
    </div>
  );
};