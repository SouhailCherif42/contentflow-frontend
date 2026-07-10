"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

export default function AgencyIndexPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/a/${agencyId}/dashboard`);
  }, [agencyId, router]);

  return <Spinner />;
}
