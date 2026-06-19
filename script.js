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
        document.body.classList.toggle('has-scrolled', scrollY > 280);
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

    window.addEventListener('scroll', onScroll, { passive: true });
    if (!reduceMotion) {
        window.addEventListener('mousemove', onMouse, { passive: true });
        updateParallax();
    }
    document.body.classList.toggle('has-scrolled', scrollY > 280);

    // ---- Scroll reveal ----
    const reveals = document.querySelectorAll(
        '.section-head, .pain-card, .problem-card, .issue-picker, .reassurance-card, .reassurance-text, .proof-card, .practice-photo, .step, .format, .review, .about-text, .about-photo, .lead-form, .cta-text, .faq-item, .pain-cta, .mini-cta, .approach-card, .principle, .session-card, .price-card, .atmosphere, .story-card, .resource-form, .shelf-card, .price-note, .skill-lab'
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
    let selectedIssueText = '';

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

    // ---- Issue picker ----
    const issuePicker = document.getElementById('issue-picker');
    if (issuePicker) {
        const issueInputs = issuePicker.querySelectorAll('input[type="checkbox"]');
        const issueResult = issuePicker.querySelector('[data-issue-result]');
        const messageField = form ? form.message : null;

        function updateIssueResult() {
            const selected = Array.from(issueInputs)
                .filter((input) => input.checked)
                .map((input) => input.value);

            if (!selected.length) {
                selectedIssueText = '';
                issueResult.textContent = 'Выберите 1-3 пункта, и я подскажу, с чего начать.';
                return;
            }

            const visible = selected.slice(0, 4).join(', ');
            selectedIssueText = `Похоже, сейчас важнее всего: ${visible}.`;
            issueResult.textContent = `${selectedIssueText} С этим можно прийти на короткий звонок.`;

            if (messageField && !messageField.value.trim()) {
                messageField.value = selectedIssueText;
            }
        }

        issueInputs.forEach((input) => input.addEventListener('change', updateIssueResult));
    }

    // ---- Resource shelf ----
    const addWinBtn = document.getElementById('addWin');
    const addChildCardBtn = document.getElementById('addChildCard');
    const addParentCardBtn = document.getElementById('addParentCard');
    const printShelfBtn = document.getElementById('printShelf');
    const childName = document.getElementById('childName');
    const parentName = document.getElementById('parentName');
    const treasureTitle = document.querySelector('[data-treasure-title]');
    const treasureSubtitle = document.querySelector('[data-treasure-subtitle]');
    const childShelfTitle = document.querySelector('[data-child-shelf-title]');
    const parentShelfTitle = document.querySelector('[data-parent-shelf-title]');
    const childCustom = document.getElementById('childCustom');
    const parentCustom = document.getElementById('parentCustom');
    const winInput = document.getElementById('winInput');
    const winList = document.getElementById('winList');
    const childShelf = document.getElementById('childShelf');
    const parentShelf = document.getElementById('parentShelf');

    function getFamilyRoles() {
        const none = document.querySelector('[data-family-none]');
        if (none && none.checked) return '';
        return Array.from(document.querySelectorAll('[data-family-role]'))
            .filter((input) => input.checked)
            .map((input) => input.value)
            .join(' и ');
    }

    function updateTreasureLabels() {
        const child = childName ? childName.value.trim() : '';
        const parent = parentName ? parentName.value.trim() : '';
        const roles = getFamilyRoles();
        const family = child ? `Сундук суперсил семьи ${child}` : 'Сундук суперсил семьи';
        if (treasureTitle) treasureTitle.textContent = family;
        if (childShelfTitle) childShelfTitle.textContent = child ? `Суперсилы ${child}` : 'Суперсилы ребёнка';
        if (parentShelfTitle) parentShelfTitle.textContent = parent ? `Суперсилы ${parent}` : 'Суперсилы родителя';
        if (treasureSubtitle) {
            const who = [parent, roles].filter(Boolean).join(', ');
            treasureSubtitle.textContent = who
                ? `${who}: выберите опоры и распечатайте карту для дома.`
                : 'Выберите опоры и распечатайте карту для дома.';
        }
    }

    [childName, parentName].forEach((input) => {
        if (input) input.addEventListener('input', updateTreasureLabels);
    });
    document.querySelectorAll('[data-family-role], [data-family-none]').forEach((input) => {
        input.addEventListener('change', () => {
            if (input.matches('[data-family-none]') && input.checked) {
                document.querySelectorAll('[data-family-role]').forEach((role) => { role.checked = false; });
            } else if (input.checked) {
                const none = document.querySelector('[data-family-none]');
                if (none) none.checked = false;
            }
            updateTreasureLabels();
        });
    });
    document.querySelectorAll('.role-picker label').forEach((label) => {
        label.addEventListener('click', (event) => {
            const input = label.querySelector('input');
            if (!input || event.target === input) return;
            event.preventDefault();
            input.checked = !input.checked;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
    updateTreasureLabels();

    function addShelfItem(list, text) {
        const value = text.trim();
        if (!list || !value) return false;

        const exists = Array.from(list.children).some((item) => item.textContent.trim().toLowerCase() === value.toLowerCase());
        if (exists) return false;

        const item = document.createElement('li');
        item.textContent = value;
        item.className = 'is-new';
        list.appendChild(item);
        window.setTimeout(() => item.classList.remove('is-new'), 500);
        return true;
    }

    document.querySelectorAll('.resource-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const target = chip.dataset.shelfTarget === 'parent' ? parentShelf : childShelf;
            const added = addShelfItem(target, chip.dataset.shelfText || chip.textContent);
            if (added) {
                chip.classList.add('is-added');
                chip.setAttribute('aria-pressed', 'true');
            }
        });
    });

    if (addChildCardBtn && childCustom) {
        addChildCardBtn.addEventListener('click', () => {
            if (!childCustom.value.trim()) {
                childCustom.focus();
                return;
            }
            if (addShelfItem(childShelf, childCustom.value)) childCustom.value = '';
            childCustom.focus();
        });
    }

    if (addParentCardBtn && parentCustom) {
        addParentCardBtn.addEventListener('click', () => {
            if (!parentCustom.value.trim()) {
                parentCustom.focus();
                return;
            }
            if (addShelfItem(parentShelf, parentCustom.value)) parentCustom.value = '';
            parentCustom.focus();
        });
    }

    if (addWinBtn && winInput && winList) {
        addWinBtn.addEventListener('click', () => {
            if (!winInput.value.trim()) {
                winInput.focus();
                return;
            }
            if (addShelfItem(winList, winInput.value)) winInput.value = '';
            winInput.focus();
        });
    }

    if (printShelfBtn) {
        printShelfBtn.addEventListener('click', () => window.print());
    }

    // ---- Skill builder ----
    const buildSkillBtn = document.getElementById('buildSkill');
    const skillProblem = document.getElementById('skillProblem');
    const skillCustom = document.getElementById('skillCustom');
    const skillSupport = document.getElementById('skillSupport');
    const skillReminder = document.getElementById('skillReminder');
    const skillSteps = document.getElementById('skillSteps');

    if (buildSkillBtn && skillSteps) {
        buildSkillBtn.addEventListener('click', () => {
            const skill = (skillCustom && skillCustom.value.trim()) || (skillProblem && skillProblem.value.trim());
            const support = skillSupport && skillSupport.value.trim();
            const reminder = skillReminder && skillReminder.value.trim();

            if (!skill) {
                if (skillCustom) skillCustom.focus();
                return;
            }

            const steps = [
                `Навык: ${skill}.`,
                'Польза: когда навык начнёт получаться, дома станет спокойнее и понятнее.',
                `Команда поддержки: ${support || 'выберите 1-2 взрослых или близких людей'}.`,
                `Мягкое напоминание: ${reminder || 'договоритесь о коротком слове, жесте или карточке'}.`,
                'Тренировка: замечайте маленькие попытки и хвалите не только результат.',
                'Праздник: заранее придумайте, как отметить первые 3-5 удачных попыток.'
            ];

            skillSteps.innerHTML = '';
            steps.forEach((step) => {
                const item = document.createElement('li');
                item.textContent = step;
                skillSteps.appendChild(item);
            });
        });
    }

    // ---- Fufik speech bubble ----
    const bunnyQuote = document.querySelector('[data-bunny-quote]');
    const bunnyAction = document.querySelector('[data-bunny-action]');
    const bunny = document.querySelector('.bunny-peek');
    if (bunnyQuote && bunny) {
        const bubble = bunnyQuote.closest('.bunny-bubble');
        const phrases = [
            { text: 'Сегодня вы уже хороший родитель — правда-правда' },
            { text: 'Иногда одна спокойная пауза уже меняет вечер' },
            { text: 'Можно быть рядом, а не идеальным' },
            { text: 'Спросите ребёнка: «как ты сейчас?» — просто так' },
            { text: 'Сложное поведение — это сигнал, а не приговор' },
            { text: 'Вы не обязаны всё решать за один вечер' },
            { text: 'Ребёнку важен не идеальный взрослый, а живой и тёплый' },
            { text: 'Если сегодня получилось на 1% спокойнее — это уже движение' },
            { text: 'Можно сначала выдохнуть, а потом воспитывать' },
            { text: 'Когда вы просите помощь, вы заботитесь о семье' },
            { text: 'Замечайте не только срывы, но и маленькие попытки' },
            { text: 'Соберите сундук суперсил и заберите медаль', href: '#resources', label: 'Собрать сундук' },
            { text: 'Попробуйте превратить трудность в навык', href: '#skill-lab', label: 'Примерить навык' },
            { text: 'На бесплатном звонке можно коротко свериться', href: '#cta', label: 'Записаться' },
            { text: 'Вы уже заметили трудность. Это важный первый шаг' }
        ];
        let qi = -1;
        let hideTimer = null;
        function showNextQuote() {
            qi = (qi + 1) % phrases.length;
            const phrase = phrases[qi];
            bunnyQuote.textContent = phrase.text;
            if (bunnyAction) {
                if (phrase.href) {
                    bunnyAction.href = phrase.href;
                    bunnyAction.textContent = phrase.label || 'Перейти';
                    bubble.classList.add('has-action');
                } else {
                    bubble.classList.remove('has-action');
                }
            }
            bubble.classList.add('show');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => bubble.classList.remove('show'), 8000);
        }
        bunny.addEventListener('click', showNextQuote);
        bunny.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showNextQuote();
            }
        });
        window.setTimeout(showNextQuote, 3000);
        window.setInterval(showNextQuote, 30000);
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
            const topic = form.topic ? form.topic.value.trim() : '';
            const message = form.message.value.trim();
            const leadText = [
                'Здравствуйте, Диана! Хочу записаться на бесплатный 15-минутный звонок.',
                '',
                `Имя: ${name}`,
                `Контакт: ${contact}`,
                age ? `Возраст ребёнка: ${age}` : '',
                topic ? `Запрос: ${topic}` : '',
                selectedIssueText ? `Чек-лист: ${selectedIssueText}` : '',
                message ? `Что беспокоит: ${message}` : '',
            ].filter(Boolean).join('\n');

            const opened = window.open(telegramUrl, '_blank', 'noopener');

            try {
                await navigator.clipboard.writeText(leadText);
                setFormStatus('Текст заявки скопирован. Вставьте его в открывшийся чат Telegram и отправьте Диане.', false, !opened);
            } catch (_) {
                setFormStatus('Не получилось скопировать текст автоматически. Откройте Telegram и напишите Диане коротко ваш запрос и контакт.', true, true);
            }
        });
    }
})();
