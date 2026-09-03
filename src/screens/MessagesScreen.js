import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { C, T, MONO } from '../theme';
import { MESSAGE_IDEAS } from '../presets';
import { Screen, Hard, Button, Kicker, Body } from '../components/ui';
import { Enter, layoutPulse } from '../components/motion';
import { IconPlus, IconTrash, IconEdit, IconCheck, IconRefresh } from '../icons';

/**
 * Edit-in-place. The top of the screen is the block screen itself, at the size
 * it really appears; tapping any line turns that line into a field. There is no
 * separate form to fill in and no save button to hunt for.
 */
export default function MessagesScreen({ settings, onChange, onBack }) {
  const messages = settings.messages || [];
  // { key: index | 'sub', from: 'preview' | 'list' } — the origin matters because
  // line 0 appears twice on this screen, and only the tapped one should open.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  const editingAt = (key, from) =>
    editing !== null && editing.key === key && editing.from === from;

  const beginEdit = (key, from, current) => {
    setDraft(current);
    setEditing({ key, from });
  };

  const commit = () => {
    if (editing === null) return;
    const key = editing.key;
    const value = draft.trim();

    if (key === 'sub') {
      onChange({ submessage: draft });
    } else if (typeof key === 'number') {
      if (!value) {
        // Emptying a line deletes it, unless it's the last one standing.
        if (messages.length === 1) {
          Alert.alert('Keep at least one', 'The block screen needs something to say.');
        } else {
          layoutPulse();
          onChange({ messages: messages.filter((_, i) => i !== key) });
        }
      } else {
        const next = messages.slice();
        next[key] = value.toUpperCase();
        onChange({ messages: next });
      }
    }
    setEditing(null);
    setDraft('');
  };

  const addLine = (text) => {
    const value = String(text || '').trim().toUpperCase();
    if (!value) {
      // Adding a blank line drops you straight into editing it.
      layoutPulse();
      const index = messages.length;
      onChange({ messages: [...messages, 'NEW LINE'] });
      setTimeout(() => beginEdit(index, 'list', 'NEW LINE'), 60);
      return;
    }
    if (messages.some((m) => m.toUpperCase() === value)) {
      Alert.alert('Already in the list', 'That line is there already.');
      return;
    }
    layoutPulse();
    onChange({ messages: [...messages, value] });
  };

  const remove = (index) => {
    if (messages.length === 1) {
      Alert.alert('Keep at least one', 'The block screen needs something to say.');
      return;
    }
    layoutPulse();
    if (editing !== null && editing.key === index) setEditing(null);
    onChange({ messages: messages.filter((_, i) => i !== index) });
  };

  const unused = MESSAGE_IDEAS.filter(
    (idea) => !messages.some((m) => m.toUpperCase() === idea.toUpperCase())
  );

  const dark = !!settings.darkBlockScreen;
  const pBg = dark ? '#0A0A0A' : C.bg;
  const pInk = dark ? '#F5F4F1' : C.ink;
  const pDim = dark ? '#8A8A93' : C.dim;

  return (
    <Screen title="Messages" onBack={() => (editing !== null ? commit() : onBack())}>
      {/* ── the block screen, as it really looks ───────────────── */}
      <Kicker style={{ marginBottom: 12 }}>Tap any line to change it</Kicker>

      <Enter>
        <Hard
          fill={pBg}
          shadow={dark ? '#3A3A40' : C.shadow}
          inner={{ padding: 20, minHeight: 240, backgroundColor: pBg }}
          style={{ marginBottom: 26 }}
        >
          <View style={{ width: 34, height: 3, backgroundColor: pInk }} />
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 2.4,
              color: pDim,
              marginTop: 10,
              marginBottom: 18,
            }}
          >
            CUTOFF / SESSION ENDED
          </Text>

          {/* headline — whichever line is first, edited in place */}
          {editingAt(0, 'preview') ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={commit}
              onSubmitEditing={commit}
              autoFocus
              autoCapitalize="characters"
              maxLength={40}
              multiline
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: '700',
                letterSpacing: -0.6,
                lineHeight: 30,
                color: pInk,
                borderBottomWidth: 2,
                borderBottomColor: C.danger,
                padding: 0,
                marginBottom: 4,
              }}
            />
          ) : (
            <Pressable onPress={() => beginEdit(0, 'preview', messages[0] || '')}>
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: '700',
                  letterSpacing: -0.6,
                  lineHeight: 30,
                  color: pInk,
                }}
              >
                {(messages[0] || "TIME'S UP").toUpperCase()}
              </Text>
            </Pressable>
          )}

          {/* second line */}
          {editingAt('sub', 'preview') ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={commit}
              autoFocus
              multiline
              maxLength={140}
              placeholder="Say something under it"
              placeholderTextColor={pDim}
              style={{
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 19,
                color: pDim,
                marginTop: 14,
                borderBottomWidth: 2,
                borderBottomColor: C.danger,
                padding: 0,
              }}
            />
          ) : (
            <Pressable onPress={() => beginEdit('sub', 'preview', settings.submessage || '')}>
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  lineHeight: 19,
                  color: settings.submessage ? pDim : C.dimmer,
                  marginTop: 14,
                }}
              >
                {settings.submessage || 'Tap to add a second line'}
              </Text>
            </Pressable>
          )}

          <View style={{ flex: 1 }} />
          <View style={{ height: 1, backgroundColor: pDim, opacity: 0.4, marginTop: 22 }} />
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 1.2,
              color: pDim,
              marginTop: 10,
            }}
          >
            TIKTOK · 20M SPENT
          </Text>
        </Hard>
      </Enter>

      {editing !== null ? (
        <View style={{ marginBottom: 22 }}>
          <Button label="DONE" icon={<IconCheck />} compact onPress={commit} />
        </View>
      ) : null}

      {/* ── the rotation list ──────────────────────────────────── */}
      <Kicker style={{ marginBottom: 10 }}>
        {messages.length === 1 ? 'One line' : `${messages.length} lines in rotation`}
      </Kicker>
      <Body style={{ marginBottom: 16 }}>
        {messages.length === 1
          ? 'Add a few more and Cutoff picks a different one each session, so the words keep their bite.'
          : 'One is picked at random every time the timer runs out.'}
      </Body>

      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginBottom: 20 }}>
        {messages.map((msg, i) => {
          const isEditing = editingAt(i, 'list');
          return (
            <View
              key={`${i}-${msg}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                paddingVertical: 13,
                borderBottomWidth: i === messages.length - 1 ? 0 : 1,
                borderBottomColor: C.rule,
              }}
            >
              <Text style={[T.kicker, { width: 20 }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>

              {isEditing ? (
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onBlur={commit}
                  onSubmitEditing={commit}
                  autoFocus
                  autoCapitalize="characters"
                  maxLength={40}
                  style={{
                    flex: 1,
                    fontFamily: MONO,
                    fontSize: 14,
                    fontWeight: '700',
                    color: C.ink,
                    borderBottomWidth: 2,
                    borderBottomColor: C.danger,
                    padding: 0,
                  }}
                />
              ) : (
                <Pressable style={{ flex: 1 }} onPress={() => beginEdit(i, 'list', msg)}>
                  <Text style={[T.label, { fontSize: 14, letterSpacing: 0 }]}>{msg}</Text>
                </Pressable>
              )}

              <Pressable onPress={() => (isEditing ? commit() : beginEdit(i, 'list', msg))} hitSlop={8}>
                {isEditing ? (
                  <IconCheck size={17} color={C.ok} />
                ) : (
                  <IconEdit size={16} color={C.dim} />
                )}
              </Pressable>
              <Pressable onPress={() => remove(i)} hitSlop={8}>
                <IconTrash size={16} color={C.danger} />
              </Pressable>
            </View>
          );
        })}
      </Hard>

      <Button label="ADD A LINE" icon={<IconPlus />} onPress={() => addLine('')} />

      {unused.length > 0 ? (
        <>
          <Kicker style={{ marginTop: 34, marginBottom: 14 }}>Or take one of these</Kicker>
          <View style={{ gap: 10 }}>
            {unused.map((idea, i) => (
              <Enter key={idea} index={Math.min(i, 6)} distance={6}>
                <Pressable
                  onPress={() => addLine(idea)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.5 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderWidth: 2,
                    borderColor: C.ink,
                    borderStyle: 'dashed',
                    paddingVertical: 12,
                    paddingHorizontal: 13,
                  })}
                >
                  <IconPlus size={15} color={C.dim} />
                  <Text style={[T.label, { fontSize: 13, letterSpacing: 0, flex: 1 }]}>
                    {idea}
                  </Text>
                </Pressable>
              </Enter>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: 30 }}>
        <Button
          label="RESET TO ONE LINE"
          icon={<IconRefresh />}
          variant="outline"
          compact
          onPress={() =>
            Alert.alert('Reset messages?', 'Drops everything back to a single line.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                  layoutPulse();
                  setEditing(null);
                  onChange({ messages: ['TIME TO STUDY'] });
                },
              },
            ])
          }
        />
      </View>
    </Screen>
  );
}
