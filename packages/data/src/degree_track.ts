import {supabase} from "./supabase.js";
import type {DegreeTrack} from "./model.js";

export interface DegreeData {
    tracks: DegreeTrack[];
}

export async function fetchDegreeData(): Promise<DegreeData> {
    const [tracksRes] = await Promise.all([
        supabase.from("degree_tracks")
            .select("track_code, name, total_credits_required, description, degree_group_requirements(group_id, is_main), degree_course_requirements(course_id), degree_choice_requirements(min_select_override,max_select_override,set_id)")
            .order("track_code"),
    ]);

    const rows = (tracksRes.data ?? []);

    return {
        tracks: rows.map((t) => {
            const reqGroupIds: number[] = [];
            const reqMainGroupIds: number[] = [];
            for (const gr of (t.degree_group_requirements)) {
                if (gr.group_id == null) continue;
                reqGroupIds.push(gr.group_id);
                if (gr.is_main) reqMainGroupIds.push(gr.group_id);
            }

            return {
                track_code: t.track_code as string,
                name: t.name as string,
                total_credits_required: t.total_credits_required,
                description: t.description,
                req_course_ids: (t.degree_course_requirements).map(c => c.course_id),
                req_choice_sets: (t.degree_choice_requirements).map(c => ({
                    set_id: c.set_id,
                    min_select_override: c.min_select_override,
                    max_select_override: c.max_select_override,
                })),
                req_main_group_ids: reqMainGroupIds,
                req_group_ids: reqGroupIds,
            };
        }),
    };
}
