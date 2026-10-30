import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/*.test.ts"],
    // 하나의 커넥션을 공유하며 트랜잭션으로 격리하므로 순차 실행한다.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
