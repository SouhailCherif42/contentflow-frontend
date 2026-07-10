"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthCard } from "@/components/auth-card";
import { NotionMark } from "@/components/notion-mark";
import { Button, Field, Input } from "@/components/ui";

export default function SignupPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, fullName);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Votre workspace éditorial en deux minutes."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nom complet" htmlFor="fullName">
          <Input
            id="fullName"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Marie Dupont"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@agence.fr"
          />
        </Field>
        <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum.">
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Créer mon compte
        </Button>
        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-faint">ou</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/auth/notion`}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-surface text-sm font-medium text-ink hover:bg-panel"
        >
          <NotionMark />
          Continuer avec Notion
        </a>
      </form>
    </AuthCard>
  );
}
