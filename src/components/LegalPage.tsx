import PageHeader from "./PageHeader";
import { SITE } from "@/lib/site";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} back="/" />
      <main className="legal px-5 pb-16 text-[15px] leading-relaxed text-zinc-700">
        {children}
        <p className="mt-10 text-[13px] text-zinc-400">시행일: {SITE.effectiveDate}</p>
      </main>
    </>
  );
}
