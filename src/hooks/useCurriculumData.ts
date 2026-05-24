import { useState, useEffect } from "react";
import { fetchCourseData } from "@our-courses/data/course";
import { fetchDegreeData } from "@our-courses/data/degree_track";
import { fetchTeachingPlanData } from "@our-courses/data/teach_plan";
import type { CourseData } from "@our-courses/data/course";
import type { DegreeData } from "@our-courses/data/degree_track";
import type { TeachingPlanData } from "@our-courses/data/teach_plan";

export interface AllData {
  courseData: CourseData;
  degreeData: DegreeData;
  teachPlanData: TeachingPlanData;
}

let dataCache: AllData | null = null;
let dataPromise: Promise<AllData> | null = null;

async function fetchAllData(): Promise<AllData> {
  if (dataCache) return dataCache;
  if (!dataPromise) {
    dataPromise = Promise.all([
      fetchCourseData(),
      fetchDegreeData(),
      fetchTeachingPlanData(),
    ]).then(([courseData, degreeData, teachPlanData]) => {
      const all: AllData = { courseData, degreeData, teachPlanData };
      dataCache = all;
      return all;
    });
  }
  return dataPromise;
}

export function useCurriculumData() {
  const [data, setData] = useState<AllData | null>(dataCache);
  const [loading, setLoading] = useState(!dataCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (dataCache) return;
    let cancelled = false;
    fetchAllData()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}