import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "같이타 — 대학생 택시 같이 타기",
    short_name: "같이타",
    description: "같은 방향 가는 학우와 택시비를 나눠요",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ffc629",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
