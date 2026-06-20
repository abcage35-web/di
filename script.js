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
        '.section-head, .pain-card, .problem-card, .issue-picker, .reassurance-card, .reassurance-text, .proof-card, .practice-photo, .step, .format, .review, .about-text, .about-photo, .lead-form, .cta-text, .pain-cta, .principle, .session-card, .price-card, .atmosphere, .story-card, .resource-form, .shelf-card, .price-note, .skill-lab'
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

    const bookingApiUrl = String(window.BOOKING_API_URL || '').trim();
    const bookingTimeZone = String(window.BOOKING_TIMEZONE || 'Asia/Tbilisi').trim();
    const slotList = form ? form.querySelector('[data-slot-list]') : null;
    const slotNote = form ? form.querySelector('[data-slot-note]') : null;
    const slotRefresh = form ? form.querySelector('[data-slot-refresh]') : null;
    let slotsLoadedFromApi = false;
    let selectedSlot = null;

    const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        timeZone: bookingTimeZone,
    });
    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: bookingTimeZone,
    });

    function formatSlotLabel(slot) {
        const start = new Date(slot.startIso);
        return `${dayFormatter.format(start)}, ${timeFormatter.format(start)}`;
    }

    function setSlotNote(message, isError) {
        if (!slotNote) return;
        slotNote.textContent = message;
        slotNote.classList.toggle('is-error', Boolean(isError));
    }

    function buildPreviewSlots() {
        const slots = [];
        const now = new Date();
        const weekdayTimes = ['10:00', '12:30', '15:00', '18:00'];
        const saturdayTimes = ['11:00', '13:00'];

        for (let dayOffset = 1; dayOffset <= 14 && slots.length < 12; dayOffset += 1) {
            const day = new Date(now);
            day.setDate(now.getDate() + dayOffset);
            const weekday = day.getDay();
            if (weekday === 0) continue;

            const times = weekday === 6 ? saturdayTimes : weekdayTimes;
            times.forEach((time) => {
                if (slots.length >= 12) return;
                const [hours, minutes] = time.split(':').map(Number);
                const start = new Date(day);
                start.setHours(hours, minutes, 0, 0);
                if (start <= now) return;
                const end = new Date(start.getTime() + 15 * 60 * 1000);
                slots.push({
                    startIso: start.toISOString(),
                    endIso: end.toISOString(),
                    preview: true,
                });
            });
        }

        return slots;
    }

    function selectSlot(slot, button) {
        selectedSlot = slot;
        const slotField = form ? form.elements.namedItem('slot') : null;
        if (slotField) {
            slotField.value = slot.startIso;
        }
        slotList.querySelectorAll('.slot-option').forEach((item) => {
            item.classList.toggle('is-selected', item === button);
            item.setAttribute('aria-pressed', String(item === button));
        });
    }

    function renderSlots(slots) {
        if (!slotList) return;
        slotList.innerHTML = '';
        selectedSlot = null;
        const slotField = form ? form.elements.namedItem('slot') : null;
        if (slotField) slotField.value = '';

        if (!slots.length) {
            const empty = document.createElement('p');
            empty.className = 'slot-empty';
            empty.textContent = 'Пока нет свободных слотов. Напишите напрямую в Telegram, и Диана предложит время вручную.';
            slotList.appendChild(empty);
            return;
        }

        slots.forEach((slot) => {
            const start = new Date(slot.startIso);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'slot-option';
            button.setAttribute('aria-pressed', 'false');

            const day = document.createElement('span');
            day.className = 'slot-day';
            day.textContent = dayFormatter.format(start);

            const time = document.createElement('strong');
            time.textContent = timeFormatter.format(start);

            button.append(day, time);
            button.addEventListener('click', () => selectSlot(slot, button));
            slotList.appendChild(button);
        });
    }

    async function loadBookingSlots() {
        if (!slotList) return;
        setSlotNote('Проверяем календарь и ищем ближайшее свободное время.');
        slotList.innerHTML = '<p class="slot-empty">Загружаем слоты...</p>';

        if (!bookingApiUrl) {
            slotsLoadedFromApi = false;
            renderSlots(buildPreviewSlots());
            setSlotNote('Календарь ещё не подключён. Можно выбрать ориентировочное время, заявка откроется в Telegram.', true);
            return;
        }

        try {
            const url = new URL(bookingApiUrl);
            url.searchParams.set('action', 'slots');
            url.searchParams.set('days', '21');
            const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error(data.error || 'slots_failed');

            slotsLoadedFromApi = true;
            renderSlots(Array.isArray(data.slots) ? data.slots : []);
            setSlotNote('Показаны свободные слоты из Google Calendar.');
        } catch (_) {
            slotsLoadedFromApi = false;
            renderSlots(buildPreviewSlots());
            setSlotNote('Не получилось получить слоты из календаря. Можно выбрать ориентировочное время и отправить заявку в Telegram.', true);
        }
    }

    async function copyAndOpenTelegram(leadText, openedMessage) {
        const opened = window.open(telegramUrl, '_blank', 'noopener');
        try {
            await navigator.clipboard.writeText(leadText);
            setFormStatus(openedMessage || 'Текст заявки скопирован. Вставьте его в открывшийся чат Telegram и нажмите “Отправить”.', false, !opened);
        } catch (_) {
            setFormStatus('Не получилось скопировать текст автоматически. Откройте Telegram и напишите Диане коротко: выбранное время, запрос, имя, контакт и возраст ребёнка.', true, true);
        }
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
        const issueCards = document.querySelectorAll('[data-issue-card]');
        const issueInputs = issuePicker.querySelectorAll('input[type="checkbox"]');
        const issueResultTitle = issuePicker.querySelector('.issue-result strong');
        const issueResult = issuePicker.querySelector('[data-issue-result]');
        const messageField = form ? form.elements.namedItem('message') : null;
        const topicField = form ? form.elements.namedItem('topic') : null;

        function setIssueText(text, topic) {
            selectedIssueText = `Похоже, сейчас важнее всего: ${text}.`;
            if (issueResultTitle) issueResultTitle.textContent = 'Запрос выбран';
            issueResult.textContent = `${selectedIssueText} С этим можно прийти на короткий звонок.`;

            if (messageField && (!messageField.value.trim() || messageField.dataset.autofilled === 'issue')) {
                messageField.value = selectedIssueText;
                messageField.dataset.autofilled = 'issue';
            }
            if (topicField && topic) {
                topicField.value = topic;
            }
        }

        function updateIssueResult() {
            const selected = Array.from(issueInputs)
                .filter((input) => input.checked)
                .map((input) => input.value);

            if (!selected.length) {
                selectedIssueText = '';
                if (issueResultTitle) issueResultTitle.textContent = 'Ваш запрос появится здесь';
                issueResult.textContent = 'Выберите 1-3 пункта, и я подскажу, с чего начать.';
                return;
            }

            const visible = selected.slice(0, 4).join(', ');
            issueCards.forEach((card) => {
                card.classList.remove('is-selected');
                card.setAttribute('aria-pressed', 'false');
            });
            setIssueText(visible);
        }

        issueInputs.forEach((input) => input.addEventListener('change', updateIssueResult));
        issueCards.forEach((card) => {
            const chooseCard = () => {
                issueInputs.forEach((input) => { input.checked = false; });
                issueCards.forEach((item) => {
                    const isCurrent = item === card;
                    item.classList.toggle('is-selected', isCurrent);
                    item.setAttribute('aria-pressed', String(isCurrent));
                });
                setIssueText(card.dataset.issueText || card.textContent.trim(), card.dataset.issueTopic);
            };

            card.addEventListener('click', chooseCard);
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    chooseCard();
                }
            });
        });
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
    const parentShelfWrap = document.querySelector('[data-parent-shelf-wrap]');
    const momShelfWrap = document.querySelector('[data-mom-shelf]');
    const dadShelfWrap = document.querySelector('[data-dad-shelf]');
    const adultOptionGroups = document.querySelectorAll('[data-parent-options]');
    const parentMedal = document.querySelector('.parent-medal');
    const medalTitle = document.querySelector('[data-medal-title]');
    const medalNote = document.querySelector('[data-medal-note]');
    const childCustom = document.getElementById('childCustom');
    const parentCustom = document.getElementById('parentCustom');
    const winInput = document.getElementById('winInput');
    const winList = document.getElementById('winList');
    const childShelf = document.getElementById('childShelf');
    const parentShelf = document.getElementById('parentShelf');
    const momShelf = document.getElementById('momShelf');
    const dadShelf = document.getElementById('dadShelf');

    function getFamilyRoles() {
        const none = document.querySelector('[data-family-none]');
        if (none && none.checked) return [];
        return Array.from(document.querySelectorAll('[data-family-role]'))
            .filter((input) => input.checked)
            .map((input) => input.value);
    }

    function joinText(items) {
        if (items.length < 2) return items[0] || '';
        if (items.length === 2) return `${items[0]} и ${items[1]}`;
        return `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}`;
    }

    function capitalize(value) {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    }

    function updateTreasureLabels() {
        const child = childName ? childName.value.trim() : '';
        const parent = parentName ? parentName.value.trim() : '';
        const roles = getFamilyRoles();
        const names = [parent, child].filter(Boolean);
        if (treasureTitle) {
            treasureTitle.textContent = names.length
                ? `Семейный сундук: ${names.join(', ')}`
                : 'Семейный сундук суперсил';
        }
        if (childShelfTitle) childShelfTitle.textContent = child ? `Суперсилы: ${child}` : 'Суперсилы ребёнка';
        if (parentShelfTitle) parentShelfTitle.textContent = parent ? `Суперсилы взрослого: ${parent}` : 'Суперсилы родителя';
        if (momShelfWrap) momShelfWrap.hidden = !roles.includes('мама');
        if (dadShelfWrap) dadShelfWrap.hidden = !roles.includes('папа');
        if (parentShelfWrap) parentShelfWrap.hidden = roles.includes('мама') || roles.includes('папа');
        updateAdultOptionGroups(roles);
        if (treasureSubtitle) {
            const roleText = roles.length ? joinText(roles) : '';
            const who = parent && roleText
                ? `${parent} (${roleText})`
                : parent || capitalize(roleText);
            treasureSubtitle.textContent = who
                ? `${who}: выберите опоры и распечатайте карту для дома.`
                : 'Выберите опоры и распечатайте карту для дома.';
        }
        syncParentsMedal(roles);
    }

    function getParentTargets() {
        const roles = getFamilyRoles();
        const targets = [];
        if (roles.includes('мама') && momShelf) targets.push(momShelf);
        if (roles.includes('папа') && dadShelf) targets.push(dadShelf);
        if (!targets.length && parentShelf) targets.push(parentShelf);
        return targets;
    }

    function updateMedal() {
        const selected = document.querySelector('input[name="parentMedal"]:checked');
        if (!selected) return;
        if (medalTitle) medalTitle.textContent = selected.value;
        if (medalNote) medalNote.textContent = selected.dataset.medalNote || '';
        if (parentMedal) {
            parentMedal.classList.remove('medal-round', 'medal-heart', 'medal-shield', 'medal-parents');
            parentMedal.classList.add(`medal-${selected.dataset.medalShape || 'round'}`);
        }
    }

    function syncParentsMedal(roles = getFamilyRoles()) {
        const parentsOption = document.querySelector('[data-parent-medal]');
        if (!parentsOption) return;
        if (roles.includes('мама') && roles.includes('папа')) {
            parentsOption.checked = true;
            updateMedal();
        } else if (parentsOption.checked) {
            const fallback = document.querySelector('input[name="parentMedal"][data-medal-shape="round"]');
            if (fallback) {
                fallback.checked = true;
                updateMedal();
            }
        }
    }

    function updateAdultOptionGroups(roles = getFamilyRoles()) {
        adultOptionGroups.forEach((group) => {
            const type = group.dataset.parentOptions;
            if (type === 'generic') group.hidden = roles.includes('мама') || roles.includes('папа');
            if (type === 'mom') group.hidden = !roles.includes('мама');
            if (type === 'dad') group.hidden = !roles.includes('папа');
        });
    }

    function getChipTargets(chip) {
        if (chip.dataset.shelfTarget === 'parent') return getParentTargets();
        if (chip.dataset.shelfTarget === 'mom') return momShelf ? [momShelf] : [];
        if (chip.dataset.shelfTarget === 'dad') return dadShelf ? [dadShelf] : [];
        return childShelf ? [childShelf] : [];
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
    document.querySelectorAll('input[name="parentMedal"]').forEach((input) => {
        input.addEventListener('change', updateMedal);
    });
    updateMedal();

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
            const targets = getChipTargets(chip);
            let added = false;
            targets.forEach((target) => {
                added = addShelfItem(target, chip.dataset.shelfText || chip.textContent) || added;
            });
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
            let added = false;
            getParentTargets().forEach((target) => {
                added = addShelfItem(target, parentCustom.value) || added;
            });
            if (added) parentCustom.value = '';
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
        if (skillProblem && skillCustom) {
            skillProblem.addEventListener('change', () => {
                const option = skillProblem.options[skillProblem.selectedIndex];
                const suggestion = option ? option.dataset.skill : '';
                skillCustom.placeholder = suggestion
                    ? `Например: ${suggestion}`
                    : 'Например: просить помощь вместо крика';
            });
        }

        buildSkillBtn.addEventListener('click', () => {
            const problem = skillProblem && skillProblem.value.trim();
            const skill = skillCustom && skillCustom.value.trim();
            const support = skillSupport && skillSupport.value.trim();
            const reminder = skillReminder && skillReminder.value.trim();

            if (!problem) {
                if (skillProblem) skillProblem.focus();
                return;
            }
            if (!skill) {
                if (skillCustom) skillCustom.focus();
                return;
            }

            const steps = [
                `Трудность: ${problem}.`,
                `Навык, который поможет: ${skill}.`,
                'Польза: когда навык начнёт получаться, ситуация станет спокойнее и понятнее.',
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
            { text: 'Вы уже хороший родитель: вы замечаете и ищете помощь.' },
            { text: 'Иногда одна спокойная пауза меняет весь вечер.' },
            { text: 'Ребёнку нужен не идеальный, а внимательный взрослый.' },
            { text: 'Можно сначала выдохнуть, а потом говорить.' },
            { text: 'Сложное поведение — это сигнал, а не приговор.' },
            { text: 'Не нужно решать всё за один вечер.' },
            { text: 'Если сегодня стало на 1% спокойнее, это уже шаг.' },
            { text: 'Просить помощь — это заботиться о семье.' },
            { text: 'Замечайте не только срывы, но и маленькие попытки.' },
            { text: 'Соберите сундук суперсил и заберите медаль.', href: '#resources', label: 'Собрать сундук' },
            { text: 'Попробуйте превратить трудность в навык.', href: '#skill-lab', label: 'Примерить навык' },
            { text: 'На бесплатном звонке можно коротко свериться.', href: '#cta', label: 'Записаться' },
            { text: 'Вы заметили трудность. Это уже важный первый шаг.' }
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
        loadBookingSlots();
        if (slotRefresh) {
            slotRefresh.addEventListener('click', loadBookingSlots);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const controls = form.elements;
            const nameField = controls.namedItem('name');
            const contactField = controls.namedItem('contact');
            const ageField = controls.namedItem('age');
            const topicField = controls.namedItem('topic');
            const messageField = controls.namedItem('message');
            const websiteField = controls.namedItem('website');
            const name = nameField.value.trim();
            const contact = contactField.value.trim();
            if (!name || !contact) {
                if (!name) nameField.focus();
                else contactField.focus();
                setFormStatus('Заполните имя и контакт, чтобы Диана могла ответить.', true);
                return;
            }

            if (websiteField && websiteField.value.trim()) return;

            if (!selectedSlot) {
                setFormStatus('Выберите свободный слот для звонка.', true);
                const firstSlot = slotList ? slotList.querySelector('.slot-option') : null;
                if (firstSlot) firstSlot.focus();
                return;
            }

            const age = ageField.value.trim();
            const topic = topicField ? topicField.value.trim() : '';
            const message = messageField.value.trim();
            const slotLabel = formatSlotLabel(selectedSlot);
            const leadText = [
                'Здравствуйте, Диана! Хочу записаться на бесплатный 15-минутный звонок.',
                '',
                `Слот: ${slotLabel}`,
                `Имя: ${name}`,
                `Контакт: ${contact}`,
                age ? `Возраст ребёнка: ${age}` : '',
                topic ? `Запрос: ${topic}` : '',
                selectedIssueText ? `Чек-лист: ${selectedIssueText}` : '',
                message ? `Что беспокоит: ${message}` : '',
            ].filter(Boolean).join('\n');

            const payload = {
                name,
                contact,
                age,
                topic,
                message,
                selectedIssueText,
                slotStart: selectedSlot.startIso,
                slotEnd: selectedSlot.endIso,
                slotLabel,
                pageUrl: window.location.href,
            };

            if (!bookingApiUrl || !slotsLoadedFromApi) {
                await copyAndOpenTelegram(leadText, 'Календарь пока не подключён. Текст заявки скопирован: вставьте его в Telegram и нажмите “Отправить”.');
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            setFormStatus('Бронируем слот в календаре...', false);

            try {
                const response = await fetch(bookingApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok || !data.ok) throw data;

                setFormStatus(`Готово: ${data.slotLabel || slotLabel}. Запись добавлена в календарь, детали отправлены в Telegram.`, false);
                form.reset();
                await loadBookingSlots();
            } catch (error) {
                const slotTaken = error && (error.code === 'SLOT_TAKEN' || error.error === 'SLOT_TAKEN');
                if (slotTaken) {
                    setFormStatus('Этот слот только что заняли. Выберите другое время.', true);
                    await loadBookingSlots();
                    return;
                }
                await copyAndOpenTelegram(leadText, 'Не получилось подтвердить запись автоматически. Текст заявки скопирован: отправьте его Диане в Telegram.');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }
})();
