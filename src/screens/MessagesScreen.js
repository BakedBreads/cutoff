import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { C, T } from '../theme';
import { MESSAGE_IDEAS } from '../presets';
import { Screen, Hard, Field, Button, Kicker, Body } from '../components/ui';
import { Enter, layoutPulse } from '../components/motion';
import { IconPlus, IconTrash, IconRefresh } from '../icons';

/**
 * The block screen picks one of these at random each session — the same words
 * every time stop landing after a week.
 */
export default function MessagesScreen({ settings, onChange, onBack }) {
  const [draft, setDraft] = useState('');
  const messages = settings.messages || [];

  const add = (text) => {
    const value = String(text || draft).trim().toUpperCase();
    if (!value) return;
    if (messages.some((m) => m.toUpperCase() === value)) {
      Alert.alert('Already in the list', 'That line is there already.');
      return;
    }
    layoutPulse();
    onChange({ messages: [...messages, value] });
    setDraft('');
  };

  const remove = (index) => {
    if (messages.length === 1) {
      Alert.alert('Keep at least one', 'The block screen needs something to say.');
      return;
    }
    layoutPulse();
    onChange({ messages: messages.filter((_, i) => i !== index) });
  };

  const unused = MESSAGE_IDEAS.filter(
    (idea) => !messages.some((m) => m.toUpperCase() === idea.toUpperCase())
  );

  return (
    <Screen title="Messages" onBack={onBack}>
      <Kicker style={{ marginBottom: 10 }}>
        {messages.length === 1 ? 'One line' : `${messages.length} lines, picked at random`}
      </Kicker>
      <Body style={{ marginBottom: 18 }}>
        {messages.length === 1
          ? 'Add a few more and Cutoff will rotate between them, so the screen keeps its bite.'
          : 'A different one shows each time the timer runs out.'}
      </Body>

      <Hard inner={{ paddingHorizontal: 15 }} style={{ marginBottom: 22 }}>
        {messages.map((msg, i) => (
          <Enter key={`${msg}-${i}`} index={i} distance={8}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                borderBottomWidth: i === messages.length - 1 ? 0 : 1,
                borderBottomColor: C.rule,
              }}
            >
              <Text style={[T.kicker, { width: 20 }]}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={[T.label, { flex: 1, fontSize: 14, letterSpacing: 0 }]}>{msg}</Text>
              <Pressable onPress={() => remove(i)} hitSlop={10}>
                <IconTrash size={17} color={C.danger} />
              </Pressable>
            </View>
          </Enter>
        ))}
      </Hard>

      <Field
        label="Add a line"
        value={draft}
        onChangeText={setDraft}
        placeholder="GO DO THE THING"
        autoCapitalize="characters"
        maxLength={40}
        hint="Short hits hardest. Three or four words."
      />
      <Button label="ADD IT" icon={<IconPlus />} onPress={() => add()} />

      {unused.length > 0 ? (
        <>
          <Kicker style={{ marginTop: 34, marginBottom: 14 }}>Or steal one of these</Kicker>
          <View style={{ gap: 10 }}>
            {unused.map((idea, i) => (
              <Enter key={idea} index={i} distance={6}>
                <Pressable
                  onPress={() => add(idea)}
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
          label="RESET TO JUST ONE"
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
