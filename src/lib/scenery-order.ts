/** Move to the target's position, without mutating the persisted input list. */
export function reorderScenery(ids: readonly string[], sourceId: string, targetId: string): string[] {
  const from = ids.indexOf(sourceId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to || new Set(ids).size !== ids.length) return [...ids];
  const result = [...ids];
  result.splice(from, 1); result.splice(to, 0, sourceId);
  return result;
}
