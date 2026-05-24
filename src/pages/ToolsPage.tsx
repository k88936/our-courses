import {useRef, useMemo, useState} from "react";
import Island, {Content, Header} from "@jetbrains/ring-ui-built/components/island/island";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Select, {type SelectItem} from "@jetbrains/ring-ui-built/components/select/select";
import {useLocale} from "../i18n/LocaleContext";
import {useAppTheme} from "../theme/ThemeContext";
import {useCurriculumData} from "../hooks/useCurriculumData";
import type {Course, Group} from "@our-courses/data/model";
import {useTName} from "@/i18n/utils"

type HistoryData = Record<string, string[]>;

interface GroupProgress {
    groupId: number;
    label: string;
    takenCredits: number;
    totalCredits: number;
    pct: number;
}

interface TrackProgress {
    trackCode: string;
    trackName: string;
    creditsEarned: number;
    creditsRequired: number;
    pct: number;
    mainGroups: GroupProgress[];
    subGroups: GroupProgress[];
    bestModule?: number;
    isComplete: boolean;
    missingRequired?: string;
}

export const ToolsPage = () => {
    const {locale} = useLocale();
    const {theme} = useAppTheme();
    const isDark = theme === "dark";
    const {data: allData, loading} = useCurriculumData();

    const allGroups = useMemo(() => allData ? Object.values(allData.courseData.groups) as Group[] : [], [allData]);
    const coursesData = useMemo(() => allData ? Object.values(allData.courseData.courses) as Course[] : [], [allData]);
    const groupCoursesData = useMemo(() => allData
        ? Object.values(allData.courseData.groups).map((g) => ({group_id: g.group_id, course_ids: g.course_ids}))
        : [], [allData]);
    const degreeTracksData = useMemo(() => allData ? allData.degreeData.tracks : [], [allData]);
    const degreeGroupReqsData = useMemo(() => {
        if (!allData) return [];
        let id = 0;
        const result: Array<{ id: number; track_code: string; group_id: number; is_main: boolean }> = [];
        for (const t of allData.degreeData.tracks) {
            for (const gid of t.req_main_group_ids) {
                result.push({id: id++, track_code: t.track_code, group_id: gid, is_main: true});
            }
            for (const gid of t.req_group_ids) {
                if (!t.req_main_group_ids.includes(gid)) {
                    result.push({id: id++, track_code: t.track_code, group_id: gid, is_main: false});
                }
            }
        }
        return result;
    }, [allData]);
    const degreeCourseReqsData = useMemo(() => {
        if (!allData) return [];
        let id = 0;
        const result: Array<{ id: number; track_code: string; course_id: number }> = [];
        for (const t of allData.degreeData.tracks) {
            for (const cid of t.req_course_ids) {
                result.push({id: id++, track_code: t.track_code, course_id: cid});
            }
        }
        return result;
    }, [allData]);

    // course_id → credits lookup
    const courseCreditsMap = useMemo(() => {
        const map = new Map<number, number>();
        for (const c of coursesData) {
            map.set(c.course_id, c.credits);
        }
        return map;
    }, [coursesData]);

    // group_id → Set<course_id>
    const groupCourseSet = useMemo(() => {
        const map = new Map<number, Set<number>>();
        for (const gc of groupCoursesData) {
            map.set(gc.group_id, new Set(gc.course_ids));
        }
        return map;
    }, [groupCoursesData]);

    // All course IDs selected across all semesters
    const allSelectedIds = useMemo(() => {
        const set = new Set<string>();
        if (historyData) {
            for (const [, ids] of Object.entries(historyData)) ids.forEach((id) => set.add(id));
        }
        return set;
    }, [historyData]);

    // Build module → {aGroupId, bGroupId} from groups data
    const moduleGroupInfo = useMemo(() => {
        const info = new Map<number, { aGroupId: number; bGroupId: number }>();
        for (const g of allGroups) {
            if (g.module_id === null) continue;
            const isA = g.group_code.endsWith("A");
            if (!info.has(g.module_id)) info.set(g.module_id, {aGroupId: 0, bGroupId: 0});
            const e = info.get(g.module_id)!;
            if (isA) e.aGroupId = g.group_id;
            else e.bGroupId = g.group_id;
        }
        return info;
    }, [allGroups]);

    // group_id → module_id (for IE/SE module range filtering)
    const groupModuleMap = useMemo(() => {
        const map = new Map<number, number>();
        for (const g of allGroups) {
            if (g.module_id !== null) map.set(g.group_id, g.module_id);
        }
        return map;
    }, [allGroups]);

    // Credits taken in a group
    const creditsTakenInGroup = (gid: number): number => {
        const cs = groupCourseSet.get(gid);
        if (!cs) return 0;
        let total = 0;
        for (const cid of allSelectedIds) {
            if (cs.has(Number(cid))) total += courseCreditsMap.get(Number(cid)) ?? 0;
        }
        return total;
    };

    // Total credits in a group
    const totalCreditsInGroup = (gid: number): number => {
        const cs = groupCourseSet.get(gid);
        if (!cs) return 1;
        let total = 0;
        for (const cid of cs) total += courseCreditsMap.get(cid) ?? 0;
        return total || 1;
    };

    // Group progress helper
    const groupProgress = (gid: number, label: string): GroupProgress => {
        const takenCredits = creditsTakenInGroup(gid);
        const totalCredits = totalCreditsInGroup(gid);
        return {
            groupId: gid,
            label,
            takenCredits,
            totalCredits,
            pct: Math.round((takenCredits / totalCredits) * 100),
        };
    };

    // Compute all track progresses (data-driven from degree_tracks + degree_group_requirements)
    const trackProgresses = useMemo((): TrackProgress[] => {
        if (!historyData) return [];

        const trackData = degreeTracksData;
        const trackGroups = degreeGroupReqsData;
        const courseReqs = degreeCourseReqsData;

        // Group requirements by track_code
        const reqByTrack = new Map<string, { main: number[]; sub: number[] }>();
        for (const rg of trackGroups) {
            if (!reqByTrack.has(rg.track_code)) reqByTrack.set(rg.track_code, {main: [], sub: []});
            const e = reqByTrack.get(rg.track_code)!;
            if (rg.is_main) e.main.push(rg.group_id);
            else e.sub.push(rg.group_id);
        }

        // Required courses by track_code
        const reqCoursesByTrack = new Map<string, number[]>();
        for (const rc of courseReqs) {
            if (!reqCoursesByTrack.has(rc.track_code)) reqCoursesByTrack.set(rc.track_code, []);
            reqCoursesByTrack.get(rc.track_code)!.push(rc.course_id);
        }

        const results: TrackProgress[] = [];

        for (const track of trackData) {
            const code = track.track_code;
            const groups = reqByTrack.get(code);
            if (!groups) continue;
            const requiredCourses = reqCoursesByTrack.get(code) ?? [];

            let creditsEarned = 0;
            let allMainGroups: GroupProgress[] = [];
            let allSubGroups: GroupProgress[] = [];
            let bestModule: number | undefined;
            let missingRequired: string | undefined;

            if (code === "IE" || code === "SE") {
                // IE/SE: pick the module with highest total credits (A+B), that's the earned amount
                const moduleIds = groups.main
                    .map((gid) => groupModuleMap.get(gid))
                    .filter((m): m is number => m !== undefined)
                    .filter((m, i, a) => a.indexOf(m) === i)
                    .sort();

                let bestModuleCredits = 0;

                for (const modId of moduleIds) {
                    const modInfo = moduleGroupInfo.get(modId);
                    if (!modInfo) continue;
                    const aGp = groupProgress(modInfo.aGroupId, locale === "zh" ? `模块${modId}A` : `Module ${modId}A`);
                    const bGp = groupProgress(modInfo.bGroupId, locale === "zh" ? `模块${modId}B` : `Module ${modId}B`);
                    const totalModCredits = aGp.takenCredits + bGp.takenCredits;
                    allMainGroups.push(aGp);
                    allSubGroups.push(bGp);
                    if (totalModCredits > bestModuleCredits) {
                        bestModuleCredits = totalModCredits;
                        bestModule = modId;
                        creditsEarned = totalModCredits;
                    }
                }
            } else {
                // AE / EM / PE: fixed groups
                allMainGroups = groups.main.map((gid) => {
                    const modId = groupModuleMap.get(gid);
                    const label = modId
                        ? (locale === "zh" ? `模块${modId}A` : `Module ${modId}A`)
                        : (locale === "zh" ? "主体课组" : "Main Group");
                    return groupProgress(gid, label);
                });

                allSubGroups = groups.sub.map((gid) => {
                    const modId = groupModuleMap.get(gid);
                    const label = modId
                        ? (locale === "zh" ? `模块${modId}B` : `Module ${modId}B`)
                        : (locale === "zh" ? "其他课组" : "Sub Group");
                    return groupProgress(gid, label);
                });

                for (const mg of allMainGroups) creditsEarned += mg.takenCredits;
                for (const sg of allSubGroups) creditsEarned += sg.takenCredits;
            }

            // Check required courses
            for (const cid of requiredCourses) {
                if (!allSelectedIds.has(String(cid))) {
                    const c = coursesData.find((cc) => cc.course_id === cid);
                    missingRequired = c?.name ?? String(cid);
                }
            }

            const creditsReq = track.total_credits_required || 24;
            results.push({
                trackCode: code,
                trackName: locale === "zh" ? track.name : track.name,
                creditsEarned,
                creditsRequired: creditsReq,
                pct: Math.min(100, Math.round((creditsEarned / creditsReq) * 100)),
                mainGroups: allMainGroups,
                subGroups: allSubGroups,
                bestModule,
                isComplete: creditsEarned >= creditsReq && !missingRequired,
                missingRequired,
            });
        }

        return results.sort((a, b) => b.pct - a.pct);
    }, [historyData, allGroups, groupCourseSet, courseCreditsMap, moduleGroupInfo, groupModuleMap, allSelectedIds, locale, coursesData, degreeTracksData, degreeGroupReqsData, degreeCourseReqsData]);

    const allSelectedCount = allSelectedIds.size;

    // Build module options for detail queries from actual data
    const trackDetailOptions = useMemo(() => {
        if (!trackProgresses.length) return {ie: [] as SelectItem[], se: [] as SelectItem[]};

        // IE modules from track data
        const ieTrack = trackProgresses.find((t) => t.trackCode === "IE");
        const seTrack = trackProgresses.find((t) => t.trackCode === "SE");

        const ieModuleIds = ieTrack
            ? [...new Set(ieTrack.mainGroups.map((g) => groupModuleMap.get(g.groupId)).filter((m): m is number => m !== undefined))].sort()
            : [9, 10, 11, 12, 13];

        const seModuleIds = seTrack
            ? [...new Set(seTrack.mainGroups.map((g) => groupModuleMap.get(g.groupId)).filter((m): m is number => m !== undefined))].sort()
            : [4, 5, 6, 7, 8];

        return {
            ie: [
                {key: "all", label: locale === "zh" ? "全部模块" : "All Modules"},
                ...ieModuleIds.map((m) => ({key: m.toString(), label: locale === "zh" ? `模块${m}` : `Module ${m}`})),
            ],
            se: [
                {key: "all", label: locale === "zh" ? "全部模块" : "All Modules"},
                ...seModuleIds.map((m) => ({key: m.toString(), label: locale === "zh" ? `模块${m}` : `Module ${m}`})),
            ],
        };
    }, [trackProgresses, groupModuleMap, locale]);

    const handleImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string);
                if (data.history) {
                    setHistoryData(data.history as HistoryData);
                    setFileName(file.name);
                } else {
                    alert(locale === "zh" ? "无效的 JSON 文件，缺少 history 字段" : "Invalid JSON: missing history field");
                }
            } catch {
                alert(locale === "zh" ? "文件解析失败，请选择有效的 JSON 文件" : "File parse error");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className={`flex flex-1 flex-col gap-3 p-3 overflow-auto ${isDark ? "bg-[#0e0e14]" : "bg-gray-50"}`}>
            {/* ===== Import section ===== */}
            <Island className={`${bgCard}`}>
                <Header border>
          <span className={`text-sm font-semibold ${textDark}`}>
            {locale === "zh" ? "学位评定" : "Degree Evaluation"}
          </span>
                </Header>
                <Content>
                    <div className="px-4 py-3 flex flex-col gap-3">
                        <div className={`text-xs ${textBody}`}>
                            {locale === "zh"
                                ? "导入工作台导出的 JSON 历史记录文件，系统将自动计算各专业学位的获取进度。"
                                : "Import a JSON history file from Workspace to evaluate degree progress."}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => fileInputRef.current?.click()}>
                                {locale === "zh" ? "导入历史记录" : "Import History"}
                            </Button>
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
                            {fileName && (
                                <span className={`text-xs ${textMuted}`}>
                  {locale === "zh" ? `已导入：${fileName}` : `Imported: ${fileName}`}
                </span>
                            )}
                        </div>
                        {historyData && (
                            <div className={`text-xs ${textMuted}`}>
                                {locale === "zh"
                                    ? `共导入 ${Object.keys(historyData).length} 个学期，${allSelectedCount} 门课程`
                                    : `${Object.keys(historyData).length} semesters, ${allSelectedCount} courses`}
                            </div>
                        )}
                    </div>
                </Content>
            </Island>

            {/* ===== Results (only after import) ===== */}
            {historyData && trackProgresses.length > 0 && (
                <>
                    {/* Overview cards */}
                    <Island className={`${bgCard}`}>
                        <Header border>
              <span className={`text-sm font-semibold ${textDark}`}>
                {locale === "zh" ? "学位获取进度" : "Degree Progress"}
              </span>
                        </Header>
                        <Content>
                            <div className="px-4 py-3 grid grid-cols-2 gap-3">
                                {trackProgresses.slice(0, 8).map((tp) => (
                                    <div
                                        key={tp.trackCode}
                                        className={`rounded-lg border p-3 ${borderCls} ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`text-sm font-semibold ${textDark}`}>{tp.trackName}</span>
                                                {tp.isComplete && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                        isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"
                                                    }`}>
                            {locale === "zh" ? "已达标" : "Complete"}
                          </span>
                                                )}
                                            </div>
                                            <span
                                                className={`text-sm font-bold ${tp.isComplete ? "text-green-500" : textDark}`}>
                        {tp.creditsEarned}/{tp.creditsRequired}
                      </span>
                                        </div>

                                        {/* Main progress bar - prominent */}
                                        <div className="relative h-5 w-full rounded-full overflow-hidden mb-2"
                                             style={{background: progressBgCss}}>
                                            <div
                                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                                style={{
                                                    width: `${Math.min(Math.max(tp.pct, 4), 100)}%`,
                                                    background: tp.isComplete ? progressCompleteCss : progressFillCss,
                                                }}
                                            >
                                                {tp.pct >= 20 && (
                                                    <span className="text-[10px] font-bold text-white drop-shadow-sm">
                            {tp.pct}%
                          </span>
                                                )}
                                            </div>
                                            {tp.pct < 20 && (
                                                <span
                                                    className={`absolute inset-y-0 right-1 flex items-center text-[10px] font-bold ${textMuted}`}>
                          {tp.pct}%
                        </span>
                                            )}
                                        </div>

                                        {/* Module info */}
                                        {tp.bestModule && (
                                            <div className={`text-[11px] mt-1.5 ${textMuted}`}>
                                                {locale === "zh"
                                                    ? `最佳匹配：模块${tp.bestModule}`
                                                    : `Best match: Module ${tp.bestModule}`}
                                            </div>
                                        )}

                                        {/* Group detail rows */}
                                        <div className="mt-2 space-y-1">
                                            {tp.mainGroups.map((g) => (
                                                <div key={`m-${g.groupId}`}
                                                     className="flex justify-between text-[11px]">
                                                    <span className={textBody}>{g.label}</span>
                                                    <span className={textMuted}>
                            {g.takenCredits}/{g.totalCredits} 学分
                          </span>
                                                </div>
                                            ))}
                                            {tp.subGroups.map((g) => (
                                                <div key={`s-${g.groupId}`}
                                                     className="flex justify-between text-[11px]">
                                                    <span className={textMuted}>{g.label}</span>
                                                    <span className={textMuted}>
                            {g.takenCredits}/{g.totalCredits} 学分
                          </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Missing required course warning */}
                                        {tp.missingRequired && (
                                            <div
                                                className={`mt-1.5 text-[11px] ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                                                {locale === "zh"
                                                    ? `⚠ 缺少必修：${tp.missingRequired}`
                                                    : `⚠ Missing: ${tp.missingRequired}`}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Content>
                    </Island>

                    {/* ===== Detail query ===== */}
                    <Island className={`${bgCard}`}>
                        <Header border>
              <span className={`text-sm font-semibold ${textDark}`}>
                {locale === "zh" ? "模块级详细查询" : "Module-Level Detail Query"}
              </span>
                        </Header>
                        <Content>
                            <div className="px-4 py-3 flex flex-col gap-3">
                                {/* Industrial Engineering (III类 模块9-13) */}
                                <div className={`rounded-lg border p-3 ${borderCls}`}>
                                    <div className={`text-xs font-semibold mb-2 ${textDark}`}>
                                        {locale === "zh" ? "工业工程 (III类 模块9-13)" : "Industrial Eng. (Type III, Modules 9-13)"}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-36">
                                            <Select
                                                data={trackDetailOptions.ie}
                                                selected={trackDetailOptions.ie.find((o) => o.key === (selectedModules["IE"]?.toString() ?? "all")) ?? trackDetailOptions.ie[0]}
                                                onSelect={(opt) => {
                                                    if (opt) setSelectedModules((p) => ({
                                                        ...p,
                                                        IE: parseInt(opt.key as string, 10)
                                                    }));
                                                }}
                                                label=""
                                            />
                                        </div>
                                    </div>
                                    {selectedModules["IE"] ? (
                                        (() => {
                                            const m = selectedModules["IE"]!;
                                            const info = moduleGroupInfo.get(m);
                                            if (!info) return <div
                                                className={`text-xs ${textMuted}`}>{locale === "zh" ? "无数据" : "No data"}</div>;
                                            const aGp = groupProgress(info.aGroupId, locale === "zh" ? "A课组" : "Group A");
                                            const bGp = groupProgress(info.bGroupId, locale === "zh" ? "B课组" : "Group B");
                                            return (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-[11px] w-12 ${textBody}`}>{aGp.label}</span>
                                                        <div className="flex-1 h-2 rounded-full overflow-hidden"
                                                             style={{background: progressBgCss}}>
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${aGp.pct}%`,
                                                                background: progressFillCss
                                                            }}/>
                                                        </div>
                                                        <span
                                                            className={`text-[11px] w-20 text-right ${textMuted}`}>{aGp.takenCredits}/{aGp.totalCredits} 学分</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-[11px] w-12 ${textMuted}`}>{bGp.label}</span>
                                                        <div className="flex-1 h-2 rounded-full overflow-hidden"
                                                             style={{background: progressBgCss}}>
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${bGp.pct}%`,
                                                                background: progressSubFillCss
                                                            }}/>
                                                        </div>
                                                        <span
                                                            className={`text-[11px] w-20 text-right ${textMuted}`}>{bGp.takenCredits}/{bGp.totalCredits} 学分</span>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className={`text-[11px] ${textMuted}`}>
                                            {locale === "zh" ? "请选择一个模块查看详情" : "Select a module to view details"}
                                        </div>
                                    )}
                                </div>

                                {/* Software Engineering (II类 模块4-8) */}
                                <div className={`rounded-lg border p-3 ${borderCls}`}>
                                    <div className={`text-xs font-semibold mb-2 ${textDark}`}>
                                        {locale === "zh" ? "软件工程 (II类 模块4-8)" : "Software Eng. (Type II, Modules 4-8)"}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-36">
                                            <Select
                                                data={trackDetailOptions.se}
                                                selected={trackDetailOptions.se.find((o) => o.key === (selectedModules["SE"]?.toString() ?? "all")) ?? trackDetailOptions.se[0]}
                                                onSelect={(opt) => {
                                                    if (opt) setSelectedModules((p) => ({
                                                        ...p,
                                                        SE: parseInt(opt.key as string, 10)
                                                    }));
                                                }}
                                                label=""
                                            />
                                        </div>
                                    </div>
                                    {selectedModules["SE"] ? (
                                        (() => {
                                            const m = selectedModules["SE"]!;
                                            const info = moduleGroupInfo.get(m);
                                            if (!info) return <div
                                                className={`text-xs ${textMuted}`}>{locale === "zh" ? "无数据" : "No data"}</div>;
                                            const aGp = groupProgress(info.aGroupId, locale === "zh" ? "A课组" : "Group A");
                                            const bGp = groupProgress(info.bGroupId, locale === "zh" ? "B课组" : "Group B");
                                            return (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-[11px] w-12 ${textBody}`}>{aGp.label}</span>
                                                        <div className="flex-1 h-2 rounded-full overflow-hidden"
                                                             style={{background: progressBgCss}}>
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${aGp.pct}%`,
                                                                background: progressFillCss
                                                            }}/>
                                                        </div>
                                                        <span
                                                            className={`text-[11px] w-20 text-right ${textMuted}`}>{aGp.takenCredits}/{aGp.totalCredits} 学分</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-[11px] w-12 ${textMuted}`}>{bGp.label}</span>
                                                        <div className="flex-1 h-2 rounded-full overflow-hidden"
                                                             style={{background: progressBgCss}}>
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${bGp.pct}%`,
                                                                background: progressSubFillCss
                                                            }}/>
                                                        </div>
                                                        <span
                                                            className={`text-[11px] w-20 text-right ${textMuted}`}>{bGp.takenCredits}/{bGp.totalCredits} 学分</span>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className={`text-[11px] ${textMuted}`}>
                                            {locale === "zh" ? "请选择一个模块查看详情" : "Select a module to view details"}
                                        </div>
                                    )}
                                </div>

                                {/* Module 1 detail (AE/EM share this) */}
                                <div className={`rounded-lg border p-3 ${borderCls}`}>
                                    <div className={`text-xs font-semibold mb-2 ${textDark}`}>
                                        {locale === "zh" ? "I类基础加强 (模块1-3)" : "Type I Core (Modules 1-3)"}
                                    </div>
                                    <div className="space-y-1.5">
                                        {[1, 2, 3].map((modId) => {
                                            const info = moduleGroupInfo.get(modId);
                                            if (!info) return null;
                                            const aGp = groupProgress(info.aGroupId, `${locale === "zh" ? "模块" : "Module "}${modId}A`);
                                            const bGp = groupProgress(info.bGroupId, `${locale === "zh" ? "模块" : "Module "}${modId}B`);
                                            return (
                                                <div key={modId}>
                                                    <div className={`text-[11px] font-medium mb-0.5 ${textDark}`}>
                                                        {locale === "zh" ? `模块${modId}` : `Module ${modId}`}
                                                        {modId === 1 && (
                                                            <span className={`ml-2 text-[10px] ${textMuted}`}>
                                ({locale === "zh" ? "AE/EM 必修" : "AE/EM Required"})
                              </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-2">
                                                        <span
                                                            className={`text-[11px] w-14 ${textBody}`}>{aGp.label}</span>
                                                        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                                                             style={{background: progressBgCss}}>
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${aGp.pct}%`,
                                                                background: progressFillCss
                                                            }}/>
                                                        </div>
                                                        <span
                                                            className={`text-[10px] w-16 text-right ${textMuted}`}>{aGp.takenCredits}/{aGp.totalCredits}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-2">
                                                        <span
                                                            className={`text-[11px] w-14 ${textMuted}`}>{bGp.label}</span>
                                                        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                                                             style={{background: progressBgCss}}>
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${bGp.pct}%`,
                                                                background: progressSubFillCss
                                                            }}/>
                                                        </div>
                                                        <span
                                                            className={`text-[10px] w-16 text-right ${textMuted}`}>{bGp.takenCredits}/{bGp.totalCredits}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(() => {
                                        const hasEM = allSelectedIds.has("30310084");
                                        return (
                                            <div
                                                className={`mt-2 text-[11px] ${hasEM ? "text-green-500" : isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                                                {locale === "zh"
                                                    ? `${hasEM ? "✅" : "⚠"} 弹性力学：${hasEM ? "已选" : "未选（工程力学必修）"}`
                                                    : `${hasEM ? "✅" : "⚠"} Elastic Mechanics: ${hasEM ? "Selected" : "Missing (EM Required)"}`}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </Content>
                    </Island>
                </>
            )}

            {/* ===== Placeholder for other tools ===== */}
            <div className="flex gap-3">
                <Island className={`flex-1 ${bgCard}`}>
                    <Header border>
            <span className={`text-sm font-semibold ${textDark}`}>
              {locale === "zh" ? "课程推荐 AI 助手" : "AI Course Assistant"}
            </span>
                    </Header>
                    <Content>
                        <div className={`px-4 py-3 text-xs ${textMuted}`}>
                            {locale === "zh" ? "此功能正在开发中，敬请期待。" : "Coming soon."}
                        </div>
                    </Content>
                </Island>
                <Island className={`flex-1 ${bgCard}`}>
                    <Header border>
            <span className={`text-sm font-semibold ${textDark}`}>
              {locale === "zh" ? "课程评价" : "Course Reviews"}
            </span>
                    </Header>
                    <Content>
                        <div className={`px-4 py-3 text-xs ${textMuted}`}>
                            {locale === "zh" ? "此功能正在开发中，敬请期待。" : "Coming soon."}
                        </div>
                    </Content>
                </Island>
            </div>
        </div>
    );
};