import { REGIONS } from '@kapara/config';
import type { ChatMessage, ConversationSummary, Like, ProfilePublic, Recommendation, ReportCreate } from '@kapara/shared';
import { meStore } from '../me/store';
import { must, sb } from './client';

/**
 * Data for real accounts, read through the database functions of
 * supabase/migrations (for_you, member_cards, my_conversations…). Those
 * functions only ever return what another member may see: answers shared
 * with "members" (or "matches" after a double like), never private ones.
 */
type Card = Omit<ProfilePublic, 'city'> & { city?: string };
const withCity = (p: Card): ProfilePublic => ({ ...p, city: REGIONS.find((r) => r.code === p.regionCode)?.city ?? '' }) as ProfilePublic;

const uid = async () => {
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('signed_out');
  return id;
};

/** Up to three plain reasons, from what both people chose to share. */
function reasonsFor(p: ProfilePublic): Recommendation['reasons'] {
  const me = meStore.get();
  const out: Recommendation['reasons'] = [];
  for (const [key, mine] of Object.entries(me.jewishLife)) {
    const theirs = (p.jewishLife as Record<string, { value?: unknown } | undefined>)[key];
    const v = mine?.value;
    if (v == null || theirs?.value == null || Array.isArray(v)) continue;
    if (theirs.value === v) out.push({ key: `reason.shared.${key}`, params: { value: String(v) } });
  }
  const lang = p.languages.find((l) => me.languages.includes(l) && l !== 'fr') ?? p.languages.find((l) => me.languages.includes(l));
  if (lang) out.push({ key: 'reason.shared_language', params: { language: lang } });
  if (p.regionCode === me.regionCode) out.push({ key: 'reason.nearby' });
  return out.slice(0, 3);
}

export const cloud = {
  async forYou(): Promise<Recommendation[]> {
    const cards = must(await sb.rpc('for_you', { max_count: 12 })) as Card[];
    return cards.map((c, i) => {
      const profile = withCity(c);
      return { profile, score: Math.max(0.5, Math.round((0.95 - i * 0.03) * 100) / 100), reasons: reasonsFor(profile) };
    });
  },

  async profile(id: string): Promise<ProfilePublic | null> {
    const cards = must(await sb.rpc('member_cards', { ids: [id] })) as Card[];
    return cards[0] ? withCity(cards[0]) : null;
  },

  /** A like on a photo or an answer. Two real members who like each other get a conversation. */
  async like(l: Like): Promise<{ matched: boolean; conversationId?: string }> {
    const me = await uid();
    const { error } = await sb.from('likes').upsert({ from_id: me, to_id: l.toProfileId, target: l.target, comment: l.comment ?? null }, { onConflict: 'from_id,to_id' });
    if (error) throw new Error(error.message);
    const [a, b] = [me, l.toProfileId].sort();
    const { data } = await sb.from('conversations').select('id').eq('a_id', a).eq('b_id', b).maybeSingle<{ id: string }>();
    return data ? { matched: true, conversationId: data.id } : { matched: false };
  },

  async conversations(): Promise<ConversationSummary[]> {
    return must(await sb.rpc('my_conversations')) as ConversationSummary[];
  },

  async messages(conversationId: string): Promise<ChatMessage[]> {
    const me = await uid();
    type M = { id: string; sender_id: string; body: string; created_at: string };
    const rows = must(await sb.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', conversationId).order('created_at')) as M[];
    return rows.map((m) => ({ id: m.id, senderId: m.sender_id, mine: m.sender_id === me, body: m.body, createdAt: m.created_at }));
  },

  async send(conversationId: string, body: string): Promise<ChatMessage> {
    const me = await uid();
    type M = { id: string; sender_id: string; body: string; created_at: string };
    const m = must(await sb.from('messages').insert({ conversation_id: conversationId, sender_id: me, body }).select('id, sender_id, body, created_at').single()) as M;
    return { id: m.id, senderId: m.sender_id, mine: true, body: m.body, createdAt: m.created_at };
  },

  async close(conversationId: string) {
    must(await sb.from('conversations').update({ closed_at: new Date().toISOString() }).eq('id', conversationId));
  },

  /** New messages arrive live (Supabase Realtime); returns the unsubscribe function. */
  onMessages(conversationId: string, cb: () => void) {
    const ch = sb.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, cb)
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  },

  async blocks(): Promise<{ userId: string; firstName: string; blockedAt: string }[]> {
    const rows = must(await sb.from('blocks').select('blocked_id, created_at')) as { blocked_id: string; created_at: string }[];
    if (!rows.length) return [];
    const names = new Map((must(await sb.rpc('member_cards', { ids: null })) as Card[]).map((c) => [c.id, c.firstName]));
    return rows.map((r) => ({ userId: r.blocked_id, firstName: names.get(r.blocked_id) ?? '', blockedAt: r.created_at }));
  },

  async block(userId: string) {
    const me = await uid();
    must(await sb.from('blocks').upsert({ blocker_id: me, blocked_id: userId }, { onConflict: 'blocker_id,blocked_id' }));
  },

  async unblock(userId: string) {
    const me = await uid();
    must(await sb.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', userId));
  },

  async report(r: ReportCreate) {
    const me = await uid();
    must(await sb.from('reports').insert({ reporter_id: me, reported_id: r.userId, reason: r.reason, details: r.details ?? null, context: r.context ?? 'profile' }));
    if (r.alsoBlock !== false) await cloud.block(r.userId);
  },
};
