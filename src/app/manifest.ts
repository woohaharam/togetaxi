import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "같이타",
    short_name: "같이타",
    description: "같은 방향 가는 학생끼리 택시비 나눠 내기",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ffc629",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
