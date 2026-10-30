import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // DB 테스트는 로컬 Supabase가 떠 있어야 해서 `npm run test:db`로 따로 돌린다.
    include: ["tests/*.test.ts"],
  },
});
