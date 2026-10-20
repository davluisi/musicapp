import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authApi, uploadApi, getMediaUrl } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { theme } from '../services/theme';
import { showDialog } from '../services/DialogContext';

export function ProfileScreen() {
  const { user, isLoggedIn, login, logout, updateUser } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordDisplay, setPasswordDisplay] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordDisplay, setConfirmPasswordDisplay] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const pwdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmPwdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pwdTimerRef.current) clearTimeout(pwdTimerRef.current);
      if (confirmPwdTimerRef.current) clearTimeout(confirmPwdTimerRef.current);
    };
  }, []);

  const handlePasswordChange = (newVal: string) => {
    setPassword(newVal);
    if (pwdTimerRef.current) clearTimeout(pwdTimerRef.current);

    if (showPassword || newVal.length === 0) {
      setPasswordDisplay(newVal);
      return;
    }

    if (newVal.length > password.length) {
      // Un nuovo carattere aggiunto: mostra i precedenti come pallino e l'ultimo visibile
      const maskedPart = '•'.repeat(newVal.length - 1);
      const lastChar = newVal.slice(-1);
      setPasswordDisplay(maskedPart + lastChar);

      // Converti l'ultimo carattere in pallino esattamente dopo 1.5 secondi (come il primo)
      pwdTimerRef.current = setTimeout(() => {
        setPasswordDisplay('•'.repeat(newVal.length));
      }, 1500);
    } else {
      // Carattere cancellato
      setPasswordDisplay('•'.repeat(newVal.length));
    }
  };

  const handleConfirmPasswordChange = (newVal: string) => {
    setConfirmPassword(newVal);
    if (confirmPwdTimerRef.current) clearTimeout(confirmPwdTimerRef.current);

    if (showPassword || newVal.length === 0) {
      setConfirmPasswordDisplay(newVal);
      return;
    }

    if (newVal.length > confirmPassword.length) {
      const maskedPart = '•'.repeat(newVal.length - 1);
      const lastChar = newVal.slice(-1);
      setConfirmPasswordDisplay(maskedPart + lastChar);

      confirmPwdTimerRef.current = setTimeout(() => {
        setConfirmPasswordDisplay('•'.repeat(newVal.length));
      }, 1500);
    } else {
      setConfirmPasswordDisplay('•'.repeat(newVal.length));
    }
  };

  const resetForm = () => {
    setNome('');
    setCognome('');
    setEmail('');
    setPassword('');
    setPasswordDisplay('');
    setConfirmPassword('');
    setConfirmPasswordDisplay('');
    setProfileImageUri('');
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadingImage(true);
      try {
        const asset = result.assets[0];
        let file: any;

        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          file = new File([blob], 'avatar.jpg', { type: asset.mimeType || 'image/jpeg' });
        } else {
          file = {
            uri: asset.uri,
            name: asset.fileName || 'avatar.jpg',
            type: asset.mimeType || 'image/jpeg',
          };
        }

        const uploadedUrl = await uploadApi.uploadImage('profile', file);
        setProfileImageUri(uploadedUrl);
      } catch (err: any) {
        showDialog('Errore Upload', 'Impossibile caricare la foto profilo: ' + (err.message || ''));
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showDialog('Campi Mancanti', 'Inserisci email e password per accedere');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await authApi.login({
        email: email.trim(),
        password,
      });
      login(loggedUser);
      showDialog('Accesso Eseguito', `Benvenuto di nuovo, ${loggedUser.nome}!`);
      resetForm();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Credenziali errate o server non raggiungibile';
      showDialog('Errore Login', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!nome.trim() || !cognome.trim() || !email.trim() || !password) {
      showDialog('Campi Mancanti', 'Compila tutti i campi obbligatori');
      return;
    }

    if (password.length < 6) {
      showDialog('Password non sicura', 'La password deve avere almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      showDialog('Errore Password', 'Le password non coincidono');
      return;
    }

    setLoading(true);
    try {
      const newUser = await authApi.register({
        nome: nome.trim(),
        cognome: cognome.trim(),
        email: email.trim().toLowerCase(),
        password,
        urlImmagineProfilo: profileImageUri || undefined,
      });
      login(newUser);
      showDialog('Registrazione Riuscita', `Benvenuto su Spotifai, ${newUser.nome}!`);
      resetForm();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Impossibile completare la registrazione';
      showDialog('Errore Registrazione', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updatedUser = await authApi.updateProfile(user.id, {
        nome: nome.trim() || undefined,
        cognome: cognome.trim() || undefined,
        email: email.trim() || undefined,
        urlImmagineProfilo: profileImageUri || undefined,
      });
      updateUser(updatedUser);
      setEditMode(false);
      showDialog('Successo', 'Profilo aggiornato con successo!');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Impossibile aggiornare il profilo';
      showDialog('Errore', msg);
    } finally {
      setLoading(false);
    }
  };

  const openEditMode = () => {
    if (!user) return;
    setNome(user.nome);
    setCognome(user.cognome);
    setEmail(user.email);
    setProfileImageUri(user.urlImmagineProfilo || '');
    setEditMode(true);
  };

  const closeEditMode = () => {
    setEditMode(false);
    resetForm();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {isLoggedIn && user ? (
          /* Profile Logged State */
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              {user.urlImmagineProfilo ? (
                <Image source={{ uri: getMediaUrl(user.urlImmagineProfilo) }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {user.nome.charAt(0).toUpperCase()}
                    {user.cognome.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.userName}>
              {user.nome} {user.cognome}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            {editMode ? (
              /* Edit Profile Form */
              <View style={styles.editForm}>
                <TouchableOpacity
                  style={styles.avatarPickerButton}
                  onPress={pickAvatar}
                  disabled={uploadingImage}
                >
                  {profileImageUri ? (
                    <Image source={{ uri: getMediaUrl(profileImageUri) }} style={styles.pickerAvatarPreview} />
                  ) : (
                    <View style={styles.pickerAvatarPlaceholder}>
                      <Ionicons name="camera-outline" size={26} color={theme.colors.textSecondary} />
                      <Text style={styles.pickerAvatarText}>
                        {uploadingImage ? 'Caricamento...' : 'Foto Profilo'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                    <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Nome"
                      placeholderTextColor={theme.colors.textMuted}
                      value={nome}
                      onChangeText={setNome}
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                    <TextInput
                      style={styles.inputWithoutIcon}
                      placeholder="Cognome"
                      placeholderTextColor={theme.colors.textMuted}
                      value={cognome}
                      onChangeText={setCognome}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={closeEditMode}
                  >
                    <Text style={styles.cancelEditText}>Annulla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveEditButton}
                    onPress={handleUpdateProfile}
                    disabled={loading || uploadingImage}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.saveEditText}>Salva</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* View Profile Actions */
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={openEditMode}
                >
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.editProfileButtonText}>Modifica Profilo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => {
                    logout();
                    showDialog('Sessione Terminata', 'Hai eseguito il logout');
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#fff" />
                  <Text style={styles.logoutButtonText}>Disconnetti</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Login & Register Card */
          <View style={[styles.card, isRegisterMode && styles.cardRegister]}>
            {!isRegisterMode ? (
              <View style={styles.headerHero}>
                <Image 
                  source={require('../assets/logo-musicapp.jpg')} 
                  style={styles.logoImage} 
                  resizeMode="cover"
                />
                <Text style={styles.heroTitle}>Spotifai</Text>
              </View>
            ) : (
              <View style={styles.registerHeader}>
                <TouchableOpacity
                  style={styles.registerBackBtn}
                  onPress={() => setIsRegisterMode(false)}
                >
                  <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.registerHeaderTitle}>Crea Account</Text>
                <View style={{ width: 28 }} />
              </View>
            )}
            <View style={styles.form}>
              {isRegisterMode && (
                <>
                  {/* Photo picker for avatar */}
                  <TouchableOpacity
                    style={styles.avatarPickerButton}
                    onPress={pickAvatar}
                    disabled={uploadingImage}
                  >
                    {profileImageUri ? (
                      <Image source={{ uri: getMediaUrl(profileImageUri) }} style={styles.pickerAvatarPreview} />
                    ) : (
                      <View style={styles.pickerAvatarPlaceholder}>
                        <Ionicons name="camera-outline" size={26} color={theme.colors.textSecondary} />
                        <Text style={styles.pickerAvatarText}>
                          {uploadingImage ? 'Caricamento...' : 'Foto Profilo'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.nameRow}>
                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                      <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Nome"
                        placeholderTextColor={theme.colors.textMuted}
                        value={nome}
                        onChangeText={setNome}
                      />
                    </View>
                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                      <TextInput
                        style={styles.inputWithoutIcon}
                        placeholder="Cognome"
                        placeholderTextColor={theme.colors.textMuted}
                        value={cognome}
                        onChangeText={setCognome}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Email */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder={isRegisterMode ? "Password (min. 6 caratteri)" : "Password"}
                  placeholderTextColor={theme.colors.textMuted}
                  value={showPassword ? password : passwordDisplay}
                  onChangeText={(text) => {
                    if (showPassword) {
                      setPassword(text);
                      setPasswordDisplay(text);
                    } else {
                      // Se l'utente scrive o cancella
                      if (text.length > password.length) {
                        const added = text.slice(password.length);
                        handlePasswordChange(password + added);
                      } else {
                        handlePasswordChange(password.slice(0, text.length));
                      }
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => {
                    const next = !showPassword;
                    setShowPassword(next);
                    if (next) {
                      setPasswordDisplay(password);
                    } else {
                      setPasswordDisplay('•'.repeat(password.length));
                    }
                  }}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password in Register mode */}
              {isRegisterMode && (
                <View style={styles.inputContainer}>
                  <Ionicons name="shield-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Conferma password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={showPassword ? confirmPassword : confirmPasswordDisplay}
                    onChangeText={(text) => {
                      if (showPassword) {
                        setConfirmPassword(text);
                        setConfirmPasswordDisplay(text);
                      } else {
                        if (text.length > confirmPassword.length) {
                          const added = text.slice(confirmPassword.length);
                          handleConfirmPasswordChange(confirmPassword + added);
                        } else {
                          handleConfirmPasswordChange(confirmPassword.slice(0, text.length));
                        }
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {/* Forgot Password link in Login mode */}
              {!isRegisterMode && (
                <TouchableOpacity
                  style={styles.forgotPasswordBtn}
                  onPress={() => showDialog('Recupero Password', 'La funzionalità di recupero password sarà disponibile a breve.')}
                >
                  <Text style={styles.forgotPasswordText}>Hai dimenticato la password?</Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={isRegisterMode ? handleRegister : handleLogin}
                disabled={loading || uploadingImage}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {isRegisterMode ? 'Crea Account' : 'Accedi'}
                    </Text>
                    <Ionicons
                      name={isRegisterMode ? 'arrow-forward' : 'log-in-outline'}
                      size={20}
                      color="#000"
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Action */}
              {!isRegisterMode ? (
                <View style={styles.registerPromptContainer}>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>oppure</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <TouchableOpacity
                    style={styles.secondaryRegisterButton}
                    onPress={() => setIsRegisterMode(true)}
                  >
                    <Ionicons name="person-add-outline" size={18} color={theme.colors.text} />
                    <Text style={styles.secondaryRegisterButtonText}>Registrati</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => setIsRegisterMode(false)}
                >
                  <Text style={styles.switchModeText}>
                    Hai già un account?{' '}
                    <Text style={styles.switchModeHighlight}>Accedi</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 6,
  },
  configToggleText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  configCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.lg,
  },
  configTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  configSaveBtn: {
    backgroundColor: theme.colors.surfaceHighlight,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginTop: 8,
  },
  configSaveBtnText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardRegister: {
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  registerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  registerBackBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  registerHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  headerHero: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    padding: 4,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  tabButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
  },
  form: {
    gap: 14,
  },
  avatarPickerButton: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  pickerAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  pickerAvatarPreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  pickerAvatarText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 15,
  },

  inputWithoutIcon: {
    flex: 1,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: theme.borderRadius.full,
    marginTop: 10,
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  registerPromptContainer: {
    marginTop: 10,
    gap: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.surfaceBorder,
  },
  dividerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  secondaryRegisterButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.surfaceHighlight,
    gap: 8,
  },
  secondaryRegisterButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeBtn: {
    alignItems: 'center',
    marginTop: 8,
    padding: 6,
  },
  switchModeText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  switchModeHighlight: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  /* Profile screen style */
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  profileActions: {
    width: '100%',
    gap: 12,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceHighlight,
    gap: 8,
  },
  editProfileButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  editForm: {
    width: '100%',
    gap: 14,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
  },
  cancelEditText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveEditButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  saveEditText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: theme.colors.dangerSurface,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.borderRadius.full,
    width: '100%',
    gap: 8,
  },
  logoutButtonText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
});
