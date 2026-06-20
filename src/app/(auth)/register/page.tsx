"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell, PrimaryButton, inputClass, labelClass } from "../AuthShell";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [affRef, setAffRef] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref") ?? "";
    if (/^[a-zA-Z0-9_-]{4,40}$/.test(ref)) setRefCode(ref);
    const aff = searchParams.get("aff") ?? "";
    if (/^[a-zA-Z0-9_-]{4,20}$/.test(aff)) setAffRef(aff);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        ...(refCode ? { referralCode: refCode } : {}),
        ...(affRef ? { affRef } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao criar conta");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
  }

  function googleSignup() {
    // Preserve affiliate attribution through the OAuth redirect
    if (affRef) {
      document.cookie = `aff_ref=${affRef}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    }
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <AuthShell
      mode="register"
      heading="Criar conta"
      subheading="Comece com $1.000 de saldo virtual"
      onGoogle={googleSignup}
      googleLabel="Cadastrar com Google"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-[#F59E0B] transition-colors hover:text-amber-300">
            Entrar
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

        {affRef && (
          <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-4 py-2.5 text-xs text-amber-300">
            <span>🎁</span> Convite de afiliado aplicado
          </div>
        )}

        <div>
          <label className={labelClass}>Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            required
            className={inputClass}
          />
        </div>

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
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
            className={inputClass}
          />
        </div>

        <PrimaryButton loading={loading} loadingLabel="Criando conta…">
          Criar conta grátis
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
