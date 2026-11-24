type AnalysisMessage = { id: string; content: string; timestamp: string };

/** Includes edits and deletions as well as newly appended messages. */
export function messageFingerprint(messages: AnalysisMessage[]): string {
  const text = JSON.stringify(messages.map(({ id, content, timestamp }) => [id, content, timestamp]));
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${messages.length}:${text.length}:${hash >>> 0}`;
}

export function isReusableAnalysis(result: { mode?: string; sourceMessageFingerprint?: string } | null | undefined, fingerprint: string) {
  return result?.mode === 'ai' && result.sourceMessageFingerprint === fingerprint;
}
