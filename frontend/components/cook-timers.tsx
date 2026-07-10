import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

const TIMER_DONE_SOUND = require('@/assets/sounds/timer-done.wav');

import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Chip } from './ui/Chip';
import { useTheme } from '@/hooks/use-theme';
import { useWakeLock } from '@/hooks/use-wake-lock';

export interface TimerSuggestion {
  label: string;
  seconds: number;
}

interface CookTimer {
  id: string;
  label: string;
  total: number;      // seconds the timer was set to
  remaining: number;  // seconds left
  running: boolean;
  finished: boolean;
}

interface CookTimersProps {
  /** Quick-add chips derived from the recipe steps (e.g. "Bake · 20m"). */
  suggestions?: TimerSuggestion[];
}

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function CookTimers({ suggestions = [] }: CookTimersProps) {
  const theme = useTheme();
  const c = theme.colors;

  const [timers, setTimers] = useState<CookTimer[]>([]);
  const timersRef = useRef<CookTimer[]>([]);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  const audioRef = useRef<AudioContext | null>(null);
  // Native audio: a real chime plays when a timer finishes (Web Audio handles
  // the web case below). Included in Expo Go, so no dev build needed.
  const player = useAudioPlayer(TIMER_DONE_SOUND);
  const anyRunning = timers.some((t) => t.running);

  // Keep the screen on while a timer is counting down.
  useWakeLock(anyRunning);

  // Let the chime play even when the phone's ringer is on silent.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
  }, []);

  const commit = (next: CookTimer[]) => {
    timersRef.current = next;
    setTimers(next);
  };

  // Prime an AudioContext on a user gesture so the finish beep is allowed to
  // play later (browsers block audio started without prior interaction).
  const ensureAudio = () => {
    if (Platform.OS !== 'web') return;
    try {
      if (!audioRef.current) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC) audioRef.current = new AC();
      }
      audioRef.current?.resume?.();
    } catch {
      /* audio unavailable */
    }
  };

  // One triple-beep (web only — uses the primed AudioContext).
  const webBeep = () => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const beep = (offset: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t0 = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      osc.start(t0);
      osc.stop(t0 + 0.42);
    };
    try { beep(0); beep(0.5); beep(1.0); } catch { /* ignore */ }
  };

  const beepLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anyFinished = timers.some((t) => t.finished);

  const stopAlarm = () => {
    if (beepLoopRef.current) {
      clearInterval(beepLoopRef.current);
      beepLoopRef.current = null;
    }
    if (Platform.OS !== 'web') {
      try { player.pause(); player.loop = false; } catch { /* ignore */ }
    }
  };

  // Keep the alarm sounding as long as *any* finished timer is unacknowledged.
  // It stops the moment the user resets, restarts, or removes it.
  useEffect(() => {
    if (!anyFinished) {
      stopAlarm();
      return;
    }
    if (Platform.OS === 'web') {
      ensureAudio();
      webBeep(); // immediate
      if (!beepLoopRef.current) beepLoopRef.current = setInterval(webBeep, 1600);
    } else {
      try {
        player.loop = true;
        player.seekTo(0);
        player.play();
      } catch {
        /* ignore */
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    return () => {
      // Cleanup when the finished-state flips or the component unmounts.
      if (beepLoopRef.current) {
        clearInterval(beepLoopRef.current);
        beepLoopRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyFinished]);

  // Belt-and-suspenders: stop audio if the panel unmounts mid-alarm.
  useEffect(() => () => stopAlarm(), []);

  // Single 1s tick drives every running timer. Uses a ref as the source of
  // truth so the finish beep fires exactly once (not double-invoked like a
  // setState updater would be in dev strict mode).
  useEffect(() => {
    const interval = setInterval(() => {
      const prev = timersRef.current;
      if (!prev.some((t) => t.running)) return;
      const next = prev.map((t) => {
        if (!t.running || t.finished) return t;
        const remaining = t.remaining - 1;
        if (remaining <= 0) {
          // Alarm start/stop is handled by the `anyFinished` effect.
          return { ...t, remaining: 0, running: false, finished: true };
        }
        return { ...t, remaining };
      });
      commit(next);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTimer = (secs: number, name: string) => {
    if (secs <= 0) return;
    ensureAudio();
    const timer: CookTimer = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: name.trim() || 'Timer',
      total: secs,
      remaining: secs,
      running: true,
      finished: false,
    };
    commit([...timersRef.current, timer]);
    setAdding(false);
    setLabel('');
    setMinutes('');
    setSeconds('');
  };

  const handleAddFromForm = () => {
    const secs = (parseInt(minutes || '0', 10) || 0) * 60 + (parseInt(seconds || '0', 10) || 0);
    addTimer(secs, label);
  };

  const toggle = (id: string) => {
    ensureAudio();
    commit(
      timersRef.current.map((t) =>
        t.id === id
          ? t.finished
            ? { ...t, remaining: t.total, finished: false, running: true } // restart a finished timer
            : { ...t, running: !t.running }
          : t,
      ),
    );
  };

  const reset = (id: string) =>
    commit(timersRef.current.map((t) => (t.id === id ? { ...t, remaining: t.total, running: false, finished: false } : t)));

  const remove = (id: string) => commit(timersRef.current.filter((t) => t.id !== id));

  return (
    <View style={[styles.panel, { backgroundColor: c.bgMuted, borderRadius: theme.radius.lg }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Ionicons name="timer-outline" size={20} color={c.accent} />
          <Text variant="h3">Timers</Text>
          {anyRunning && (
            <View style={styles.awakeBadge}>
              <Ionicons name="eye-outline" size={12} color={c.success} />
              <Text variant="caption" style={{ color: c.success }}>screen on</Text>
            </View>
          )}
        </View>
        {!adding && (
          <Pressable onPress={() => { ensureAudio(); setAdding(true); }} hitSlop={8} style={styles.addLink}>
            <Ionicons name="add" size={18} color={c.accent} />
            <Text variant="smallMedium" style={{ color: c.accent }}>Add</Text>
          </Pressable>
        )}
      </View>

      {/* Quick-add chips from the recipe steps */}
      {!adding && suggestions.length > 0 && (
        <View style={styles.suggestRow}>
          {suggestions.map((s, i) => (
            <Chip key={i} size="sm" variant="outline" onPress={() => addTimer(s.seconds, s.label)}
              icon={<Ionicons name="add" size={12} color={c.fg} />}>
              {`${s.label} · ${fmt(s.seconds)}`}
            </Chip>
          ))}
        </View>
      )}

      {/* Add form */}
      {adding && (
        <View style={styles.addForm}>
          <Input
            value={label}
            onChangeText={setLabel}
            placeholder="Name (e.g. Pasta)"
            autoFocus
          />
          <View style={styles.timeInputs}>
            <Input
              value={minutes}
              onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, ''))}
              placeholder="min"
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
              style={{ textAlign: 'center' }}
            />
            <Text variant="h2" color="fgSubtle">:</Text>
            <Input
              value={seconds}
              onChangeText={(t) => setSeconds(t.replace(/[^0-9]/g, ''))}
              placeholder="sec"
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
              style={{ textAlign: 'center' }}
            />
          </View>
          <View style={styles.presetRow}>
            {[1, 5, 10, 15, 20].map((m) => (
              <Chip key={m} size="sm" onPress={() => { setMinutes(String(m)); setSeconds(''); }}>
                {`${m}m`}
              </Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Button variant="ghost" onPress={() => { setAdding(false); setLabel(''); setMinutes(''); setSeconds(''); }} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button onPress={handleAddFromForm} style={{ flex: 2 }} icon={<Ionicons name="play" size={16} color={c.accentFg} />}>
              Start timer
            </Button>
          </View>
        </View>
      )}

      {/* Active timers */}
      {timers.length === 0 && !adding && (
        <Text variant="small" color="fgSubtle" style={{ marginTop: theme.spacing.sm }}>
          No timers yet. Add one and it&apos;ll beep when it&apos;s done.
        </Text>
      )}

      {timers.map((t) => (
        <View
          key={t.id}
          style={[
            styles.timerRow,
            {
              backgroundColor: t.finished ? c.accentMuted : c.bgElevated,
              borderRadius: theme.radius.md,
              borderColor: t.finished ? c.accent : c.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="smallMedium" color={t.finished ? 'accent' : 'fgMuted'}>
              {t.finished ? `${t.label} — done!` : t.label}
            </Text>
            <Text style={[styles.countdown, { color: t.finished ? c.accent : c.fg }]}>
              {fmt(t.remaining)}
            </Text>
          </View>
          <View style={styles.timerControls}>
            <Pressable onPress={() => toggle(t.id)} hitSlop={6} style={[styles.ctrlBtn, { backgroundColor: c.accent }]}>
              <Ionicons name={t.finished ? 'refresh' : t.running ? 'pause' : 'play'} size={18} color={c.accentFg} />
            </Pressable>
            <Pressable onPress={() => reset(t.id)} hitSlop={6} style={[styles.ctrlBtn, { backgroundColor: c.bgMuted }]}>
              <Ionicons name="refresh-outline" size={16} color={c.fgMuted} />
            </Pressable>
            <Pressable onPress={() => remove(t.id)} hitSlop={6} style={[styles.ctrlBtn, { backgroundColor: c.bgMuted }]}>
              <Ionicons name="close" size={16} color={c.fgMuted} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  awakeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addForm: { gap: 10 },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  countdown: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 38 },
  timerControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ctrlBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
