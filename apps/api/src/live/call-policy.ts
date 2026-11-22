import type { InviteRefusal, LiveCallsFrom } from '@kapara/shared';

export interface MemberFacts {
  exists: boolean;
  paused: boolean;
  liveEnabled: boolean;
  liveCallsFrom: LiveCallsFrom;
  gender: string | null;
  age: number | null;
  /** Empty = no preference expressed. */
  wantsGenders: string[];
  ageMin: number | null;
  ageMax: number | null;
}

export interface Relationship {
  blockedEitherWay: boolean;
  /** Mutual like, or an accepted introduction / shared conversation. */
  connected: boolean;
}

/** Each side fits what the other declared looking for. Missing data never excludes. */
export function mutuallyCompatible(a: MemberFacts, b: MemberFacts): boolean {
  const fits = (seeker: MemberFacts, other: MemberFacts) => {
    if (seeker.wantsGenders.length && other.gender && !seeker.wantsGenders.includes(other.gender)) return false;
    if (other.age != null && seeker.ageMin != null && other.age < seeker.ageMin) return false;
    if (other.age != null && seeker.ageMax != null && other.age > seeker.ageMax) return false;
    return true;
  };
  return fits(a, b) && fits(b, a);
}

/**
 * Can `caller` see `callee` in Live and propose a call? The callee's own
 * setting always wins. The returned reason is never more precise than
 * `not_available` about the callee, so nobody learns they were filtered out.
 */
export function canReach(caller: MemberFacts, callee: MemberFacts, rel: Relationship): InviteRefusal | null {
  if (!caller.exists || !caller.liveEnabled || caller.paused) return 'live_disabled';
  if (!callee.exists || !callee.liveEnabled || callee.paused) return 'not_available';
  if (rel.blockedEitherWay) return 'not_available';
  if (callee.liveCallsFrom === 'nobody') return 'not_available';
  if (callee.liveCallsFrom === 'matches' && !rel.connected) return 'not_available';
  if (!rel.connected && !mutuallyCompatible(caller, callee)) return 'not_available';
  return null;
}
