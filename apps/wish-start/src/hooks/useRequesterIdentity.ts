"use client";

import { useEffect, useState } from "react";

import { getOrCreateRequesterId } from "@/lib/requesterIdentity";

export function useRequesterIdentity() {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    setClientId(getOrCreateRequesterId(window.localStorage));
  }, []);

  return clientId;
}
