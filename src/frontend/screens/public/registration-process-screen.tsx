"use client";

import { BackLink, BlockPanel } from "@/frontend/components/mc";

export function RegistrationProcessScreen() {
  const steps = [
    {
      title: "1. Create an Account",
      description: "Click on 'Start your Journer' button from the homepage or 'Get Started' button from navigation bar and sign up using your email, choose an username and a strong password. Verify your email with the OTP sent to your inbox to gain access to the dashboard.",
    },
    {
      title: "2. Complete Your Profile",
      description: (
        <span className="flex flex-col gap-2">
          <span>2.1 Before you can register for any events, you must complete your profile.</span>
          <span>2.2 Navigate to &apos;Profile&apos; in the dashboard, fill in all the required details such as your name, college details and more.</span>
          <span>2.3 Upload the required documents such as your payment receipt, payment screenshot, and make sure to enter the Transaction ID.</span>
        </span>
      ),
    },
    {
      title: "3. Wait for Payment Verification",
      description: "Once Payment Details are submitted, please wait for the payment to get verified. It might take about 12-24 Hours.",
    },
    {
      title: "4. Explore Events",
      description: "By the time your payment is under review you can Visit the 'Explore Events' page to view all available technical and non-technical events. Click on any event card to view the detailed guidelines, eligibility, and prize pool.",
    },
    {
      title: "5. Register for an Event",
      description: "Once you have selected an event, click the 'Register' button. For individual events, you will be instantly registered if slots are available.",
    },
    {
      title: "6. Managing Team Events",
      description: "For team events, you can either create a new team or join an existing one using a Team ID. The Team Leader can manage members and the registration directly from their dashboard.",
    },
    {
      title: "7. Contact",
      description: "In case of any issues, please contact us at gateways@christuniversity.in",
    }
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">REGISTRATION PROCESS</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          A step-by-step guide on how to enter the portal and register for Gateways 2026.
        </p>
      </header>

      <section className="mt-[calc(var(--mc-unit)*2)] flex flex-col gap-[calc(var(--mc-unit)*4)]">
        {steps.map((step, i) => (
          <BlockPanel key={i} variant="panel" padded="lg">
            <div className="flex flex-col gap-[calc(var(--mc-unit)*2)]">
              <div>
                <h2 className="font-pixel text-[18px] md:text-[22px] text-mc-gold-light mb-[calc(var(--mc-unit))]">{step.title}</h2>
                <p className="text-[16px] md:text-[18px] text-mc-text leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </BlockPanel>
        ))}
      </section>
    </div>
  );
}
