"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, PrimaryButton, inputClass, labelClass } from "../AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) setError("Email ou senha inválidos");
    else router.push("/dashboard");
  }

  return (
    <AuthShell
      mode="login"
      heading="Bem-vindo de volta"
      subheading="Entre na sua conta para continuar"
      onGoogle={() => signIn("google", { callbackUrl: "/dashboard" })}
      googleLabel="Continuar com Google"
      footer={
        <>
          Não tem conta?{" "}
          <Link href="/register" className="font-semibold text-[#F59E0B] transition-colors hover:text-amber-300">
            Criar conta grátis
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            <span className="text-rose-500">⚠</span> {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={inputClass}
          />
        </div>

        <PrimaryButton loading={loading} loadingLabel="Entrando…">
          Entrar na plataforma
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
