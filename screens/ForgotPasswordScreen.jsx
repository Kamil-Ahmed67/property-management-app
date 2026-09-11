import { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ onBackToLogin }) {
  // 1 = enter email, 2 = enter OTP, 3 = set new password
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });

  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function closeStatusModal() {
    setStatusModal((s) => ({ ...s, visible: false }));
  }

  function showError(title, message) {
    setStatusModal({ visible: true, type: 'error', title, message });
  }

  async function handleSendCode() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showError('Email required', 'Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      showError('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${config.BMS_API}api/ForgotPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({ Mail: trimmedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Could not send reset code, please try again.');
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep(2);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 200);
    } catch (err) {
      showError('Could not send code', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOtpChange(index, value) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(index, e) {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOtp() {
    const otp = otpDigits.join('');

    if (otp.length !== 6) {
      showError('Incomplete code', 'Please enter all 6 digits of the code.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${config.BMS_API}api/VerifyResetOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({ Mail: email.trim(), Otp: otp }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Invalid or expired code.');
      }

      setStep(3);
    } catch (err) {
      showError('Verification failed', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setOtpDigits(['', '', '', '', '', '']);
    await handleSendCode();
  }

  async function handleResetPassword() {
    if (newPassword.length < 6) {
      showError('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords don't match", 'Please make sure both passwords are identical.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${config.BMS_API}api/ResetPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          Mail: email.trim(),
          Otp: otpDigits.join(''),
          NewPassword: newPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Could not reset password, please try again.');
      }

      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Password reset',
        message: 'Your password has been changed successfully. You can now sign in.',
      });
    } catch (err) {
      showError('Reset failed', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={onBackToLogin} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s === step && styles.progressDotActive,
                s < step && styles.progressDotDone,
              ]}
            />
          ))}
        </View>

        {step === 1 ? (
          <>
            <View style={styles.headerIconWrap}>
              <Ionicons name="lock-closed-outline" size={26} color="#0F9D58" />
            </View>
            <Text style={styles.title}>পাসওয়ার্ড ভুলে গেছেন?</Text>
            <Text style={styles.subtitle}>
              চিন্তা নেই — আপনার ইমেইল দিন, আমরা একটি ভেরিফিকেশন কোড পাঠাব।
            </Text>

            <Text style={styles.label}>ইমেইল ঠিকানা</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={colors.muted} style={styles.leadingIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleSendCode}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#ffffff" />
                  <Text style={styles.primaryButtonLabel}>কোড পাঠান</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={styles.headerIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={26} color="#0F9D58" />
            </View>
            <Text style={styles.title}>ভেরিফিকেশন কোড দিন</Text>
            <Text style={styles.subtitle}>
              আমরা <Text style={styles.subtitleEmail}>{email}</Text> এ একটি ৬-সংখ্যার কোড পাঠিয়েছি।
            </Text>

            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpInputRefs.current[index] = ref)}
                  style={[styles.otpBox, digit && styles.otpBoxFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={(e) => handleOtpKeyPress(index, e)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0}
              style={styles.resendRow}
              activeOpacity={0.7}
            >
              <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
                {cooldown > 0 ? `আবার কোড পাঠান (${cooldown}s)` : 'কোড পাননি? আবার পাঠান'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleVerifyOtp}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                  <Text style={styles.primaryButtonLabel}>যাচাই করুন</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View style={styles.headerIconWrap}>
              <Ionicons name="key-outline" size={26} color="#0F9D58" />
            </View>
            <Text style={styles.title}>নতুন পাসওয়ার্ড দিন</Text>
            <Text style={styles.subtitle}>আপনার নতুন পাসওয়ার্ড সেট করুন।</Text>

            <Text style={styles.label}>নতুন পাসওয়ার্ড</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.muted} style={styles.leadingIcon} />
              <TextInput
                style={styles.input}
                placeholder="কমপক্ষে ৬ অক্ষর"
                placeholderTextColor={colors.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.trailingIcon}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>পাসওয়ার্ড নিশ্চিত করুন</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.muted} style={styles.leadingIcon} />
              <TextInput
                style={styles.input}
                placeholder="পুনরায় লিখুন"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleResetPassword}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={18} color="#ffffff" />
                  <Text style={styles.primaryButtonLabel}>পাসওয়ার্ড পরিবর্তন করুন</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </KeyboardAwareScrollView>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        actionLabel={statusModal.type === 'success' ? 'লগইনে যান' : 'ঠিক আছে'}
        onAction={() => {
          closeStatusModal();
          if (statusModal.type === 'success') onBackToLogin?.();
        }}
        onRequestClose={closeStatusModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  page: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 22, paddingTop: 60, paddingBottom: 40 },

  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    width: 22,
    backgroundColor: '#0F9D58',
  },
  progressDotDone: {
    backgroundColor: '#86D9AE',
  },

  headerIconWrap: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  subtitleEmail: {
    fontFamily: 'Manrope-Bold',
    color: '#111827',
  },

  label: {
    color: '#111827',
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  leadingIcon: { paddingLeft: 14, paddingRight: 2 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-Regular',
  },
  trailingIcon: { paddingHorizontal: 14, paddingVertical: 10 },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#111827',
  },
  otpBoxFilled: {
    borderColor: '#0F9D58',
    backgroundColor: '#F0FBF5',
  },

  resendRow: {
    alignItems: 'center',
    marginBottom: 22,
  },
  resendText: {
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
    color: '#0F9D58',
  },
  resendTextDisabled: {
    color: colors.muted,
  },

  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#0F9D58',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
  },
});