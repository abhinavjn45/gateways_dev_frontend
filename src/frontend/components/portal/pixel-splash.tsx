"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/frontend/lib/animation/gsap-init";
import { markSplashSeen, shouldPlaySplash } from "@/frontend/lib/animation/splash-store";
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
 * WHAT IT RESOLVES INTO: a pixel-art redraw of THE MARK THE NAV SHOWS.
 * `scripts/gen-splash-mask.mjs` rasterises `Gateways Coloured.svg` — the same
 * file `site-nav.tsx` renders — down to 152x152 against the gold token ramp, and
 * that is the end state. Two reasons it is not the SVG itself at rest: landing
 * on smooth vector art would undo the whole effect, since the pixels would
 * resolve into something never made of pixels; and the SVG is 2.9MB, which is
 * not a thing to block the first beat of a splash on. The bake is 4KB.
 *
 * HOW IT WORKS: ONE <canvas>, redrawn at four increasing resolutions. The crest
 * PNG is drawn into a backing store of 19, then 38, then 76, then 152 pixels
 * square with `imageSmoothingEnabled = false`, and CSS scales that up to
 * --splash-size with `image-rendering: pixelated`. So the mark arrives as huge
 * blocks and sharpens into itself, ending at the crest's native 152px — the same
 * picture the rest of the site uses.
 *
 * Those four numbers are 152 divided by 8, 4, 2 and 1. Exact integer divisions,
 * so every step lands on whole source pixels and none of them resample into mush.
 *
 * THIS USED TO BE 639 FLYING BLOCKS. Each was a <span> holding a 4x4 chunk of the
 * same PNG via background-position, wearing a gold face that faded on landing —
 * 1278 elements under GSAP to draw a picture already sitting on disk as a file.
 * The canvas is the same idea, blocks resolving into a mark, at four redraws
 * instead of 1278 tweened nodes.
 *
 * The steps are DISCRETE `tl.call()`s, never a tween on a paint property. A
 * full-size surface repainted every frame is what the ambient rain layer did
 * before it was removed for stuttering the page.
 *
 * WHAT IT STANDS IN FRONT OF: the hero's own landscape, thrown far out of focus,
 * rather than a flat fill. The splash then reads as being staged in the world the
 * site opens onto, and the final zoom becomes a focus pull into it instead of a
 * cut between two unrelated surfaces. It is the same `overworld-panorama` scene
 * data the hero uses — not a copy of it — so retuning the hero retunes this.
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
 * Must stay comfortably above the timeline's own ~5.6s, or it would cut the
 * animation off rather than act as a backstop.
 */
const FAILSAFE_MS = 8500;

/**
 * Backing-store sizes for the resolve, coarsest first.
 *
 * Derived from the ART's own width rather than a literal 152, so the two cannot
 * drift if the crest is ever regenerated at another size. Every divisor is a
 * power of two, which is the point: each step lands on whole source pixels, so
 * the blocks are exact and no step resamples into mush.
 *
 * The last entry IS the source size — the resolve ends at the crest's native
 * pixel art, not at a smoothed upscale of it.
 */
const CREST_PX = ART.brand.gatewaysCrestPixel.w;
const CREST_STEPS = [CREST_PX / 8, CREST_PX / 4, CREST_PX / 2, CREST_PX] as const;

/**
 * The crest bitmap, requested as soon as this module evaluates.
 *
 * MODULE SCOPE, NOT AN EFFECT, and the difference is visible. Starting the fetch
 * in `useEffect` puts it behind hydration, and measured on a cold load that made
 * the canvas draw nothing until ~700ms — the timeline had already spent most of
 * the coarsest step, so the very blocky beat that the whole effect is built
 * around was half over before anything appeared. Kicking it off here starts the
 * request as the chunk evaluates instead.
 *
 * Guarded because this module is imported by a server-rendered layout, and
 * `Image` does not exist there. `null` on the server is fine: the component only
 * ever reads it from the browser.
 *
 * It is 4KB and it is the one asset the splash cannot draw without, so this is
 * not the same call as the blurred backdrop scene, which is ~100KB and stays
 * deferred to a frame after first paint.
 */
const CREST_IMG: HTMLImageElement | null =
  typeof window === "undefined" ? null : new Image();
if (CREST_IMG) CREST_IMG.src = ART.brand.gatewaysCrestPixel.src;

/**
 * The hero's scene, read from the same registry `HeroSection` reads. Looked up at
 * module scope because it is a static table lookup, not per-render work.
 */
const HERO_SCENE = getScene("overworld-panorama");

export function PixelSplash() {
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const crest = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  /**
   * The decoded crest, and the step it should currently be showing.
   *
   * Both are refs rather than state: a redraw must not re-render the component,
   * and the timeline writes `step` from a `tl.call()` outside React entirely.
   *
   * They are separate because the image and the timeline race. If a step fires
   * before the PNG has decoded there is nothing to draw, so the step is recorded
   * and `onload` draws whatever the latest one is by then — which is also why
   * `drawCrest` reads `step.current` instead of taking it as an argument.
   */
  const step = useRef(0);

  const drawCrest = useCallback(() => {
    const canvas = crest.current;
    const img = CREST_IMG;
    // `complete` covers the case that matters most: a repeat visit where the
    // bitmap is already in cache and no load event will ever fire.
    if (!canvas || !img?.complete || !img.naturalWidth) return;

    const n = CREST_STEPS[step.current];
    // Resizing the backing store IS the pixelation: the canvas holds n x n
    // pixels and CSS blows it up to --splash-size. Assigning width/height also
    // clears the canvas and resets the context, so `imageSmoothingEnabled` has
    // to be set after it, every time — not once at setup.
    canvas.width = n;
    canvas.height = n;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, n, n);
  }, []);

  // Draw as soon as the bitmap is there. If it already decoded before this
  // mounted, `drawCrest` runs immediately and no listener is needed.
  useEffect(() => {
    const img = CREST_IMG;
    if (!img) return;
    if (img.complete) {
      drawCrest();
      return;
    }
    img.addEventListener("load", drawCrest);
    return () => img.removeEventListener("load", drawCrest);
  }, [drawCrest]);

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

      // Start coarse. `gsap.set` rather than CSS because the canvas also carries
      // `.gsap-hidden`, and the entrance below animates out of both at once.
      step.current = 0;
      drawCrest();

      gsap.set(crest.current, { autoAlpha: 0, scale: 1.06 });

      const tl = gsap.timeline({ onComplete: finish });

      // The mark arrives already assembled but unreadable, and sharpens into
      // focus. The slight scale-down is the only continuous motion here — it is
      // a transform, so it composites; the resolution changes are discrete.
      tl.to(crest.current, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.85,
        ease: "power2.out",
      }, 0.2);

      // The resolve itself. `call` and not a tween: each step is one redraw of a
      // 152px-at-most buffer, and tweening a paint property to get the same four
      // frames would repaint a full-size surface continuously in between.
      //
      // Evenly spaced at 0.73s, so the steps land at 0.93 / 1.66 / 2.39. The
      // last one is early on purpose: it leaves ~0.5s of the finished crest
      // sitting still before the ring fires at 2.95, so the accent reads as
      // punctuating a completed mark rather than interrupting one mid-resolve.
      CREST_STEPS.forEach((_, i) => {
        if (i === 0) return;
        tl.call(() => {
          step.current = i;
          drawCrest();
        }, undefined, 0.2 + i * 0.73);
      });

      // The crest lands: a shockwave ring pushes out and the whole mark takes a
      // short breath, so the resolve ends on an accent instead of just stopping.
      // The ring flashes in already wider than the crest and keeps expanding —
      // it is never static at the artwork's own size, where it would read as a
      // frame drawn around the logo rather than a pulse leaving it.
      tl.to(ring.current, {
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
        // A beat of stillness on the finished crest, then the reveal: the camera
        // pushes into the logo and the homepage arrives through it.
        //
        // Order matters. The aperture opens FIRST, while the crest still covers
        // that exact shape — so nothing visibly pops. Fading the crest then
        // uncovers the hole, and by then the zoom is already underway, so the
        // mark reads as opening rather than disappearing.
        // A class rather than a GSAP tween on the custom property: the value is
        // `var(--splash-size)`, an indirection GSAP would try to parse as a number.
        .call(() => backdrop.current?.classList.add("is-open"), undefined, 4.1)
        .to(crest.current, {
          autoAlpha: 0,
          duration: 0.45,
          ease: "power2.in",
        }, 4.15)
        .to(el, {
          scale: 14,
          duration: 1.5,
          // Accelerating, so it reads as falling into the logo rather than the
          // logo being pushed at the viewer.
          ease: "power2.in",
        }, 4.1)
        // The silhouette has gaps between the wing feathers. They scale off-screen
        // long before this, but fading the backdrop out guarantees a clean finish
        // — and is the whole reveal on any browser without `mask-composite`.
        .to(backdrop.current, {
          autoAlpha: 0,
          duration: 0.4,
          ease: "power2.inOut",
        }, 5.2);

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
      // never resumes, a tween that throws), the overlay still lifts.
      const failsafe = window.setTimeout(finish, FAILSAFE_MS);

      return () => {
        window.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", skip);
        window.clearTimeout(failsafe);
      };
    },
    { scope: root, dependencies: [finish, drawCrest] },
  );

  // Unmount rather than hide: 542 spans have no business lingering in the DOM
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
          "--splash-aperture": `url("${ART.brand.gatewaysCrestAperture.src}")`,
        } as React.CSSProperties
      }
    >
      {/* The void itself, and the layer the crest-shaped hole is punched through.
          It carries the background instead of the root so the reveal has
          something to cut into. Everything below is a CHILD of it, so the
          aperture cuts through the whole stack in one go. */}
      <div ref={backdrop} className="splash-backdrop">
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
            backdrop so the aperture cuts through it too. */}
        <div className="splash-grid pointer-events-none absolute inset-0" />
      </div>

      <div ref={stage} className="splash-stage relative">
        <div
          ref={ring}
          className="splash-ring gsap-hidden pointer-events-none absolute left-1/2 top-1/2"
        />

        {/* The crest. One element, redrawn at four resolutions — see the note
            at the top of this file for why it is not 639 of them.

            `width`/`height` are the INITIAL backing store only; `drawCrest`
            reassigns both on every step, and assigning either one clears the
            canvas. They are set here so the very first paint is already the
            right shape rather than the 300x150 a canvas defaults to.

            No `alt` equivalent is needed: the whole splash is `aria-hidden`,
            and the crest is decorative — the page it reveals carries the
            wordmark as real text. */}
        <canvas
          ref={crest}
          className="splash-crest gsap-hidden block"
          width={CREST_STEPS[0]}
          height={CREST_STEPS[0]}
        />
      </div>
    </div>
  );
}
