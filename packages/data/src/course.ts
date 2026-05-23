import {supabase} from "./supabase.js";
import type {Course, Module, Group, ChoiceSet, CourseCoursePrereq, CourseChoiceSetPrereq} from "./model.js";

export interface CourseData {
    modules: Module[];
    groups: Record<number, Group>;
    choiceSets: Record<number, ChoiceSet>;
    courses: Record<number, Course>;
    prereqs: CourseCoursePrereq[];
    prereqChoiceSets: CourseChoiceSetPrereq[];
}

export async function fetchCourseData(): Promise<CourseData> {
    const [modulesRes, groupsRes, choiceSetsRes, coursesRes, prereqsRes, prereqChoiceSetsRes] = await Promise.all([
        supabase.from("modules").select("module_id, name, description").order("module_id"),
        supabase.from("course_groups").select("group_id, module_id, group_code, name, group_courses(course_id), choice_sets(set_id)"),
        supabase.from("choice_sets").select("set_id, name, min_select, max_select, group_id, choice_set_courses(course_id)"),
        supabase.from("courses").select("*"),
        supabase.from("course_prerequisites").select("course_id, prereq_course_id"),
        supabase.from("course_prereq_choice_sets").select("course_id, prereq_choice_set"),
    ]);

    const modules = (modulesRes.data ?? [])
    const groupsRows = (groupsRes.data ?? [])
    const choiceSetsRows = (choiceSetsRes.data ?? [])

    return {
        modules: modules.map((m) => {
            const cgs = groupsRows.filter((g) => g.module_id === m.module_id);
            return {
                module_id: m.module_id,
                name: m.name,
                description: m.description,
                sub_group_ids: cgs.map((g) => g.group_id),
            };
        }),
        groups: Object.fromEntries(
            groupsRows.map((g) => {
                const gcs = g.group_courses
                const css = g.choice_sets
                return [g.group_id, {
                    group_id: g.group_id,
                    module_id: g.module_id,
                    group_code: g.group_code,
                    name: g.name,
                    course_ids: (gcs).map((gc) => gc.course_id),
                    choice_set_ids: (css).map((cs) => cs.set_id),
                }];
            }),
        ),
        choiceSets: Object.fromEntries(
            choiceSetsRows.map((cs) => {
                const cscs = cs.choice_set_courses;
                return [cs.set_id, {
                    set_id: cs.set_id,
                    name: cs.name,
                    min_select: cs.min_select,
                    max_select: cs.max_select,
                    group_id: cs.group_id,
                    course_ids: (cscs).map((csc) => csc.course_id),
                }];
            }),
        ) as Record<number, ChoiceSet>,
        courses: Object.fromEntries(
            ((coursesRes.data ?? []) as Course[]).map((c) => [c.course_id, c]),
        ) as Record<string, Course>,
        prereqs: (prereqsRes.data ?? []) as CourseCoursePrereq[],
        prereqChoiceSets: (prereqChoiceSetsRes.data ?? []) as CourseChoiceSetPrereq[],
    };
}
