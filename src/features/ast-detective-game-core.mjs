export function selectChallenge(questions, { topic = "Random", difficulty = "Mixed", size = 1, recentIds = [], random = Math.random } = {}) {
  const eligible = questions.filter((question) => (topic === "Random" || question.topic === topic) && (difficulty === "Mixed" || question.difficulty === difficulty));
  const fresh = eligible.filter((question) => !recentIds.includes(question.id));
  const recent = eligible.filter((question) => recentIds.includes(question.id));
  return [...shuffle(fresh, random), ...shuffle(recent, random)].slice(0, Math.min(size, eligible.length));
}
function shuffle(items, random) { const copy = [...items]; for (let index = copy.length - 1; index > 0; index -= 1) { const swap = Math.floor(random() * (index + 1)); [copy[index], copy[swap]] = [copy[swap], copy[index]]; } return copy; }
export function calculateScore(results) { const correct = results.filter((result) => result.correct).length; return { correct, total: results.length, percent: results.length ? Math.round((correct / results.length) * 100) : 0 }; }
export function updateStreak({ current = 0, best = 0 }, correct) { const nextCurrent = correct ? current + 1 : 0; return { current: nextCurrent, best: Math.max(best, nextCurrent) }; }
export function summarizeSession(results) { const topics = new Map(); for (const result of results) { const entry = topics.get(result.question.topic) || { correct: 0, total: 0 }; entry.total += 1; if (result.correct) entry.correct += 1; topics.set(result.question.topic, entry); } const strengths = [], review = []; for (const [topic, value] of topics) (value.correct / value.total >= 0.75 ? strengths : review).push(topic); return { ...calculateScore(results), strengths, review }; }
