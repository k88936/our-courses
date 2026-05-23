import {supabase} from "./supabase.js";
import type {Seminar, CourseIdToSeminarIdMap} from "./model.js";

export interface TeachingPlanData {
    seminars: Seminar[];
    courseToSeminar: CourseIdToSeminarIdMap;
}

export async function fetchTeachingPlanData(): Promise<TeachingPlanData> {
    const [semestersRes] = await Promise.all([
        supabase.from("semesters")
            .select("semester_id, season, year_rank, course_recommended_semesters(course_id)"),
    ]);

    const rows = (semestersRes.data ?? []);

    const seminars: Seminar[] = rows.map((s) => ({
        semester_id: s.semester_id,
        season: s.season,
        year_rank: s.year_rank,
        course_ids: s.course_recommended_semesters.map(c=>c.course_id),
    }));

    const courseToSeminar: CourseIdToSeminarIdMap = {};
    for (const sem of seminars) {
        for (const cid of sem.course_ids) {
            courseToSeminar[cid] = sem;
        }
    }

    return {seminars, courseToSeminar};
}
