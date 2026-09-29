import type { BotAccess } from './types';

type Rule = { directive: 'allow' | 'disallow'; path: string };
type Group = { agents: string[]; rules: Rule[] };

const botNames = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'] as const;

function parseGroups(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let sawRule = false;
  for (const original of text.split(/\r?\n/)) {
    const line = original.replace(/#.*/, '').trim();
    if (!line) continue;
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const directive = match[1].toLowerCase();
    const value = match[2].trim();
    if (directive === 'user-agent') {
      if (!current || sawRule) { current = { agents: [], rules: [] }; groups.push(current); sawRule = false; }
      if (value) current.agents.push(value.toLowerCase());
    } else if ((directive === 'allow' || directive === 'disallow') && current) {
      current.rules.push({ directive, path: value }); sawRule = true;
    }
  }
  return groups;
}

function matches(pathname: string, rule: string) {
  if (!rule) return false;
  const pattern = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\$$/, '$');
  return new RegExp(`^${pattern}`).test(pathname);
}

function accessFor(groups: Group[], bot: string, pathname: string): BotAccess {
  const normalized = bot.toLowerCase();
  const exact = groups.filter(group => group.agents.includes(normalized));
  const wildcard = groups.filter(group => group.agents.includes('*'));
  const candidates = exact.length ? exact : wildcard;
  const source = exact.length ? bot : wildcard.length ? '*' : 'no matching rule';
  const rules = candidates.flatMap(group => group.rules).filter(rule => matches(pathname, rule.path));
  if (!rules.length) return { bot, state: 'allowed', source, rule: 'No matching Allow or Disallow rule.' };
  const longest = Math.max(...rules.map(rule => rule.path.length));
  const chosen = rules.filter(rule => rule.path.length === longest).sort((a, b) => a.directive === 'allow' ? -1 : b.directive === 'allow' ? 1 : 0)[0];
  return { bot, state: chosen.directive === 'disallow' ? 'blocked' : 'allowed', source, rule: `${chosen.directive === 'disallow' ? 'Disallow' : 'Allow'}: ${chosen.path}` };
}

export function aiBotAccess(text: string | null, pageUrl: string): BotAccess[] {
  if (text === null) return botNames.map(bot => ({ bot, state: 'unknown', source: 'robots.txt unavailable', rule: 'No robots.txt content was available to evaluate.' }));
  const groups = parseGroups(text);
  const pathname = new URL(pageUrl).pathname || '/';
  return botNames.map(bot => accessFor(groups, bot, pathname));
}
