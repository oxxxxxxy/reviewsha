import type { AIReviewIssue } from '../../ai/types/ai.types';
export type ReportIssue = AIReviewIssue & {
  id: string;
  category: string;
  title: string;
  description: string;
  filePath: string;
  line?: number;
};
export type AnalysisReport = {
  version: '1.0';
  score: number;
  summary: string;
  issues: ReportIssue[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  fileReviews: Array<{ path: string; summary: string; strengths: string[]; weaknesses: string[] }>;
};
