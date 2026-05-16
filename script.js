const parallaxItems = [...document.querySelectorAll("[data-depth]")];

function updateParallax() {
    const scrollY = window.scrollY || 0;
    for (const item of parallaxItems) {
        const depth = Number(item.dataset.depth || 0);
        item.style.setProperty("--parallax-y", `${scrollY * depth}px`);
    }
}

updateParallax();
window.addEventListener("scroll", updateParallax, { passive: true });
