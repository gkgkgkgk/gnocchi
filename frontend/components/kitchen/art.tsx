/**
 * Picks the drawing that best stands in for a recipe without a photo. Each
 * dish lists words that suggest it; words in the title count most, then tags,
 * then ingredient names. With no clear winner it falls back to the pan, pot,
 * tray or board the dish most likely cooks in.
 */
import { ComponentType } from 'react';
import { ColorTokens } from '@/constants/theme';
import {
  Bowl, Bread, Burger, CakeSlice, Cookies, Drink, Drumstick, Dumplings, Eggs, Fish, IceCream, Muffin,
  Pancakes, Pasta, Pie, Pizza, RiceBowl, Salad, Sandwich, Steak, Sushi, Taco,
} from './foods';
import { Board, Pot, SheetTray, Skillet } from './shapes';

type Ground = 'butterMuted' | 'tomatoMuted' | 'basilMuted';

interface Art {
  key: string;
  Draw: ComponentType<{ size?: number; rotate?: number }>;
  /** Phrases that name the dish. */
  names: string[];
  /** Ingredients that hint at it (weaker). */
  hints?: string[];
  ground: Ground;
  sweet?: boolean;
}

const StewPot = (p: { size?: number; rotate?: number }) => <Pot {...p} filling="cocoa" />;
const SoupBowl = (p: { size?: number; rotate?: number }) => <Bowl {...p} filling="tomato" />;
const GnocchiPan = (p: { size?: number; rotate?: number }) => <Skillet {...p} filling="butter" />;

const ARTS: Art[] = [
  { key: 'taco', Draw: Taco, ground: 'basilMuted', names: ['taco', 'burrito', 'quesadilla', 'fajita', 'enchilada', 'nacho', 'tostada', 'carnitas', 'al pastor'], hints: ['tortilla', 'cilantro', 'salsa'] },
  { key: 'burger', Draw: Burger, ground: 'basilMuted', names: ['burger', 'smash burger', 'slider', 'patty melt', 'sloppy joe'], hints: ['bun', 'ground beef'] },
  { key: 'pizza', Draw: Pizza, ground: 'butterMuted', names: ['pizza', 'flatbread', 'calzone', 'stromboli'], hints: ['mozzarella', 'pizza dough'] },
  { key: 'gnocchi', Draw: GnocchiPan, ground: 'tomatoMuted', names: ['gnocchi'] },
  { key: 'pasta', Draw: Pasta, ground: 'tomatoMuted', names: ['pasta', 'spaghetti', 'linguine', 'fettuccine', 'penne', 'rigatoni', 'lasagna', 'lasagne', 'mac and cheese', 'macaroni', 'carbonara', 'bolognese', 'alfredo', 'ravioli', 'tortellini', 'orzo', 'noodle', 'pad thai', 'lo mein', 'ramen', 'udon', 'cacio e pepe', 'ziti'], hints: ['spaghetti', 'pasta', 'noodles', 'parmesan'] },
  { key: 'stew', Draw: StewPot, ground: 'butterMuted', names: ['stew', 'bourguignon', 'chili', 'goulash', 'ragout', 'ragù', 'ragu', 'braise', 'braised', 'pot roast', 'tagine', 'cassoulet', 'chili con carne', 'gumbo', 'jambalaya'], hints: ['stock', 'broth', 'bay leaf', 'bay leaves', 'red wine'] },
  { key: 'soup', Draw: SoupBowl, ground: 'basilMuted', names: ['soup', 'bisque', 'chowder', 'minestrone', 'gazpacho', 'pho', 'broth', 'congee', 'dal', 'dahl', 'lentil'] },
  { key: 'rice', Draw: RiceBowl, ground: 'basilMuted', names: ['rice', 'curry', 'bibimbap', 'poke', 'biryani', 'paella', 'teriyaki', 'stir fry', 'stir-fry', 'fried rice', 'risotto', 'katsu', 'donburi', 'grain bowl'], hints: ['rice', 'jasmine rice', 'basmati', 'soy sauce', 'coconut milk', 'curry paste'] },
  { key: 'salad', Draw: Salad, ground: 'tomatoMuted', names: ['salad', 'slaw', 'caesar', 'tabbouleh', 'panzanella', 'niçoise', 'nicoise'], hints: ['lettuce', 'arugula', 'romaine', 'mixed greens', 'cucumber', 'vinaigrette'] },
  { key: 'dumplings', Draw: Dumplings, ground: 'tomatoMuted', names: ['dumpling', 'gyoza', 'potsticker', 'wonton', 'bao', 'pierogi', 'momo', 'empanada'], hints: ['wrappers'] },
  { key: 'sushi', Draw: Sushi, ground: 'butterMuted', names: ['sushi', 'maki', 'onigiri', 'sashimi', 'hand roll'], hints: ['nori', 'sushi rice'] },
  { key: 'eggs', Draw: Eggs, ground: 'basilMuted', names: ['eggs', 'omelet', 'omelette', 'frittata', 'shakshuka', 'scramble', 'huevos', 'benedict', 'fried egg', 'breakfast'] },
  { key: 'pancakes', Draw: Pancakes, ground: 'tomatoMuted', sweet: true, names: ['pancake', 'waffle', 'crepe', 'crêpe', 'french toast', 'flapjack', 'dutch baby'], hints: ['buttermilk', 'maple syrup'] },
  { key: 'sandwich', Draw: Sandwich, ground: 'tomatoMuted', names: ['sandwich', 'panini', 'hoagie', 'sub', 'toastie', 'grilled cheese', 'blt', 'club', 'banh mi', 'reuben', 'wrap', 'toast'] },
  { key: 'steak', Draw: Steak, ground: 'butterMuted', names: ['steak', 'ribeye', 'sirloin', 'brisket', 'short rib', 'tenderloin', 'lamb chop', 'pork chop', 'roast beef', 'filet', 'skirt steak', 'flank steak', 'meatloaf'], hints: ['ribeye', 'steak', 'beef'] },
  { key: 'fish', Draw: Fish, ground: 'basilMuted', names: ['fish', 'salmon', 'cod', 'trout', 'halibut', 'tilapia', 'tuna steak', 'sea bass', 'snapper', 'shrimp', 'prawn', 'scallop', 'seafood', 'mussels', 'crab', 'lobster'], hints: ['salmon', 'cod', 'shrimp', 'fish sauce'] },
  { key: 'chicken', Draw: Drumstick, ground: 'basilMuted', names: ['chicken', 'wings', 'drumstick', 'thigh', 'turkey', 'schnitzel', 'nuggets', 'tenders', 'roast chicken'], hints: ['chicken', 'chicken breast', 'chicken thighs'] },
  { key: 'cake', Draw: CakeSlice, ground: 'basilMuted', sweet: true, names: ['cake', 'cheesecake', 'torte', 'tiramisu', 'gateau', 'gâteau', 'bundt', 'layer cake', 'shortcake'], hints: ['frosting', 'icing', 'cake flour'] },
  { key: 'pie', Draw: Pie, ground: 'butterMuted', sweet: true, names: ['pie', 'tart', 'galette', 'cobbler', 'crumble', 'crisp', 'quiche'], hints: ['pie crust', 'pie dough'] },
  { key: 'muffin', Draw: Muffin, ground: 'butterMuted', sweet: true, names: ['muffin', 'cupcake'] },
  { key: 'cookies', Draw: Cookies, ground: 'tomatoMuted', sweet: true, names: ['cookie', 'biscotti', 'shortbread', 'brownie', 'blondie', 'bars', 'macaron', 'snickerdoodle', 'granola'], hints: ['chocolate chips', 'brown sugar', 'baking soda'] },
  { key: 'bread', Draw: Bread, ground: 'basilMuted', names: ['bread', 'loaf', 'focaccia', 'sourdough', 'baguette', 'biscuit', 'scone', 'rolls', 'challah', 'brioche', 'naan', 'pita', 'bagel', 'cornbread'], hints: ['yeast', 'bread flour'] },
  { key: 'iceCream', Draw: IceCream, ground: 'basilMuted', sweet: true, names: ['ice cream', 'gelato', 'sorbet', 'popsicle', 'sundae', 'frozen yogurt', 'semifreddo'] },
  { key: 'drink', Draw: Drink, ground: 'tomatoMuted', names: ['smoothie', 'juice', 'lemonade', 'cocktail', 'latte', 'milkshake', 'shake', 'punch', 'margarita', 'sangria', 'spritz', 'mocktail', 'tea', 'agua fresca'] },
  { key: 'board', Draw: Board, ground: 'basilMuted', names: ['charcuterie', 'bruschetta', 'salsa', 'pico de gallo', 'guacamole', 'dip', 'hummus', 'crudités', 'snack board', 'antipasto'] },
  { key: 'sheet', Draw: SheetTray, ground: 'basilMuted', names: ['sheet pan', 'traybake', 'roasted vegetables', 'roast vegetables'] },
];

const FALLBACKS: Art[] = [
  { key: 'skillet', Draw: Skillet, ground: 'butterMuted', names: [] },
  { key: 'pot', Draw: Pot, ground: 'tomatoMuted', names: [] },
  { key: 'sheet', Draw: SheetTray, ground: 'basilMuted', names: [] },
  { key: 'board', Draw: Board, ground: 'butterMuted', names: [] },
];

function has(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zà-ÿ])${escaped}(e?s)?([^a-zà-ÿ]|$)`, 'i').test(text);
}

export interface ArtPick {
  art: Art;
  /** Stable per-recipe number for arranging garnishes. */
  seed: number;
}

export function pickArt(title: string, tags: string[] = [], ingredients: string[] = [], id = ''): ArtPick {
  let seed = 7;
  for (const ch of id || title) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;

  // The dish is usually the last noun before "with"/"and"/"," — "Carne Asada
  // Tacos", "Chicken Tikka Curry", "Mushroom Bourguignon with Ribeye". Words
  // nearer the end of that head count most; side dishes count a little.
  const t = title.toLowerCase();
  const cut = t.search(/\s+(with|and|&|over|on|in)\s+|,|\(/);
  const head = cut > 0 ? t.slice(0, cut) : t;
  const rest = cut > 0 ? t.slice(cut) : '';
  const tagText = tags.join(' ').toLowerCase();
  const ing = ingredients.map((i) => i.toLowerCase());
  let best: Art | null = null;
  let bestScore = 0;
  for (const art of ARTS) {
    let score = 0;
    for (const n of art.names) {
      if (has(head, n)) {
        const at = head.lastIndexOf(n);
        score = Math.max(score, 10 + 4 * ((at + n.length) / Math.max(head.length, 1)));
      } else if (has(rest, n)) {
        score = Math.max(score, 4);
      }
      if (has(tagText, n)) score += 3;
    }
    for (const h of art.hints ?? []) if (ing.some((i) => has(i, h))) score += 1.5;
    if (score > bestScore) { best = art; bestScore = score; }
  }
  if (best && bestScore >= 3) return { art: best, seed };

  // No named dish: guess the vessel from what goes in it.
  const all = ing.join(' ');
  if (/(flour|sugar|butter).*(flour|sugar|butter)/.test(all) && /(bake|baking|flour)/.test(all)) return { art: FALLBACKS[2], seed };
  if (/(broth|stock|simmer)/.test(all)) return { art: FALLBACKS[1], seed };
  return { art: FALLBACKS[seed % FALLBACKS.length], seed };
}

export function groundColor(colors: ColorTokens, ground: Ground): string {
  return colors[ground];
}
