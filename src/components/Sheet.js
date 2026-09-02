import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { IconClose } from '../icons';
import { IconButton } from './ui';

/** Bottom sheet with a hard top border. No rounded corners, no blur. */
export default function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.45)' }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: C.bg,
          borderTopWidth: 3,
          borderColor: C.ink,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={[T.label, { flex: 1, fontSize: 13, letterSpacing: 1.8 }]}>
            {String(title || '').toUpperCase()}
          </Text>
          <IconButton icon={<IconClose />} onPress={onClose} size={38} />
        </View>
        {children}
      </View>
    </Modal>
  );
}
