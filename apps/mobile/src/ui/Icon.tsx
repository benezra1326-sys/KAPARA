import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { isRTL } from '../i18n';

export type IconName =
  // Navigation
  | 'forYou' | 'crossed' | 'live' | 'messages' | 'me'
  // Actions and states
  | 'heart' | 'close' | 'back' | 'chevron' | 'check' | 'lock' | 'eye' | 'pin' | 'sparkle' | 'info' | 'settings'
  // Calls
  | 'mic' | 'micOff' | 'video' | 'videoOff' | 'flip' | 'phone' | 'hangup' | 'shield' | 'audio';

/** Arrows that must point the other way in right-to-left languages. */
const DIRECTIONAL: IconName[] = ['back', 'chevron'];

/**
 * KAPARA's single icon set: 24 px grid, 1.75 stroke, rounded caps, drawn
 * for the app (no icon font, no emoji). Decorative: the label next to an
 * icon, or the control's accessibilityLabel, carries the meaning.
 */
export function Icon({ name, size = 24, color, filled }: { name: IconName; size?: number; color: string; filled?: boolean }) {
  const p = { stroke: color, strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const fillIf = filled ? { ...p, fill: color } : p;
  const flip = isRTL && DIRECTIONAL.includes(name) ? { transform: [{ scaleX: -1 }] } : undefined;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={flip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      {name === 'forYou' || name === 'sparkle' ? <Path d="M12 3.5c.7 4.4 2.6 6.3 7 7-4.4.7-6.3 2.6-7 7-.7-4.4-2.6-6.3-7-7 4.4-.7 6.3-2.6 7-7Z" {...fillIf} /> : null}
      {name === 'crossed' ? (
        <>
          <Circle cx={9} cy={12} r={5.75} {...p} />
          <Circle cx={15} cy={12} r={5.75} {...p} />
          {filled ? <Path d="M12 7.2a5.75 5.75 0 0 1 0 9.6 5.75 5.75 0 0 1 0-9.6Z" {...p} fill={color} /> : null}
        </>
      ) : null}
      {name === 'live' ? (
        <>
          <Circle cx={12} cy={12} r={2.4} {...fillIf} />
          <Path d="M8.1 8.1a5.5 5.5 0 0 0 0 7.8M15.9 8.1a5.5 5.5 0 0 1 0 7.8M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" {...p} />
        </>
      ) : null}
      {name === 'messages' ? <Path d="M5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17h-1A2.5 2.5 0 0 1 3 14.5v-8A2.5 2.5 0 0 1 5.5 4Z" {...fillIf} /> : null}
      {name === 'me' ? (
        <>
          <Circle cx={12} cy={8.5} r={3.75} {...fillIf} />
          <Path d="M4.5 20.5c1.3-3.9 4.1-5.9 7.5-5.9s6.2 2 7.5 5.9" {...p} />
        </>
      ) : null}
      {name === 'heart' ? <Path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20Z" {...fillIf} /> : null}
      {name === 'close' ? <Path d="M6 6l12 12M18 6 6 18" {...p} /> : null}
      {name === 'back' ? <Path d="M15 5l-7 7 7 7" {...p} /> : null}
      {name === 'chevron' ? <Path d="m9 5 7 7-7 7" {...p} /> : null}
      {name === 'check' ? <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} /> : null}
      {name === 'lock' ? (
        <>
          <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...p} />
          <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...p} />
        </>
      ) : null}
      {name === 'eye' ? (
        <>
          <Path d="M2.8 12S6.2 5.5 12 5.5 21.2 12 21.2 12 17.8 18.5 12 18.5 2.8 12 2.8 12Z" {...p} />
          <Circle cx={12} cy={12} r={2.8} {...p} />
        </>
      ) : null}
      {name === 'pin' ? (
        <>
          <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" {...p} />
          <Circle cx={12} cy={10} r={2.3} {...p} />
        </>
      ) : null}
      {name === 'info' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v5.5M12 7.8v.2" {...p} />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...p} />
          <Circle cx={16} cy={7} r={2} {...p} />
          <Circle cx={8} cy={17} r={2} {...p} />
        </>
      ) : null}
      {name === 'mic' || name === 'micOff' ? (
        <>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" {...p} />
          {name === 'micOff' ? <Line x1={4} y1={4} x2={20} y2={20} {...p} /> : null}
        </>
      ) : null}
      {name === 'video' || name === 'videoOff' ? (
        <>
          <Rect x={3} y={6.5} width={12.5} height={11} rx={2.5} {...p} />
          <Path d="M15.5 10.5 21 7.5v9l-5.5-3" {...p} />
          {name === 'videoOff' ? <Line x1={3} y1={4} x2={20} y2={20} {...p} /> : null}
        </>
      ) : null}
      {name === 'flip' ? <Path d="M4 9a8 8 0 0 1 14-3l2 2M20 4v4h-4M20 15a8 8 0 0 1-14 3l-2-2M4 20v-4h4" {...p} /> : null}
      {name === 'phone' ? <Path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 4.9 4.9l1.3-2 4 1.6V17a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" {...p} /> : null}
      {name === 'hangup' ? <Path d="M3 14.5c5-4.7 13-4.7 18 0l-1.8 2.6-3.4-1.2-.4-2.6a10.6 10.6 0 0 0-6.8 0l-.4 2.6-3.4 1.2Z" {...p} /> : null}
      {name === 'shield' ? <Path d="M12 3 5 6v5.5c0 4.2 3 7.8 7 9.5 4-1.7 7-5.3 7-9.5V6Z M12 8v5M12 16v.5" {...p} /> : null}
      {name === 'audio' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M8.5 10v4M12 8v8M15.5 10v4" {...p} />
        </>
      ) : null}
    </Svg>
  );
}
