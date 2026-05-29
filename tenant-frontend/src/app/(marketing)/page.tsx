import dynamic from "next/dynamic";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { StatsMarquee } from "@/components/landing/StatsMarquee";

const BentoFeatures = dynamic(
  () => import("@/components/landing/BentoFeatures").then((m) => m.BentoFeatures),
);
const ComplianceStrip = dynamic(
  () => import("@/components/landing/ComplianceStrip").then((m) => m.ComplianceStrip),
);
const ProcessTimeline = dynamic(
  () => import("@/components/landing/ProcessTimeline").then((m) => m.ProcessTimeline),
);
const PricingSection = dynamic(
  () => import("@/components/landing/PricingSection").then((m) => m.PricingSection),
);
const CTASection = dynamic(() => import("@/components/landing/CTASection").then((m) => m.CTASection));

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <StatsMarquee />
        <BentoFeatures />
        <ComplianceStrip />
        <ProcessTimeline />
        <PricingSection />
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
}
