import type {Database} from "./database.types";

// basic concepts
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Group = Database["public"]["Tables"]["course_groups"]["Row"] & {
    course_ids: number[];
    choice_set_ids: number[];
}
export type ChoiceSet = Database["public"]["Tables"]["choice_sets"]["Row"] & {
    course_ids: number [];
}
export type Module = Database["public"]["Tables"]["modules"]["Row"] & {
    sub_group_ids: number[];
}
export type DegreeTrack = Database["public"]["Tables"]["degree_tracks"]["Row"] & {
    req_course_ids: number[];
    req_choice_sets: { set_id: number, min_select_override: number | null, max_select_override: number | null }[];
    req_main_group_ids: number[];
    req_group_ids: number[];
};

export type Seminar = Database["public"]["Tables"]["semesters"]["Row"] & {
    course_ids: number[];
}

// course prereq conditions make it separate from Course for easyness of Course type
export type CourseCoursePrereq = Database["public"]["Tables"]["course_prerequisites"]["Row"]
export type CourseChoiceSetPrereq = Database["public"]["Tables"]["course_prereq_choice_sets"]["Row"];

// for course to seminar inverse loop up
export type CourseIdToSeminarIdMap = Record<number, Seminar>