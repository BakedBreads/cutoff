import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T, MONO, SHADOW } from '../theme';
import { IconBack } from '../icons';

/* ─────────────────────────────────────────────────────────────
   Hard shadow primitive: a solid offset rectangle, never blurred.
   ───────────────────────────────────────────────────────────── */

export const Hard = ({
  style,
  inner,
  children,
  offset = SHADOW,
  fill = C.paper,
  shadow = C.ink,
  border = 2,
}) => (
  <View style={[{ marginRight: offset, marginBottom: offset }, style]}>
    <View
      style={{
        position: 'absolute',
        left: offset,
        top: offset,
        right: -offset,
        bottom: -offset,
        backgroundColor: shadow,
      }}
    />
    <View
      style={[
        { backgroundColor: fill, borderWidth: border, borderColor: C.ink },
        inner,
      ]}
    >
      {children}
    </View>
  </View>
);

/* ─────────────────────────────────────────────────────────────
   Pressable that visually sinks into its own shadow.
   ───────────────────────────────────────────────────────────── */

export const HardPress = ({
  onPress,
  onLongPress,
  disabled,
  style,
  inner,
  children,
  offset = SHADOW,
  fill = C.paper,
  shadow = C.ink,
}) => {
  const [down, setDown] = useState(false);
  const shift = down ? offset : 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[{ marginRight: offset, marginBottom: offset, opacity: disabled ? 0.4 : 1 }, style]}
    >
      <View
        style={{
          position: 'absolute',
          left: offset,
          top: offset,
          right: -offset,
          bottom: -offset,
          backgroundColor: shadow,
        }}
      />
      <View
        style={[
          {
            backgroundColor: fill,
            borderWidth: 2,
            borderColor: C.ink,
            transform: [{ translateX: shift }, { translateY: shift }],
          },
          inner,
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
};

/* ─────────────────────────────────────────────────────────────
   Buttons
   ───────────────────────────────────────────────────────────── */

export const Button = ({
  label,
  onPress,
  variant = 'solid', // solid | outline | danger
  disabled,
  style,
  icon,
  compact,
}) => {
  const fill =
    variant === 'solid' ? C.ink : variant === 'danger' ? C.danger : C.paper;
  const ink = variant === 'outline' ? C.ink : C.paper;

  return (
    <HardPress
      onPress={onPress}
      disabled={disabled}
      fill={fill}
      style={style}
      inner={{
        paddingVertical: compact ? 11 : 16,
        paddingHorizontal: compact ? 14 : 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
      }}
    >
      {icon ? React.cloneElement(icon, { color: ink, size: compact ? 15 : 17 }) : null}
      <Text
        style={{
          fontFamily: MONO,
          fontSize: compact ? 12 : 14,
          fontWeight: '700',
          letterSpacing: 1.4,
          color: ink,
        }}
      >
        {label}
      </Text>
    </HardPress>
  );
};

/** Small square icon-only button, used in headers. */
export const IconButton = ({ icon, onPress, fill = C.paper, size = 44 }) => (
  <HardPress
    onPress={onPress}
    offset={4}
    fill={fill}
    inner={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {React.cloneElement(icon, { color: fill === C.ink ? C.paper : C.ink, size: 19 })}
  </HardPress>
);

/* ─────────────────────────────────────────────────────────────
   Text bits
   ───────────────────────────────────────────────────────────── */

export const Kicker = ({ children, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
    <View style={{ width: 18, height: 3, backgroundColor: C.ink }} />
    <Text style={T.kicker}>{String(children).toUpperCase()}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: C.rule }} />
  </View>
);

export const Body = ({ children, style }) => (
  <Text style={[T.body, style]}>{children}</Text>
);

export const Rule = ({ style }) => (
  <View style={[{ height: 1, backgroundColor: C.rule }, style]} />
);

/* ─────────────────────────────────────────────────────────────
   Chip — used for durations and preset picking
   ───────────────────────────────────────────────────────────── */

export const Chip = ({ label, active, onPress, style }) => (
  <Pressable
    onPress={onPress}
    style={[
      {
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: active ? C.ink : 'transparent',
        paddingVertical: 8,
        paddingHorizontal: 13,
      },
      style,
    ]}
  >
    <Text
      style={{
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: active ? C.paper : C.ink,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

/* ─────────────────────────────────────────────────────────────
   Form controls
   ───────────────────────────────────────────────────────────── */

export const Field = ({
  label,
  hint,
  value,
  onChangeText,
  onBlur,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize = 'sentences',
  maxLength,
}) => (
  <View style={{ marginBottom: 20 }}>
    {label ? <Text style={[T.kicker, { marginBottom: 8 }]}>{label.toUpperCase()}</Text> : null}
    <View style={{ borderWidth: 2, borderColor: C.ink, backgroundColor: C.paper }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={C.dimmer}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        style={{
          fontFamily: MONO,
          fontSize: 14,
          color: C.ink,
          paddingHorizontal: 13,
          paddingVertical: Platform.OS === 'ios' ? 14 : 10,
          minHeight: multiline ? 84 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
    {hint ? (
      <Text style={[T.body, { fontSize: 11, marginTop: 7, color: C.dimmer }]}>{hint}</Text>
    ) : null}
  </View>
);

/**
 * Big −/+ stepper for picking a duration. Holding a button repeats, so getting
 * from 20 to 90 minutes doesn't take seventy taps.
 */
export const Stepper = ({ value, onChange, min = 1, max = 600, step = 5, suffix = 'MIN' }) => {
  const repeat = React.useRef(null);
  // The interval closes over its own copy of the value, so track it in a ref
  // rather than reading `value` from a stale render.
  const latest = React.useRef(value);
  latest.current = value;

  const bump = (delta) => {
    const next = Math.max(min, Math.min(max, latest.current + delta));
    latest.current = next;
    onChange(next);
  };

  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };

  const startRepeat = (delta) => {
    stopRepeat();
    repeat.current = setInterval(() => bump(delta), 110);
  };

  React.useEffect(() => stopRepeat, []);

  const Btn = ({ delta, plus }) => {
    const [down, setDown] = React.useState(false);
    const bar = down ? C.paper : C.ink;
    return (
      <Pressable
        onPress={() => bump(delta)}
        onLongPress={() => startRepeat(delta)}
        onPressIn={() => setDown(true)}
        onPressOut={() => {
          setDown(false);
          stopRepeat();
        }}
        delayLongPress={280}
        style={{
          width: 58,
          height: 58,
          borderWidth: 2,
          borderColor: C.ink,
          backgroundColor: down ? C.ink : C.paper,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 18, height: 2.5, backgroundColor: bar }} />
        {plus ? (
          <View
            style={{ width: 2.5, height: 18, backgroundColor: bar, position: 'absolute' }}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Btn delta={-step} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 40,
            fontWeight: '700',
            letterSpacing: -2,
            color: C.ink,
          }}
        >
          {value}
        </Text>
        <Text style={[T.kicker, { letterSpacing: 1.6, marginTop: 2 }]}>{suffix}</Text>
      </View>
      <Btn delta={step} plus />
    </View>
  );
};

/** Square-knob switch. No rounded corners anywhere in this app. */
export const Toggle = ({ value, onValueChange }) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    hitSlop={10}
    style={{
      width: 54,
      height: 30,
      borderWidth: 2,
      borderColor: C.ink,
      backgroundColor: value ? C.ink : C.paper,
      justifyContent: 'center',
      padding: 3,
    }}
  >
    <View
      style={{
        width: 20,
        height: 20,
        backgroundColor: value ? C.paper : C.ink,
        alignSelf: value ? 'flex-end' : 'flex-start',
      }}
    />
  </Pressable>
);

export const Row = ({ title, subtitle, right, onPress, last }) => {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.rule,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[T.label, { fontSize: 13 }]}>{title}</Text>
        {subtitle ? (
          <Text style={[T.body, { fontSize: 11, marginTop: 4 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
};

/* ─────────────────────────────────────────────────────────────
   Screen shell
   ───────────────────────────────────────────────────────────── */

export const Screen = ({ title, onBack, right, children, scroll = true, footer }) => {
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {(title || onBack) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 18,
          }}
        >
          {onBack ? <IconButton icon={<IconBack />} onPress={onBack} size={40} /> : null}
          <Text style={[T.label, { flex: 1, fontSize: 13, letterSpacing: 1.8 }]}>
            {String(title || '').toUpperCase()}
          </Text>
          {right}
        </View>
      )}
      <Container
        style={{ flex: 1 }}
        contentContainerStyle={
          scroll
            ? { paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }
            : undefined
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Container>
      {footer ? (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: insets.bottom + 14,
            borderTopWidth: 2,
            borderTopColor: C.ink,
            backgroundColor: C.bg,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
};
