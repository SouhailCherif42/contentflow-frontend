"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
    } finally {
      // même réponse quelle que soit l'existence de l'email
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Recevez un lien de réinitialisation par email."
      footer={
        <Link href="/login" className="font-medium text-accent hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-md bg-accent-soft px-3 py-2.5 text-sm text-accent-strong">
          Si un compte existe avec cette adresse, un lien de réinitialisation vient d&apos;être envoyé.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
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
          <Button type="submit" loading={loading} className="w-full">
            Envoyer le lien
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
