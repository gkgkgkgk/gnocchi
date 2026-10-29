/**
 * Dishes drawn in the kitchen style: chunky outlines, flat fills from the
 * tomato / butter / basil / cocoa palette, and a hard offset shadow. Each
 * draws into the same 100×100 box as the pans in ./shapes.
 */
import { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { Piece, usePalette } from './shapes';

type P = { size?: number; rotate?: number };

export function Taco({ size, rotate = -6 }: P) {
  const p = usePalette();
  // Side view: the shell cups upward and the filling spills over its rim.
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          {real && <Path d="M12 46 q6 -14 14 -6 q6 -16 16 -6 q8 -16 16 -4 q8 -14 16 -4 q8 -10 12 6 Z" fill={p.basil} />}
          {real && <Rect x={30} y={34} width={16} height={10} rx={3} fill={p.cocoa} strokeWidth={2} />}
          {real && <Rect x={56} y={33} width={14} height={10} rx={3} fill={p.cocoa} strokeWidth={2} />}
          {real && <Circle cx={48} cy={30} r={6.5} fill={p.tomato} strokeWidth={2} />}
          {real && <Circle cx={74} cy={36} r={5.5} fill={p.tomato} strokeWidth={2} />}
          {real && <Circle cx={24} cy={36} r={5} fill={p.paper} strokeWidth={2} />}
          <Path d="M6 44 A44 40 0 0 0 94 44 Z" fill={real ? p.butter : undefined} />
          {real && <Path d="M16 52 A34 30 0 0 0 84 52" fill="none" strokeWidth={2} strokeDasharray="2 7" />}
        </>
      )}
    </Piece>
  );
}

export function Burger({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={14} y={70} width={72} height={16} rx={7} fill={real ? p.butter : undefined} />
          <Rect x={10} y={56} width={80} height={14} rx={7} fill={real ? p.cocoa : undefined} />
          {real && <Path d="M14 56 l10 10 l10 -10 l10 10 l10 -10 l10 10 l10 -10 l10 8" fill={p.butter} strokeWidth={2} />}
          {real && <Path d="M10 52 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0" fill={p.basil} strokeWidth={2.5} />}
          <Path d="M12 50 Q12 16 50 16 Q88 16 88 50 Z" fill={real ? p.butter : undefined} />
          {real && [30, 44, 58, 70, 38, 52].map((x, i) => (
            <Ellipse key={i} cx={x} cy={i < 4 ? 30 : 40} rx={2.6} ry={1.6} fill={p.paper} strokeWidth={1.2} />
          ))}
        </>
      )}
    </Piece>
  );
}

export function Pizza({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={50} r={42} fill={real ? p.butter : undefined} />
          {real && <Circle cx={50} cy={50} r={33} fill={p.tomato} strokeWidth={2} />}
          {real && [[38, 36], [62, 40], [44, 62], [64, 62], [50, 49]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={6} fill={p.cocoa} strokeWidth={2} />
          ))}
          {real && <Path d="M30 50 q4 -6 8 0 M58 30 q4 -6 8 0" fill="none" stroke={p.basil} strokeWidth={4} />}
          {real && <Line x1={50} y1={8} x2={50} y2={92} strokeWidth={2} />}
          {real && <Line x1={8} y1={50} x2={92} y2={50} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

/** A plate of pasta seen from above: a swirl with a basil leaf. */
export function Pasta({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={50} r={42} fill={real ? p.paper : undefined} />
          {real && <Circle cx={50} cy={50} r={28} fill={p.butter} strokeWidth={2} />}
          {real && <Path d="M50 50 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0 a20 20 0 1 1 40 0" fill="none" strokeWidth={2} />}
          {real && <Circle cx={40} cy={40} r={5} fill={p.tomato} strokeWidth={2} />}
          {real && <Path d="M58 58 Q68 50 74 58 Q66 66 58 58 Z" fill={p.basil} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

/** A salad bowl from the side, leaves spilling over the rim. */
export function Salad({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          {real && <Path d="M22 50 Q20 22 40 30 Q42 44 22 50 Z" fill={p.basil} />}
          {real && <Path d="M44 46 Q50 14 66 26 Q60 44 44 46 Z" fill={p.basil} />}
          {real && <Path d="M62 50 Q80 26 86 42 Q76 52 62 50 Z" fill={p.basil} />}
          {real && <Circle cx={36} cy={46} r={7} fill={p.tomato} strokeWidth={2} />}
          {real && <Circle cx={60} cy={44} r={5} fill={p.butter} strokeWidth={2} />}
          <Path d="M8 50 L92 50 Q90 88 50 88 Q10 88 8 50 Z" fill={real ? p.paper : undefined} />
          {real && <Path d="M20 62 L80 62" fill="none" strokeWidth={2} stroke={p.tomato} />}
        </>
      )}
    </Piece>
  );
}

/** A bowl of soup or stew with a bay leaf, seen from above. */
export function Bowl({ size, rotate = 0, filling = 'cocoa' }: P & { filling?: 'cocoa' | 'tomato' | 'butter' | 'basil' }) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={50} r={42} fill={real ? p.paper : undefined} />
          {real && <Circle cx={50} cy={50} r={32} fill={p[filling]} strokeWidth={2} />}
          {real && <Rect x={34} y={36} width={11} height={11} rx={3} fill={p.butter} strokeWidth={2} />}
          {real && <Rect x={54} y={52} width={11} height={11} rx={3} fill={p.tomato} strokeWidth={2} />}
          {real && <Path d="M38 64 Q46 52 56 58 Q46 70 38 64 Z" fill={p.basil} strokeWidth={2} />}
          {real && <Circle cx={60} cy={38} r={4} fill={p.paper} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function CakeSlice({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M12 78 L12 44 L88 30 L88 78 Z" fill={real ? p.butter : undefined} />
          {real && <Path d="M12 56 L88 50" fill="none" stroke={p.cocoa} strokeWidth={6} />}
          {real && <Path d="M12 44 L88 30 L88 38 Q80 46 72 38 Q64 48 56 40 Q48 50 40 42 Q32 52 24 44 Q18 50 12 50 Z" fill={p.paper} strokeWidth={2} />}
          {real && <Circle cx={72} cy={24} r={8} fill={p.tomato} strokeWidth={2} />}
          {real && <Path d="M72 16 q4 -8 10 -8" fill="none" strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Cookies({ size, rotate = 6 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={4} y={16} width={92} height={68} rx={8} fill={real ? p.steel : undefined} />
          {real && <Rect x={12} y={24} width={76} height={52} rx={4} fill={p.paper} strokeWidth={2} />}
          {real && [0, 1, 2].map((col) => [0, 1].map((row) => {
            const cx = 28 + col * 22; const cy = 39 + row * 22;
            return [
              <Circle key={`c${col}${row}`} cx={cx} cy={cy} r={8.5} fill={p.butter} strokeWidth={2} />,
              <Circle key={`a${col}${row}`} cx={cx - 3} cy={cy - 2} r={1.8} fill={p.cocoa} strokeWidth={0} />,
              <Circle key={`b${col}${row}`} cx={cx + 3} cy={cy + 2} r={1.8} fill={p.cocoa} strokeWidth={0} />,
            ];
          }))}
        </>
      )}
    </Piece>
  );
}

export function Bread({ size, rotate = -8 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M10 70 Q8 34 50 30 Q92 34 90 70 Z" fill={real ? p.cocoa : undefined} />
          {real && <Path d="M10 70 L90 70" fill="none" strokeWidth={3} />}
          {real && [32, 50, 68].map((x) => <Path key={x} d={`M${x - 8} 52 Q${x} 38 ${x + 8} 46`} fill="none" stroke={p.butter} strokeWidth={4} />)}
        </>
      )}
    </Piece>
  );
}

export function Pancakes({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Ellipse cx={50} cy={78} rx={42} ry={10} fill={real ? p.paper : undefined} />
          {[66, 54, 42].map((y) => <Rect key={y} x={16} y={y} width={68} height={14} rx={7} fill={real ? p.butter : undefined} />)}
          {real && <Path d="M18 44 Q50 34 82 44 L82 50 Q78 60 74 50 Q60 54 50 48 Q40 60 34 48 Q26 52 18 50 Z" fill={p.cocoa} strokeWidth={2} />}
          {real && <Rect x={42} y={32} width={16} height={10} rx={2} fill={p.paper} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Eggs({ size, rotate = -20 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={68} y={44} width={34} height={12} rx={6} fill={real ? p.ink : undefined} />
          <Circle cx={40} cy={50} r={36} fill={real ? p.steel : undefined} />
          {real && <Path d="M18 46 Q20 30 36 34 Q44 26 50 38 Q60 44 50 56 Q44 70 30 62 Q16 60 18 46 Z" fill={p.paper} strokeWidth={2} />}
          {real && <Circle cx={36} cy={47} r={8} fill={p.butter} strokeWidth={2} />}
          {real && <Path d="M44 64 Q50 52 62 58 Q70 66 60 74 Q48 78 44 64 Z" fill={p.paper} strokeWidth={2} />}
          {real && <Circle cx={55} cy={65} r={6} fill={p.butter} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Steak({ size, rotate = -10 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M14 46 Q14 20 46 22 Q86 20 88 50 Q90 80 54 80 Q40 80 34 70 Q14 70 14 46 Z" fill={real ? p.cocoa : undefined} />
          {real && <Path d="M24 44 Q24 30 44 30" fill="none" stroke={p.paper} strokeWidth={4} />}
          {real && [0, 1, 2].map((i) => <Line key={i} x1={40 + i * 13} y1={36} x2={30 + i * 13} y2={70} stroke={p.ink} strokeWidth={3} />)}
          {real && <Path d="M70 30 q8 4 10 14" fill="none" stroke={p.basil} strokeWidth={5} />}
        </>
      )}
    </Piece>
  );
}

export function Fish({ size, rotate = -8 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M10 50 Q36 20 70 40 L90 26 L86 50 L90 74 L70 60 Q36 80 10 50 Z" fill={real ? p.tomato : undefined} />
          {real && <Circle cx={26} cy={46} r={4} fill={p.paper} strokeWidth={2} />}
          {real && <Path d="M40 40 q6 10 0 20 M52 38 q6 12 0 24" fill="none" strokeWidth={2} />}
          {real && <Circle cx={70} cy={84} r={7} fill={p.butter} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Drumstick({ size, rotate = 30 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={58} y={44} width={30} height={12} rx={6} fill={real ? p.paper : undefined} />
          <Circle cx={88} cy={44} r={7} fill={real ? p.paper : undefined} />
          <Circle cx={88} cy={56} r={7} fill={real ? p.paper : undefined} />
          <Path d="M12 50 Q12 22 42 24 Q62 30 64 50 Q62 70 42 76 Q12 78 12 50 Z" fill={real ? p.cocoa : undefined} />
          {real && <Path d="M24 40 Q32 32 44 34" fill="none" stroke={p.butter} strokeWidth={4} />}
        </>
      )}
    </Piece>
  );
}

export function Dumplings({ size, rotate = 0 }: P) {
  const p = usePalette();
  // Three pleated crescents in a bamboo steamer.
  const crescent = (x: number, y: number) =>
    `M${x - 17} ${y + 5} Q${x - 14} ${y - 16} ${x} ${y - 16} Q${x + 14} ${y - 16} ${x + 17} ${y + 5} Q${x} ${y + 11} ${x - 17} ${y + 5} Z`;
  const spots: [number, number][] = [[34, 42], [66, 42], [50, 68]];
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={50} r={44} fill={real ? p.butter : undefined} />
          {real && <Circle cx={50} cy={50} r={36} fill={p.basil} strokeWidth={2} />}
          {real && spots.map(([x, y], i) => <Path key={i} d={crescent(x, y)} fill={p.paper} strokeWidth={2.5} />)}
          {real && spots.map(([x, y], i) => (
            <Path key={`p${i}`} d={`M${x - 8} ${y - 12} l2 6 M${x} ${y - 16} l0 7 M${x + 8} ${y - 12} l-2 6`} fill="none" strokeWidth={2} />
          ))}
        </>
      )}
    </Piece>
  );
}

export function Sushi({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          {[[30, 36], [70, 36], [50, 70]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={20} fill={real ? p.ink : undefined} />
          ))}
          {real && [[30, 36], [70, 36], [50, 70]].map(([x, y], i) => (
            <Circle key={`r${i}`} cx={x} cy={y} r={15} fill={p.paper} strokeWidth={0} />
          ))}
          {real && [[30, 36, 'tomato'], [70, 36, 'basil'], [50, 70, 'butter']].map(([x, y, f], i) => (
            <Circle key={`f${i}`} cx={x as number} cy={y as number} r={7} fill={(p as any)[f as string]} strokeWidth={2} />
          ))}
        </>
      )}
    </Piece>
  );
}

export function IceCream({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M30 50 L50 94 L70 50 Z" fill={real ? p.butter : undefined} />
          {real && <Path d="M36 58 L60 66 M40 70 L56 76 M44 56 L64 52" fill="none" strokeWidth={2} />}
          <Circle cx={50} cy={34} r={22} fill={real ? p.paper : undefined} />
          {real && <Circle cx={50} cy={34} r={22} fill={p.paper} />}
          {real && <Path d="M28 40 q6 10 12 0 q6 10 12 0 q6 10 12 0 q6 10 10 0" fill={p.tomato} strokeWidth={2} />}
          {real && <Circle cx={56} cy={12} r={6} fill={p.tomato} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Pie({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={50} r={42} fill={real ? p.butter : undefined} />
          {real && <Circle cx={50} cy={50} r={32} fill={p.tomato} strokeWidth={2} />}
          {real && [30, 44, 58, 70].map((x) => <Line key={`v${x}`} x1={x} y1={22} x2={x} y2={78} stroke={p.butter} strokeWidth={6} />)}
          {real && [30, 44, 58, 70].map((y) => <Line key={`h${y}`} x1={22} y1={y} x2={78} y2={y} stroke={p.butter} strokeWidth={6} />)}
          {real && <Circle cx={50} cy={50} r={32} fill="none" strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Drink({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          {real && <Line x1={58} y1={30} x2={74} y2={6} strokeWidth={5} stroke={p.tomato} />}
          <Path d="M26 26 L74 26 L66 92 L34 92 Z" fill={real ? p.paper : undefined} />
          {real && <Path d="M29 44 L71 44 L66 88 L34 88 Z" fill={p.basil} strokeWidth={2} />}
          {real && <Circle cx={36} cy={28} r={9} fill={p.butter} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

export function Sandwich({ size, rotate = -6 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M10 80 L50 18 L90 80 Z" fill={real ? p.butter : undefined} />
          {real && <Path d="M18 72 L50 26 L82 72 Z" fill={p.paper} strokeWidth={2} />}
          {real && <Path d="M24 66 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0" fill="none" stroke={p.basil} strokeWidth={5} />}
          {real && <Path d="M32 56 L68 56" fill="none" stroke={p.tomato} strokeWidth={6} />}
        </>
      )}
    </Piece>
  );
}

export function Muffin({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M22 54 L78 54 L70 90 L30 90 Z" fill={real ? p.tomato : undefined} />
          {real && [36, 50, 64].map((x) => <Line key={x} x1={x} y1={58} x2={x - (x - 50) * 0.2} y2={86} strokeWidth={2} />)}
          <Path d="M16 56 Q14 20 50 18 Q86 20 84 56 Z" fill={real ? p.cocoa : undefined} />
          {real && [[36, 36], [56, 30], [64, 46], [44, 48]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.6} fill={p.butter} strokeWidth={0} />)}
        </>
      )}
    </Piece>
  );
}

export function RiceBowl({ size, rotate = 0 }: P) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          {real && <Path d="M18 52 Q20 24 50 24 Q80 24 82 52 Z" fill={p.paper} />}
          {real && <Path d="M46 52 Q48 30 70 34 Q80 42 78 52 Z" fill={p.tomato} strokeWidth={2} />}
          {real && <Path d="M28 40 Q34 32 42 36" fill="none" stroke={p.basil} strokeWidth={5} />}
          {real && <Line x1={60} y1={4} x2={92} y2={34} strokeWidth={4} stroke={p.cocoa} />}
          {real && <Line x1={68} y1={2} x2={96} y2={28} strokeWidth={4} stroke={p.cocoa} />}
          <Path d="M8 52 L92 52 Q90 88 50 88 Q10 88 8 52 Z" fill={real ? p.butter : undefined} />
        </>
      )}
    </Piece>
  );
}
