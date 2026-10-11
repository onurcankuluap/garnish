/**
 * The Lit Menu's signature transition (Treatment A, layered CSS photography),
 * ported from docs/redesign-concepts/motion/motion.js (Phase 4 final).
 *
 * One scroll → progress mapper. Every write is a transform, opacity or
 * clip-path on a handful of elements; values are a pure function of scroll,
 * so reverse scroll is exact. It renders only on scroll/resize, and not at all
 * while the stage is off screen. Reduced motion never calls this (the static
 * composition is pure CSS).
 *
 * Desktop: A arrival → B atmosphere → C the photograph itself flies into the
 * Plate I slot (uniform scale + clip, landing on the CSS-defined plate crop)
 * → D the menu card. The smoke matte gets the identical transform, push and
 * clip. Phones: no pin; the card scrolls over a sticky hero.
 */

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const expo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface StageDebug {
  mobile: boolean;
  stageTop: number;
  len: number;
  vh: number;
}

export function startStage(stage: HTMLElement): () => void {
  const q = <T extends Element = HTMLElement>(sel: string) => stage.querySelector(sel) as T;
  const frame = q("[data-s=frame]"), photo = q("[data-s=photo]"), still = q("[data-s=still]");
  const falloff = q("[data-s=falloff]"), dim = q("[data-s=dim]"), copy = q("[data-s=copy]");
  const smoke = q("[data-s=smoke]"), sframe = q("[data-s=sframe]"), sstill = q("[data-s=sstill]");
  const card = q("[data-s=card]"), slot = q("[data-s=slot]"), hero = q("[data-s=hero]");
  const plateImg = slot.querySelector("img") as HTMLElement;
  const head = q("[data-d=head]"), cap = q("[data-d=cap]"), incl = q("[data-d=incl]");
  const lis = Array.from(card.querySelectorAll<HTMLElement>(".course li"));
  const dots = lis.map((li) => li.querySelector<HTMLElement>(".dots"));
  const mq = matchMedia("(max-width: 860px)");
  let mobile = mq.matches;

  const G = { vw: 0, vh: 0, stageTop: 0, len: 1, h: { x: 0, y: 0, w: 1 }, p: { x: 0, y: 0, w: 1 }, clip: { t: 0, r: 0, b: 0, l: 0 } };
  let last = -1;
  let ticking = false;
  let visible = true;
  let raf = 0;

  function measure() {
    G.vw = innerWidth;
    G.vh = innerHeight;
    G.stageTop = stage.getBoundingClientRect().top + scrollY;
    G.len = Math.max(1, stage.offsetHeight - G.vh);
    if (mobile) return;
    G.h = { x: frame.offsetLeft, y: frame.offsetTop, w: frame.offsetWidth };
    const pr = card.getBoundingClientRect(), sr = slot.getBoundingClientRect(), ir = plateImg.getBoundingClientRect();
    G.p = { x: ir.left - pr.left, y: ir.top - pr.top, w: ir.width };
    const sx = sr.left - pr.left, sy = sr.top - pr.top;
    G.clip = { t: sy, r: pr.width - (sx + sr.width), b: pr.height - (sy + sr.height), l: sx };
  }

  const progress = () => (mobile ? clamp(scrollY / G.vh / 1.2) * 1.2 : clamp((scrollY - G.stageTop) / G.len));

  function desktop(p: number) {
    const b = expo(seg(p, 0, 0.3)); // B atmosphere
    const c = inOut(seg(p, 0.22, 0.74)); // C the photograph becomes Plate I
    const k = expo(seg(p, 0.18, 0.62)); // the paper card rises
    const h = G.h, t = G.p, cl = G.clip;
    const x = lerp(h.x, t.x, c), y = lerp(h.y, t.y, c), w = lerp(h.w, t.w, c);
    const ft = `translate3d(${(x - h.x).toFixed(2)}px,${(y - h.y - 10 * b * (1 - c)).toFixed(2)}px,0) scale(${(w / h.w).toFixed(5)})`;
    const clip = `inset(${(cl.t * c).toFixed(1)}px ${(cl.r * c).toFixed(1)}px ${(cl.b * c).toFixed(1)}px ${(cl.l * c).toFixed(1)}px)`;
    const push = `scale(${(1 + 0.045 * b * (1 - c)).toFixed(4)})`;
    frame.style.transform = ft;
    photo.style.clipPath = clip;
    still.style.transform = push;
    sframe.style.transform = `${ft} translate3d(0,${(-60 * b).toFixed(1)}px,0)`;
    sstill.style.transform = push;
    smoke.style.clipPath = clip;
    smoke.style.opacity = (0.85 * (1 - seg(p, 0.02, 0.2))).toFixed(3);
    falloff.style.opacity = ((1 - 0.3 * b) * (1 - seg(p, 0.22, 0.46))).toFixed(3);
    falloff.style.transform = `translate3d(${(-0.07 * G.vw * b).toFixed(1)}px,0,0)`;
    const co = 1 - seg(p, 0, 0.24);
    copy.style.opacity = co.toFixed(3);
    copy.style.transform = `translate3d(0,${(-36 * expo(seg(p, 0, 0.24))).toFixed(1)}px,0)`;
    copy.classList.toggle("off", co < 0.25);
    card.style.clipPath = `inset(${((1 - k) * 100).toFixed(2)}% 0 0 0)`;
    const hd1 = expo(seg(p, 0.45, 0.7));
    head.style.opacity = hd1.toFixed(3);
    head.style.transform = `translate3d(0,${(24 * (1 - hd1)).toFixed(1)}px,0)`;
    lis.forEach((li, i) => {
      const e = expo(seg(p, 0.52 + 0.06 * i, 0.74 + 0.06 * i));
      li.style.opacity = e.toFixed(3);
      li.style.transform = `translate3d(0,${(16 * (1 - e)).toFixed(1)}px,0)`;
      const d = dots[i];
      if (d) d.style.transform = `translateY(-6px) scaleX(${e.toFixed(3)})`;
    });
    const e2 = expo(seg(p, 0.72, 0.95)).toFixed(3);
    cap.style.opacity = e2;
    incl.style.opacity = e2;
  }

  function phone(p: number) {
    const o = clamp(p);
    copy.style.opacity = (1 - seg(p, 0, 0.45)).toFixed(3);
    copy.style.transform = `translate3d(0,${(-24 * o).toFixed(1)}px,0)`;
    const ft = `scale(${(1 - 0.06 * o).toFixed(4)})`;
    frame.style.transform = ft;
    sframe.style.transform = `${ft} translate3d(0,${(-80 * o).toFixed(1)}px,0)`;
    smoke.style.opacity = (0.85 * (1 - seg(p, 0, 0.5))).toFixed(3);
    dim.style.opacity = (0.65 * o).toFixed(3);
    hero.style.visibility = p > 1.15 ? "hidden" : "";
  }

  function update() {
    ticking = false;
    const p = progress();
    if (p === last) return;
    last = p;
    if (mobile) phone(p);
    else desktop(p);
  }
  function schedule(force = false) {
    if (force) last = -1;
    if (!ticking && visible) {
      ticking = true;
      raf = requestAnimationFrame(update);
    }
  }

  const all = [frame, photo, falloff, still, smoke, sframe, sstill, copy, card, head, cap, incl, dim, hero, ...lis, ...dots];
  const reset = () => all.forEach((el) => el?.removeAttribute("style"));

  const onScroll = () => schedule();
  const onResize = () => {
    if (mq.matches !== mobile) {
      mobile = mq.matches;
      reset();
    }
    measure();
    schedule(true);
  };

  const vis = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      if (visible) schedule(true);
    },
    { rootMargin: "100px 0px" },
  );
  vis.observe(stage);
  // phones: the plate cuts in, the courses set as they arrive (CSS transitions)
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.25 },
  );
  io.observe(q(".plate-fig"));
  io.observe(q(".course"));

  // "#the-bar" lives inside the pin: on desktop its landing state is the end
  // of the stage, not the stage's top, so in-page links go there
  const toCard = () => window.scrollTo(0, G.stageTop + G.len);
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (mobile || !a || a.hash !== "#the-bar" || a.pathname !== location.pathname) return;
    e.preventDefault();
    history.pushState(null, "", "#the-bar");
    toCard();
  };
  document.addEventListener("click", onClick);

  measure();
  update();
  if (location.hash === "#the-bar" && !mobile) requestAnimationFrame(toCard);
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  let alive = true;
  document.fonts?.ready.then(() => alive && onResize());
  const onLoad = () => onResize();
  addEventListener("load", onLoad);

  (window as unknown as { __gm?: StageDebug }).__gm = {
    get mobile() { return mobile; },
    get stageTop() { return G.stageTop; },
    get len() { return G.len; },
    get vh() { return G.vh; },
  };

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onResize);
    removeEventListener("load", onLoad);
    document.removeEventListener("click", onClick);
    vis.disconnect();
    io.disconnect();
    reset();
    delete (window as unknown as { __gm?: StageDebug }).__gm;
  };
}
