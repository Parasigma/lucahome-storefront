"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { Dictionary } from "@/i18n/es";
import { forgotAction, loginAction, registerAction, resetAction, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

type Props = { mode: "login" | "register" | "forgot" | "reset"; t: Dictionary["auth"]; locale: string; next?: string; token?: string };

const actions = { login: loginAction, register: registerAction, forgot: forgotAction, reset: resetAction };

export function AuthForm({ mode, t, locale, next, token }: Props) {
  // Tras un error se conservan nombre y correo (React vacía los formularios al terminar la acción).
  const [state, action] = useActionState<AuthState & { name?: string; email?: string }, FormData>(
    async (prev, fd) => ({ ...(await actions[mode](prev, fd)), name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? "") }),
    {},
  );
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const title = { login: t.loginTitle, register: t.registerTitle, forgot: t.forgotTitle, reset: t.resetTitle }[mode];
  const text = { login: t.loginText, register: t.registerText, forgot: t.forgotText, reset: "" }[mode];
  const button = { login: t.loginButton, register: t.registerButton, forgot: t.forgotButton, reset: t.resetButton }[mode];

  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {text && <p className="mt-2 text-sm text-ink-soft">{text}</p>}
        {state.ok ? (
          <div className="mt-6 space-y-4">
            <p className="alert-ok">{mode === "forgot" ? t.forgotSent : t.resetDone}</p>
            <Link href={`/${locale}/login`} className="btn-primary w-full">{t.loginButton}</Link>
          </div>
        ) : (
          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="locale" value={locale} />
            {next && <input type="hidden" name="next" value={next} />}
            {token && <input type="hidden" name="token" value={token} />}
            {state.error && <p role="alert" className="alert-error">{t[state.error]}</p>}
            {mode === "register" && (
              <div>
                <label className="label" htmlFor="name">{t.name}</label>
                <input id="name" name="name" required minLength={2} maxLength={120} autoComplete="name" defaultValue={state.name} className="field" />
              </div>
            )}
            {mode !== "reset" && (
              <div>
                <label className="label" htmlFor="email">{t.email}</label>
                <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" defaultValue={state.email} className="field" />
              </div>
            )}
            {mode !== "forgot" && (
              <div>
                <label className="label" htmlFor="password">{t.password}</label>
                <input
                  id="password" name="password" type="password" required dir="ltr" className="field"
                  minLength={mode === "login" ? 1 : 10}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                {mode !== "login" && <p className="mt-1.5 text-xs text-muted">{t.passwordHint}</p>}
              </div>
            )}
            {mode === "register" && (
              <label className="flex items-start gap-2.5 text-sm text-ink-soft">
                <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[#1d914f]" />
                <span>
                  {t.acceptTerms}{" "}
                  <Link href={`/${locale}/legal/terms`} target="_blank" className="font-semibold text-brand-dark underline">↗</Link>
                </span>
              </label>
            )}
            <SubmitButton>{button}</SubmitButton>
            {mode === "login" && (
              <div className="space-y-2 pt-2 text-center text-sm text-ink-soft">
                <p><Link href={`/${locale}/forgot`} className="font-semibold hover:text-ink">{t.forgot}</Link></p>
                <p>{t.noAccount} <Link href={`/${locale}/register${q}`} className="font-semibold text-brand-dark">{t.registerButton}</Link></p>
              </div>
            )}
            {mode === "register" && (
              <p className="pt-2 text-center text-sm text-ink-soft">
                {t.haveAccount} <Link href={`/${locale}/login${q}`} className="font-semibold text-brand-dark">{t.loginButton}</Link>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
