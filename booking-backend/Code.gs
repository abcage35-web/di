const DEFAULT_TIME_ZONE = 'Asia/Tbilisi';
const DEFAULT_DURATION_MINUTES = 15;
const DEFAULT_DAYS_AHEAD = 21;
const DEFAULT_SLOT_RULES = {
  1: ['10:00', '12:30', '15:00', '18:00'],
  2: ['10:00', '12:30', '15:00', '18:00'],
  3: ['10:00', '12:30', '15:00', '18:00'],
  4: ['10:00', '12:30', '15:00', '18:00'],
  5: ['10:00', '12:30', '15:00', '18:00'],
  6: ['11:00', '13:00'],
};

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || 'health');

    if (action === 'slots') {
      const days = clampNumber_(Number(params.days || DEFAULT_DAYS_AHEAD), 1, 45);
      return json_({ ok: true, slots: getAvailableSlots_(days) });
    }

    return json_({
      ok: true,
      service: 'booking',
      configured: getConfigStatus_(),
    });
  } catch (error) {
    return json_({
      ok: false,
      code: error.code || 'BOOKING_ERROR',
      error: error.message || String(error),
    });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    if (payload.website) {
      return json_({ ok: true, ignored: true });
    }
    return json_(bookSlot_(payload));
  } catch (error) {
    return json_({
      ok: false,
      code: error.code || 'BOOKING_ERROR',
      error: error.message || String(error),
    });
  }
}

function bookSlot_(payload) {
  assertConfigured_();
  validatePayload_(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);

  try {
    const calendar = getCalendar_();
    const start = new Date(payload.slotStart);
    const end = payload.slotEnd
      ? new Date(payload.slotEnd)
      : new Date(start.getTime() + getDurationMinutes_() * 60 * 1000);

    if (!isAllowedSlot_(start)) {
      throw publicError_('SLOT_NOT_ALLOWED', 'Выберите слот из списка доступного времени.');
    }
    if (!isSlotFree_(calendar, start, end)) {
      throw publicError_('SLOT_TAKEN', 'Этот слот уже занят.');
    }

    const title = `Звонок: ${payload.name}`;
    const slotLabel = formatSlot_(start);
    const description = [
      'Заявка с сайта Дианы Лукьянцевой',
      '',
      `Слот: ${slotLabel}`,
      `Имя: ${payload.name}`,
      `Контакт: ${payload.contact}`,
      payload.age ? `Возраст ребёнка: ${payload.age}` : '',
      payload.topic ? `Запрос: ${payload.topic}` : '',
      payload.selectedIssueText ? `Чек-лист: ${payload.selectedIssueText}` : '',
      payload.message ? `Что беспокоит: ${payload.message}` : '',
      payload.pageUrl ? `Страница: ${payload.pageUrl}` : '',
    ].filter(Boolean).join('\n');

    const event = calendar.createEvent(title, start, end, {
      description,
      location: 'Telegram / онлайн',
    });

    const telegramSent = sendTelegram_(payload, slotLabel, event.getId());

    return {
      ok: true,
      eventId: event.getId(),
      slotLabel,
      telegramSent,
    };
  } finally {
    lock.releaseLock();
  }
}

function getAvailableSlots_(daysAhead) {
  const calendar = getCalendar_();
  const rules = getSlotRules_();
  const durationMs = getDurationMinutes_() * 60 * 1000;
  const timeZone = getTimeZone_();
  const now = new Date();
  const slots = [];

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const weekday = day.getDay();
    const dayRules = rules[String(weekday)] || [];

    dayRules.forEach((time) => {
      const start = createDateAtTime_(day, time);
      const end = new Date(start.getTime() + durationMs);
      if (start <= now) return;
      if (!isSlotFree_(calendar, start, end)) return;

      slots.push({
        startIso: Utilities.formatDate(start, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        endIso: Utilities.formatDate(end, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        label: formatSlot_(start),
      });
    });
  }

  return slots.slice(0, 24);
}

function isAllowedSlot_(start) {
  return getAvailableSlots_(DEFAULT_DAYS_AHEAD + 1).some((slot) => {
    return Math.abs(new Date(slot.startIso).getTime() - start.getTime()) < 60 * 1000;
  });
}

function isSlotFree_(calendar, start, end) {
  return calendar.getEvents(start, end).length === 0;
}

function sendTelegram_(payload, slotLabel, eventId) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return false;

  const text = [
    '<b>Новая запись на бесплатный звонок</b>',
    '',
    `<b>Слот:</b> ${escapeHtml_(slotLabel)}`,
    `<b>Имя:</b> ${escapeHtml_(payload.name)}`,
    `<b>Контакт:</b> ${escapeHtml_(payload.contact)}`,
    payload.age ? `<b>Возраст ребёнка:</b> ${escapeHtml_(payload.age)}` : '',
    payload.topic ? `<b>Запрос:</b> ${escapeHtml_(payload.topic)}` : '',
    payload.selectedIssueText ? `<b>Чек-лист:</b> ${escapeHtml_(payload.selectedIssueText)}` : '',
    payload.message ? `<b>Что беспокоит:</b> ${escapeHtml_(payload.message)}` : '',
    eventId ? `<b>Google Calendar event:</b> ${escapeHtml_(eventId)}` : '',
  ].filter(Boolean).join('\n');

  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  return response.getResponseCode() >= 200 && response.getResponseCode() < 300;
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw publicError_('BAD_REQUEST', 'Пустая заявка.');
  }
  ['name', 'contact', 'slotStart'].forEach((field) => {
    if (!String(payload[field] || '').trim()) {
      throw publicError_('BAD_REQUEST', `Не заполнено поле ${field}.`);
    }
  });

  const start = new Date(payload.slotStart);
  if (Number.isNaN(start.getTime())) {
    throw publicError_('BAD_REQUEST', 'Некорректный слот.');
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw publicError_('BAD_REQUEST', 'Пустой POST-запрос.');
  }
  return JSON.parse(e.postData.contents);
}

function getCalendar_() {
  const props = PropertiesService.getScriptProperties();
  const calendarId = props.getProperty('CALENDAR_ID');
  if (calendarId) {
    const configuredCalendar = CalendarApp.getCalendarById(calendarId);
    if (!configuredCalendar) {
      throw publicError_('CALENDAR_NOT_FOUND', 'Заданный календарь недоступен аккаунту Apps Script.');
    }
    return configuredCalendar;
  }

  const defaultCalendar = CalendarApp.getDefaultCalendar();
  if (!defaultCalendar) {
    throw publicError_('CALENDAR_NOT_FOUND', 'Основной календарь не найден.');
  }
  return defaultCalendar;
}

function getSlotRules_() {
  const raw = PropertiesService.getScriptProperties().getProperty('SLOT_RULES_JSON');
  if (!raw) return DEFAULT_SLOT_RULES;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw publicError_('BAD_SLOT_RULES', 'SLOT_RULES_JSON должен быть валидным JSON.');
  }
}

function getDurationMinutes_() {
  const value = Number(PropertiesService.getScriptProperties().getProperty('SLOT_DURATION_MINUTES') || DEFAULT_DURATION_MINUTES);
  return clampNumber_(value, 10, 180);
}

function getTimeZone_() {
  return PropertiesService.getScriptProperties().getProperty('TIME_ZONE') || DEFAULT_TIME_ZONE;
}

function createDateAtTime_(day, time) {
  const parts = String(time).split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), parts[0], parts[1] || 0, 0, 0);
}

function formatSlot_(date) {
  return Utilities.formatDate(date, getTimeZone_(), 'EEE, d MMMM, HH:mm');
}

function getConfigStatus_() {
  const props = PropertiesService.getScriptProperties();
  const calendarId = props.getProperty('CALENDAR_ID');
  const configuredCalendar = calendarId ? CalendarApp.getCalendarById(calendarId) : null;
  const defaultCalendar = CalendarApp.getDefaultCalendar();
  return {
    calendar: calendarId ? Boolean(configuredCalendar) : Boolean(defaultCalendar),
    configuredCalendarFound: Boolean(configuredCalendar),
    usingDefaultCalendar: Boolean(!calendarId && defaultCalendar),
    telegramToken: Boolean(props.getProperty('TELEGRAM_BOT_TOKEN')),
    telegramChat: Boolean(props.getProperty('TELEGRAM_CHAT_ID')),
    timeZone: getTimeZone_(),
  };
}

function assertConfigured_() {
  const props = PropertiesService.getScriptProperties();
  const missing = [];
  if (!props.getProperty('TELEGRAM_BOT_TOKEN')) missing.push('TELEGRAM_BOT_TOKEN');
  if (!props.getProperty('TELEGRAM_CHAT_ID')) missing.push('TELEGRAM_CHAT_ID');
  if (missing.length) {
    throw publicError_('CONFIG_MISSING', `Не настроены свойства: ${missing.join(', ')}.`);
  }
}

function clampNumber_(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function publicError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
