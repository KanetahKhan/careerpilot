import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { PillarsSection } from "@/components/landing/PillarsSection";
import { StepsSection } from "@/components/landing/StepsSection";
import { Footer } from "@/components/landing/Footer";
import "@/app/landing.css";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <HeroSection />
      <PillarsSection />
      <StepsSection />
      <Footer />
    </main>
  );
}
