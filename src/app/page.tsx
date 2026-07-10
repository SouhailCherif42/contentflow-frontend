"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { agencyStore } from "@/lib/api";
import { Logo } from "@/components/logo";
import { FlowRail } from "@/components/flow-rail";
import { Button } from "@/components/ui";

const features = [
  {
    title: "Piliers éditoriaux",
    body: "Structurez votre ligne éditoriale par thèmes et mots-clés. Chaque idée, contenu et flux de veille s'y rattache.",
  },
  {
    title: "Idées assistées par IA",
    body: "Générez des idées ancrées dans vos piliers et votre veille, avec détection automatique des doublons.",
  },
  {
    title: "Rédaction et versions",
    body: "Rédigez, améliorez par instructions, comparez les versions et restaurez celle qui fonctionne.",
  },
  {
    title: "Curation RSS",
    body: "Agrégez vos sources, importez des URLs, taguez par pilier et transformez la veille en matière première.",
  },
  {
    title: "Calendrier éditorial",
    body: "Planifiez la publication, assignez les contenus à votre équipe et gardez le rythme.",
  },
  {
    title: "Sync Notion",
    body: "Poussez contenus et calendrier vers vos databases Notion. Votre workspace reste la source de vérité.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const enter = () => {
    const agencyId = agencyStore.get();
    router.push(agencyId ? `/a/${agencyId}/dashboard` : "/onboarding");
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {!loading && user ? (
            <Button onClick={enter}>
              Ouvrir le workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-soft hover:text-ink">
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-strong"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Héro : la thèse du produit, portée par le rail de flux */}
        <section className="py-20">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-accent">
            Content marketing pour agences et équipes
          </p>
          <h1 className="max-w-2xl font-display text-5xl leading-[1.08]">
            De l&apos;idée à la publication, <em className="text-accent">un seul flux</em>.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-soft">
            ContentFlow réunit vos piliers éditoriaux, votre veille, la génération d&apos;idées et la
            rédaction assistée dans un workspace unique — jusqu&apos;au calendrier et à la sync Notion.
          </p>
          <div className="mt-8 flex items-center gap-3">
            {!loading && user ? (
              <Button onClick={enter}>
                Ouvrir le workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
                >
                  Commencer gratuitement
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink hover:bg-panel"
                >
                  Se connecter
                </Link>
              </>
            )}
          </div>

          <div className="mt-16 max-w-2xl rounded-lg border border-line bg-surface px-8 pb-4 pt-7">
            <FlowRail
              activeIndex={2}
              steps={[
                { label: "Veille" },
                { label: "Idée" },
                { label: "Brouillon" },
                { label: "Relecture" },
                { label: "Publié" },
              ]}
            />
          </div>
        </section>

        <section className="border-t border-line py-16">
          <h2 className="mb-10 font-display text-2xl">Tout le pipeline éditorial, au même endroit</h2>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="bg-surface p-6">
                <h3 className="mb-1.5 text-sm font-semibold">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-16">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-panel px-8 py-8">
            <div>
              <h2 className="font-display text-2xl">Multi-agences, rôles et invitations</h2>
              <p className="mt-1 max-w-lg text-sm text-soft">
                Chaque agence a son espace isolé. Invitez vos clients en lecture, vos rédacteurs en
                collaboration, et gardez le contrôle en admin.
              </p>
            </div>
            <Link
              href="/signup"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
            >
              Créer mon agence
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs text-soft">
          <span>© {new Date().getFullYear()} ContentFlow</span>
          <span>Le workspace éditorial des équipes content.</span>
        </div>
      </footer>
    </div>
  );
}
