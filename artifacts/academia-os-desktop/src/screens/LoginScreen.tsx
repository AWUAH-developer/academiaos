import React, { useState } from 'react';
import DevourLogo from '../components/DevourLogo';
import { useAuth } from '../store/auth';

export default function LoginScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!username.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      const result = await login(
        username.trim().toLowerCase(),
        password,
      );

      if (!result.ok) {
        setError(
          result.error ??
            'Sign-in failed. Check your username and password.',
        );
      }
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Sign-in failed. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="desktop-auth-page">
      <div className="desktop-auth-shell">
        <section className="desktop-auth-brand">
          <div className="desktop-auth-brand-icon">
            <img
              src="./brand-logo.jpg"
              alt="AcademiaOS"
            />
          </div>

          <div className="desktop-auth-brand-copy">
            <DevourLogo />

            <p>School Command Centre</p>
          </div>
        </section>

        <section className="desktop-auth-introduction">
          <h1>Sign in to your school</h1>

          <p className="desktop-auth-description">
            Use the username and password assigned by your school
            administrator.
          </p>
        </section>

        {error && (
          <div className="desktop-auth-error" role="alert">
            {error}
          </div>
        )}

        <form
          className="desktop-auth-form"
          onSubmit={handleSubmit}
        >
          <div className="desktop-auth-field">
            <label htmlFor="desktop-username">
              Username
            </label>

            <input
              id="desktop-username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="desktop-auth-field">
            <label htmlFor="desktop-password">
              Password
            </label>

            <div className="desktop-auth-password-control">
              <input
                id="desktop-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="desktop-auth-password-toggle"
                onClick={() =>
                  setShowPassword((visible) => !visible)
                }
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            className="desktop-auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Signing in…'
              : 'Sign in to AcademiaOS'}
          </button>
        </form>

        <footer className="desktop-auth-footer">
          AcademiaOS™ © 2026. All rights reserved.
        </footer>
</div>
    </main>
  );
}
