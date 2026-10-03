/* floral-garden — theme.js (ES module)
 * Animasi khas tema: reveal bunga saat scroll, parallax cover,
 * indikator visual tombol musik, sorot nav aktif.
 */
export function init(ctx) {
  const { cfg, root } = ctx;
  const qsa = (sel, el) => (el || root).querySelectorAll(sel);
  const qs = (sel, el) => (el || root).querySelector(sel);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) Reveal on scroll dengan jeda berjenjang untuk kartu
  const reveals = Array.from(qsa(".kh-reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("kh-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const sibs = Array.from(en.target.parentElement.children).filter((c) =>
              c.classList.contains("kh-reveal")
            );
            const idx = Math.max(0, sibs.indexOf(en.target));
            en.target.style.transitionDelay = Math.min(idx * 90, 450) + "ms";
            en.target.classList.add("kh-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  // 2) Parallax lembut pada latar cover
  const coverBg = qs(".fg-cover__bg");
  if (coverBg && !reduce) {
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = Math.min(window.scrollY, window.innerHeight);
          coverBg.style.transform = "translateY(" + y * 0.14 + "px) scale(1.04)";
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  // 3) Indikator visual tombol musik (engine yang memutar/menjeda)
  const audio = qs("audio[data-musik]");
  const btnMusik = document.getElementById("btn-musik");
  if (audio && btnMusik) {
    audio.addEventListener("play", () => btnMusik.classList.add("fg-playing"));
    audio.addEventListener("pause", () => btnMusik.classList.remove("fg-playing"));
  }

  // 4) Sorot tautan nav sesuai section yang terlihat
  const nav = qs(".fg-nav");
  const secs = ["salam", "profil", "acara", "galeri", "rsvp"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (nav && secs.length && "IntersectionObserver" in window && !reduce) {
    const links = qsa("a", nav);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((a) => {
              const aktif = a.getAttribute("href") === "#" + en.target.id;
              a.style.background = aktif ? "var(--fg-blush)" : "";
            });
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    secs.forEach((s) => spy.observe(s));
  }

  // 5) Mode demo: pita DEMO + tombol "Pesan tema ini" (WA)
  if (cfg && cfg.demo === true && !document.body.querySelector(".kh-demo-ribbon")) {
    const ribbon = document.createElement("div");
    ribbon.className = "kh-demo-ribbon";
    ribbon.textContent = "DEMO";
    document.body.appendChild(ribbon);

    const wa = document.createElement("a");
    wa.className = "kh-pesan";
    wa.href =
      "https://wa.me/6280000000000?text=" +
      encodeURIComponent("Halo, saya ingin memesan tema Floral Garden untuk undangan digital saya.");
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.textContent = "Pesan tema ini";
    document.body.appendChild(wa);
  }
}
