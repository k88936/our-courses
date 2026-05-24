// ---- i18n helpers (no enNames, just passthrough) ----
import {useMemo} from "react";

export function useTName() {
    return useMemo(
        () => ({
            tName: (_courseId: number | string, zhName: string) => zhName,
            tModule: (_moduleId: number, zhName: string) => zhName,
            tGroup: (_groupCode: string, zhName: string) => zhName,
            tSemester: (zhSem: string) => zhSem,
            tTrack: (_trackCode: string, zhName: string) => zhName,
        }),
        [],
    );
}