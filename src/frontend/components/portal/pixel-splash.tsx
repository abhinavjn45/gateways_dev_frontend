"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/frontend/lib/animation/gsap-init";
import { markSplashSeen, shouldPlaySplash } from "@/frontend/lib/animation/splash-store";
import { SPLASH_GRID, SPLASH_MASK } from "@/frontend/lib/animation/splash-mask";
import { ART } from "@/frontend/lib/assets/manifest";
import { ParallaxLayer } from "@/frontend/components/scene";
import { cn } from "@/frontend/lib/utils";
import { getScene } from "@/frontend/lib/assets/scenes";

/**
 * The crest assembles itself out of flying blocks, then reveals the site.
 *
 * Inspired by the Ra.One (2011) Q-BRICKS cube-assembly sequence — cubes converge
 * out of the dark and resolve into a solid form — rebuilt in the project's voxel
 * idiom and, unlike the original's 8-10 hours per frame, running at 60fps.
 *
 * WHAT IT ASSEMBLES INTO: the actual smooth 1254px crest (`gatewaysCrest` /
 * `gatewaysCrestBlack`), not a pixelated redraw. For a while this was ONE
 * <canvas> drawing the 152px pixel-art crest at four increasing resolutions —
 * 19, 38, 76, 152 — blown up to --splash-size with `image-rendering: pixelated`.
 * Cheaper, and it was reverted for two reasons the visitor can see: the finished
 * mark was a 152px image stretched to 456-760px, and every one of the four
 * redraws was a hard pop. Unreadable for its first 2.4s and flashing four
 * times is not what an opening flourish is for. The tiles below are more work
 * for the GPU, so they carry the mitigations that make that affordable (see
 * the timeline).
 *
 * HOW IT WORKS: `SPLASH_MASK` is a 38x38 occupancy grid of the crest — which
 * cells hold any art at all — so the animation does not waste 61% of its blocks
 * on empty space. The pixels each block shows come from the full-detail image,
 * sliced into that same grid via CSS background-position, one <span> per
 * occupied cell. Each block flies in from a randomised radial offset wearing a
 * solid cube face; the face fades on landing to reveal that block's chunk of the
 * crest. That two-layer trick is what makes it read as blocks ASSEMBLING rather
 * than an image wiping in.
 *
 * THE ART MUST BE LOADED BEFORE THE FACES FADE. The tiles are CSS backgrounds
 * of one 277KB PNG (609KB for the black light-theme one). Until it arrives every
 * tile is transparent, and the cube faces that cover them fade at 0.85s — on a
 * cold first visit that would be a crest revealing as nothing. So the timeline
 * is built paused and released once the image has decoded, capped at 1.5s so a
 * slow network degrades to tiles filling in late rather than a stuck overlay.
 * Decoding also primes the HTTP cache the CSS backgrounds read from.
 *
 * WHAT IT STANDS IN FRONT OF: the hero's own landscape, thrown far out of focus,
 * rather than a flat fill, so the splash reads as being staged in the world the
 * site opens onto. It is the same `overworld-panorama` scene data the hero uses —
 * not a copy of it — so retuning the hero retunes this.
 *
 * IT LEAVES BY FADING, NOT BY ZOOMING THROUGH THE CREST. The exit used to punch a
 * crest-shaped hole in the backdrop (a CSS mask), scale the overlay 14x through
 * it and flood the screen with a gold bloom. A frame-by-frame recording showed
 * that sequence was the flicker, three ways over:
 *
 *   - the mask image comes from the CDN, and Chrome does not paint a masked
 *     element until its mask has loaded — so for ~0.7s on a first visit the
 *     overlay was invisible and the homepage showed, then the splash slammed
 *     over it;
 *   - opening the hole exposed the page through the gaps in the crest's line
 *     art, a beat before the zoom could carry them off-screen;
 *   - the bloom took the whole screen to near-solid gold, a brightness spike to
 *     nearly four times the page it was revealing.
 *
 * A fade has none of those failure modes: no mask, so the backdrop is solid from
 * the first paint; nothing to see through; and brightness moves in one direction
 * from the dark overlay to the page.
 *
 * IT IS AN OVERLAY, NOT A GATE. The app renders and hydrates underneath, so the
 * homepage's LCP is untouched — the splash only covers it. Everything below is
 * about making sure that cover always lifts:
 *
 *   - a hard timeout force-dismisses it even if the timeline never completes
 *   - any pointer or key press skips it
 *   - reduced motion (OS or the in-app toggle) skips it before it ever builds
 *   - it plays at most once per tab, and a boot script in the root layout hides
 *     it before first paint on repeat loads so there is no flash
 *   - <noscript> CSS in globals.css hides it when JS never runs
 */

/**
 * Ceiling on how long the overlay may cover the app, whatever the timeline does.
 * Must stay comfortably above the timeline's own ~4.8s plus the up-to-1.5s wait
 * for the crest image, or it would cut the animation off rather than act as a
 * backstop.
 */
const FAILSAFE_MS = 8500;

/**
 * How long to wait for the crest PNG before starting anyway. Long enough for a
 * cold fetch on a decent connection; short enough that a bad one costs the
 * opening beat, not the whole splash.
 */
const ART_WAIT_MS = 1500;

/** The occupied cells, resolved once at module scope rather than per render. */
const CELLS: ReadonlyArray<{ col: number; row: number }> = SPLASH_MASK.flatMap(
  (line, row) => [...line].flatMap((char, col) => (char === "#" ? [{ col, row }] : [])),
);

/**
 * The hero's scene, read from the same registry `HeroSection` reads. Looked up at
 * module scope because it is a static table lookup, not per-render work.
 */
const HERO_SCENE = getScene("overworld-panorama");

/** Resolves when the image is decoded, or after `ms`, whichever is first. */
function decodeWithin(src: string, ms: number): Promise<void> {
  const img = new Image();
  img.src = src;
  const decoded = img.decode().catch(() => {
    /* a decode failure is not the splash's problem to report */
  });
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  return Promise.race([decoded, timeout]);
}

export function PixelSplash() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  /**
   * The blurred backdrop is mounted a frame AFTER first paint, never on the
   * server.
   *
   * Its layers are generated pixel art inlined as data URIs — ~100KB of them —
   * and this component lives in the ROOT layout, so server-rendering them would
   * add that weight to the HTML of every route in the app, including every route
   * where the splash is hidden before first paint and never seen. Deferring to a
   * frame callback also puts the work after `useGSAP`'s layout effect, so on a
   * repeat load the component has already unmounted itself and the art is never
   * generated at all.
   *
   * The cost is one frame of flat `--void` before the landscape appears, plus
   * the rasterisation of four generated layers under a 22px blur. `.splash-scene`
   * fades in over 0.55s so that lands as the opening beat it was meant to be
   * rather than a hard cut a frame into the assembly.
   */
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSceneReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The timeline, the failsafe and the skip handler can all race to finish.
  // Whoever gets there first wins; the rest become no-ops.
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    markSplashSeen();
    setDone(true);
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      // Reduced motion is checked synchronously here rather than via the
      // useReducedMotion hook: that hook starts false and corrects in an effect,
      // which would let the timeline build for a frame first.
      if (prefersReducedMotion() || !shouldPlaySplash()) {
        finish();
        return;
      }

      const tiles = gsap.utils.toArray<HTMLElement>(".splash-tile", stage.current);
      const faces = gsap.utils.toArray<HTMLElement>(".splash-face", stage.current);

      // Scatter each block outward from the centre. This is a `set` rather than a
      // `.from()` because the offsets are randomised per block and cannot live in
      // CSS — but the blocks are already opacity:0 via `.gsap-hidden`, so there is
      // no flash of them at rest first.
      const centre = (SPLASH_GRID - 1) / 2;
      tiles.forEach((tile) => {
        const col = Number(tile.dataset.col);
        const row = Number(tile.dataset.row);
        const dx = col - centre;
        const dy = row - centre;
        const length = Math.hypot(dx, dy) || 1;
        const distance = gsap.utils.random(150, 420);

        gsap.set(tile, {
          x: (dx / length) * distance + gsap.utils.random(-70, 70),
          y: (dy / length) * distance + gsap.utils.random(-70, 70),
          scale: gsap.utils.random(1.5, 2.4),
          rotation: gsap.utils.random(-80, 80),
          autoAlpha: 0,
        });
      });

      // Identical stagger config on tiles and faces, so each block's face fades a
      // fixed beat after that same block starts flying — the "lands, then
      // resolves" read — without tracking 618 individual timelines.
      const stagger: gsap.StaggerVars = {
        grid: [SPLASH_GRID, SPLASH_GRID],
        from: "center",
        amount: 1.9,
      };

      // Built PAUSED: it is released below, once the crest image has decoded.
      const tl = gsap.timeline({ onComplete: finish, paused: true });

      tl.to(tiles, {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        autoAlpha: 1,
        duration: 0.85,
        ease: "back.out(1.4)",
        stagger,
      }, 0.2)
        .to(faces, {
          autoAlpha: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger,
        }, 0.85)
        // 618 promoted compositor layers is fine while they're actively flying
        // in (that's what `.splash-tile`'s `will-change` in globals.css is for),
        // but every one of them is still a separate GPU layer the browser has to
        // track for the rest of the timeline otherwise — including through the
        // closing 14x zoom, which is the one moment that can least afford it.
        // They're landed and static by here, so release the layers well before
        // the zoom needs the budget instead of after.
        .call(() => {
          tiles.forEach((tile) => {
            tile.style.willChange = "auto";
          });
        }, undefined, 1.4)
        // The crest lands: a shockwave ring pushes out and the whole mark takes a
        // short breath, so the assembly ends on an accent instead of just stopping.
        // The ring flashes in already wider than the crest and keeps expanding —
        // it is never static at the artwork's own size, where it would read as a
        // frame drawn around the logo rather than a pulse leaving it.
        .to(ring.current, {
          autoAlpha: 0.5,
          scale: 1.15,
          duration: 0.15,
          ease: "power2.out",
        }, 2.95)
        .to(ring.current, {
          autoAlpha: 0,
          scale: 2.3,
          duration: 0.8,
          ease: "power2.out",
        }, 3.1)
        .to(stage.current, {
          scale: 1.04,
          duration: 0.22,
          ease: "power2.out",
        }, 2.95)
        .to(stage.current, {
          scale: 1,
          duration: 0.7,
          ease: "elastic.out(1, 0.5)",
        }, 3.17)
        // A beat of stillness on the finished crest, then the whole overlay —
        // backdrop, crest and all — fades out together and the homepage is simply
        // there underneath. One property, one direction, nothing to see through.
        // See the note at the top of this file for what this replaced and why.
        .to(el, {
          autoAlpha: 0,
          duration: 0.7,
          ease: "power1.inOut",
        }, 4.1);

      // Only the theme's own file is fetched. `data-theme` is stamped on <html>
      // before first paint by the root layout's boot script, so it is already
      // right here.
      const light = document.documentElement.dataset.theme === "light";
      const src = light ? ART.brand.gatewaysCrestBlack.src : ART.brand.gatewaysCrest.src;
      let cancelled = false;
      void decodeWithin(src, ART_WAIT_MS).then(() => {
        if (!cancelled && !finished.current) tl.play();
      });

      // Skip on any input. `once` on each listener plus the `finished` guard means
      // a burst of events cannot start several exit tweens.
      const skip = () => {
        if (finished.current) return;
        tl.kill();
        gsap.to(el, { autoAlpha: 0, duration: 0.25, ease: "power2.out", onComplete: finish });
      };
      window.addEventListener("pointerdown", skip, { once: true });
      window.addEventListener("keydown", skip, { once: true });

      // Last line of defence: if the timeline stalls (a backgrounded tab that
      // never resumes, a tween that throws, an image that never decodes), the
      // overlay still lifts.
      const failsafe = window.setTimeout(finish, FAILSAFE_MS);

      return () => {
        cancelled = true;
        window.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", skip);
        window.clearTimeout(failsafe);
      };
    },
    { scope: root, dependencies: [finish] },
  );

  // Unmount rather than hide: 618 spans have no business lingering in the DOM
  // for the rest of the session.
  if (done) return null;

  return (
    <div
      id="pixel-splash"
      ref={root}
      aria-hidden
      className="fixed inset-0 z-[200] grid place-items-center"
      style={
        {
          "--splash-tile-src": `url("${ART.brand.gatewaysCrest.src}")`,
          "--splash-tile-src-light": `url("${ART.brand.gatewaysCrestBlack.src}")`,
        } as React.CSSProperties
      }
    >
      {/* The void and the out-of-focus landscape behind the crest. Solid from
          the very first paint: there is no mask on it any more, so nothing has
          to load before it covers the page. */}
      <div className="splash-backdrop">
        {/* The hero's landscape, out of focus. No `AnimatedBackground` wrapper:
            that would attach a pointer listener, a resize listener and a set of
            infinite drift tweens to a picture that is blurred past the point
            where any of it could be seen. The layers are rendered directly, with
            no `handleRef`, which is what makes them inert. */}
        {sceneReady && HERO_SCENE && (
          <div className="splash-scene pointer-events-none" aria-hidden>
            {/* THE THEME GATE IS LOAD-BEARING, not a tidiness thing.
                `overworld-panorama` carries both a daylight and a night stack
                and expects exactly one to be visible; the choice is the
                `scene-only-*` classes, which `AnimatedBackground` applies and
                this hand-rolled copy has to apply too. Rendering the layers
                ungated stacks BOTH — and `night-wash` is a near-opaque dark
                gradient, so it painted this backdrop black. That is not merely
                a wrong picture: the reveal below is a focus pull from a blurred
                landscape to a sharp one, which only reads as a pull because the
                two are a similar brightness. Against black it became a hard
                cut, seen as a flash at the hand-off.

                Anything added to that scene must be gated here as well. */}
            <div
              className={cn(
                "absolute inset-0",
                HERO_SCENE.baseGradientNight && "scene-only-light",
              )}
              style={{ background: HERO_SCENE.baseGradient }}
            />
            {HERO_SCENE.baseGradientNight ? (
              <div
                className="scene-only-dark absolute inset-0"
                style={{ background: HERO_SCENE.baseGradientNight }}
              />
            ) : null}
            {HERO_SCENE.layers.map((layer) => (
              <ParallaxLayer
                key={layer.key}
                layer={layer}
                sceneKey={HERO_SCENE.key}
                palette={HERO_SCENE.palette}
                className={layer.theme ? `scene-only-${layer.theme}` : undefined}
              />
            ))}
          </div>
        )}

        {/* Mixes toward --void, so one rule serves both themes: near-black over
            the landscape in dark, sky over it in light. */}
        <div className="splash-veil pointer-events-none absolute inset-0" />

        {/* Faint block grid, so the void reads as buildable space. Inside the
            backdrop so it sits under the crest with the scene. */}
        <div className="splash-grid pointer-events-none absolute inset-0" />
      </div>

      <div ref={stage} className="splash-stage relative">
        <div
          ref={ring}
          className="splash-ring gsap-hidden pointer-events-none absolute left-1/2 top-1/2"
        />

        {CELLS.map(({ col, row }) => (
          <span
            key={`${col}-${row}`}
            data-col={col}
            data-row={row}
            className="splash-tile gsap-hidden absolute block"
            style={{
              left: `calc(var(--splash-tile) * ${col})`,
              top: `calc(var(--splash-tile) * ${row})`,
              backgroundPosition: `calc(var(--splash-tile) * -${col}) calc(var(--splash-tile) * -${row})`,
            }}
          >
            {/* The solid cube face worn during flight, faded on landing. */}
            <i className="splash-face absolute inset-0 block bg-mc-gold bevel" />
          </span>
        ))}
      </div>

    </div>
  );
}
