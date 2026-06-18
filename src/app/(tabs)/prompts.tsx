import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createChat } from '@/features/chat/chat.service';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, Typography } from '@/constants/theme';

interface Template {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  text: string;
}

const TEMPLATES: Template[] = [
  {
    icon: 'school-outline',
    title: 'Explain simply',
    subtitle: 'Explain a concept like I’m 5.',
    text: 'Explain the following concept like I\'m 5:\n\n',
  },
  {
    icon: 'list-outline',
    title: 'Summarize',
    subtitle: 'Get a 5-bullet summary of any text.',
    text: 'Summarize the following text in 5 concise bullet points:\n\n',
  },
  {
    icon: 'bulb-outline',
    title: 'Brainstorm',
    subtitle: 'Generate 10 ideas on a topic.',
    text: 'Brainstorm 10 creative ideas for:\n\n',
  },
  {
    icon: 'code-slash-outline',
    title: 'Write code',
    subtitle: 'Solve a coding task with explanation.',
    text: 'Write code for the following task and briefly explain it:\n\n',
  },
  {
    icon: 'language-outline',
    title: 'Translate',
    subtitle: 'Translate text to English.',
    text: 'Translate the following text to English:\n\n',
  },
  {
    icon: 'create-outline',
    title: 'Improve writing',
    subtitle: 'Clarify and polish your text.',
    text: 'Improve the clarity, grammar, and tone of this text:\n\n',
  },
  {
    icon: 'scale-outline',
    title: 'Pros & cons',
    subtitle: 'Weigh both sides of a decision.',
    text: 'List the pros and cons of:\n\n',
  },
  {
    icon: 'shirt-outline',
    title: 'Draft a message',
    subtitle: 'Write a friendly message for a situation.',
    text: 'Draft a short, friendly message for the following situation:\n\n',
  },
];

export default function PromptsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const useTemplate = async (t: Template) => {
    try {
      const chat = await createChat();
      router.push({ pathname: '/chat/[id]', params: { id: chat.id, prompt: t.text } });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.lg, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.lg }]}>
        Tap a starter to open a new chat with the prompt pre-filled. Add your text, then send.
      </Text>
      <View style={styles.grid}>
        {TEMPLATES.map((t) => (
          <Pressable
            key={t.title}
            onPress={() => useTemplate(t)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSelected }]}>
              <Ionicons name={t.icon} size={20} color={colors.accent} />
            </View>
            <Text style={[Typography.bodyMedium, { color: colors.text }]}>{t.title}</Text>
            <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
              {t.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
