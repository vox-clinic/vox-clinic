"use client"

import { NavBar } from "./nav-bar"
import { HeroSection } from "./hero-section"
import { SocialProofBar } from "./social-proof-bar"
import { HowItWorksSection } from "./how-it-works-section"
import { FeaturesBentoSection } from "./features-bento-section"
import { AIShowcaseSection } from "./ai-showcase-section"
import { ProfessionsSection } from "./professions-section"
import { SecuritySection } from "./security-section"
import { TestimonialsSection } from "./testimonials-section"
import { PricingSection } from "./pricing-section"
import { FAQSection } from "./faq-section"
import { FinalCTASection } from "./final-cta-section"

export function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth">
      <NavBar />
      <main>
        <HeroSection />
        <SocialProofBar />
        <HowItWorksSection />
        <FeaturesBentoSection />
        <AIShowcaseSection />
        <ProfessionsSection />
        <SecuritySection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
    </div>
  )
}
