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
        '.section-head, .pain-card, .problem-card, .reassurance-card, .reassurance-text, .proof-card, .practice-photo, .step, .format, .review, .about-text, .about-photo, .lead-form, .cta-text, .faq-item, .pain-cta, .mini-cta, .approach-card, .principle, .session-card, .price-card, .atmosphere, .story-card'
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
    const telegramUrl = 'https://t.me/dizvilook';

    function setFormStatus(message, isError, showTelegramLink) {
        let status = form.querySelector('.form-status');
        if (!status) {
            status = document.createElement('p');
            status.className = 'form-status';
            form.appendChild(status);
        }
        status.textContent = '';
        status.appendChild(document.createTextNode(message));
        if (showTelegramLink) {
            status.appendChild(document.createElement('br'));
            const link = document.createElement('a');
            link.href = telegramUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            link.className = 'form-status-link';
            link.textContent = 'Открыть Telegram';
            status.appendChild(link);
        }
        status.classList.toggle('is-error', Boolean(isError));
    }

    // ---- Mobile nav menu ----
    const navToggle = document.querySelector('.nav-toggle');
    const navEl = document.querySelector('.nav');
    if (navToggle && navEl) {
        const closeMenu = () => {
            navEl.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        };
        navToggle.addEventListener('click', () => {
            const open = navEl.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', String(open));
        });
        navEl.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', closeMenu));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navEl.classList.contains('open')) closeMenu();
        });
    }

    // ---- Bunny speech bubble (по клику) ----
    const bunnyQuote = document.querySelector('[data-bunny-quote]');
    const bunny = document.querySelector('.bunny-peek');
    if (bunnyQuote && bunny) {
        const bubble = bunnyQuote.closest('.bunny-bubble');
        const phrases = [
            'Сегодня вы уже хороший родитель — правда-правда',
            'Иногда обнять полезнее, чем объяснить',
            'Можно быть рядом, а не идеальным',
            'Спросите ребёнка: «как ты сейчас?» — просто так',
            'Слушать важнее, чем отвечать',
            'Капризы — это не «плохо». Это сигнал.',
            'Глубокий вдох — и вы снова с ребёнком'
        ];
        let qi = -1;
        let hideTimer = null;
        function showNextQuote() {
            qi = (qi + 1) % phrases.length;
            bunnyQuote.textContent = phrases[qi];
            bubble.classList.add('show');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => bubble.classList.remove('show'), 6500);
        }
        bunny.addEventListener('click', showNextQuote);
        bunny.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showNextQuote();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = form.name.value.trim();
            const contact = form.contact.value.trim();
            if (!name || !contact) {
                if (!name) form.name.focus();
                else form.contact.focus();
                setFormStatus('Заполните имя и контакт, чтобы Диана могла ответить.', true);
                return;
            }

            const age = form.age.value.trim();
            const message = form.message.value.trim();
            const leadText = [
                'Здравствуйте, Диана! Хочу записаться на бесплатный 15-минутный звонок.',
                '',
                `Имя: ${name}`,
                `Контакт: ${contact}`,
                age ? `Возраст ребёнка: ${age}` : '',
                message ? `Что беспокоит: ${message}` : '',
            ].filter(Boolean).join('\n');

            try {
                await navigator.clipboard.writeText(leadText);
                setFormStatus('Текст заявки скопирован. Теперь откройте Telegram, вставьте сообщение в чат и отправьте его Диане.', false, true);
            } catch (_) {
                setFormStatus('Не получилось скопировать текст автоматически. Откройте Telegram и напишите Диане коротко ваш запрос и контакт.', true, true);
            }
        });
    }
})();
