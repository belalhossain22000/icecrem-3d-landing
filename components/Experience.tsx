"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

// A missing WebGL context throws inside the renderer; keep the rest of the page alive.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[crema-lab] 3D scene disabled:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const STAGES = [
  {
    eyebrow: "Premium gelato",
    title: ["Made to", "melt slowly"],
    copy: "Crema Lab folds cold air into slow-churned cream, so every spoon turns silky the moment it meets your tongue.",
  },
  {
    eyebrow: "Premium gelato",
    title: ["Churned", "cold"],
    copy: "The cream is chilled low and spun gently in steel until it thickens into a smooth, velvety base. Nothing rushed, nothing added.",
  },
  {
    eyebrow: "Premium gelato",
    title: ["Swirled", "to order"],
    copy: "Every cone is filled the moment you order. Cream rises in tight, even coils over a freshly baked waffle shell.",
  },
  {
    eyebrow: "Premium gelato",
    title: ["Finished", "by hand"],
    copy: "Dipped in warm, single-origin chocolate and turned by hand, each cone gets a thin glossy shell that cracks at the first bite.",
  },
  {
    eyebrow: "Premium gelato",
    title: ["From cream", "to crave"],
    copy: "A cold, creamy centre under a snap of dark chocolate. Made slowly. Gone quickly.",
  },
];

const FLAVORS = [
  { name: "Vanilla Bean", note: "Madagascar vanilla, slow-churned", price: "$5.5", a: "#f6ead0", b: "#e2cfa6" },
  { name: "Dark Chocolate", note: "70% single-origin cacao", price: "$6.0", a: "#6a3a26", b: "#2e170d" },
  { name: "Pistachio", note: "Roasted Sicilian pistachios", price: "$6.5", a: "#d6dfb0", b: "#a3b277" },
  { name: "Salted Caramel", note: "Burnt sugar, sea salt flakes", price: "$6.0", a: "#e8b873", b: "#b9783a" },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function Experience() {
  const story = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = story.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      progress.current = p;
      setStage(Math.round(p * 4));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const goTo = useCallback((i: number) => {
    const el = story.current;
    if (!el) return;
    const top = el.offsetTop + (i / 4) * (el.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  return (
    <>
      <header className="nav">
        <div className="util">
          <span>● Coastal Sherwoodville ▾</span>
          <span>☎ 555 000 0123</span>
        </div>
        <div className="bar">
          <a className="logo" href="#top">
            CREMA LAB
            <small>HANDCRAFTED GELATO</small>
          </a>
          <nav className="links">
            <a href="#flavors">Flavors</a>
            <a href="#top" onClick={(e) => { e.preventDefault(); goTo(1); }}>Process</a>
            <a href="#top" onClick={(e) => { e.preventDefault(); goTo(3); }}>Craft</a>
            <a href="#story">Story</a>
          </nav>
          <div className="actions">
            <button className="pill">Sign In</button>
            <button className="ico" aria-label="Account"><Icon d="M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></button>
            <button className="ico" aria-label="Bag"><Icon d="M6 8h12l1 12H5L6 8zM9 8a3 3 0 0 1 6 0" /></button>
          </div>
        </div>
      </header>

      <section id="top" ref={story} className="story">
        <div className="sticky" data-stage={stage}>
          <div className="deco circle" />
          <div className="deco panel" />
          <div className="deco arch" />

          <div className="canvas">
            <SceneBoundary>
              <Scene progress={progress} />
            </SceneBoundary>
          </div>

          <div className="copy">
            {STAGES.map((s, i) => (
              <div key={i} className="slide" data-active={i === stage}>
                <p className="eyebrow">{s.eyebrow}</p>
                <h1>
                  {s.title.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </h1>
                <p className="lead">{s.copy}</p>
                <button className="pill">
                  Read more <span aria-hidden>→</span>
                </button>
              </div>
            ))}
          </div>

          <div className="dots" role="tablist" aria-label="Story steps">
            {STAGES.map((_, i) => (
              <button key={i} role="tab" aria-selected={i === stage} aria-label={`Step ${i + 1}`} data-on={i === stage} onClick={() => goTo(i)} />
            ))}
          </div>
          <button className="next" aria-label="Next step" onClick={() => goTo(Math.min(4, stage + 1))} data-hide={stage === 4}>
            <Icon d="M9 5l7 7-7 7" />
          </button>
          <div className="hint" data-hide={stage > 0}>Scroll</div>
          <button className="fab" aria-label="Chat"><Icon d="M4 5h16v11H9l-5 4V5z" /></button>
        </div>
      </section>

      <section id="flavors" className="flavors">
        <p className="eyebrow">Today at the counter</p>
        <h2>Flavors, made slowly</h2>
        <div className="grid">
          {FLAVORS.map((f) => (
            <article key={f.name} className="card">
              <div className="swatch" style={{ background: `radial-gradient(circle at 35% 30%, ${f.a}, ${f.b})` }} />
              <h3>{f.name}</h3>
              <p>{f.note}</p>
              <span>{f.price}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="story" className="about">
        <h2>Small batches. Cold steel. Warm hands.</h2>
        <p>
          We make gelato in the open, in batches small enough to taste every one. No shortcuts, no stabilisers hiding behind a label,
          just cream, sugar and patience.
        </p>
      </section>

      <footer className="foot">
        <span>CREMA LAB</span>
        <span>© 2026 Crema Lab. Frontend concept.</span>
      </footer>
    </>
  );
}
