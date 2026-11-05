import { Task, User } from '../types';

export interface MemberMatch {
  member: User;
  matchedSkills: string[];
  openTasks: number;
  score: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();

function skillMatches(memberSkill: string, wanted: string): boolean {
  const a = norm(memberSkill);
  const b = norm(wanted);
  if (!a || !b) return false;
  if (a === b) return true;
  // "scikit-learn" vs "scikit learn", "python" vs "python scripting"
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

/**
 * Rank team members for a piece of work.
 *
 * - If the task lists required skills, members are matched against those.
 * - Otherwise each member's skills are looked for in the task's title/description.
 * - Members with more open tasks are ranked lower, so work is spread out.
 *
 * Only members with at least one matching skill are returned.
 */
export function rankMembersForTask(
  work: { title?: string; description?: string; recommendedSkills?: string[]; tags?: string[] },
  members: User[],
  allTasks: Task[]
): MemberMatch[] {
  const wanted = [...(work.recommendedSkills || []), ...(work.tags || [])].filter(Boolean);
  const text = ` ${norm(`${work.title || ''} ${work.description || ''}`)} `;

  return members
    .map((member) => {
      const skills = member.skills || [];
      const matched = new Set<string>();

      for (const skill of skills) {
        if (wanted.some((w) => skillMatches(skill, w))) {
          matched.add(skill);
        } else {
          const s = norm(skill);
          if (s.length >= 2 && text.includes(` ${s} `)) matched.add(skill);
        }
      }

      const openTasks = allTasks.filter(
        (t) => t.assigneeId === member.id && !t.completed && t.status !== 'completed'
      ).length;

      return {
        member,
        matchedSkills: Array.from(matched),
        openTasks,
        score: matched.size * 10 - openTasks * 2,
      };
    })
    .filter((m) => m.matchedSkills.length > 0)
    .sort((a, b) => b.score - a.score || a.openTasks - b.openTasks);
}
