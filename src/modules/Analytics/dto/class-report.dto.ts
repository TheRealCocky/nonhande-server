export class StudentReportDto {
  name: string;
  xp: number;
  streak: number;
  successRate: number;
  wordsMastered: number;
  aiInteractions: number;
}

export class ClassGlobalStatsDto {
  totalStudents: number;
  averageXp: number;
  mostDifficultLesson: string;
  topStudents: StudentReportDto[];
}