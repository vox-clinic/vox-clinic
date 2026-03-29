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
import { Particles } from "@/components/ui/particles"

interface LandingPageProps {
  isAuthenticated?: boolean
  dashboardUrl?: string
}

export function LandingPage({ isAuthenticated = false, dashboardUrl = "/dashboard" }: LandingPageProps) {
  return (
    <div className="relative min-h-screen scroll-smooth bg-[#0a0f1a] text-white">
      <div className="fixed inset-0 z-50 pointer-events-none w-screen h-screen">
        <Particles className="size-full" quantity={80} color="#14B8A6" size={0.6} staticity={40} ease={60} />
      </div>
      <div className="relative">
      <NavBar isAuthenticated={isAuthenticated} dashboardUrl={dashboardUrl} />
      <main className="[&>div]:py-24 md:[&>div]:py-32">
        <HeroSection isAuthenticated={isAuthenticated} dashboardUrl={dashboardUrl} />
        <div><SocialProofBar /></div>
        <div><HowItWorksSection /></div>
        <div><FeaturesBentoSection /></div>
        <div><AIShowcaseSection /></div>
        <div><ProfessionsSection /></div>
        <div><SecuritySection /></div>
        <div><TestimonialsSection /></div>
        <div><PricingSection /></div>
        <div><FAQSection /></div>
        <FinalCTASection />
      </main>
      </div>
    </div>
  )
}
