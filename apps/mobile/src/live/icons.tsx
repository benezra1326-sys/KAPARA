import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconName = 'mic' | 'micOff' | 'video' | 'videoOff' | 'flip' | 'phone' | 'hangup' | 'shield' | 'check' | 'chevron' | 'audio';

/** Line icons drawn for the Live screens (1.75 stroke, rounded caps). Decorative: labels carry meaning. */
export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  const p = { stroke: color, strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
      {name === 'check' ? <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} /> : null}
      {name === 'chevron' ? <Path d="m9 5 7 7-7 7" {...p} /> : null}
      {name === 'audio' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M8.5 10v4M12 8v8M15.5 10v4" {...p} />
        </>
      ) : null}
    </Svg>
  );
}
