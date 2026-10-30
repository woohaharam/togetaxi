import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  // next-env.d.ts는 Next.js가 만들어 주는 파일이라 손대지 않는다.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/sw.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 쓰지 않는 값은 _로 시작하면 넘어간다.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
