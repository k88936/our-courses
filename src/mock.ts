import type {CoursePlan} from "@thu-info/lib/src/models/cr/cr";

export type TermRecord = {
    term: string;
    courses: CoursePlan[];
};

export const pastTerms: TermRecord[] = [
    {
        term: "2024 Fall",
        courses: [
            {id: "MATH101", name: "Calculus A", property: "Major Required", credit: 4, group: "Math Foundation"},
            {id: "CS102", name: "Programming Fundamentals", property: "Major Required", credit: 3, group: "CS Core"},
            {id: "ENG103", name: "Academic English", property: "General Education", credit: 2, group: "Language"}
        ]
    },
    {
        term: "2024 Spring",
        courses: [
            {id: "PHYS110", name: "University Physics", property: "Major Required", credit: 4, group: "Science Foundation"},
            {id: "CS111", name: "Discrete Mathematics", property: "Major Required", credit: 3, group: "CS Core"},
            {id: "PE101", name: "Physical Education I", property: "General Education", credit: 1, group: "Sports"}
        ]
    },
    {
        term: "2023 Fall",
        courses: [
            {id: "CHEM100", name: "General Chemistry", property: "General Education", credit: 3, group: "Science"},
            {id: "HIST120", name: "History of Modern China", property: "General Education", credit: 2, group: "Humanity"},
            {id: "CS100", name: "Intro to Computing", property: "Major Elective", credit: 2, group: "CS Intro"}
        ]
    }
];

export const availableCourses: CoursePlan[] = [
    {id: "CS201", name: "Data Structures", property: "Major Required", credit: 3, group: "CS Core"},
    {id: "CS202", name: "Computer Organization", property: "Major Required", credit: 3, group: "CS Core"},
    {id: "MATH210", name: "Linear Algebra", property: "Major Required", credit: 3, group: "Math Foundation"},
    {id: "STAT200", name: "Probability and Statistics", property: "Major Elective", credit: 2, group: "Math Foundation"},
    {id: "ART105", name: "Visual Communication", property: "General Education", credit: 2, group: "Art"},
    {id: "PE102", name: "Physical Education II", property: "General Education", credit: 1, group: "Sports"}
];

export const initialStaging: CoursePlan[] = [
    {id: "CS201", name: "Data Structures", property: "Major Required", credit: 3, group: "CS Core"},
    {id: "MATH210", name: "Linear Algebra", property: "Major Required", credit: 3, group: "Math Foundation"}
];
