import type {Database} from "../src/database.types";
import {supabase} from "../src/utils/supabase";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type GroupCourse = Database["public"]["Tables"]["group_courses"]["Row"] & {
    courses: Course | null;
};
type ChoiceSet = Database["public"]["Tables"]["choice_sets"]["Row"];
type ChoiceSetCourse = Database["public"]["Tables"]["choice_set_courses"]["Row"];
type CourseGroup = Database["public"]["Tables"]["course_groups"]["Row"];
type DegreeTrack = Database["public"]["Tables"]["degree_tracks"]["Row"];
type DegreeGroupReq = Database["public"]["Tables"]["degree_group_requirements"]["Row"] & {
    course_groups: CourseGroup | null;
};
type DegreeCourseReq = Database["public"]["Tables"]["degree_course_requirements"]["Row"] & {
    courses: Course | null;
};
type DegreeChoiceReq = Database["public"]["Tables"]["degree_choice_requirements"]["Row"] & {
    choice_sets: (ChoiceSet & {
        choice_set_courses: (ChoiceSetCourse & { courses: Course | null })[];
    }) | null;
};
type CoursePrereq = Database["public"]["Tables"]["course_prerequisites"]["Row"] & {
    courses: Course | null;
    prereq: Course | null;
};
type CoursePrereqChoiceSet = Database["public"]["Tables"]["course_prereq_choice_sets"]["Row"] & {
    courses: Course | null;
    choice_sets: (ChoiceSet & {
        choice_set_courses: (ChoiceSetCourse & { courses: Course | null })[];
    }) | null;
};

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

function printChoiceSetRow(
    set: ChoiceSet & {
        courses: (ChoiceSetCourse & { course: Course | null })[];
    },
) {
    const ids = set.courses.map((c) => c.course?.course_id ?? "").join(" / ");
    const names = set.courses.map((c) => c.course?.name ?? "").join(" / ");
    const credits = set.courses
        .map((c) => String(c.course?.credits ?? ""))
        .join("/");
    const types = [...new Set(set.courses.map((c) => c.course?.module_type ?? "").filter(Boolean))].join("/");
    printLine(ids, names, credits, types, set.name);
}

async function fetchAll() {
    const [modules, groups, groupCourses, choiceSets, choiceSetCourses] =
        await Promise.all([
            supabase.from("modules").select("*").order("module_id"),
            supabase.from("course_groups").select("*"),
            supabase
                .from("group_courses")
                .select("*, courses(*)")
                .order("course_id"),
            supabase.from("choice_sets").select("*"),
            supabase
                .from("choice_set_courses")
                .select("*, courses(*)"),
        ]);

    return {
        modules: modules.data ?? [],
        groups: groups.data ?? [],
        groupCourses: groupCourses.data ?? [],
        choiceSets: choiceSets.data ?? [],
        choiceSetCourses: choiceSetCourses.data ?? [],
    };
}

async function fetchDegreeData() {
    const [tracks, groupReqs, courseReqs, choiceReqs, prereqs, prereqChoiceSets] = await Promise.all([
        supabase.from("degree_tracks").select("*").order("track_code"),
        supabase.from("degree_group_requirements")
            .select("*, course_groups(*)"),
        supabase.from("degree_course_requirements")
            .select("*, courses(*)"),
        supabase.from("degree_choice_requirements")
            .select("*, choice_sets(*, choice_set_courses(*, courses(*)))"),
        supabase.from("course_prerequisites")
            .select("*, courses!course_prerequisites_course_id_fkey(*), prereq:course_prerequisites_prereq_course_id_fkey(*)"),
        supabase.from("course_prereq_choice_sets")
            .select("*, courses(*), choice_sets(*, choice_set_courses(*, courses(*)))"),
    ]);

    return {
        tracks: (tracks.data ?? []) as DegreeTrack[],
        groupReqs: (groupReqs.data ?? []) as DegreeGroupReq[],
        courseReqs: (courseReqs.data ?? []) as DegreeCourseReq[],
        choiceReqs: (choiceReqs.data ?? []) as DegreeChoiceReq[],
        prereqs: (prereqs.data ?? []) as CoursePrereq[],
        prereqChoiceSets: (prereqChoiceSets.data ?? []) as CoursePrereqChoiceSet[],
    };
}

function processGroupCourses(
    groupId: number,
    allGroupCourses: GroupCourse[],
    allChoiceSets: ChoiceSet[],
    allChoiceSetCourses: (ChoiceSetCourse & { courses: Course | null })[],
) {
    const gc = allGroupCourses.filter((g) => g.group_id === groupId);
    const sets = allChoiceSets
        .filter((s) => s.group_id === groupId)
        .map((s) => ({
            ...s,
            courses: allChoiceSetCourses
                .filter((csc) => csc.set_id === s.set_id)
                .map((csc) => ({
                    ...csc,
                    course: csc.courses,
                })),
        }));

    const setCourseIds = new Set(
        sets.flatMap((s) => s.courses.map((c) => c.course_id)),
    );

    const individual = gc.filter((g) => !setCourseIds.has(g.course_id));

    return {individual, sets};
}

function printDegreeTracks(
    tracks: DegreeTrack[],
    groupReqs: DegreeGroupReq[],
    courseReqs: DegreeCourseReq[],
    choiceReqs: DegreeChoiceReq[],
) {
    console.log(`\n课程要求\n`);

    for (const track of tracks) {
        const reqGroups = groupReqs.filter((r) => r.track_code === track.track_code);
        const reqCourses = courseReqs.filter((r) => r.track_code === track.track_code);
        const reqChoices = choiceReqs.filter((r) => r.track_code === track.track_code);

        const byModule = new Map<number, { name: string; isMain: boolean }[]>();
        for (const rg of reqGroups) {
            const g = rg.course_groups;
            if (!g) continue;
            const modId = g.module_id ?? 0;
            if (!byModule.has(modId)) byModule.set(modId, []);
            byModule.get(modId)!.push({
                name: g.name,
                isMain: rg.is_main ?? false,
            });
        }

        const sortedModIds = [...byModule.keys()].sort((a, b) => a - b);

        const lines: string[] = [];

        // Module range line
        const mainGroups = sortedModIds.flatMap((m) =>
            byModule.get(m)!.filter((g) => g.isMain).map((g) => g.name),
        );
        const electGroups = sortedModIds.flatMap((m) =>
            byModule.get(m)!.filter((g) => !g.isMain).map((g) => g.name),
        );

        if (sortedModIds.length > 0 && sortedModIds[0] !== 0) {
            const modRange = sortedModIds.length === 1
                ? `模块 ${sortedModIds[0]}`
                : `模块 ${sortedModIds[0]}-${sortedModIds[sortedModIds.length - 1]}`;
            lines.push(`可选${modRange}，必修课组：${mainGroups.join("、")}；选修课组：${electGroups.join("、")}`);
        } else {
            if (mainGroups.length > 0)
                lines.push(`必修课组：${mainGroups.join("、")}`);
            if (electGroups.length > 0)
                lines.push(`选修课组：${electGroups.join("、")}`);
        }

        // Required courses
        for (const rc of reqCourses) {
            if (rc.courses) {
                lines.push(`必修课程：${rc.courses.name}（${rc.course_id}）`);
            }
        }

        // Choice constraints
        for (const rc of reqChoices) {
            const cs = rc.choice_sets;
            if (cs && cs.choice_set_courses.length > 0) {
                const courseList = cs.choice_set_courses
                    .map((csc) => csc.courses?.name ?? csc.course_id)
                    .join("、");
                const minSelect = rc.min_select_override ?? cs.min_select;
                const maxSelect = rc.max_select_override ?? cs.max_select;
                lines.push(
                    `选课限制：在「${cs.name}」中${minSelect === maxSelect ? `必修 ${minSelect} 门` : `至少选 ${minSelect} 门，至多选 ${maxSelect} 门`}：${courseList}`,
                );
            } else if (cs) {
                const minSelect = rc.min_select_override ?? cs.min_select;
                const maxSelect = rc.max_select_override ?? cs.max_select;
                lines.push(
                    `选课限制：在「${cs.name}」中${minSelect === maxSelect ? `必修 ${minSelect} 门` : `至少选 ${minSelect} 门，至多选 ${maxSelect} 门`}`,
                );
            }
        }

        console.log(`${track.name}（共 ${track.total_credits_required} 学分）`);
        for (const line of lines) {
            console.log(`  ${line}`);
        }
        console.log("");
    }
}

function buildPrereqMap(
    prereqs: CoursePrereq[],
    prereqChoiceSets: CoursePrereqChoiceSet[],
) {
    const map = new Map<string, string>();
    const byCourse = new Map<string, string[]>();
    for (const p of prereqs) {
        const courseId = p.course_id;
        const prereqName = p.prereq?.name ?? p.prereq_course_id;
        const prereqId = p.prereq_course_id;
        if (!byCourse.has(courseId)) byCourse.set(courseId, []);
        byCourse.get(courseId)!.push(`${prereqName}（${prereqId}）`);
    }
    for (const pcs of prereqChoiceSets) {
        const courseId = pcs.course_id;
        const cs = pcs.choice_sets;
        if (!cs || cs.choice_set_courses.length === 0) continue;
        const options = cs.choice_set_courses
            .map((csc) => `${csc.courses?.name ?? csc.course_id}（${csc.course_id}）`)
            .join(" / ");
        if (!byCourse.has(courseId)) byCourse.set(courseId, []);
        byCourse.get(courseId)!.push(`${cs.name}（${options}）`);
    }
    for (const [courseId, list] of byCourse) {
        map.set(courseId, `需先修：${list.join("、")}`);
    }
    return map;
}

async function print_all() {
    const {modules, groups, groupCourses, choiceSets, choiceSetCourses} =
        await fetchAll();
    const {tracks, groupReqs, courseReqs, choiceReqs, prereqs, prereqChoiceSets} = await fetchDegreeData();
    const prereqMap = buildPrereqMap(prereqs, prereqChoiceSets);

    const modGroups = groups.filter((g) => g.module_id !== null);
    const foundationGroups = groups.filter((g) => g.module_id === null);

    for (const mod of modules) {
        console.log(`\n模块 ${mod.module_id}：${mod.name}`);

        const mg = modGroups
            .filter((g) => g.module_id === mod.module_id)
            .sort((a, b) => a.group_code.localeCompare(b.group_code));

        for (const group of mg) {
            const {individual, sets} = processGroupCourses(
                group.group_id,
                groupCourses,
                choiceSets,
                choiceSetCourses,
            );
            if (individual.length === 0 && sets.length === 0) continue;

            console.log(`\n${group.name}`);
            console.log("");
            printTableHeader();

            for (const s of sets) {
                if (s.courses.length > 0) printChoiceSetRow(s);
            }
            for (const g of individual) {
                if (g.courses) {
                    const note = [g.note ?? "", prereqMap.get(g.courses.course_id) ?? ""].filter(Boolean).join("，");
                    const type = g.courses.module_type ?? "";
                    printLine(g.courses.course_id, g.courses.name, String(g.courses.credits), type, note);
                }
            }
        }
    }

    for (const group of foundationGroups) {
        const {individual, sets} = processGroupCourses(
            group.group_id,
            groupCourses,
            choiceSets,
            choiceSetCourses,
        );
        if (individual.length === 0 && sets.length === 0) continue;

        console.log(`\n${group.name}`);
        console.log("");
        printTableHeader();

        for (const s of sets) {
            if (s.courses.length > 0) printChoiceSetRow(s);
        }
        for (const g of individual) {
            if (g.courses) {
                const note = [g.note ?? "", prereqMap.get(g.courses.course_id) ?? ""].filter(Boolean).join("，");
                const type = g.courses.module_type ?? "";
                printLine(g.courses.course_id, g.courses.name, String(g.courses.credits), type, note);
            }
        }
    }

    printDegreeTracks(tracks, groupReqs, courseReqs, choiceReqs);
}

print_all();
