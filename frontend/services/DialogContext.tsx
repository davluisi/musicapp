import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export type DialogButton = {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
};

type DialogRequest = {
  title: string;
  message?: string;
  buttons: DialogButton[];
};

type DialogTone = 'success' | 'error' | 'warning' | 'info' | 'danger';

type ToneStyle = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  surface: string;
};

const TONE_STYLES: Record<DialogTone, ToneStyle> = {
  success: {
    icon: 'checkmark-circle',
    color: theme.colors.primary,
    surface: theme.colors.cardGlow,
  },
  error: {
    icon: 'close-circle',
    color: theme.colors.danger,
    surface: theme.colors.dangerSurface,
  },
  warning: {
    icon: 'alert-circle',
    color: theme.colors.warning,
    surface: 'rgba(255, 170, 0, 0.14)',
  },
  info: {
    icon: 'information-circle',
    color: theme.colors.accent,
    surface: 'rgba(138, 43, 226, 0.16)',
  },
  danger: {
    icon: 'trash',
    color: theme.colors.danger,
    surface: theme.colors.dangerSurface,
  },
};

let opener: ((request: DialogRequest) => void) | null = null;

export function showDialog(title: string, message?: string, buttons?: DialogButton[]) {
  const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' as const }];
  opener?.({ title, message, buttons: resolvedButtons });
}

function resolveTone(title: string, buttons: DialogButton[]): DialogTone {
  if (buttons.some((button) => button.style === 'destructive')) {
    return 'danger';
  }

  const normalized = title.toLowerCase();
  if (
    normalized.includes('successo') ||
    normalized.includes('eseguito') ||
    normalized.includes('riuscita') ||
    normalized.includes('completato')
  ) {
    return 'success';
  }
  if (normalized.includes('errore')) {
    return 'error';
  }
  if (
    normalized.includes('attenzione') ||
    normalized.includes('mancant') ||
    normalized.includes('richiest') ||
    normalized.includes('sicura') ||
    normalized.includes('nessun')
  ) {
    return 'warning';
  }
  return 'info';
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef<DialogRequest[]>([]);
  const visibleRef = useRef(false);
  const hidingRef = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const animateIn = () => {
    opacity.setValue(0);
    scale.setValue(0.92);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const present = (next: DialogRequest) => {
    hidingRef.current = false;
    visibleRef.current = true;
    Keyboard.dismiss();
    setRequest(next);
    setVisible(true);
    animateIn();
  };

  const openRef = useRef<(next: DialogRequest) => void>(() => {});
  openRef.current = (next: DialogRequest) => {
    if (visibleRef.current) {
      queueRef.current.push(next);
      return;
    }
    present(next);
  };

  opener = (next) => openRef.current(next);

  useEffect(() => {
    return () => {
      opener = null;
    };
  }, []);

  const finishHide = (button?: DialogButton) => {
    hidingRef.current = false;
    const pending = queueRef.current.shift();
    if (pending) {
      present(pending);
      button?.onPress?.();
      return;
    }

    visibleRef.current = false;
    button?.onPress?.();
    if (!visibleRef.current) {
      setVisible(false);
    }
  };

  const hide = (button?: DialogButton) => {
    if (!visibleRef.current || hidingRef.current) {
      return;
    }
    hidingRef.current = true;
    let settled = false;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      finishHide(button);
    };

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => settle());
    setTimeout(settle, 200);
  };

  const dismissFromBackdrop = () => {
    if (!request) {
      return;
    }
    const cancelButton = request.buttons.find((button) => button.style === 'cancel');
    if (cancelButton) {
      hide(cancelButton);
      return;
    }
    if (request.buttons.length === 1) {
      hide(request.buttons[0]);
    }
  };

  const tone = request ? resolveTone(request.title, request.buttons) : 'info';
  const toneStyle = TONE_STYLES[tone];

  return (
    <>
      {children}
      {visible && (
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={dismissFromBackdrop}
      >
        <Animated.View style={[styles.overlay, { opacity }]}>
          <Pressable style={styles.backdrop} onPress={dismissFromBackdrop}>
            <Animated.View style={{ transform: [{ scale }], width: '100%', alignItems: 'center' }}>
              <Pressable
                style={styles.card}
                onPress={(event) => event.stopPropagation()}
                accessibilityRole="alert"
                accessibilityViewIsModal
              >
                {request && (
                  <>
                    <View style={[styles.iconWrap, { backgroundColor: toneStyle.surface }]}>
                      <Ionicons name={toneStyle.icon} size={32} color={toneStyle.color} />
                    </View>
                    <Text style={styles.title}>{request.title}</Text>
                    {!!request.message && (
                      <ScrollView
                        style={styles.messageScroll}
                        contentContainerStyle={styles.messageContent}
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                      >
                        <Text style={styles.message}>{request.message}</Text>
                      </ScrollView>
                    )}
                    <View style={[styles.actions, request.buttons.length > 2 && styles.actionsStacked]}>
                      {request.buttons.map((button, index) => {
                        const variant = button.style ?? 'default';
                        return (
                          <Pressable
                            key={`${button.text}-${index}`}
                            style={({ pressed }) => [
                              styles.actionButton,
                              request.buttons.length === 1 && styles.actionButtonSingle,
                              variant === 'cancel' && styles.actionCancel,
                              variant === 'default' && styles.actionDefault,
                              variant === 'destructive' && styles.actionDestructive,
                              pressed && styles.actionPressed,
                            ]}
                            onPress={() => hide(button)}
                          >
                            <Text
                              style={[
                                styles.actionText,
                                variant === 'cancel' && styles.actionTextCancel,
                                variant === 'default' && styles.actionTextDefault,
                                variant === 'destructive' && styles.actionTextDestructive,
                              ]}
                            >
                              {button.text}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  messageScroll: {
    maxHeight: 220,
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
  },
  messageContent: {
    paddingHorizontal: theme.spacing.xs,
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  actionButtonSingle: {
    width: '100%',
  },
  actionCancel: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  actionDefault: {
    backgroundColor: theme.colors.primary,
  },
  actionDestructive: {
    backgroundColor: theme.colors.danger,
  },
  actionPressed: {
    opacity: 0.82,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionTextCancel: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  actionTextDefault: {
    color: '#000',
  },
  actionTextDestructive: {
    color: '#fff',
  },
});
