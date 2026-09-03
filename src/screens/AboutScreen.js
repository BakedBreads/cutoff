import React from 'react';
import { View, Text, Linking, Alert, Platform } from 'react-native';
import { C, T, MONO } from '../theme';
import { human } from '../format';
import { CONTACT_EMAIL } from '../presets';
import { canHardBlock, uninstallSelf } from '../blocker';
import { summarise } from '../components/Stats';
import { Screen, Hard, Button, Kicker, Body } from '../components/ui';
import { Enter } from '../components/motion';
import { Wordmark, IconShield, IconAlert, IconChart, IconTrash } from '../icons';

const VERSION = '1.7.0';

export default function AboutScreen({ history, apps, onBack }) {
  const stats = summarise(history);
  const totalMins = history.reduce((sum, h) => sum + h.actualMs / 60000, 0);

  const mail = async () => {
    const url =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent(`Cutoff ${VERSION} feedback`)}` +
      `&body=${encodeURIComponent(
        `\n\n---\nCutoff ${VERSION} · ${Platform.OS} ${Platform.Version}\n` +
          `${canHardBlock ? 'hard block' : 'timer mode'} · ${apps.length} apps · ` +
          `${history.length} sessions`
      )}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('No mail app', `Write to ${CONTACT_EMAIL} instead.`);
    }
  };

  return (
    <Screen title="About" onBack={onBack}>
      <Enter>
        <Hard inner={{ padding: 22, alignItems: 'center' }} style={{ marginBottom: 26 }}>
          <Wordmark size={54} />
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 20,
              fontWeight: '700',
              letterSpacing: 5,
              color: C.ink,
              marginTop: 16,
              paddingLeft: 5,
            }}
          >
            CUTOFF
          </Text>
          <Text style={[T.kicker, { marginTop: 8, letterSpacing: 1.8 }]}>
            VERSION {VERSION} · {canHardBlock ? 'ANDROID' : 'TIMER MODE'}
          </Text>
        </Hard>
      </Enter>

      <Body style={{ marginBottom: 26 }}>
        A timer for the apps that eat your evening. Tap one, it opens for real, and when the
        clock hits zero your own screen lands on top of it. It stays there every time you
        reopen that app until you come back here and hold the button.
      </Body>

      {/* ── your numbers ───────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 14 }}>Since you installed it</Kicker>
      <Enter delay={80}>
        <Hard inner={{ padding: 18, flexDirection: 'row' }} style={{ marginBottom: 26 }}>
          <Stat value={String(history.length)} label="SESSIONS" />
          <Divider />
          <Stat value={human(totalMins)} label="TOTAL" />
          <Divider />
          <Stat value={String(stats.streak)} label="DAY STREAK" />
        </Hard>
      </Enter>

      {/* ── contact ────────────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 12 }}>Something broken? An idea?</Kicker>
      <Body style={{ marginBottom: 14 }}>
        Write to me. Mention what phone you're on and what you were doing — it saves a round
        trip.
      </Body>
      <Hard fill={C.bg} inner={{ padding: 15 }} style={{ marginBottom: 14 }}>
        <Text style={[T.kicker, { marginBottom: 7 }]}>CONTACT</Text>
        <Text
          onPress={mail}
          style={{
            fontFamily: MONO,
            fontSize: 14,
            fontWeight: '700',
            color: C.ink,
            textDecorationLine: 'underline',
          }}
        >
          {CONTACT_EMAIL}
        </Text>
      </Hard>
      <Button label="WRITE AN EMAIL" variant="outline" compact onPress={mail} />

      {/* ── privacy ────────────────────────────────────────────── */}
      <Kicker style={{ marginTop: 34, marginBottom: 12 }}>Where your data goes</Kicker>
      <Hard inner={{ padding: 16, flexDirection: 'row', gap: 13 }} style={{ marginBottom: 26 }}>
        <IconShield size={21} />
        <View style={{ flex: 1 }}>
          <Text style={[T.label, { fontSize: 13, marginBottom: 7 }]}>Nowhere</Text>
          <Body style={{ fontSize: 12 }}>
            There's no server, no account and no analytics in this app — it has no networking
            code at all. Your apps, your wording and your session log live in storage on this
            phone and are deleted with it.
          </Body>
        </View>
      </Hard>

      {/* ── permissions, plainly ───────────────────────────────── */}
      {canHardBlock ? (
        <>
          <Kicker style={{ marginBottom: 12 }}>What the permissions are for</Kicker>
          <Hard inner={{ paddingHorizontal: 16 }} style={{ marginBottom: 26 }}>
            <Perm
              title="Display over other apps"
              body="Draws the block screen on top of whatever you're in. Android also treats it as permission to interrupt from the background."
            />
            <Perm
              title="Usage access"
              body="Reads which app is in the foreground, once every second and a half, so a block can come back when you reopen the app. It never leaves the phone."
            />
            <Perm
              title="See installed apps"
              body="Lists what's on the phone so you can pick apps by name, and fetches their icons for the grid."
              last
            />
          </Hard>
        </>
      ) : null}

      {/* ── honest limits ──────────────────────────────────────── */}
      <Kicker style={{ marginBottom: 12 }}>What it can't do</Kicker>
      <Hard fill={C.bg} inner={{ padding: 16, flexDirection: 'row', gap: 13 }}>
        <IconAlert size={20} color={C.dim} />
        <View style={{ flex: 1 }}>
          <Body style={{ fontSize: 12 }}>
            No app on a normal phone can force-quit another app — not this one, not the paid
            ones. What it does is cover the app and send you home, which ends the session just
            as well. Someone determined can still force-stop Cutoff from Android's settings.
            It's a speed bump for your own habits, not a lock.
          </Body>
        </View>
      </Hard>

      {/* ── removing it ────────────────────────────────────────── */}
      {canHardBlock ? (
        <>
          <Kicker style={{ marginTop: 34, marginBottom: 12 }}>Had enough?</Kicker>
          <Body style={{ marginBottom: 14 }}>
            Uninstalling takes everything with it — your apps, your wording and the session
            log all live on this phone and nowhere else. Android will ask you to confirm.
          </Body>
          <Button
            label="UNINSTALL CUTOFF"
            icon={<IconTrash />}
            variant="outline"
            compact
            onPress={() =>
              Alert.alert(
                'Uninstall Cutoff?',
                'Android will ask you to confirm. Everything stored on this phone goes with it.',
                [
                  { text: 'Keep it', style: 'cancel' },
                  { text: 'Uninstall', style: 'destructive', onPress: uninstallSelf },
                ]
              )
            }
          />
        </>
      ) : null}

      <View style={{ marginTop: 34, alignItems: 'center', gap: 8 }}>
        <IconChart size={16} color={C.dimmer} />
        <Text style={[T.kicker, { color: C.dimmer, letterSpacing: 1.4, textAlign: 'center' }]}>
          BUILT FOR ONE PERSON WHO KEPT LOSING EVENINGS
        </Text>
      </View>
    </Screen>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 22,
          fontWeight: '700',
          letterSpacing: -1,
          color: C.ink,
        }}
      >
        {value}
      </Text>
      <Text style={[T.kicker, { marginTop: 6, letterSpacing: 1.1 }]}>{label}</Text>
    </View>
  );
}

const Divider = () => <View style={{ width: 1, backgroundColor: C.rule }} />;

function Perm({ title, body, last }) {
  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.rule,
      }}
    >
      <Text style={[T.label, { fontSize: 12, marginBottom: 6 }]}>{title}</Text>
      <Body style={{ fontSize: 11 }}>{body}</Body>
    </View>
  );
}
