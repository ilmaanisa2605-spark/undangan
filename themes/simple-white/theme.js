/* simple-white — theme.js (ES module)
 * Animasi khas tema: reveal lembut saat scroll + parallax halus pada cover.
 * Menghormati prefers-reduced-motion. Tidak me-fetch ulang config.
 */
export function init(ctx) {
  const { cfg, root, helpers } = ctx;
  const qsa = (sel, el) => (el || root).querySelectorAll(sel);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) Reveal on scroll
  const reveals = qsa(".kh-reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("kh-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("kh-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  // 2) Parallax halus pada gambar cover (desktop & HP mampu)
  const sway = root.querySelector("[data-sway]");
  if (sway && !reduce) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        sway.style.transform = "translateY(" + y * 0.12 + "px)";
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // 3) Mode demo: pita DEMO + tombol "Pesan tema ini" (WA)
  if (cfg && cfg.demo === true && !document.body.querySelector(".kh-demo-ribbon")) {
    const ribbon = document.createElement("div");
    ribbon.className = "kh-demo-ribbon";
    ribbon.textContent = "DEMO";
    document.body.appendChild(ribbon);

    const nama = "Simple White";
    const wa = document.createElement("a");
    wa.className = "kh-pesan";
    wa.href =
      "https://wa.me/6280000000000?text=" +
      encodeURIComponent("Halo, saya ingin memesan tema " + nama + " untuk undangan digital saya.");
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.textContent = "Pesan tema ini";
    document.body.appendChild(wa);
  }

  // helpers tersedia bila dibutuhkan engine/tema lain
  void helpers;
}
