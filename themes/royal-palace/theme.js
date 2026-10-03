/* royal-palace — theme.js (ES module)
 * Animasi khas tema: intro sinematik gerbang emas, reveal megah,
 * shimmer pada countdown, indikator musik, sorot nav.
 */
export function init(ctx) {
  const { cfg, root } = ctx;
  const qsa = (sel, el) => (el || root).querySelectorAll(sel);
  const qs = (sel, el) => (el || root).querySelector(sel);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) Intro sinematik: ketuk untuk masuk, atau otomatis setelah 6 detik
  const intro = qs(".rp-intro");
  if (intro) {
    let gone = false;
    const dismiss = () => {
      if (gone) return;
      gone = true;
      intro.classList.add("rp-intro--done");
      setTimeout(() => intro.remove(), 1400);
    };
    intro.addEventListener("click", dismiss);
    setTimeout(dismiss, reduce ? 500 : 6000);
  }

  // 2) Reveal megah dengan jeda berjenjang
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
            en.target.style.transitionDelay = Math.min(idx * 110, 550) + "ms";
            en.target.classList.add("kh-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  // 3) Kilau emas berjalan pada angka countdown (CSS text shimmer via class)
  if (!reduce) {
    const cdSpans = qsa("[data-cd-d],[data-cd-h],[data-cd-m],[data-cd-s]");
    cdSpans.forEach((sp) => sp.classList.add("rp-shimmer"));
    const style = document.createElement("style");
    style.textContent =
      ".rp-shimmer{background:linear-gradient(100deg,#c9a24b 20%,#f6ecc9 40%,#c9a24b 60%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rpShimmer 4s linear infinite;}@keyframes rpShimmer{to{background-position:-200% center;}}";
    document.head.appendChild(style);
  }

  // 4) Indikator visual tombol musik
  const audio = qs("audio[data-musik]");
  const btnMusik = document.getElementById("btn-musik");
  if (audio && btnMusik) {
    audio.addEventListener("play", () => btnMusik.classList.add("rp-playing"));
    audio.addEventListener("pause", () => btnMusik.classList.remove("rp-playing"));
  }

  // 5) Sorot nav sesuai section
  const nav = qs(".rp-nav");
  const secs = ["profil", "acara", "galeri", "rsvp"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (nav && secs.length && "IntersectionObserver" in window && !reduce) {
    const links = qsa("a", nav);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((a) => {
              a.style.color = a.getAttribute("href") === "#" + en.target.id ? "var(--rp-gold)" : "";
            });
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    secs.forEach((s) => spy.observe(s));
  }

  // 6) QR check-in: isi placeholder dengan URL undangan saat ini
  const qrBox = qs("[data-qr]");
  if (qrBox && !qrBox.dataset.qrDone) {
    qrBox.dataset.qrDone = "1";
    const url = window.location.href.split("#")[0];
    const note = document.createElement("p");
    note.textContent = "QR tersedia di halaman undangan";
    note.style.cssText = "font-size:.72rem;color:#8a8a8a;margin:0;text-align:center;";
    qrBox.appendChild(note);
    qrBox.title = url;
  }

  // 7) Mode demo: pita DEMO + tombol "Pesan tema ini" (WA)
  if (cfg && cfg.demo === true && !document.body.querySelector(".kh-demo-ribbon")) {
    const ribbon = document.createElement("div");
    ribbon.className = "kh-demo-ribbon";
    ribbon.textContent = "DEMO";
    document.body.appendChild(ribbon);

    const wa = document.createElement("a");
    wa.className = "kh-pesan";
    wa.href =
      "https://wa.me/6280000000000?text=" +
      encodeURIComponent("Halo, saya ingin memesan tema Royal Palace untuk undangan digital saya.");
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.textContent = "Pesan tema ini";
    document.body.appendChild(wa);
  }
}
