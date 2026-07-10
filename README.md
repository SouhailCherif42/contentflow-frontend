# ContentFlow — Frontend

Frontend web du SaaS de content marketing ContentFlow, construit sur le backend FastAPI du dossier `../contentflow-backend`.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS 4** (tokens de design dans `src/app/globals.css`)
- **TanStack React Query** pour les données (chargement / erreur / invalidation)
- **lucide-react** pour les icônes

## Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

Le backend doit tourner sur `http://localhost:8000` (configurable via `.env.local` → `NEXT_PUBLIC_API_URL`).

## Architecture

```
src/
  lib/
    api.ts             # client HTTP typé : Bearer JWT, refresh auto sur 401, stockage tokens
    types.ts           # types alignés sur les schémas Pydantic du backend
    labels.ts          # libellés FR (statuts, formats, rôles) + formats de dates
    auth-context.tsx   # Providers (React Query + auth), login/register/logout
    agency-context.tsx # agence courante, membres, rôle → canEdit / isAdmin
  components/
    ui.tsx             # primitives : Button, Input, Select, Dialog, Table, Badge, états…
    shell.tsx          # sidebar fixe du workspace
    flow-rail.tsx      # signature visuelle : le rail du pipeline éditorial
    toast.tsx          # notifications
  app/
    page.tsx           # landing publique
    login | signup | forgot-password | reset-password | onboarding
    invite/[token]     # acceptation d'invitation
    a/[agencyId]/      # workspace scoppé par agence (auth requise)
      dashboard | topics | ideas | content | content/[id] | curation | calendar
      settings (agence) | settings/members | settings/notion
```

## Multi-tenant et rôles

- Toutes les routes du workspace sont préfixées `/a/{agencyId}` ; l'ID est mémorisé en localStorage
  pour rediriger vers le bon espace à la prochaine session.
- Les rôles (`admin`, `collaborator`, `viewer`) sont dérivés de la liste des membres :
  les actions d'écriture sont masquées pour les lecteurs, les actions d'administration
  (suppression, invitations, Notion, rôles) réservées aux admins. Le backend reste la
  source d'autorité (403 gérés).

## Limites connues côté backend

- Pas d'endpoint « lister mes agences » : après acceptation d'invitation, la réponse ne contient
  pas l'`agency_id`. La page d'invitation accepte un paramètre optionnel `?agency=<id>` pour
  rediriger directement ; sinon l'utilisateur doit ouvrir l'URL du workspace partagée par l'équipe.
- L'OAuth Notion (`GET /auth/notion`) redirige côté backend ; le mapping des databases se fait
  ensuite dans Paramètres → Notion.
