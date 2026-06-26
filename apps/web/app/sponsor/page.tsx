import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { SponsorForm } from "../components/SponsorForm";

export const metadata = {
  title: "Advertise on Aside — reach developers in their most-watched line",
  description:
    "Native, honest sponsorship in the Claude Code status line. Apply for early access.",
};

export default function Sponsor() {
  return (
    <>
      <Nav />

      <header className="hero" style={{ paddingBottom: 32 }}>
        <div className="container">
          <span className="eyebrow">
            <span className="pulse" aria-hidden="true" />
            early access
          </span>
          <h1 className="title">
            Reach developers in their{" "}
            <span className="accent">most-watched line.</span>
          </h1>
          <p className="subcopy">
            When the AI is thinking, every developer is looking at the status
            line. Aside places a small share of native, clearly-labeled
            sponsor messages there — no tracking, no reading their code, no dark
            patterns. Just one honest line, in front of the right audience.
          </p>
          <div className="hero-cta">
            <a href="#apply" className="btn btn-primary">
              Apply for early access
            </a>
            <a href="#pricing" className="btn btn-ghost">
              See pricing
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Value props */}
        <section className="block">
          <div className="container">
            <div className="grid">
              <div className="card">
                <div className="step-num">Attention</div>
                <h3>The wait-state is prime time.</h3>
                <p>
                  Developers watch the status line precisely when the assistant
                  is busy. Your message lands in a focused, recurring moment —
                  not buried in a feed.
                </p>
              </div>
              <div className="card">
                <div className="step-num">Native</div>
                <h3>One honest line, clearly labeled.</h3>
                <p>
                  Sponsored curiosities sit alongside organic ones and are always
                  attributed. Around 20% of slots are sponsored — enough to
                  sustain the project, never enough to annoy.
                </p>
              </div>
              <div className="card">
                <div className="step-num">Clean</div>
                <h3>No tracking of their work.</h3>
                <p>
                  Aside never reads code, prompts, files, or paths. Click
                  counts are best-effort and anonymous. Privacy is the product,
                  for readers and sponsors alike.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="block" id="pricing">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">Pricing</div>
              <h2 className="section-title">Pay for attention, by the view.</h2>
              <p className="section-sub">
                Indicative early-access pricing, modeled per 1,000 views. Final
                rates are set per campaign during onboarding — these numbers are
                illustrative, not a live quote.
              </p>
            </div>
            <div className="pricing">
              <div className="price-card">
                <div className="tier">Starter</div>
                <div className="amount">
                  $2<span> / 1,000 views</span>
                </div>
                <p>
                  Test the channel. Small monthly block, single ad line, global
                  audience.
                </p>
              </div>
              <div className="price-card featured">
                <div className="tier">Growth</div>
                <div className="amount">
                  $4<span> / 1,000 views</span>
                </div>
                <p>
                  Priority rotation and faster delivery. Geo targeting and basic
                  reporting included.
                </p>
              </div>
              <div className="price-card">
                <div className="tier">Scale</div>
                <div className="amount">
                  Custom<span> / volume</span>
                </div>
                <p>
                  High-volume blocks, multiple ad lines, and a dedicated point of
                  contact.
                </p>
              </div>
            </div>
            <p className="pricing-note">
              Illustrative only. Clicks, delivery speed, and geography affect the
              final rate. Nothing is charged through this site.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="block" id="apply">
          <div className="container">
            <div className="section-head" style={{ textAlign: "center" }}>
              <div className="section-kicker">Apply</div>
              <h2 className="section-title">Tell us about your campaign.</h2>
              <p className="section-sub" style={{ margin: "0 auto" }}>
                Send us the basics and we&apos;ll follow up. No billing, no
                commitment — this is an application for early access.
              </p>
            </div>
            <SponsorForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
