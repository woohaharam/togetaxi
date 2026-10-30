"use client";

import { useEffect } from "react";
import { initPwa } from "@/lib/pwa";

export default function PwaInit() {
  useEffect(() => {
    initPwa();
  }, []);
  return null;
}
