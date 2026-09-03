import type { AstDetectiveQuestion, AstDetectiveDifficulty, AstDetectiveTopic } from "../data/types";
export type GameResult = { question: AstDetectiveQuestion; correct: boolean };
export function selectChallenge(questions: AstDetectiveQuestion[], options?: { topic?: "Random" | AstDetectiveTopic; difficulty?: "Mixed" | AstDetectiveDifficulty; size?: number; recentIds?: string[]; random?: () => number }): AstDetectiveQuestion[];
export function calculateScore(results: GameResult[]): { correct: number; total: number; percent: number };
export function updateStreak(streak: { current: number; best: number }, correct: boolean): { current: number; best: number };
export function summarizeSession(results: GameResult[]): { correct: number; total: number; percent: number; strengths: string[]; review: string[] };
