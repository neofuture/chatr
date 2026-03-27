"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePanels } from "@/contexts/PanelContext";
import { useToast } from "@/contexts/ToastContext";
import { EmailVerificationContent } from "@/components/forms/EmailVerification/EmailVerification";
import { ForgotPasswordContent } from "@/components/forms/ForgotPassword/ForgotPassword";
import api, { getApiBase } from "@/lib/api";
import styles from "./login.module.css";

const API = getApiBase();
const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || "Chatr";
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://chatr-app.online";

export default function LoginPage() {
  const router = useRouter();
  const { openPanel } = usePanels();
  const { showToast } = useToast();
  const [view, setView] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"email" | "sms">("email");

  const [regEmail, setRegEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [emailValid, setEmailValid] = useState(true);
  const [phoneValid, setPhoneValid] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameSubmitError, setUsernameSubmitError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) router.replace("/app");
  }, [router]);

  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength += 25;
    return strength;
  };
  const passwordStrength = calculatePasswordStrength(regPassword);

  const validateEmail = (em: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+44")) return cleaned.length >= 13 && cleaned.length <= 15;
    if (cleaned.startsWith("07")) return cleaned.length === 11;
    return false;
  };

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (!usernameManuallyEdited)
      setUsername(`${val}${lastName}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20).toLowerCase());
  };
  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (!usernameManuallyEdited)
      setUsername(`${firstName}${val}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20).toLowerCase());
  };
  const handleUsernameChange = (v: string) => {
    setUsernameManuallyEdited(true);
    setUsername(v.replace(/\s/g, "").toLowerCase());
  };

  useEffect(() => {
    if (username.length < 3 || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      setUsernameSuggestions([]);
      try {
        const r = await fetch(
          `${API}/api/users/check-username?username=${encodeURIComponent(username)}`
        );
        const d = await r.json();
        setUsernameAvailable(d.available);
        if (!d.available) {
          const sr = await fetch(
            `${API}/api/users/suggest-username?username=${encodeURIComponent(username)}`
          );
          const sd = await sr.json();
          if (sd.suggestions) setUsernameSuggestions(sd.suggestions);
        }
      } catch {
        /* ignore */
      } finally {
        setUsernameChecking(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [username]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.auth.login(email, password, undefined, verificationMethod);
      if (data.requiresEmailVerification) {
        showToast("Please verify your email first", "warning");
        openPanel(
          "email-verification",
          <EmailVerificationContent userId={data.userId} verificationType="email" />,
          "Verify Email",
          "center"
        );
        setLoading(false);
        return;
      }
      if (data.requiresPhoneVerification) {
        showToast("Please verify your phone number first", "warning");
        openPanel(
          "phone-verification",
          <EmailVerificationContent userId={data.userId} verificationType="phone" />,
          "Verify Phone Number",
          "center"
        );
        setLoading(false);
        return;
      }
      if (data.requiresLoginVerification) {
        const msg =
          data.verificationMethod === "sms"
            ? "Please check your phone for the verification code"
            : "Please check your email for the verification code";
        showToast(msg, "info");
        localStorage.setItem("temp_login_email", email);
        localStorage.setItem("temp_login_password", password);
        openPanel(
          "login-verification",
          <EmailVerificationContent userId={data.userId} verificationType="login" />,
          "Verify Login",
          "center"
        );
        setLoading(false);
        return;
      }
      if (data.requiresTwoFactor) {
        showToast("2FA is not yet supported here", "info");
        setLoading(false);
        return;
      }
      if (!data.token || !data.user) throw new Error("Invalid login response");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("chatr:auth-changed"));
      showToast("Login successful!", "success");
      router.replace("/app");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setUsernameSubmitError(false);
    if (!firstName.trim()) { showToast("Please enter your first name", "warning"); return; }
    if (!lastName.trim()) { showToast("Please enter your last name", "warning"); return; }
    if (!regEmail || !validateEmail(regEmail)) { showToast("Please enter a valid email", "warning"); setEmailValid(false); return; }
    setEmailValid(true);
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) { showToast("Please enter a valid UK mobile number", "warning"); setPhoneValid(false); return; }
    setPhoneValid(true);
    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) { showToast("Invalid username", "warning"); setUsernameSubmitError(true); return; }
    if (usernameChecking) { showToast("Checking username...", "info"); return; }
    if (usernameAvailable === false) { showToast("Username taken", "warning"); setUsernameSubmitError(true); return; }
    if (regPassword.length < 8 || !/[A-Z]/.test(regPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(regPassword)) { showToast("Password must include: 1 capital, 1 special char, 8+ chars", "warning"); return; }
    if (regPassword !== confirmPassword) { showToast("Passwords do not match", "warning"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          phoneNumber,
          username,
          password: regPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender: gender || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Registration failed");
      showToast("Registration successful! Check your email.", "success");
      const userEmail = regEmail;
      setRegEmail("");
      setFirstName("");
      setLastName("");
      setGender("");
      setPhoneNumber("");
      setUsername("");
      setRegPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        openPanel(
          "Verify Your Email",
          <EmailVerificationContent userId={data.userId} email={userEmail} />
        );
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    openPanel("Forgot Password", <ForgotPasswordContent />);
  };

  const isUsernameInvalid = () =>
    username && (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username));

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Image
            src="/images/logo-horizontal.png"
            alt={PRODUCT_NAME}
            width={200}
            height={66}
            priority
            style={{ width: 200, height: "auto" }}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {view === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="you@example.com or @username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              <p className={styles.forgotWrap}>
                <button type="button" onClick={handleForgotPassword} className="text-link">
                  Forgot password?
                </button>
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Send verification code via:</label>
              <div className={styles.verifyToggle}>
                <button
                  type="button"
                  onClick={() => setVerificationMethod("sms")}
                  className={`${styles.verifyBtn} ${verificationMethod === "sms" ? styles.active : ""}`}
                >
                  <i className="fas fa-mobile-alt" /> SMS
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationMethod("email")}
                  className={`${styles.verifyBtn} ${verificationMethod === "email" ? styles.active : ""}`}
                >
                  <i className="fas fa-envelope" /> Email
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <p className={styles.switchText}>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setView("register");
                  setError("");
                }}
                className="text-link"
              >
                Create account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className={styles.nameRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Gender <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
              </label>
              <select
                className="form-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className={`form-input ${!emailValid ? styles.invalid : ""}`}
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  setEmailValid(true);
                }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className={`form-input ${!phoneValid ? styles.invalid : ""}`}
                placeholder="+447911123456 or 07911123456"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneValid(true);
                }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input
                  type="text"
                  className="form-input input-with-icon input-with-status"
                  placeholder="username"
                  value={username}
                  onChange={(e) => {
                    handleUsernameChange(e.target.value);
                    setUsernameSubmitError(false);
                  }}
                  required
                />
                {username.length > 0 && (
                  <span className="input-status-icon">
                    {usernameChecking && (
                      <span style={{ color: "var(--color-orange-500)" }}>
                        <i className="fas fa-spinner fa-spin" />
                      </span>
                    )}
                    {!usernameChecking &&
                      username.length >= 3 &&
                      !isUsernameInvalid() &&
                      usernameAvailable === true && (
                        <span style={{ color: "var(--color-green-500)" }}>
                          <i className="fas fa-check" />
                        </span>
                      )}
                    {!usernameChecking &&
                      (isUsernameInvalid() || usernameAvailable === false) && (
                        <span style={{ color: "var(--color-red-500)" }}>
                          <i className="fas fa-times" />
                        </span>
                      )}
                  </span>
                )}
              </div>
              {usernameSuggestions.length > 0 && (
                <div className={styles.suggestions}>
                  {usernameSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setUsername(s);
                        setUsernameManuallyEdited(true);
                        setUsernameSuggestions([]);
                      }}
                      className={styles.suggBtn}
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showRegPassword ? "text" : "password"}
                  className="form-input"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  tabIndex={-1}
                >
                  <i className={`fas ${showRegPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              {regPassword && (
                <div className={styles.strengthBar}>
                  <div
                    className={styles.strengthFill}
                    style={{
                      width: `${passwordStrength}%`,
                      backgroundColor:
                        passwordStrength <= 25
                          ? "#ef4444"
                          : passwordStrength <= 50
                            ? "#f97316"
                            : passwordStrength <= 75
                              ? "#eab308"
                              : "#22c55e",
                    }}
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              {confirmPassword && regPassword !== confirmPassword && (
                <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  Passwords do not match
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
            <p className={styles.switchText}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                }}
                className="text-link"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        <div className={styles.websiteLink}>
          <a href={WEBSITE_URL}>Visit chatr-app.online &rarr;</a>
        </div>
      </div>
    </div>
  );
}
