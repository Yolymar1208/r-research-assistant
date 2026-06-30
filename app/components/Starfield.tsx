'use client'

// Reusable deep-space backdrop: layered star dots + two soft nebula glows +
// a few thin constellation lines (echoing scatter-plot/data-point motifs,
// which fits a statistics product better than generic sci-fi). Pure CSS,
// no canvas/JS animation loop — cheap to render, respects reduced motion.
export default function Starfield() {
  return (
    <div aria-hidden="true" className="jros-starfield">
      <div className="jros-nebula jros-nebula-violet" />
      <div className="jros-nebula jros-nebula-blue" />
      <div className="jros-stars jros-stars-small" />
      <div className="jros-stars jros-stars-medium" />
      <div className="jros-stars jros-stars-large" />
      <svg className="jros-constellation" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <line x1="80" y1="120" x2="220" y2="240" />
        <line x1="220" y1="240" x2="180" y2="380" />
        <line x1="780" y1="760" x2="900" y2="680" />
        <line x1="900" y1="680" x2="860" y2="540" />
        <line x1="640" y1="90" x2="740" y2="160" />
      </svg>

      <style jsx>{`
        .jros-starfield {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: radial-gradient(ellipse at top, #0d1830 0%, #05070f 55%, #020308 100%);
          pointer-events: none;
        }
        .jros-nebula {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.28;
        }
        .jros-nebula-violet {
          width: 480px;
          height: 480px;
          top: -120px;
          left: -100px;
          background: #7c5cff;
        }
        .jros-nebula-blue {
          width: 520px;
          height: 520px;
          bottom: -160px;
          right: -120px;
          background: #2e75b6;
        }
        .jros-stars {
          position: absolute;
          inset: 0;
          background-repeat: repeat;
        }
        .jros-stars-small {
          background-image:
            radial-gradient(1px 1px at 10% 20%, #fff, transparent),
            radial-gradient(1px 1px at 30% 70%, #fff, transparent),
            radial-gradient(1px 1px at 55% 15%, #fff, transparent),
            radial-gradient(1px 1px at 70% 55%, #fff, transparent),
            radial-gradient(1px 1px at 90% 35%, #fff, transparent),
            radial-gradient(1px 1px at 15% 90%, #fff, transparent),
            radial-gradient(1px 1px at 45% 45%, #fff, transparent),
            radial-gradient(1px 1px at 80% 80%, #fff, transparent);
          background-size: 600px 600px;
          opacity: 0.5;
          animation: jros-twinkle-a 7s ease-in-out infinite;
        }
        .jros-stars-medium {
          background-image:
            radial-gradient(1.5px 1.5px at 25% 35%, #cdd8ff, transparent),
            radial-gradient(1.5px 1.5px at 60% 25%, #cdd8ff, transparent),
            radial-gradient(1.5px 1.5px at 85% 65%, #cdd8ff, transparent),
            radial-gradient(1.5px 1.5px at 40% 85%, #cdd8ff, transparent),
            radial-gradient(1.5px 1.5px at 5% 60%, #cdd8ff, transparent);
          background-size: 800px 800px;
          opacity: 0.4;
          animation: jros-twinkle-b 9s ease-in-out infinite;
        }
        .jros-stars-large {
          background-image:
            radial-gradient(2px 2px at 20% 50%, #e8b85c, transparent),
            radial-gradient(2px 2px at 75% 20%, #fff, transparent),
            radial-gradient(2px 2px at 50% 75%, #fff, transparent);
          background-size: 900px 900px;
          opacity: 0.55;
        }
        .jros-constellation {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .jros-constellation line {
          stroke: #7c9cff;
          stroke-width: 1;
          opacity: 0.18;
        }
        @keyframes jros-twinkle-a {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        @keyframes jros-twinkle-b {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          .jros-stars-small, .jros-stars-medium {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
