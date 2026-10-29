import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { inputStyle } from '@/components/ui/Input';
import { Mascot } from '@/components/kitchen/mascot';
import { Tablecloth } from '@/components/kitchen/tablecloth';
import { Bob, easeColors, Pop, Rise } from '@/components/kitchen/motion';
import { Board, Pot, Skillet } from '@/components/kitchen/shapes';
import { fetchUnits } from '@/services/unit-service';
import { createRecipe, fetchRecipeById, setRecipeCover, unitToString, updateRecipe, uploadRecipePhoto } from '@/services/recipe-service';
import { pickImage } from '@/services/image-service';
import { findUnit } from '@/utils/unit-conversion';
import { decimalToFraction, parseIngredientLine, sectionHeading, stripLeadingAmount } from '@/utils/ingredient-formatter';
import { IMPORT_TYPES, originOf, type Origin } from '@/utils/recipe-origin';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { type Theme } from '@/constants/theme';

// Alert.alert() is unreliable on web (silent in some Expo builds), so route
// through window.alert / window.confirm there.
function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
function confirmDiscard(onDiscard: () => void) {
  const message = 'Your changes to this recipe will be lost.';
  if (Platform.OS === 'web') {
    if (window.confirm(`Discard changes?\n\n${message}`)) onDiscard();
  } else {
    Alert.alert('Discard changes?', message, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDiscard },
    ]);
  }
}

interface FormIngredient {
  quantity: string;
  unit: string;
  name: string;
  optional: boolean;
  // Group heading, e.g. "Marinade". null = ungrouped; '' = a heading being typed.
  section: string | null;
}

interface RecipeFormData {
  title: string;
  notes: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: FormIngredient[];
  steps: string[];
  imageUrl: string;
  sourceUrl: string | null;
  sourceType: string | null;
  sourceRecipeId: string | null;
}

type FieldError = 'title' | 'ingredients' | 'steps';

const blankIngredient = (section: string | null = null): FormIngredient =>
  ({ quantity: '', unit: '', name: '', optional: false, section });

const EMPTY: RecipeFormData = {
  title: '', notes: '', prepTime: '', cookTime: '', servings: '',
  ingredients: [blankIngredient()], steps: [''], imageUrl: '',
  sourceUrl: null, sourceType: 'manual', sourceRecipeId: null,
};

/** Quantity as the cook would type it: 0.5 → "1/2", 0 → "". */
function amountText(q: unknown): string {
  const n = typeof q === 'number' ? q : parseFloat(String(q ?? ''));
  return n > 0 ? decimalToFraction(n) : '';
}

/**
 * Add or edit a recipe on one page: the dish, its mise en place, and the
 * method. Imports (link, text, photo, pitch) arrive here pre-filled to check
 * over before saving.
 */
export default function RecipeEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const recipeId = params.id as string | undefined;
  const isEditing = !!recipeId;
  const theme = useTheme();
  const c = theme.colors;
  const { isWide } = useResponsive();
  const styles = makeStyles(theme);

  const [form, setForm] = useState<RecipeFormData>(EMPTY);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);
  // A picked photo (blob:/file: URI) is uploaded once the recipe row exists.
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [showPhotoLink, setShowPhotoLink] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [errors, setErrors] = useState<Set<FieldError>>(new Set());
  const [stepHeights, setStepHeights] = useState<Record<number, number>>({});

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<FieldError, number>>>({});
  const nameRefs = useRef<Record<number, TextInput | null>>({});
  const stepRefs = useRef<Record<number, TextInput | null>>({});
  const [focusNext, setFocusNext] = useState<{ kind: 'ingredient' | 'step'; index: number } | null>(null);

  // --- Loading ----------------------------------------------------------

  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      try {
        const [recipe, units] = await Promise.all([fetchRecipeById(recipeId), fetchUnits().catch(() => [])]);
        if (!recipe) {
          notify('Not found', 'That recipe no longer exists.');
          router.back();
          return;
        }
        setForm({
          title: recipe.title || '',
          notes: recipe.notes || '',
          prepTime: recipe.prep_time ? String(recipe.prep_time) : '',
          cookTime: recipe.cook_time ? String(recipe.cook_time) : '',
          servings: recipe.servings ? String(recipe.servings) : '',
          ingredients: recipe.ingredients?.length
            ? recipe.ingredients.map((ing) => {
                const unit = unitToString(ing.unit);
                return {
                  quantity: amountText(ing.quantity),
                  unit: findUnit(units, unit)?.abbreviation || unit,
                  name: ing.quantity > 0 ? stripLeadingAmount(ing.text || '', unit) : (ing.text || ''),
                  optional: !!ing.optional,
                  section: ing.section || null,
                };
              })
            : [blankIngredient()],
          steps: recipe.steps?.length ? recipe.steps : [''],
          imageUrl: recipe.image_url || '',
          sourceUrl: recipe.source_url ?? null,
          sourceType: recipe.source_type ?? null,
          sourceRecipeId: recipe.source_recipe_id ?? null,
        });
      } catch (error) {
        console.error('Failed to load recipe:', error);
        notify('Error', 'Could not load that recipe.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [recipeId]);

  // Link, text, photo and pitch imports hand over their draft through a global
  // (no URL length limits); the URL param is the older route.
  useEffect(() => {
    const pending = (global as any).__pendingRecipeImport;
    const param = params.importedData;
    if (!pending && typeof param !== 'string') return;
    delete (global as any).__pendingRecipeImport;
    (async () => {
      const imported = pending ?? JSON.parse(param as string);
      const units = await fetchUnits().catch(() => []);
      const ingredients: FormIngredient[] = (imported.ingredients ?? []).map((ing: any) => {
        const qty = parseFloat(ing.quantity) || 0;
        const unit = ing.unit ?? '';
        return {
          quantity: amountText(qty),
          unit: findUnit(units, unit)?.abbreviation || unit,
          name: qty > 0 ? stripLeadingAmount(ing.text || '', unit) : (ing.text || ''),
          optional: !!ing.optional,
          section: ing.section || null,
        };
      });
      setForm({
        ...EMPTY,
        title: imported.title || '',
        notes: imported.notes || '',
        prepTime: parseInt(imported.prepTime, 10) > 0 ? String(parseInt(imported.prepTime, 10)) : '',
        cookTime: parseInt(imported.cookTime, 10) > 0 ? String(parseInt(imported.cookTime, 10)) : '',
        servings: parseInt(imported.servings, 10) > 0 ? String(parseInt(imported.servings, 10)) : '',
        ingredients: ingredients.length ? ingredients : [blankIngredient()],
        steps: imported.steps?.length ? imported.steps : [''],
        imageUrl: imported.localPhotoUri || imported.imageUrl || '',
        sourceUrl: imported.source || null,
        sourceType: imported.sourceType || (imported.source ? 'website' : 'manual'),
      });
      if (imported.localPhotoUri) setLocalPhotoUri(imported.localPhotoUri);
      setImportedFrom(imported.sourceType === 'photo' ? 'your photo'
        : imported.sourceType === 'ai' ? 'your pitch'
        : imported.source ? hostOf(imported.source) : 'your text');
      setDirty(true);
    })();
  }, [params.importedData]);

  // Focus a row that was just added (Enter in a field, or "Add").
  useEffect(() => {
    if (!focusNext) return;
    const ref = focusNext.kind === 'ingredient' ? nameRefs.current[focusNext.index] : stepRefs.current[focusNext.index];
    ref?.focus();
    setFocusNext(null);
  }, [focusNext, form]);

  // --- Editing ----------------------------------------------------------

  const edit = (patch: Partial<RecipeFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const clearError = (e: FieldError) =>
    setErrors((prev) => (prev.has(e) ? new Set([...prev].filter((x) => x !== e)) : prev));

  const setIngredient = (index: number, patch: Partial<FormIngredient>) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    }));
    setDirty(true);
    if (patch.name) clearError('ingredients');
  };

  const insertIngredient = (afterIndex: number) => {
    setForm((prev) => {
      const ingredients = [...prev.ingredients];
      ingredients.splice(afterIndex + 1, 0, blankIngredient(prev.ingredients[afterIndex]?.section ?? null));
      return { ...prev, ingredients };
    });
    setFocusNext({ kind: 'ingredient', index: afterIndex + 1 });
  };

  const removeIngredient = (index: number) => {
    setForm((prev) => {
      const ingredients = prev.ingredients.filter((_, i) => i !== index);
      return { ...prev, ingredients: ingredients.length ? ingredients : [blankIngredient()] };
    });
    setDirty(true);
  };

  const addSection = () => {
    setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, blankIngredient('')] }));
    setDirty(true);
  };

  const renameSection = (indices: number[], name: string) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (indices.includes(i) ? { ...ing, section: name } : ing)),
    }));
    setDirty(true);
  };

  // Drop a heading; its ingredients join the group above it.
  const removeSection = (indices: number[]) => {
    setForm((prev) => {
      const above = indices[0] > 0 ? prev.ingredients[indices[0] - 1].section : null;
      return {
        ...prev,
        ingredients: prev.ingredients.map((ing, i) => (indices.includes(i) ? { ...ing, section: above } : ing)),
      };
    });
    setDirty(true);
  };

  /** Turn a pasted list into rows, honouring "For the sauce:" headings. */
  const addPastedList = () => {
    const parsed: FormIngredient[] = [];
    let section: string | null = form.ingredients[form.ingredients.length - 1]?.section ?? null;
    for (const raw of pasteText.split('\n')) {
      if (!raw.trim()) continue;
      const heading = sectionHeading(raw);
      if (heading) { section = heading; continue; }
      const p = parseIngredientLine(raw);
      if (!p.name) continue;
      parsed.push({ quantity: amountText(p.quantity), unit: p.unit, name: p.name, optional: p.optional, section });
    }
    if (!parsed.length) return;
    setForm((prev) => {
      const kept = prev.ingredients.filter((ing) => ing.name.trim() || ing.quantity.trim());
      return { ...prev, ingredients: [...kept, ...parsed] };
    });
    setDirty(true);
    clearError('ingredients');
    setPasteText('');
    setPasteOpen(false);
  };

  const setStep = (index: number, value: string) => {
    // Enter (or pasting several paragraphs) splits into separate steps.
    if (value.includes('\n')) {
      const parts = value.split(/\n+/).map((s) => s.replace(/^\s*(?:\d+[.)]|step \d+:?)\s*/i, '').trim());
      const [first, ...rest] = parts;
      const extra = rest.filter(Boolean);
      setForm((prev) => {
        const steps = [...prev.steps];
        steps.splice(index, 1, first, ...(extra.length ? extra : ['']));
        return { ...prev, steps };
      });
      setFocusNext({ kind: 'step', index: index + Math.max(extra.length, 1) });
    } else {
      setForm((prev) => ({ ...prev, steps: prev.steps.map((s, i) => (i === index ? value : s)) }));
    }
    setDirty(true);
    if (value.trim()) clearError('steps');
  };

  const addStep = () => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, ''] }));
    setFocusNext({ kind: 'step', index: form.steps.length });
  };

  const removeStep = (index: number) => {
    setForm((prev) => {
      const steps = prev.steps.filter((_, i) => i !== index);
      return { ...prev, steps: steps.length ? steps : [''] };
    });
    setDirty(true);
  };

  const pickPhoto = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        setLocalPhotoUri(uri);
        edit({ imageUrl: uri });
      }
    } catch (error: any) {
      notify('Photo', error?.message || 'Could not open that photo.');
    }
  };

  const close = () => {
    const leave = () => (router.canGoBack() ? router.back() : router.replace('/(drawer)/(tabs)' as any));
    if (dirty && !saving) confirmDiscard(leave);
    else leave();
  };

  // --- Saving -----------------------------------------------------------

  const validate = (): FieldError[] => {
    const out: FieldError[] = [];
    if (!form.title.trim()) out.push('title');
    if (!form.ingredients.some((i) => i.name.trim())) out.push('ingredients');
    if (!form.steps.some((s) => s.trim())) out.push('steps');
    return out;
  };

  const save = async () => {
    const problems = validate();
    if (problems.length) {
      setErrors(new Set(problems));
      const y = sectionY.current[problems[0]];
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      return;
    }
    setErrors(new Set());
    setSaving(true);
    try {
      const isLocalPhoto = !!localPhotoUri && form.imageUrl === localPhotoUri;
      const data = {
        title: form.title.trim(),
        ingredients: form.ingredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            // The amount and unit are stored separately; text is just the name.
            text: ing.name.trim(),
            quantity: ing.quantity.trim(),
            unitAbbreviation: ing.unit.trim(),
            optional: ing.optional,
            section: ing.section?.trim() || null,
          })),
        steps: form.steps.map((s) => s.trim()).filter(Boolean),
        image_url: isLocalPhoto ? undefined : (form.imageUrl.trim() || undefined),
        notes: form.notes.trim() || null,
        source_url: form.sourceUrl,
        source_type: form.sourceType ?? 'manual',
        source_recipe_id: form.sourceRecipeId,
        metadata: { prepTime: form.prepTime, cookTime: form.cookTime, servings: form.servings },
      };
      const saved = isEditing ? await updateRecipe(recipeId!, data) : await createRecipe(data);
      const savedId = isEditing ? recipeId! : saved.id;
      // setRecipeCover is a cover-only PATCH, so it can't clobber the rest.
      if (isLocalPhoto) {
        const photo = await uploadRecipePhoto(savedId, localPhotoUri!);
        await setRecipeCover(savedId, photo.key);
      }
      setDirty(false);
      router.replace(`/recipe/${savedId}` as any);
    } catch (error) {
      console.error('Save failed:', error);
      notify('Not saved', 'Something went wrong saving this recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Rendering --------------------------------------------------------

  const groups = (() => {
    const out: { section: string | null; indices: number[] }[] = [];
    form.ingredients.forEach((ing, index) => {
      const last = out[out.length - 1];
      // '' stays apart from null so a heading being retyped doesn't vanish.
      if (last && last.section === ing.section) last.indices.push(index);
      else out.push({ section: ing.section, indices: [index] });
    });
    return out;
  })();
  const filledIngredients = form.ingredients.filter((i) => i.name.trim()).length;

  const markSection = (key: FieldError) => (e: LayoutChangeEvent) => { sectionY.current[key] = e.nativeEvent.layout.y; };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Bob><Mascot size={96} /></Bob>
        <ActivityIndicator color={c.accent} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const field = (focusKey?: boolean) => [inputStyle(theme), styles.field, focusKey && null];

  const renderIngredientRow = (ing: FormIngredient, index: number) => (
    <IngredientRow
      key={index}
      ing={ing}
      index={index}
      wide={isWide}
      nameRef={(r) => { nameRefs.current[index] = r; }}
      onChange={(patch) => setIngredient(index, patch)}
      onSubmit={() => insertIngredient(index)}
      onRemove={() => removeIngredient(index)}
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Tablecloth />
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: c.outline }]}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
          style={[styles.closeBtn, { borderColor: c.outline, backgroundColor: c.bgElevated, ...theme.shadow.sm }]}>
          <Ionicons name="close" size={20} color={c.fg} />
        </Pressable>
        <Text variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {isEditing ? 'Edit recipe' : 'New recipe'}
        </Text>
        <Button size="sm" onPress={save} loading={saving} disabled={saving}>Save</Button>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, isWide && styles.contentWide]} keyboardShouldPersistTaps="handled">
        {importedFrom && (
          <View style={[styles.importNote, { backgroundColor: c.butterMuted, borderColor: c.outline }]}>
            <Mascot size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Read from {importedFrom}.</Text>
              <Text variant="small" color="fgMuted">Check the amounts and steps, then save.</Text>
            </View>
          </View>
        )}

        {/* The dish */}
        <Rise index={0}>
        <View style={styles.panel} onLayout={markSection('title')}>
          <PanelTab label="The dish" art={<Skillet size={40} rotate={-30} />} />
          <TextInput
            value={form.title}
            onChangeText={(v) => { edit({ title: v }); if (v.trim()) clearError('title'); }}
            placeholder="Name this dish"
            placeholderTextColor={c.fgSubtle}
            accessibilityLabel="Recipe name"
            style={[styles.titleInput, { color: c.fg, borderBottomColor: errors.has('title') ? c.danger : c.outline }]}
          />
          {errors.has('title') && <Text variant="small" color="danger" style={{ marginTop: 6 }}>Give it a name.</Text>}

          <View style={[styles.dishRow, !isWide && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <Pressable
              onPress={pickPhoto}
              accessibilityRole="button"
              accessibilityLabel={form.imageUrl ? 'Change photo' : 'Add a photo'}
              style={[styles.photo, !isWide && { width: '100%', height: 120 }, { borderColor: form.imageUrl ? c.outline : c.borderStrong, backgroundColor: c.bgMuted }]}
            >
              {form.imageUrl ? (
                <>
                  <Image source={{ uri: form.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable
                    onPress={() => { setLocalPhotoUri(null); edit({ imageUrl: '' }); }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    style={[styles.photoRemove, { backgroundColor: c.bgElevated, borderColor: c.outline }]}
                  >
                    <Ionicons name="close" size={16} color={c.fg} />
                  </Pressable>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={26} color={c.fgMuted} />
                  <Text variant="label" color="fgMuted" style={{ marginTop: 4 }}>Add a photo</Text>
                </>
              )}
            </Pressable>

            <View style={{ flex: 1, gap: 12 }}>
              <View style={styles.facts}>
                <Fact label="Prep" suffix="min" value={form.prepTime} onChange={(v) => edit({ prepTime: v.replace(/[^\d]/g, '') })} />
                <Fact label="Cook" suffix="min" value={form.cookTime} onChange={(v) => edit({ cookTime: v.replace(/[^\d]/g, '') })} />
                <Fact label="Serves" value={form.servings} onChange={(v) => edit({ servings: v.replace(/[^\d]/g, '') })} />
              </View>
              <View>
                <Text variant="label" color="fgMuted" style={{ marginBottom: 6 }}>Where&apos;s it from?</Text>
                <View style={styles.origins} accessibilityRole="radiogroup">
                  {ORIGINS.map((o) => {
                    const on = originOf(form.sourceType, form.sourceRecipeId, form.sourceUrl) === o.key;
                    return (
                      <Chip
                        key={o.key}
                        size="sm"
                        variant={on ? 'accent' : 'outline'}
                        onPress={() => edit({ sourceType: on ? form.sourceType : o.sourceType(form.sourceType, form.sourceUrl) })}
                        icon={<Ionicons name={o.icon} size={13} color={on ? c.accent : c.fgMuted} />}
                      >
                        {o.label}
                      </Chip>
                    );
                  })}
                </View>
              </View>
              {showPhotoLink || (form.imageUrl && !localPhotoUri) ? (
                <TextInput
                  value={localPhotoUri ? '' : form.imageUrl}
                  onChangeText={(v) => { setLocalPhotoUri(null); edit({ imageUrl: v }); }}
                  placeholder="Image link (https://…)"
                  placeholderTextColor={c.fgSubtle}
                  autoCapitalize="none"
                  keyboardType="url"
                  accessibilityLabel="Image link"
                  style={[...field()]}
                />
              ) : (
                <Pressable onPress={() => setShowPhotoLink(true)} hitSlop={6} accessibilityRole="button">
                  <Text variant="small" color="fgMuted" style={{ textDecorationLine: 'underline' }}>Use an image link instead</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        </Rise>

        {/* Mise en place */}
        <Rise index={1}>
        <View style={[styles.panel, errors.has('ingredients') && { borderColor: c.danger }]} onLayout={markSection('ingredients')}>
          <PanelTab
            label="Ingredients"
            count={filledIngredients || undefined}
            art={<Board size={42} rotate={-10} />}
            action={!pasteOpen ? (
              <Button size="sm" variant="secondary" onPress={() => setPasteOpen(true)} icon={<Ionicons name="clipboard-outline" size={15} color={c.fg} />}>
                Paste a list
              </Button>
            ) : undefined}
          />
          {errors.has('ingredients') && <Text variant="small" color="danger" style={{ marginBottom: 10 }}>Add at least one ingredient.</Text>}

          {pasteOpen && (
            <View style={[styles.pasteBox, { borderColor: c.outline, backgroundColor: c.butterMuted }]}>
              <Text variant="small" color="fgMuted">
                One ingredient per line, like “1/2 cup orange juice”. A line like “For the marinade:” starts a section.
              </Text>
              <TextInput
                value={pasteText}
                onChangeText={setPasteText}
                multiline
                autoFocus
                placeholder={'2 cloves garlic, minced\n1/4 cup lime juice\nsalt (optional)'}
                placeholderTextColor={c.fgSubtle}
                textAlignVertical="top"
                accessibilityLabel="Ingredient list"
                style={[...field(), { minHeight: 130, marginTop: 10, lineHeight: 22 }]}
              />
              <View style={styles.pasteActions}>
                <Button size="sm" variant="ghost" onPress={() => { setPasteOpen(false); setPasteText(''); }}>Cancel</Button>
                <Button size="sm" onPress={addPastedList} disabled={!pasteText.trim()}>Add these</Button>
              </View>
            </View>
          )}

          {groups.map((group) => (
            <View key={group.indices[0]} style={{ marginTop: group.section !== null ? 14 : 0 }}>
              {group.section !== null && (
                <View style={styles.sectionRow}>
                  <TextInput
                    value={group.section}
                    onChangeText={(v) => renameSection(group.indices, v)}
                    placeholder="Section, e.g. Marinade"
                    placeholderTextColor={c.fgSubtle}
                    autoFocus={group.section === ''}
                    accessibilityLabel="Section name"
                    style={[styles.sectionInput, { color: c.accent, borderBottomColor: c.borderStrong }]}
                  />
                  <Pressable onPress={() => removeSection(group.indices)} accessibilityRole="button" accessibilityLabel="Remove section heading" hitSlop={6} style={styles.iconBtn}>
                    <Ionicons name="close" size={18} color={c.fgSubtle} />
                  </Pressable>
                </View>
              )}
              {group.indices.map((index) => renderIngredientRow(form.ingredients[index], index))}
              <Pressable
                onPress={() => insertIngredient(group.indices[group.indices.length - 1])}
                accessibilityRole="button"
                style={styles.addLink}
                hitSlop={4}
              >
                <Ionicons name="add" size={18} color={c.accent} />
                <Text variant="smallMedium" color="accent">
                  {group.section ? `Add to ${group.section}` : 'Add ingredient'}
                </Text>
              </Pressable>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Pressable onPress={addSection} accessibilityRole="button" style={styles.addLink} hitSlop={4}>
            <Ionicons name="albums-outline" size={17} color={c.fgMuted} />
            <Text variant="smallMedium" color="fgMuted">Add a section, like a marinade or sauce</Text>
          </Pressable>
        </View>

        </Rise>

        {/* Method */}
        <Rise index={2}>
        <View style={[styles.panel, errors.has('steps') && { borderColor: c.danger }]} onLayout={markSection('steps')}>
          <PanelTab label="Method" count={form.steps.filter((s) => s.trim()).length || undefined} art={<Pot size={42} />} />
          {errors.has('steps') && <Text variant="small" color="danger" style={{ marginBottom: 10 }}>Add at least one step.</Text>}
          {form.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Burner n={index + 1} lit={!!step.trim()} />
              <TextInput
                ref={(r) => { stepRefs.current[index] = r; }}
                value={step}
                onChangeText={(v) => setStep(index, v)}
                onContentSizeChange={(e) => {
                  // Web reports scrollHeight (text + padding); native reports
                  // the text alone. Either way, settle on the box height.
                  const content = e.nativeEvent.contentSize.height;
                  const h = Platform.OS === 'web' ? content + 4 : content + 26;
                  setStepHeights((prev) => (Math.abs((prev[index] ?? 0) - h) < 2 ? prev : { ...prev, [index]: h }));
                }}
                multiline
                placeholder={index === 0 ? 'What happens first? Press Enter for the next step.' : `Step ${index + 1}`}
                placeholderTextColor={c.fgSubtle}
                textAlignVertical="top"
                accessibilityLabel={`Step ${index + 1}`}
                style={[...field(), { flex: 1, lineHeight: 22, height: Math.max(46, stepHeights[index] ?? 46) }]}
              />
              <Pressable onPress={() => removeStep(index)} accessibilityRole="button" accessibilityLabel={`Remove step ${index + 1}`} hitSlop={6} style={[styles.iconBtn, { marginTop: 8 }]}>
                <Ionicons name="close" size={18} color={c.fgSubtle} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addStep} accessibilityRole="button" style={styles.addLink} hitSlop={4}>
            <Ionicons name="add" size={18} color={c.accent} />
            <Text variant="smallMedium" color="accent">Add step</Text>
          </Pressable>
        </View>

        </Rise>

        {/* Notes */}
        <Rise index={3}>
        <View style={styles.panel}>
          <PanelTab label="Notes" />
          <TextInput
            value={form.notes}
            onChangeText={(v) => edit({ notes: v })}
            multiline
            placeholder="Tips, swaps, where it came from"
            placeholderTextColor={c.fgSubtle}
            textAlignVertical="top"
            accessibilityLabel="Notes"
            style={[...field(), { minHeight: 96, lineHeight: 22 }]}
          />
        </View>

        </Rise>

        <Button size="lg" fullWidth onPress={save} loading={saving} disabled={saving} style={{ marginTop: 8 }}>
          {isEditing ? 'Save changes' : 'Save recipe'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const ORIGINS: {
  key: Origin;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  sourceType: (current: string | null, url: string | null) => string;
}[] = [
  { key: 'made', label: 'Made by me', icon: 'bookmark-outline', sourceType: () => 'manual' },
  { key: 'adapted', label: 'Adapted', icon: 'git-branch-outline', sourceType: () => 'adapted' },
  // Keep the specific import kind when there is one.
  { key: 'imported', label: 'Imported', icon: 'download-outline', sourceType: (cur, url) => (cur && IMPORT_TYPES.includes(cur) ? cur : url ? 'website' : 'text') },
  { key: 'ai', label: 'AI idea', icon: 'sparkles-outline', sourceType: () => 'ai' },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the link';
  }
}

/** A panel's heading: a little label tab, an optional kitchen piece and action. */
function PanelTab({ label, count, art, action }: { label: string; count?: number; art?: React.ReactNode; action?: React.ReactNode }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, minHeight: 36 }}>
      {art}
      <Text variant="h2" accessibilityRole="header">{label}</Text>
      {count ? (
        <View style={{ minWidth: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: c.outline, backgroundColor: c.butter, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text variant="label" style={{ fontSize: 12 }}>{count}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      {action}
    </View>
  );
}

/** A stove burner holding the step number; lights up once the step has text. */
function Burner({ n, lit }: { n: number; lit: boolean }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Pop
      trigger={lit}
      style={{
        width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: c.outline,
        backgroundColor: lit ? c.tomato : c.bgElevated, alignItems: 'center', justifyContent: 'center', marginTop: 4,
      }}
    >
      <View style={{ position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: lit ? c.accentFg : c.borderStrong, opacity: 0.8 }} />
      <Text variant="label" style={{ color: lit ? c.accentFg : c.fg, fontSize: 13 }}>{n}</Text>
    </Pop>
  );
}

/** A small labelled number field for times and servings. */
function Fact({ label, suffix, value, onChange }: { label: string; suffix?: string; value: string; onChange: (v: string) => void }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text variant="label" color="fgMuted" style={{ marginBottom: 6 }}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholder="–"
          placeholderTextColor={c.fgSubtle}
          accessibilityLabel={suffix ? `${label} time in minutes` : label}
          style={[inputStyle(theme), { paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, paddingRight: suffix ? 40 : 12 }]}
        />
        {suffix && <Text variant="small" color="fgSubtle" style={{ position: 'absolute', right: 12 }}>{suffix}</Text>}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: theme.outlineWidth, backgroundColor: c.bg,
    },
    closeBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 64, gap: 22 },
    contentWide: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingTop: 28 },
    importNote: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.radius.lg, borderWidth: 2 },
    panel: {
      backgroundColor: c.bgElevated,
      borderRadius: theme.radius.xl,
      borderWidth: theme.outlineWidth,
      borderColor: c.outline,
      padding: 18,
      ...theme.shadow.md,
    },
    titleInput: {
      ...theme.type.h1,
      fontSize: 30,
      lineHeight: 36,
      paddingVertical: 6,
      borderBottomWidth: 2,
      outlineStyle: 'none',
    } as any,
    dishRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginTop: 18 },
    photo: {
      width: 132, height: 132, borderRadius: theme.radius.lg, borderWidth: 2, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    facts: { flexDirection: 'row', gap: 10 },
    origins: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    field: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
    iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, marginLeft: 26 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    sectionInput: {
      ...theme.type.label, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase',
      flex: 1, paddingVertical: 6, borderBottomWidth: 2, outlineStyle: 'none',
    } as any,
    divider: { height: 2, borderRadius: 1, marginVertical: 8 },
    pasteBox: { borderWidth: 2, borderRadius: theme.radius.lg, padding: 14, marginBottom: 14 },
    pasteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  });
}

/**
 * One line of the mise en place: a prep bowl that fills once the ingredient
 * is named, then amount, unit and name in a single outlined strip. On phones
 * the name gets its own line above the amount and unit.
 */
function IngredientRow({ ing, index, wide, nameRef, onChange, onSubmit, onRemove }: {
  ing: FormIngredient;
  index: number;
  wide: boolean;
  nameRef: (r: TextInput | null) => void;
  onChange: (patch: Partial<FormIngredient>) => void;
  onSubmit: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const [focused, setFocused] = useState(false);
  const focus = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
  const cell = [styles.cell, { color: c.fg, fontFamily: theme.type.body.fontFamily }];
  const rule = { borderColor: c.border };

  const amount = (
    <TextInput {...focus} value={ing.quantity} onChangeText={(v) => onChange({ quantity: v })}
      placeholder="Amt" placeholderTextColor={c.fgSubtle} keyboardType="numbers-and-punctuation"
      accessibilityLabel={`Amount for ingredient ${index + 1}`} style={[...cell, styles.amountCell]} />
  );
  const unit = (
    <TextInput {...focus} value={ing.unit} onChangeText={(v) => onChange({ unit: v })}
      placeholder="unit" placeholderTextColor={c.fgSubtle} autoCapitalize="none"
      accessibilityLabel={`Unit for ingredient ${index + 1}`} style={[...cell, styles.unitCell, { borderLeftWidth: 2 }, rule]} />
  );
  const name = (
    <TextInput {...focus} ref={nameRef} value={ing.name} onChangeText={(v) => onChange({ name: v })}
      onSubmitEditing={onSubmit} blurOnSubmit={false} returnKeyType="next"
      placeholder={index === 0 ? 'Ingredient, e.g. olive oil' : 'Ingredient'} placeholderTextColor={c.fgSubtle}
      accessibilityLabel={`Ingredient ${index + 1}`}
      style={[...cell, { flex: 1, minWidth: 0, fontFamily: theme.type.bodyMedium.fontFamily, fontWeight: '500' }, wide && { borderLeftWidth: 2 }, rule]} />
  );
  const optional = (
    <Pressable onPress={() => onChange({ optional: !ing.optional })} accessibilityRole="switch"
      accessibilityState={{ checked: ing.optional }} accessibilityLabel="Optional"
      style={[styles.optToggle, ing.optional && { backgroundColor: c.butterMuted, borderColor: c.outline }]}>
      <Text variant="label" style={{ fontSize: 12, color: ing.optional ? c.fg : c.fgSubtle }}>optional</Text>
    </Pressable>
  );

  return (
    <Rise style={styles.ingredientRow}>
      <Pop trigger={!!ing.name.trim()} style={[styles.bowl, easeColors, { borderColor: c.outline, backgroundColor: ing.name.trim() ? (ing.optional ? c.butterMuted : c.butter) : c.bgElevated }]} />
      <View style={[
        styles.strip,
        { borderColor: focused ? c.outline : c.borderStrong, backgroundColor: c.bgElevated },
        focused && { shadowColor: c.accent, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
      ]}>
        {wide ? (
          <View style={styles.stripLine}>{amount}{unit}{name}{optional}</View>
        ) : (
          <>
            <View style={styles.stripLine}>{name}</View>
            <View style={[styles.stripLine, { borderTopWidth: 2 }, rule]}>{amount}{unit}<View style={{ flex: 1 }} />{optional}</View>
          </>
        )}
      </View>
      <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${ing.name || 'ingredient'}`}
        hitSlop={6} style={[styles.iconBtn, { marginTop: 8 }]}>
        <Ionicons name="close" size={18} color={c.fgSubtle} />
      </Pressable>
    </Rise>
  );
}

const styles = StyleSheet.create({
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bowl: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, marginTop: 15 },
  strip: { flex: 1, borderWidth: 2, borderRadius: 12, overflow: 'hidden' },
  stripLine: { flexDirection: 'row', alignItems: 'center' },
  cell: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, outlineStyle: 'none' } as any,
  amountCell: { width: 64, textAlign: 'center' },
  unitCell: { width: 74 },
  optToggle: { borderWidth: 2, borderColor: 'transparent', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginHorizontal: 6 },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
});
