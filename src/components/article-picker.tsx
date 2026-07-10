"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { Badge, Input, cn } from "./ui";
import type { Article } from "@/lib/types";

/*
  Sélecteur d'articles de curation pour enrichir la génération IA.
  Le point clé du brief client : ancrer les contenus dans la veille.
*/
export function ArticlePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { agencyId } = useAgency();
  const [filter, setFilter] = useState("");

  const articles = useQuery({
    queryKey: ["articles", agencyId, "picker"],
    queryFn: () => api<Article[]>(`/agencies/${agencyId}/curation/articles`),
  });

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  if (articles.isPending) {
    return <p className="py-3 text-center text-[13px] text-soft">Chargement de la veille…</p>;
  }
  if (articles.isError || !articles.data || articles.data.length === 0) {
    return (
      <p className="rounded-md bg-panel px-3 py-2.5 text-[13px] text-soft">
        Aucun article de veille disponible. Ajoutez des flux RSS ou importez des URLs dans l&apos;onglet
        Curation pour ancrer la génération dans votre veille.
      </p>
    );
  }

  const term = filter.trim().toLowerCase();
  // articles sauvegardés en premier : ce sont ceux jugés pertinents
  const list = articles.data
    .filter((a) => !term || a.title.toLowerCase().includes(term) || (a.summary ?? "").toLowerCase().includes(term))
    .sort((a, b) => Number(b.is_saved) - Number(a.is_saved))
    .slice(0, 50);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-faint" />
        <Input
          aria-label="Filtrer les articles de veille"
          className="pl-8"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer la veille…"
        />
      </div>
      <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-line p-1">
        {list.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-soft">Aucun article ne correspond.</p>
        ) : (
          list.map((a) => (
            <label
              key={a.id}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-panel",
                selected.includes(a.id) && "bg-accent-soft/60",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-[#1e7a4a]"
                checked={selected.includes(a.id)}
                onChange={() => toggle(a.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{a.title}</span>
                {a.summary && <span className="block truncate text-xs text-faint">{a.summary}</span>}
              </span>
              {a.is_saved && (
                <Badge tone="green">
                  <Bookmark className="mr-0.5 h-3 w-3" />
                  Sauvegardé
                </Badge>
              )}
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-soft">
        {selected.length === 0
          ? "Aucun article sélectionné — la génération s'appuiera uniquement sur le pilier."
          : `${selected.length} article${selected.length > 1 ? "s" : ""} de veille utilisé${selected.length > 1 ? "s" : ""} comme contexte.`}
      </p>
    </div>
  );
}
