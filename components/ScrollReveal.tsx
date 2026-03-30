"use client";

import { useEffect } from "react";

/**
 * Attaches an IntersectionObserver to all .nrs-reveal elements in the document,
 * adding .nrs-revealed when they enter the viewport.
 * Renders no DOM — purely a side-effect component.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Immediately reveal all elements for users who prefer reduced motion
      document.querySelectorAll(".nrs-reveal").forEach((el) => {
        el.classList.add("nrs-revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("nrs-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const observe = () => {
      document.querySelectorAll(".nrs-reveal:not(.nrs-revealed)").forEach((el) => {
        observer.observe(el);
      });
    };

    observe();

    // Re-run on DOM changes (dynamic content)
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
