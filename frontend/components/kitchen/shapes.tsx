/**
 * Kitchen pieces seen from above, drawn as outlined blocks with a hard
 * offset shadow: a skillet and a pot are circles, a sheet tray is a rimmed
 * rectangle, a cutting board is a slab with a hanging hole, and a gnocchi is
 * the brand mark. All are decorative and hidden from screen readers.
 *
 * Every piece draws into a 100×100 box; `size` scales it.
 */
import { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

export const SW = 3;      // outline width in viewBox units
const DROP = 4;    // hard shadow offset

interface PieceProps {
  size?: number;
  /** Rotation in degrees, for scattering pieces naturally. */
  rotate?: number;
}

export function usePalette() {
  const { colors: c, scheme } = useTheme();
  return {
    ink: c.outline,
    drop: scheme === 'dark' ? '#000000' : c.outline,
    paper: c.bgElevated,
    steel: c.steel,
    tomato: c.tomato,
    butter: c.butter,
    basil: c.basil,
    cocoa: c.cocoa,
  };
}

/** Wrap shapes with a solid shadow copy nudged down-right. */
export function Piece({ size = 64, rotate = 0, children }: PieceProps & { children: (fill: boolean) => ReactNode }) {
  const p = usePalette();
  return (
    <Svg width={size} height={size} viewBox="-6 -6 112 112" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G rotation={rotate} origin="50, 50">
        <G x={DROP} y={DROP} fill={p.drop} stroke={p.drop} strokeWidth={SW}>{children(false)}</G>
        <G stroke={p.ink} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">{children(true)}</G>
      </G>
    </Svg>
  );
}

/** A ridged gnocchi pillow: the brand mark. */
export function Gnocchi({ size = 40, rotate = -12 }: PieceProps) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={14} y={26} width={72} height={48} rx={24} fill={real ? p.butter : undefined} />
          {real && [32, 44, 56, 68].map((x) => (
            <Path key={x} d={`M${x} 34 Q${x - 4} 50 ${x} 66`} fill="none" strokeWidth={2.5} />
          ))}
        </>
      )}
    </Piece>
  );
}

/** Skillet: a round pan with a long handle, optionally with something cooking. */
export function Skillet({ size, rotate = -20, filling = 'butter' }: PieceProps & { filling?: 'butter' | 'tomato' | 'basil' | 'empty' }) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={68} y={44} width={34} height={12} rx={6} fill={real ? p.ink : undefined} />
          <Circle cx={40} cy={50} r={36} fill={real ? p.steel : undefined} />
          {real && <Circle cx={40} cy={50} r={27} fill={p.paper} strokeWidth={2} />}
          {real && filling !== 'empty' && (
            <>
              <Ellipse cx={30} cy={44} rx={9} ry={6} fill={p[filling]} strokeWidth={2} />
              <Ellipse cx={48} cy={42} rx={9} ry={6} fill={p[filling]} strokeWidth={2} />
              <Ellipse cx={38} cy={60} rx={9} ry={6} fill={p[filling]} strokeWidth={2} />
            </>
          )}
        </>
      )}
    </Piece>
  );
}

/** Stock pot: a circle with two ear handles and a full surface. */
export function Pot({ size, rotate = 0, filling = 'tomato' }: PieceProps & { filling?: 'butter' | 'tomato' | 'basil' | 'cocoa' }) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={2} y={42} width={18} height={16} rx={6} fill={real ? p.ink : undefined} />
          <Rect x={80} y={42} width={18} height={16} rx={6} fill={real ? p.ink : undefined} />
          <Circle cx={50} cy={50} r={38} fill={real ? p.steel : undefined} />
          {real && <Circle cx={50} cy={50} r={30} fill={p[filling]} strokeWidth={2} />}
          {real && filling === 'cocoa' ? (
            <>
              {/* a stew: carrot coins and a bay leaf */}
              <Circle cx={38} cy={40} r={6} fill={p.tomato} strokeWidth={2} />
              <Rect x={54} y={54} width={11} height={11} rx={3} fill={p.butter} strokeWidth={2} />
              <Path d="M34 64 Q46 46 64 42 Q56 62 34 64 Z" fill={p.basil} strokeWidth={2} />
            </>
          ) : real ? (
            <>
              <Circle cx={40} cy={42} r={5} fill={p.paper} strokeWidth={2} />
              <Circle cx={58} cy={56} r={3.5} fill={p.paper} strokeWidth={2} />
            </>
          ) : null}
        </>
      )}
    </Piece>
  );
}

/** Sheet tray: a rimmed rectangle with a neat grid of things baking. */
export function SheetTray({ size, rotate = 6 }: PieceProps) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={4} y={16} width={92} height={68} rx={8} fill={real ? p.steel : undefined} />
          {real && <Rect x={12} y={24} width={76} height={52} rx={4} fill={p.paper} strokeWidth={2} />}
          {real && [0, 1, 2].map((col) => [0, 1].map((row) => (
            <Circle key={`${col}-${row}`} cx={28 + col * 22} cy={39 + row * 22} r={7.5} fill={p.butter} strokeWidth={2} />
          )))}
        </>
      )}
    </Piece>
  );
}

/** Cutting board: a slab with a hanging hole, holding a tomato and a leaf. */
export function Board({ size, rotate = -8 }: PieceProps) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Rect x={6} y={22} width={88} height={56} rx={14} fill={real ? p.butter : undefined} />
          {real && <Circle cx={82} cy={50} r={5} fill={p.paper} strokeWidth={2} />}
          {real && <Circle cx={34} cy={50} r={14} fill={p.tomato} strokeWidth={2} />}
          {real && <Path d="M34 38 l-3 -4 M34 38 l3 -4 M34 38 l0 -5" fill="none" strokeWidth={2} />}
          {real && <Path d="M52 60 Q60 40 72 44 Q66 62 52 60 Z" fill={p.basil} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

/** A plate: rim and well. */
export function Plate({ size, rotate = 0 }: PieceProps) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={50} r={40} fill={real ? p.paper : undefined} />
          {real && <Circle cx={50} cy={50} r={27} fill="none" strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

/** A basil leaf on its own, for scattering. */
export function Leaf({ size, rotate = 20 }: PieceProps) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Path d="M14 80 Q20 20 86 16 Q80 78 14 80 Z" fill={real ? p.basil : undefined} />
          {real && <Line x1={22} y1={72} x2={70} y2={30} strokeWidth={2} />}
        </>
      )}
    </Piece>
  );
}

/** A whole tomato. */
export function Tomato({ size, rotate = 0 }: PieceProps) {
  const p = usePalette();
  return (
    <Piece size={size} rotate={rotate}>
      {(real) => (
        <>
          <Circle cx={50} cy={54} r={34} fill={real ? p.tomato : undefined} />
          {real && <Path d="M50 26 L42 16 M50 26 L58 16 M50 26 L50 12 M50 26 L36 26 M50 26 L64 26" fill="none" stroke={p.ink} strokeWidth={3} />}
          {real && <Path d="M36 46 Q40 40 46 40" fill="none" stroke={p.paper} strokeWidth={3} />}
        </>
      )}
    </Piece>
  );
}

export type Dish = 'skillet' | 'pot' | 'sheet' | 'board';

/**
 * Which piece of kitchen kit a recipe "lives in", guessed from its title and
 * tags so a stew shows a pot and cookies show a sheet tray. Falls back to a
 * stable pick from the id so the same recipe always looks the same.
 */
export function dishFor(title: string, tags: string[] = [], id = ''): Dish {
  const text = `${title} ${tags.join(' ')}`.toLowerCase();
  if (/(soup|stew|chili|curry|braise|bourguignon|broth|ragu|ragù|stock|dal|pho|ramen|risotto|sauce)/.test(text)) return 'pot';
  if (/(bake|baked|cookie|cake|bread|pie|tart|roast|muffin|brownie|focaccia|pizza|sheet|granola|dessert|scone)/.test(text)) return 'sheet';
  if (/(taco|salad|salsa|pico|slaw|sandwich|toast|bowl|wrap|crudo|ceviche|board|snack)/.test(text)) return 'board';
  if (/(pan|fry|fried|sear|saut|skillet|burger|pancake|egg|omelet|stir|gnocchi|pasta|steak)/.test(text)) return 'skillet';
  let h = 0;
  for (const ch of id || title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (['skillet', 'pot', 'sheet', 'board'] as const)[h % 4];
}

export function DishPiece({ dish, size, rotate }: PieceProps & { dish: Dish }) {
  if (dish === 'pot') return <Pot size={size} rotate={rotate} />;
  if (dish === 'sheet') return <SheetTray size={size} rotate={rotate} />;
  if (dish === 'board') return <Board size={size} rotate={rotate} />;
  return <Skillet size={size} rotate={rotate} />;
}
