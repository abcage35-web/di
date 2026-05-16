// Smooth parallax + scroll reveal
(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Parallax for background doodles ----
    const doodles = document.querySelectorAll('.doodle');
    const parallaxItems = document.querySelectorAll('.parallax-item');

    let scrollY = window.scrollY;
    let mouseX = 0;
    let mouseY = 0;
    let ticking = false;

    function updateParallax() {
        doodles.forEach((el) => {
            const speed = parseFloat(el.dataset.speed || '0.3');
            const ty = -scrollY * speed;
            const tx = mouseX * speed * 18;
            const my = mouseY * speed * 18;
            el.style.transform = `translate3d(${tx}px, ${ty + my}px, 0)`;
        });

        parallaxItems.forEach((el) => {
            const depth = parseFloat(el.dataset.depth || '0.05');
            const rect = el.getBoundingClientRect();
            const center = window.innerHeight / 2;
            const offset = (rect.top + rect.height / 2 - center) * depth;
            el.style.transform = `translate3d(0, ${-offset}px, 0)`;
        });

        ticking = false;
    }

    function onScroll() {
        scrollY = window.scrollY;
        if (!ticking && !reduceMotion) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    function onMouse(e) {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
        mouseY = (e.clientY / window.innerHeight) - 0.5;
        if (!ticking && !reduceMotion) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    if (!reduceMotion) {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMouse, { passive: true });
        updateParallax();
    }

    // ---- Scroll reveal ----
    const reveals = document.querySelectorAll(
        '.section-head, .pain-card, .step, .format, .review, .about-text, .about-photo, .lead-form, .cta-text, .faq-item, .pain-cta, .approach-card, .principle, .session-card, .atmosphere, .story-card'
    );
    reveals.forEach((el) => el.classList.add('reveal'));

    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));

    // ---- Lead form ----
    const form = document.getElementById('leadForm');
    const success = document.getElementById('formSuccess');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = form.name.value.trim();
            const contact = form.contact.value.trim();
            if (!name || !contact) {
                if (!name) form.name.focus();
                else form.contact.focus();
                return;
            }
            try {
                const payload = {
                    name,
                    contact,
                    age: form.age.value.trim(),
                    message: form.message.value.trim(),
                    ts: new Date().toISOString(),
                };
                localStorage.setItem('lead_' + Date.now(), JSON.stringify(payload));
            } catch (_) {}
            success.classList.add('show');
        });
    }
})();
