export enum QuestionType {
  SINGLE = 'single', // Deprecated in UI but kept for type safety if needed, mapped to multi logic
  MULTI = 'multi',
  TEXT = 'text',
  MATRIX_SINGLE = 'matrix_single', // Deprecated in UI
  MATRIX_MULTI = 'matrix_multi', // New standard for matrices
}

export interface QuestionOption {
  value: string;
  label: string;
  isOther?: boolean; // triggers a text input
}

export interface Question {
  id: number;
  label: string;
  type: QuestionType;
  options?: QuestionOption[];
  rows?: string[];
  cols?: string[];
  subLabel?: string;
}

export interface SurveyAnswer {
  // Now simpler: mostly string[] or Record<string, string[]>
  [key: string]: string | string[] | Record<string, string[]>;
}

export interface CompletedSurvey {
  id: string;
  timestamp: number;
  answers: SurveyAnswer;
  synced?: boolean;
}