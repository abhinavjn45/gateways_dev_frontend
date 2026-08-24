"use client";

import { BackLink, BlockPanel } from "@/frontend/components/mc";

export function PrivacyScreen() {
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">PRIVACY POLICY</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          How we handle and protect your data for Gateways 2026.
        </p>
      </header>

      <section className="mt-[calc(var(--mc-unit)*2)]">
        <BlockPanel variant="panel" padded="lg">
          <p className="text-[16px] md:text-[18px] text-mc-text leading-relaxed">
            Content coming soon...
          </p>
        </BlockPanel>
      </section>
    </div>
  );
}
