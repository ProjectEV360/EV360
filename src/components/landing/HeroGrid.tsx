import { useEffect, useRef, useCallback } from "react";

/* ─── Node & edge layout ─────────────────────────────────────────────
   Hand-placed on a 1 000 × 600 viewBox. On mobile (< 640 px) we hide
   nodes marked `desktopOnly` so the grid stays legible.
   ──────────────────────────────────────────────────────────────────── */
interface Node {
  id: number;
  x: number;
  y: number;
  desktopOnly?: boolean;
}

const NODES: Node[] = [
  { id: 0, x: 80, y: 80 },
  { id: 1, x: 250, y: 50 },
  { id: 2, x: 420, y: 100 },
  { id: 3, x: 600, y: 60 },
  { id: 4, x: 780, y: 90 },
  { id: 5, x: 920, y: 50, desktopOnly: true },
  { id: 6, x: 130, y: 230 },
  { id: 7, x: 310, y: 210 },
  { id: 8, x: 500, y: 250 },
  { id: 9, x: 690, y: 220 },
  { id: 10, x: 860, y: 240, desktopOnly: true },
  { id: 11, x: 60, y: 400 },
  { id: 12, x: 230, y: 380 },
  { id: 13, x: 420, y: 420 },
  { id: 14, x: 610, y: 390 },
  { id: 15, x: 800, y: 410, desktopOnly: true },
  { id: 16, x: 170, y: 530 },
  { id: 17, x: 500, y: 550 },
  { id: 18, x: 730, y: 520, desktopOnly: true },
  { id: 19, x: 940, y: 350, desktopOnly: true },
];

type Edge = [number, number];

const EDGES: Edge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
  [4, 10],
  [5, 19],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [6, 11],
  [7, 12],
  [8, 13],
  [9, 14],
  [10, 15],
  [10, 19],
  [11, 12],
  [12, 13],
  [13, 14],
  [14, 15],
  [11, 16],
  [12, 16],
  [13, 17],
  [14, 18],
  [15, 18],
  [16, 17],
  [17, 18],
  [15, 19],
];

/* ─── Pulse constants ─────────────────────────────────────────────── */
const MAX_CONCURRENT = 3;
const PULSE_INTERVAL_MIN = 2000;
const PULSE_INTERVAL_MAX = 4000;
const PULSE_TRAVEL_MS = 1200;
const NODE_GLOW_MS = 300;

function edgeLength(n1: Node, n2: Node) {
  return Math.hypot(n2.x - n1.x, n2.y - n1.y);
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function HeroGrid() {
  const svgRef = useRef<SVGSVGElement>(null);
  const runningRef = useRef(true);
  const activePulsesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reducedMotionRef = useRef(false);
  const isMobileRef = useRef(false);

  /* Visible edges filtering */
  const getVisibleEdges = useCallback((): Edge[] => {
    if (!isMobileRef.current) return EDGES;
    const mobileIds = new Set(NODES.filter((n) => !n.desktopOnly).map((n) => n.id));
    return EDGES.filter(([a, b]) => mobileIds.has(a) && mobileIds.has(b));
  }, []);

  /* Fire single pulse */
  const firePulse = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !runningRef.current || reducedMotionRef.current) return;
    if (activePulsesRef.current >= MAX_CONCURRENT) return;

    const visibleEdges = getVisibleEdges();
    if (!visibleEdges.length) return;
    const edgeIdx = Math.floor(Math.random() * visibleEdges.length);
    const [aId, bId] = visibleEdges[edgeIdx];

    // Randomize direction: A->B or B->A
    const forward = Math.random() > 0.5;
    const startId = forward ? aId : bId;
    const destId = forward ? bId : aId;
    const nodeA = NODES[startId];
    const nodeB = NODES[destId];
    const len = edgeLength(nodeA, nodeB);
    if (len <= 0) return;

    const dashLen = Math.max(16, Math.min(len * 0.3, 42));

    const pulse = document.createElementNS("http://www.w3.org/2000/svg", "line");
    pulse.setAttribute("x1", String(nodeA.x));
    pulse.setAttribute("y1", String(nodeA.y));
    pulse.setAttribute("x2", String(nodeB.x));
    pulse.setAttribute("y2", String(nodeB.y));
    pulse.setAttribute("stroke", "#34C38F");
    pulse.setAttribute("stroke-width", "2");
    pulse.setAttribute("stroke-linecap", "round");
    pulse.setAttribute("stroke-dasharray", `${dashLen} ${len * 2}`);
    pulse.setAttribute("stroke-dashoffset", String(dashLen));
    pulse.style.opacity = "0";
    pulse.style.filter = "drop-shadow(0 0 3px #34C38F)";

    const pulseGroup = svg.querySelector("#hero-grid-pulses");
    if (!pulseGroup) return;
    pulseGroup.appendChild(pulse);
    activePulsesRef.current++;

    const cleanupPulse = () => {
      pulse.remove();
      activePulsesRef.current = Math.max(0, activePulsesRef.current - 1);
    };

    if (typeof pulse.animate !== "function") {
      cleanupPulse();
      return;
    }

    const anim = pulse.animate(
      [
        { strokeDashoffset: dashLen, opacity: 0 },
        { opacity: 0.85, offset: 0.15 },
        { opacity: 0.85, offset: 0.85 },
        { strokeDashoffset: -(len + dashLen), opacity: 0, offset: 1 },
      ],
      {
        duration: PULSE_TRAVEL_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );

    anim.onfinish = () => {
      cleanupPulse();

      /* Brighten destination node for ~300ms */
      const targetNode = svg.querySelector(`[data-node-id="${destId}"]`) as SVGElement | null;
      const halo = svg.querySelector(`[data-halo-id="${destId}"]`) as SVGElement | null;
      const isDark = document.documentElement.classList.contains("dark");
      const baseOpacity = isDark ? 0.22 : 0.14;

      if (targetNode && typeof targetNode.animate === "function") {
        targetNode.animate(
          [{ opacity: baseOpacity }, { opacity: 0.95 }, { opacity: baseOpacity }],
          { duration: NODE_GLOW_MS, easing: "ease-out" },
        );
      }
      if (halo && typeof halo.animate === "function") {
        halo.animate([{ opacity: 0 }, { opacity: isDark ? 0.6 : 0.45 }, { opacity: 0 }], {
          duration: NODE_GLOW_MS,
          easing: "ease-out",
        });
      }
    };

    anim.oncancel = cleanupPulse;
  }, [getVisibleEdges]);

  /* ── Scheduling loop ─────────────────────────────────────────── */
  const schedulePulse = useCallback(
    (customDelay?: number) => {
      if (!runningRef.current || reducedMotionRef.current) return;
      const delay = customDelay ?? randomBetween(PULSE_INTERVAL_MIN, PULSE_INTERVAL_MAX);
      timerRef.current = setTimeout(() => {
        firePulse();
        schedulePulse();
      }, delay);
    },
    [firePulse],
  );

  /* ── Setup & teardown ────────────────────────────────────────── */
  useEffect(() => {
    /* Reduced motion check */
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      if (e.matches) {
        clearTimeout(timerRef.current);
      } else {
        schedulePulse(1000);
      }
    };
    mql.addEventListener("change", onMotionChange);

    /* Mobile check */
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 640;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    /* Visibility check (tab hidden/visible) */
    const onVisibility = () => {
      if (document.hidden) {
        runningRef.current = false;
        clearTimeout(timerRef.current);
      } else {
        runningRef.current = true;
        schedulePulse(1000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    /* IntersectionObserver (hero on-screen/off-screen) */
    const el = svgRef.current;
    let observer: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            runningRef.current = false;
            clearTimeout(timerRef.current);
          } else if (!document.hidden) {
            runningRef.current = true;
            schedulePulse(1000);
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(el);
    }

    /* Start initial pulse */
    if (!reducedMotionRef.current) {
      schedulePulse(800);
    }

    return () => {
      clearTimeout(timerRef.current);
      runningRef.current = false;
      mql.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", checkMobile);
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
      if (el) {
        const pulseGroup = el.querySelector("#hero-grid-pulses");
        if (pulseGroup) pulseGroup.replaceChildren();
      }
    };
  }, [schedulePulse]);

  const mobileIds = new Set(NODES.filter((n) => !n.desktopOnly).map((n) => n.id));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      className="hero-grid-svg"
      aria-hidden="true"
    >
      {/* ── Edges ─────────────────────────────────────── */}
      <g>
        {EDGES.map(([aId, bId]) => {
          const a = NODES[aId];
          const b = NODES[bId];
          const isDesktopEdge = a.desktopOnly || b.desktopOnly;
          return (
            <line
              key={`e-${aId}-${bId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`hero-grid-edge${isDesktopEdge ? " hero-grid-desktop-only" : ""}`}
            />
          );
        })}
      </g>

      {/* ── Nodes ─────────────────────────────────────── */}
      <g>
        {NODES.map((n) => (
          <g key={`n-${n.id}`} className={n.desktopOnly ? "hero-grid-desktop-only" : undefined}>
            {/* Halo (glows on pulse arrival) */}
            <circle data-halo-id={n.id} cx={n.x} cy={n.y} r="10" className="hero-grid-halo" />
            {/* Core dot */}
            <circle
              data-node-id={n.id}
              cx={n.x}
              cy={n.y}
              r="3.5"
              className={`hero-grid-node${mobileIds.has(n.id) ? "" : " hero-grid-desktop-only"}`}
            />
          </g>
        ))}
      </g>

      {/* ── Pulse layer (children added dynamically) ── */}
      <g id="hero-grid-pulses" />
    </svg>
  );
}
