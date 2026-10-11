"use client";

import { useEffect } from "react";
import { startStage } from "@/lib/ui/stageMotion";

/** Attaches the scroll choreography to the server-rendered stage. Renders nothing. */
export default function StageMotion({ target }: { target: string }) {
  useEffect(() => {
    if (!document.documentElement.classList.contains("js-motion")) return; // reduced motion: static
    const stage = document.getElementById(target);
    if (!stage) return;
    return startStage(stage);
  }, [target]);
  return null;
}
