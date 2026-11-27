import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { REGIONS } from '@kapara/config';
import { fonts, radius, shadow, space } from '@kapara/design';
import { useRole } from '../../src/account';
import { adminStats, adminStore, useAdmin, type AdminMember, type MemberStatus } from '../../src/admin/store';
import { DEMO_MODE } from '../../src/api/client';
import { CLOUD } from '../../src/cloud/client';
import { photoSource } from '../../src/demo/images';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, fontFor, Screen, Text, columnsFor, useLayout } from '../../src/ui';

const ALL_TABS = ['overview', 'reports', 'photos', 'members'] as const;
// Real accounts: no photo review queue yet (photos are visible as soon as they are added).
// With the API, a reported photo is handled from its report ("Retirer la photo").
const TABS = CLOUD || !DEMO_MODE ? ALL_TABS.filter((x) => x !== 'photos') : ALL_TABS;
type Tab = (typeof ALL_TABS)[number];
const cityOf = (code: string) => REGIONS.find((r) => r.code === code)?.city ?? code;

/**
 * Back-office of the app, for administrators only: numbers, reports to
 * handle, photos to approve and the member list. Demo: fictional data,
 * decisions kept in memory.
 */
export default function Admin() {
  const { t } = useTranslation();
  const role = useRole();
  const [tab, setTab] = useState<Tab>('overview');
  const all = useAdmin((s) => s);
  useEffect(() => { if (role === 'admin') void adminStore.load(); }, [role]);
  const counts = useMemo(() => ({ reports: all.reports.filter((r) => r.status === 'open').length, photos: all.photos.filter((p) => p.status === 'pending').length }), [all]);
  if (role !== 'admin') return <Redirect href="/" />;
  return (
    <Screen back="back" title={t('admin.title')} subtitle={t('admin.subtitle')} width="wide">
      <View style={{ paddingHorizontal: space.lg, gap: space.xl, paddingBottom: space.xxxl }}>
        {CLOUD || !DEMO_MODE ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text variant="caption" tone="textSubtle" style={{ flex: 1, minWidth: 200 }}>{all.error ? t('cloud.adminError') : t('cloud.adminNotice')}</Text>
            <Button kind="ghost" label={all.loading ? t('cloud.loading') : t('cloud.refresh')} onPress={() => void adminStore.load()} style={{ paddingHorizontal: space.md }} />
          </View>
        ) : DEMO_MODE ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <DemoBadge compact />
            <Text variant="caption" tone="textSubtle" style={{ flex: 1 }}>{t('admin.demoNotice')}</Text>
          </View>
        ) : null}
        <Segments tab={tab} onChange={setTab} badges={{ reports: counts.reports, photos: counts.photos }} />
        {tab === 'overview' ? <Overview onGo={setTab} /> : tab === 'reports' ? <Reports /> : tab === 'photos' ? <Photos /> : <Members />}
      </View>
    </Screen>
  );
}

function Segments({ tab, onChange, badges }: { tab: Tab; onChange: (t: Tab) => void; badges: Partial<Record<Tab, number>> }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {TABS.map((k) => {
        const on = k === tab;
        const n = badges[k];
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ minHeight: 44, paddingHorizontal: space.lg, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: space.sm,
              backgroundColor: on ? c.text : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border }}>
            <Text variant="label" style={{ color: on ? c.bg : c.text }}>{t(`admin.tabs.${k}`)}</Text>
            {n ? (
              <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="caption" style={{ color: c.onAccent, fontFamily: fonts.bodySemibold }}>{n}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Panel({ children, style }: { children: ReactNode; style?: object }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md }, shadow.card, style]}>{children}</View>;
}

function Overview({ onGo }: { onGo: (t: Tab) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { width } = useLayout();
  const all = useAdmin((x) => x);
  const s = useMemo(() => adminStats(all), [all]);
  const cols = columnsFor(Math.min(width, 1080) - space.lg * 2, 160, 4);
  const cs = all.cloud;
  const tiles: { label: string; value: number; tone?: string; go?: Tab }[] = cs ? [
    { label: t('cloud.stats.members'), value: cs.members, go: 'members' },
    { label: t('cloud.stats.onboarded'), value: cs.onboarded },
    { label: t('cloud.stats.signups7d'), value: cs.signups7d },
    { label: t('cloud.stats.demo'), value: cs.demo },
    { label: t('cloud.stats.likes'), value: cs.likes },
    { label: t('cloud.stats.conversations'), value: cs.conversations },
    { label: t('cloud.stats.messages'), value: cs.messages },
    { label: t('admin.stats.openReports'), value: cs.openReports, tone: cs.openReports ? c.accent : undefined, go: 'reports' },
    { label: t('admin.stats.suspended'), value: cs.suspended },
  ] : [
    { label: t('admin.stats.members'), value: s.members, go: 'members' },
    { label: t('admin.stats.activeToday'), value: s.activeToday },
    { label: t('admin.stats.newThisWeek'), value: s.newThisWeek },
    { label: t('admin.stats.verified'), value: s.verified },
    { label: t('admin.stats.openReports'), value: s.openReports, tone: s.openReports ? c.accent : undefined, go: 'reports' },
    { label: t('admin.stats.pendingPhotos'), value: s.pendingPhotos, tone: s.pendingPhotos ? c.highlight : undefined, go: 'photos' },
    { label: t('admin.stats.suspended'), value: s.suspended },
  ];
  const max = Math.max(1, ...Object.values(s.byRegion));
  return (
    <View style={{ gap: space.xl }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {tiles.map((x) => (
          <Pressable key={x.label} onPress={x.go ? () => onGo(x.go!) : undefined} disabled={!x.go} accessibilityRole={x.go ? 'button' : undefined}
            style={{ width: `${100 / cols - 2}%` as const, minWidth: 140, flexGrow: 1 }}>
            <Panel style={{ gap: space.xs }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: x.tone ?? c.text }}>{x.value}</Text>
              <Text variant="caption" tone="textMuted">{x.label}</Text>
            </Panel>
          </Pressable>
        ))}
      </View>
      <Panel>
        <Text variant="heading">{t('admin.byCity')}</Text>
        {Object.entries(s.byRegion).sort((a, b) => b[1] - a[1]).map(([code, n]) => (
          <View key={code} style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="label">{cityOf(code)}</Text>
              <Text variant="label" tone="textMuted">{n}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${(n / max) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: c.accent }} />
            </View>
          </View>
        ))}
      </Panel>
      <Panel>
        <Text variant="heading">{t('admin.byGender')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
          {Object.entries(s.byGender).map(([g, n]) => (
            <View key={g} style={{ gap: 2 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30 }}>{n}</Text>
              <Text variant="caption" tone="textMuted">{t(`admin.gender.${g}`)}</Text>
            </View>
          ))}
        </View>
      </Panel>
    </View>
  );
}

function Who({ k, size = 44 }: { k: string; size?: number }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const m = useAdmin((s) => s.members.find((x) => x.key === k));
  if (!m) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Image source={m.photoUrl ? photoSource(m.photoUrl) : undefined} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceAlt }} contentFit="cover" contentPosition="top" accessible={false} />
      <View>
        <Text variant="bodyStrong">{m.firstName}{m.age ? `, ${m.age}` : ''}{m.isAdmin ? ` · ${t('cloud.adminTag')}` : ''}</Text>
        <Text variant="caption" tone="textMuted">{m.isDemo ? `${t('cloud.demoTag')} · ` : ''}{cityOf(m.regionCode)}{m.email ? ` · ${m.email}` : ''}</Text>
      </View>
    </View>
  );
}

function Reports() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const reports = useAdmin((s) => s.reports);
  const members = useAdmin((s) => s.members);
  const nameOf = (k: string) => members.find((m) => m.key === k)?.firstName ?? '';
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? reports : reports.filter((r) => r.status === 'open');
  return (
    <View style={{ gap: space.lg }}>
      <Text tone="textMuted">{t('admin.reportsIntro')}</Text>
      {list.length === 0 ? <Panel><Text tone="textMuted">{t('admin.reportsEmpty')}</Text></Panel> : null}
      {list.map((r) => (
        <Panel key={r.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
            <Who k={r.reportedKey} />
            <Text variant="caption" tone="textSubtle">{t('admin.hoursAgo', { count: r.hoursAgo })}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Tag label={t(`safety.reason.${r.reason}`)} color={c.accent} />
            <Tag label={t(`admin.context.${r.context}`, { defaultValue: r.context })} />
            {r.status !== 'open' ? <Tag label={t(`admin.decision.${r.status}`)} color={c.live} /> : null}
          </View>
          <Text style={{ fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 25 }}>« {r.details} »</Text>
          <Text variant="caption" tone="textSubtle">{t('admin.reportedBy', { name: nameOf(r.reporterKey) })}</Text>
          {r.status === 'open' ? (
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button kind="secondary" label={t('admin.viewProfile')} onPress={() => router.push(`/profile/${r.reportedKey}`)} style={{ flexGrow: 1 }} />
              <Button kind="secondary" label={t('admin.dismiss')} onPress={() => adminStore.decideReport(r.id, 'dismissed')} style={{ flexGrow: 1 }} />
              <Button kind="secondary" label={t('admin.warn')} onPress={() => adminStore.decideReport(r.id, 'warned')} style={{ flexGrow: 1 }} />
              <Button label={t('admin.suspend')} onPress={() => adminStore.decideReport(r.id, 'suspended')} style={{ flexGrow: 1 }} />
            </View>
          ) : null}
          {r.photoId ? (
            <Button kind="secondary" label={t('beta.moderation.removePhoto')} onPress={() => void adminStore.removePhoto(r.id, r.photoId!)} />
          ) : null}
        </Panel>
      ))}
      <Button kind="ghost" label={t(showAll ? 'admin.showOpen' : 'admin.showAll')} onPress={() => setShowAll(!showAll)} />
    </View>
  );
}

function Tag({ label, color }: { label: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 3, backgroundColor: c.surfaceAlt }}>
      <Text variant="caption" style={{ color: color ?? c.textMuted, fontFamily: fonts.bodyMedium }}>{label}</Text>
    </View>
  );
}

function Photos() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { width } = useLayout();
  const allPhotos = useAdmin((s) => s.photos);
  const photos = useMemo(() => allPhotos.filter((p) => p.status === 'pending'), [allPhotos]);
  const cols = columnsFor(Math.min(width, 1080) - space.lg * 2, 220, 4);
  return (
    <View style={{ gap: space.lg }}>
      <Text tone="textMuted">{t('admin.photosIntro')}</Text>
      {photos.length === 0 ? <Panel><Text tone="textMuted">{t('admin.photosEmpty')}</Text></Panel> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {photos.map((p) => (
          <View key={p.id} style={[{ width: `${100 / cols - 3}%` as const, minWidth: 150, flexGrow: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface }, shadow.card]}>
            <Image source={photoSource(p.url)} style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: c.surfaceAlt }} contentFit="cover" contentPosition="top" accessibilityLabel={t('admin.photoOf')} />
            <View style={{ padding: space.md, gap: space.sm }}>
              <Who k={p.key} size={32} />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button kind="secondary" label={t('admin.reject')} onPress={() => adminStore.decidePhoto(p.id, 'rejected')} style={{ flex: 1, paddingHorizontal: space.sm }} />
                <Button label={t('admin.approve')} onPress={() => adminStore.decidePhoto(p.id, 'approved')} style={{ flex: 1, paddingHorizontal: space.sm }} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const STATUS_FILTERS = ['all', 'active', 'paused', 'suspended'] as const;

function Members() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const members = useAdmin((s) => s.members);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members
      .filter((m) => filter === 'all' || m.status === filter)
      .filter((m) => !needle || m.firstName.toLowerCase().includes(needle) || cityOf(m.regionCode).toLowerCase().includes(needle) || !!m.email?.toLowerCase().includes(needle))
      .sort((a, b) => Number(a.isDemo) - Number(b.isDemo) || (a.lastActiveMinutesAgo ?? 1e9) - (b.lastActiveMinutesAgo ?? 1e9));
  }, [members, q, filter]);
  return (
    <View style={{ gap: space.lg }}>
      <TextInput value={q} onChangeText={setQ} placeholder={t('admin.search')} placeholderTextColor={c.textSubtle} accessibilityLabel={t('admin.search')}
        style={{ minHeight: 48, borderRadius: radius.pill, paddingHorizontal: space.xl, backgroundColor: c.surface, color: c.text, borderWidth: 1, borderColor: c.border, fontFamily: fontFor(fonts.body), fontSize: 16 }} />
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} accessibilityRole="button" accessibilityState={{ selected: f === filter }}
            style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: f === filter ? c.accentSoft : 'transparent', borderWidth: 1, borderColor: f === filter ? c.accent : c.border }}>
            <Text variant="caption" style={{ color: f === filter ? c.accent : c.textMuted, fontFamily: fonts.bodyMedium }}>{t(`admin.status.${f}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text variant="caption" tone="textSubtle">{t('admin.membersCount', { count: list.length })}</Text>
      <Panel style={{ padding: 0, gap: 0 }}>
        {list.map((m, i) => <MemberRow key={m.key} m={m} first={i === 0} onOpen={() => router.push(`/profile/${m.key}`)} />)}
      </Panel>
    </View>
  );
}

function MemberRow({ m, first, onOpen }: { m: AdminMember; first: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const next: MemberStatus = m.status === 'suspended' ? 'active' : 'suspended';
  const color = m.status === 'active' ? c.live : m.status === 'paused' ? c.highlight : c.danger;
  const ago = m.lastActiveMinutesAgo;
  const seen = ago === null ? (m.isDemo ? t('cloud.demoTag') : t('cloud.neverSeen')) : ago < 60 ? t('admin.seenMinutes', { count: ago }) : ago < 60 * 24 ? t('admin.seenHours', { count: Math.floor(ago / 60) }) : t('admin.seenDays', { count: Math.floor(ago / 1440) });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderTopWidth: first ? 0 : 1, borderTopColor: c.border, flexWrap: 'wrap' }}>
      <Pressable onPress={onOpen} accessibilityRole="button" style={{ flex: 1, minWidth: 180 }}><Who k={m.key} /></Pressable>
      <View style={{ minWidth: 140, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text variant="caption">{t(`admin.status.${m.status}`)}{m.verified ? ` · ${t('admin.verified')}` : ''}</Text>
        </View>
        <Text variant="caption" tone="textSubtle">{seen}{m.reportsCount ? ` · ${t('admin.reportsN', { count: m.reportsCount })}` : ''}</Text>
      </View>
      <Button kind={m.status === 'suspended' ? 'secondary' : 'ghost'} label={t(m.status === 'suspended' ? 'admin.reinstate' : 'admin.suspend')}
        onPress={() => adminStore.setMemberStatus(m.key, next)} style={{ paddingHorizontal: space.md }} />
    </View>
  );
}
