/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
const cursorDot = document.getElementById("cursorDot");
const cursorRing = document.getElementById("cursorRing");
const isTouch = window.matchMedia("(hover: none)").matches;

if (!isTouch) {
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
  });

  function ringLoop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    cursorRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(ringLoop);
  }
  ringLoop();

  document.querySelectorAll("[data-cursor='hover']").forEach((el) => {
    el.addEventListener("mouseenter", () => cursorRing.classList.add("hover"));
    el.addEventListener("mouseleave", () => cursorRing.classList.remove("hover"));
  });
}

/* ============================================================
   NAV: burger + scroll shrink
   ============================================================ */
const navBurger = document.getElementById("navBurger");
const mobileMenu = document.getElementById("mobileMenu");

navBurger.addEventListener("click", () => {
  navBurger.classList.toggle("open");
  mobileMenu.classList.toggle("open");
});

mobileMenu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navBurger.classList.remove("open");
    mobileMenu.classList.remove("open");
  })
);

/* ============================================================
   SCROLL PROGRESS THREAD
   ============================================================ */
const threadFill = document.getElementById("threadFill");
function updateThread() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  threadFill.style.width = pct + "%";
}
window.addEventListener("scroll", updateThread, { passive: true });
updateThread();

/* ============================================================
   SCROLL REVEALS
   ============================================================ */
const revealTargets = document.querySelectorAll(
  ".craft-card, .process-item, .section-head, .contact-inner"
);
revealTargets.forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(28px)";
  el.style.transition = "opacity .8s cubic-bezier(0.16,1,0.3,1), transform .8s cubic-bezier(0.16,1,0.3,1)";
});

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = Array.from(el.parentElement.children).indexOf(el) * 60;
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        }, delay);
        io.unobserve(el);
      }
    });
  },
  { threshold: 0.15 }
);
revealTargets.forEach((el) => io.observe(el));

/* ============================================================
   HORIZONTAL DRAG GALLERY (work section)
   ============================================================ */
const trackWrap = document.querySelector(".work-track-wrap");
const track = document.getElementById("workTrack");

let isDown = false;
let startX = 0;
let scrollLeftStart = 0;
let currentScroll = 0;
let maxScroll = 0;

function computeMax() {
  maxScroll = Math.max(0, track.scrollWidth - trackWrap.clientWidth);
}
computeMax();
window.addEventListener("resize", computeMax);

function setTrackX(x) {
  currentScroll = Math.min(Math.max(x, 0), maxScroll);
  track.style.transform = `translateX(${-currentScroll}px)`;
}

trackWrap.addEventListener("pointerdown", (e) => {
  isDown = true;
  trackWrap.classList.add("dragging");
  startX = e.clientX;
  scrollLeftStart = currentScroll;
  trackWrap.setPointerCapture(e.pointerId);
});

trackWrap.addEventListener("pointermove", (e) => {
  if (!isDown) return;
  const dx = e.clientX - startX;
  setTrackX(scrollLeftStart - dx);
});

function endDrag(e) {
  isDown = false;
  trackWrap.classList.remove("dragging");
}
trackWrap.addEventListener("pointerup", endDrag);
trackWrap.addEventListener("pointercancel", endDrag);

// wheel -> horizontal scroll within the section
trackWrap.addEventListener(
  "wheel",
  (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const atStart = currentScroll <= 0 && e.deltaY < 0;
      const atEnd = currentScroll >= maxScroll && e.deltaY > 0;
      if (!atStart && !atEnd) {
        e.preventDefault();
        setTrackX(currentScroll + e.deltaY);
      }
    }
  },
  { passive: false }
);

/* ============================================================
   MAGNETIC TILT ON WORK CARD VISUALS
   ============================================================ */
if (!isTouch) {
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateX(${-py * 10}deg) rotateY(${px * 10}deg)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = `perspective(600px) rotateX(0) rotateY(0)`;
    });
  });
}

/* ============================================================
   SMOOTH ANCHOR SCROLL (accounts for fixed nav)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      window.scrollTo({
        top: target.offsetTop - 60,
        behavior: "smooth",
      });
    }
  });
});
