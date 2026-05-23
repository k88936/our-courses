import {fetchCourseData} from "../src/course";
import {fetchDegreeData} from "../src/degree_track";
import {fetchTeachingPlanData} from "../src/teach_plan";
import type {
    Course, Group, ChoiceSet,
    CourseCoursePrereq, CourseChoiceSetPrereq,
} from "../src/model";

const COL_WIDTHS = {id: 35, name: 50, credits: 8, type: 8};

function visualWidth(str: string) {
    let w = 0;
    for (const ch of str) {
        w += /[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(ch) ? 2 : 1;
    }
    return w;
}

function pad(str: string, len: number) {
    const vw = visualWidth(str);
    const padding = Math.max(0, len - vw);
    return str + " ".repeat(padding);
}

function printLine(
    ids: string,
    names: string,
    credits: string,
    type: string,
    note: string,
) {
    console.log(
        pad(ids, COL_WIDTHS.id) +
        pad(names, COL_WIDTHS.name) +
        pad(credits, COL_WIDTHS.credits) +
        pad(type, COL_WIDTHS.type) +
        note,
    );
}

function printTableHeader() {
    printLine("课程编号", "课程名称", "学分", "类别", "备注");
}

const REC_COL_WIDTHS = {courseId: 35, name: 50, semester: 30};

function printRecLine(courseId: string, name: string, semester: string) {
    console.log(
        pad(courseId, REC_COL_WIDTHS.courseId) +
        pad(name, REC_COL_WIDTHS.name) +
        semester,
    );
}

function printRecHeader() {
    printRecLine("课程编号", "课程名称", "推荐学期");
}

function buildPrereqMap(
    prereqs: CourseCoursePrereq[],
    prereqChoiceSets: CourseChoiceSetPrereq[],
    courses: Record<string, Course>,
    choiceSets: Record<number, ChoiceSet>,
) {
    const byCourse = new Map<number, string[]>();
    for (const p of prereqs) {
        const name = courses[p.prereq_course_id]?.name ?? p.prereq_course_id;
        push(byCourse, p.course_id, `${name}（${p.prereq_course_id}）`);
    }
    for (const pcs of prereqChoiceSets) {
        const cs = choiceSets[pcs.prereq_choice_set];
        if (!cs || cs.course_ids.length === 0) continue;
        const options = cs.course_ids
            .map((cid) => `${courses[cid]?.name ?? cid}（${cid}）`)
            .join(" / ");
        push(byCourse, pcs.course_id, `${cs.name}（${options}）`);
    }
    const map = new Map<number, string>();
    for (const [courseId, list] of byCourse) {
        map.set(courseId, `需先修：${list.join("、")}`);
    }
    return map;
}

function push(map: Map<number, string[]>, key: number, value: string) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}

function printGroup(
    group: Group,
    choiceSets: Record<number, ChoiceSet>,
    courses: Record<string, Course>,
    prereqMap: Map<number, string>,
) {
    const g = group;
    const setList = g.choice_set_ids
        .map((sid: number) => choiceSets[sid])
        .filter(Boolean)
        .map((cs: ChoiceSet) => ({
            name: cs.name,
            courses: cs.course_ids.map((cid) => ({
                course_id: cid,
                course: courses[cid] ?? null,
            })),
        }));

    const setCourseIds = new Set(setList.flatMap((s) => s.courses.map((c) => c.course_id)));
    const individual = g.course_ids.filter((cid: number) => !setCourseIds.has(cid));

    if (individual.length === 0 && setList.length === 0) return;

    console.log(`\n${g.name}`);
    console.log("");
    printTableHeader();

    for (const cid of individual) {
        const c = courses[cid];
        const note = [prereqMap.get(cid) ?? ""].filter(Boolean).join("，");
        const type = c?.module_type ?? "";
        printLine(String(cid), c?.name ?? "", String(c?.credits ?? ""), type, note);
    }

    for (const s of setList) {
        if (s.courses.length > 0) {
            const ids = s.courses.map((c) => c.course_id).join(" / ");
            const names = s.courses.map((c) => c.course?.name ?? "").join(" / ");
            const credits = s.courses.map((c) => String(c.course?.credits ?? "")).join("/");
            const types = [...new Set(s.courses.map((c) => c.course?.module_type ?? "").filter(Boolean))].join("/");
            printLine(ids, names, credits, types, s.name);
        }
    }
}

async function main() {
    const {modules, groups, choiceSets, courses, prereqs, prereqChoiceSets} =
        await fetchCourseData();
    const prereqMap = buildPrereqMap(prereqs, prereqChoiceSets, courses, choiceSets);

    const groupsList = Object.values(groups);
    const modGroups = groupsList.filter((g) => g.module_id != null);
    const foundationGroups = groupsList.filter((g) => g.module_id == null);

    for (const mod of modules) {
        console.log(`\n模块 ${mod.module_id}：${mod.name}`);
        const mg = modGroups
            .filter((g) => mod.sub_group_ids.includes(g.group_id))
            .sort((a, b) => String(a.group_code).localeCompare(String(b.group_code)));
        for (const group of mg) {
            printGroup(group, choiceSets, courses, prereqMap);
        }
    }

    for (const group of foundationGroups) {
        printGroup(group, choiceSets, courses, prereqMap);
    }

    const {tracks} = await fetchDegreeData();
    console.log(`\n课程要求\n`);
    for (const t of tracks) {
        const lines: string[] = [];
        if (t.req_main_group_ids.length > 0)
            lines.push(`main课组：${t.req_main_group_ids.map((id) => (groups[id] as Group)?.name ?? id).join("、")}`);
        if (t.req_group_ids.length > 0)
            lines.push(`选修课组：${t.req_group_ids.map((id) => (groups[id] as Group)?.name ?? id).join("、")}`);
        for (const cid of t.req_course_ids)
            lines.push(`必修课程：${courses[cid]?.name ?? cid}（${cid}）`);
        for (const s of t.req_choice_sets) {
            const cs = choiceSets[s.set_id];
            if (cs) {
                lines.push(`选课限制：在「${cs.name}」中：at least: ${s.min_select_override ?? cs.min_select} } at most: ${s.max_select_override ?? cs.max_select}`);
            }
        }
        console.log(`${t.name}（共 ${t.total_credits_required} 学分）`);
        for (const line of lines) console.log(`  ${line}`);
        console.log("");
    }

    const {seminars} = await fetchTeachingPlanData();
    if (seminars.length > 0) {
        console.log(`\n教学计划`);
        console.log("");
        printRecHeader();
        for (const s of seminars) {
            const semLabel = `${s.season} ${s.year_rank}`;
            for (const cid of s.course_ids) {
                printRecLine(String(cid), courses[cid]?.name ?? "", semLabel);
            }
        }
    }
}

main();
