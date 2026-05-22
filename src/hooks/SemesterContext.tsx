import {createContext, useContext, useState, type ReactNode} from "react";

const ALL_SEMESTERS = [
  "大一·开学前（军训）",
  "大一·秋季",
  "大一·春季",
  "大一·夏季",
  "大二·秋季",
  "大二·春季",
  "大二·夏季",
  "大三·秋季",
  "大三·春季",
  "大三·夏季",
  "大四·秋季",
  "大四·春季",
] as const;

export type Semester = (typeof ALL_SEMESTERS)[number];

interface SemesterContextType {
  semester: Semester;
  setSemester: (s: Semester) => void;
  allSemesters: readonly Semester[];
}

const SemesterContext = createContext<SemesterContextType | null>(null);

export const SemesterProvider = ({children}: {children: ReactNode}) => {
  const [semester, setSemester] = useState<Semester>("大一·开学前（军训）");
  return (
    <SemesterContext.Provider value={{semester, setSemester, allSemesters: ALL_SEMESTERS}}>
      {children}
    </SemesterContext.Provider>
  );
};

export const useSemester = (): SemesterContextType => {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error("useSemester must be used within SemesterProvider");
  return ctx;
};