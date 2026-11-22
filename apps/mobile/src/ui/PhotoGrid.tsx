import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { PHOTO_LIMITS } from '@kapara/shared';
import { radius, space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { photoSource } from '../demo/images';
import {
  addPhoto, movePhoto, openSettings, pickPhoto, removePhoto, retryPhoto, usePhotoSync, commitPhotos, type MyPhoto,
} from '../me/photos';
import { useMe } from '../me/store';
import { useTheme } from '../theme';
import { Button } from './Button';
import { DemoBadge } from './DemoBadge';
import { Sheet } from './Sheet';
import { Text } from './Text';

const GAP = space.sm;
type Panel = { kind: 'add' } | { kind: 'denied'; canAskAgain: boolean } | { kind: 'photo'; id: string } | null;

/**
 * Six slots, the first one is the main photo. Tap a photo to move it or
 * remove it (also available as screen-reader actions); tap an empty slot to
 * add one from the photo library or the camera.
 */
export function PhotoGrid() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const photos = useMe((s) => s.photos);
  const sync = usePhotoSync();
  const [width, setWidth] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const slot = width ? (width - GAP * 2) / 3 : 0;
  const open = photos.length < PHOTO_LIMITS.maxCount;

  const pick = async (source: 'library' | 'camera') => {
    setPanel(null);
    const r = await pickPhoto(source);
    if (r.kind === 'denied') setPanel({ kind: 'denied', canAskAgain: r.canAskAgain });
    if (r.kind === 'picked') { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); await addPhoto(r.uri); }
  };
  const selected = panel?.kind === 'photo' ? photos.findIndex((p) => p.id === panel.id) : -1;
  const sel = selected >= 0 ? photos[selected] : undefined;
  const act = (f: () => void) => { setPanel(null); void Haptics.selectionAsync(); f(); };

  return (
    <View style={{ padding: space.lg, gap: space.md }}>
      {/* Capped at 480 px: on a desktop, six 4:5 tiles would otherwise fill the screen. */}
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, width: '100%', maxWidth: 480 }}>
        {slot ? photos.map((p, i) => (
          <Tile key={p.id} photo={p} index={i} count={photos.length} size={slot}
            onPress={() => (p.status === 'error' ? retryPhoto(p.id) : setPanel({ kind: 'photo', id: p.id }))} />
        )) : null}
        {slot && open ? Array.from({ length: PHOTO_LIMITS.maxCount - photos.length }, (_, i) => (
          <Animated.View key={`empty-${i}`} layout={LinearTransition}>
            <Pressable onPress={() => setPanel({ kind: 'add' })} accessibilityRole="button"
              accessibilityLabel={i === 0 && !photos.length ? t('photos.addMain') : t('photos.add')}
              style={({ pressed }) => ({
                width: slot, aspectRatio: 4 / 5, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed',
                borderColor: i === 0 && !photos.length ? c.accent : c.border, backgroundColor: pressed ? c.surfaceAlt : 'transparent',
                alignItems: 'center', justifyContent: 'center', gap: space.xs,
              })}>
              <Text variant="heading" tone={i === 0 && !photos.length ? 'accent' : 'textSubtle'} accessibilityElementsHidden>＋</Text>
              {i === 0 && !photos.length ? <Text variant="caption" tone="accent">{t('photos.main')}</Text> : null}
            </Pressable>
          </Animated.View>
        )) : null}
      </View>

      {sync.failed ? (
        <Pressable onPress={() => { commitPhotos().catch(() => undefined); }} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text variant="caption" style={{ color: c.danger }}>{t('photos.saveFailed')}</Text>
        </Pressable>
      ) : null}
      <Text variant="caption" tone="textSubtle">{DEMO_MODE ? t('photos.demoNotice') : t('photos.privacy')}</Text>

      <Sheet visible={panel?.kind === 'add'} onClose={() => setPanel(null)}>
        <Text variant="heading" accessibilityRole="header">{t('photos.addTitle')}</Text>
        <Text tone="textMuted">{t('photos.tips')}</Text>
        <Button label={t('photos.fromLibrary')} onPress={() => void pick('library')} />
        {Platform.OS !== 'web' ? <Button kind="secondary" label={t('photos.fromCamera')} onPress={() => void pick('camera')} /> : null}
        <Button kind="ghost" label={t('ui.cancel')} onPress={() => setPanel(null)} />
      </Sheet>

      <Sheet visible={panel?.kind === 'denied'} onClose={() => setPanel(null)}>
        <Text variant="heading" accessibilityRole="header">{t('photos.deniedTitle')}</Text>
        <Text tone="textMuted">{t('photos.deniedBody')}</Text>
        {panel?.kind === 'denied' && !panel.canAskAgain && Platform.OS !== 'web'
          ? <Button label={t('photos.openSettings')} onPress={() => { setPanel(null); openSettings(); }} /> : null}
        <Button kind="secondary" label={t('photos.fromLibrary')} onPress={() => void pick('library')} />
        <Button kind="ghost" label={t('ui.close')} onPress={() => setPanel(null)} />
      </Sheet>

      <Sheet visible={!!sel} onClose={() => setPanel(null)}>
        {sel ? (
          <>
            <Text variant="heading" accessibilityRole="header">{selected === 0 ? t('photos.mainPhoto') : t('edit.photoN', { n: selected + 1 })}</Text>
            {selected > 0 ? <Button label={t('photos.makeMain')} onPress={() => act(() => movePhoto(sel.id, 0))} /> : null}
            {selected > 1 ? <Button kind="secondary" label={t('photos.moveEarlier')} onPress={() => act(() => movePhoto(sel.id, selected - 1))} /> : null}
            {selected < photos.length - 1 ? <Button kind="secondary" label={t('photos.moveLater')} onPress={() => act(() => movePhoto(sel.id, selected + 1))} /> : null}
            <Button kind="ghost" label={t('photos.remove')} onPress={() => act(() => removePhoto(sel.id))} />
            {photos.length === 1 && !DEMO_MODE ? <Text variant="caption" tone="textSubtle">{t('photos.lastHint')}</Text> : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function Tile({ photo, index, count, size, onPress }: { photo: MyPhoto; index: number; count: number; size: number; onPress: () => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const name = index === 0 ? t('photos.mainPhoto') : t('edit.photoN', { n: index + 1 });
  const state = photo.status === 'uploading' ? t('photos.uploading') : photo.status === 'error' ? t('photos.failed') : undefined;
  const actions = [
    ...(index > 0 ? [{ name: 'main', label: t('photos.makeMain') }, { name: 'earlier', label: t('photos.moveEarlier') }] : []),
    ...(index < count - 1 ? [{ name: 'later', label: t('photos.moveLater') }] : []),
    { name: 'remove', label: t('photos.remove') },
  ];
  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} entering={FadeIn.duration(250)}>
      <Pressable onPress={onPress} accessibilityRole="button"
        accessibilityLabel={[name, t('ui.progress', { current: index + 1, total: count }), state].filter(Boolean).join(', ')}
        accessibilityHint={photo.status === 'error' ? t('photos.retry') : t('photos.manageHint')}
        accessibilityActions={actions}
        onAccessibilityAction={(e) => {
          const a = e.nativeEvent.actionName;
          if (a === 'main') movePhoto(photo.id, 0);
          if (a === 'earlier') movePhoto(photo.id, index - 1);
          if (a === 'later') movePhoto(photo.id, index + 1);
          if (a === 'remove') removePhoto(photo.id);
        }}
        style={({ pressed }) => ({ width: size, aspectRatio: 4 / 5, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <Image source={photoSource(photo.url)} style={{ flex: 1 }} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
        {photo.isDemo ? <View style={{ position: 'absolute', top: space.xs, start: space.xs, end: space.xs }}><DemoBadge compact /></View> : null}
        {index === 0 ? (
          <View style={{ position: 'absolute', bottom: space.xs, start: space.xs, backgroundColor: 'rgba(20,17,24,0.62)', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
            <Text variant="caption" style={{ color: '#fff' }}>{t('photos.main')}</Text>
          </View>
        ) : null}
        {photo.status ? (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(20,17,24,0.45)', alignItems: 'center', justifyContent: 'center', padding: space.sm, gap: space.xs }}>
            {photo.status === 'uploading' ? <ActivityIndicator color="#fff" /> : <Text variant="caption" style={{ color: '#fff', textAlign: 'center' }}>{t('photos.failedShort')}</Text>}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
