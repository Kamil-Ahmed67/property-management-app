import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import StatusModal from './StatusModal';

const RATING_KEYS = ['', 'feedback.rating.poor', 'feedback.rating.fair', 'feedback.rating.good', 'feedback.rating.great', 'feedback.rating.excellent'];
const CATEGORIES = [
  { key: 'bug', labelKey: 'feedback.category.bug' },
  { key: 'idea', labelKey: 'feedback.category.idea' },
  { key: 'praise', labelKey: 'feedback.category.praise' },
  { key: 'other', labelKey: 'feedback.category.other' },
];

/**
 * Bottom-sheet feedback form opened from FeedbackCard's "Submit Feedback"
 * button. Only the rating is required — category, details, and email are
 * optional. Shows the shared StatusModal on success.
 */
export default function FeedbackSheet({ visible, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);

  function placeholderFor(r) {
    if (r <= 2) return t('feedback.placeholder.bad');
    if (r === 3) return t('feedback.placeholder.mid');
    return t('feedback.placeholder.good');
  }

  function reset() {
    setRating(0);
    setCategory(null);
    setMessage('');
    setEmail('');
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit() {
    if (!rating || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit({ rating, category, message: message.trim(), email: email.trim() });
      }
      setSubmitting(false);
      onClose();
      setSuccessVisible(true);
    } catch (err) {
      setSubmitting(false);
      setError(err.message || t('feedback.errorDefault'));
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                <Text style={styles.title}>{t('feedback.title')}</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>{t('feedback.subtitle')}</Text>

              <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.starRow}>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6} activeOpacity={0.7}>
                        <Ionicons
                          name={n <= rating ? 'star' : 'star-outline'}
                          size={30}
                          color={n <= rating ? colors.primary : colors.border}
                          style={styles.star}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {rating > 0 ? <Text style={styles.ratingLabel}>{t(RATING_KEYS[rating])}</Text> : null}
                </View>

                <View style={styles.chipRow}>
                  {CATEGORIES.map((c) => {
                    const active = category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setCategory(active ? null : c.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{t(c.labelKey)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>{t('feedback.details')}</Text>
                <TextInput
                  style={styles.input}
                  multiline
                  placeholder={placeholderFor(rating || 3)}
                  placeholderTextColor={colors.muted}
                  value={message}
                  onChangeText={(txt) => txt.length <= 280 && setMessage(txt)}
                />
                <Text style={styles.counter}>{message.length}/280</Text>

                <Text style={styles.fieldLabel}>{t('feedback.emailLabel')}</Text>
                <TextInput
                  style={styles.inputSingle}
                  placeholder={t('feedback.emailPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.submitBtn, (!rating || submitting) && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!rating || submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitLabel}>{t('feedback.submit')}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <StatusModal
        visible={successVisible}
        type="success"
        title={t('feedback.successTitle')}
        message={t('feedback.successMessage')}
        actionLabel={t('form.done')}
        onAction={() => {
          setSuccessVisible(false);
          reset();
        }}
        onRequestClose={() => setSuccessVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.5)', justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 17, fontFamily: 'Manrope-ExtraBold' },
  subtitle: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', marginTop: 4, marginBottom: 16 },
  scroll: { flexGrow: 0 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  stars: { flexDirection: 'row' },
  star: { marginRight: 6 },
  ratingLabel: { color: colors.primaryDark, fontSize: 13, fontFamily: 'Manrope-Bold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipLabel: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Bold' },
  chipLabelActive: { color: colors.primaryDark },
  fieldLabel: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 80,
    textAlignVertical: 'top', color: colors.text, fontSize: 13, fontFamily: 'Manrope-Regular', backgroundColor: colors.bg,
  },
  counter: { color: colors.muted, fontSize: 10.5, fontFamily: 'Manrope-Regular', textAlign: 'right', marginTop: 4, marginBottom: 16 },
  inputSingle: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12,
    color: colors.text, fontSize: 13, fontFamily: 'Manrope-Regular', backgroundColor: colors.bg, marginBottom: 18,
  },
  errorText: { color: colors.error, fontSize: 12, fontFamily: 'Manrope-Medium', marginBottom: 10 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitLabel: { color: '#ffffff', fontSize: 14, fontFamily: 'Manrope-ExtraBold' },
});