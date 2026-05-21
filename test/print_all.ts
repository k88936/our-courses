import {createClient} from "@supabase/supabase-js";
import type {Database} from "../src/database.types";
import {supabase} from "../src/utils/supabase";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type GroupCourse = Database["public"]["Tables"]["group_courses"]["Row"] & {
    courses: Course | null;
};
type ChoiceSet = Database["public"]["Tables"]["choice_sets"]["Row"];
type ChoiceSetCourse = Database["public"]["Tables"]["choice_set_courses"]["Row"];
const COL_WIDTHS = {id: 35, name: 50, credits: 8};

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
    note: string,
) {
    console.log(
        pad(ids, COL_WIDTHS.id) +
        pad(names, COL_WIDTHS.name) +
        pad(credits, COL_WIDTHS.credits) +
        note,
    );
}

function printTableHeader() {
    printLine("课程编号", "课程名称", "学分", "备注");
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
    printLine(ids, names, credits, set.name);
}

async function fetchAll(supabase: ReturnType<typeof createClient<Database>>) {
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

async function print_all() {
    const {modules, groups, groupCourses, choiceSets, choiceSetCourses} =
        await fetchAll(supabase);

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
                    const note = g.note ?? "";
                    printLine(g.courses.course_id, g.courses.name, String(g.courses.credits), note);
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
                const note = g.note ?? "";
                printLine(g.courses.course_id, g.courses.name, String(g.courses.credits), note);
            }
        }
    }
}
print_all()