# Booking system

## Decision

The site is hosted as static files, so Google and Telegram secrets must not live in the browser. The booking flow uses:

- Static frontend in `index.html`, `styles.css`, `script.js`.
- Public config in `booking-config.js` with only the Apps Script Web App URL.
- Google Apps Script backend in `booking-backend/`.
- Google Calendar as the source of truth for busy slots.
- Telegram Bot API notification after a successful booking.

Alternatives considered:

- Calendly / TidyCal / Cal.com widgets: fast to launch, but less control over the site flow and Telegram notification path.
- Custom Node.js / Cloudflare Worker backend with Google Calendar API: more scalable, but requires separate hosting, OAuth/service-account setup, and secret management.
- Google Apps Script: best fit for a static GitHub Pages site because it can safely access Google Calendar, store script properties, and call Telegram without exposing secrets.

Official docs used:

- Google Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- Apps Script ContentService: https://developers.google.com/apps-script/guides/content
- Apps Script Calendar service: https://developers.google.com/apps-script/reference/calendar
- Apps Script Lock service: https://developers.google.com/apps-script/reference/lock
- Apps Script Properties service: https://developers.google.com/apps-script/reference/properties
- Apps Script UrlFetch service: https://developers.google.com/apps-script/reference/url-fetch
- Telegram Bot API: https://core.telegram.org/bots/api

## Flow

1. The parent fills contact fields and selects a day and time. Busy times stay visible but disabled.
2. Frontend sends a booking request to Apps Script.
3. Apps Script checks the Google Calendar again under a script lock.
4. If the slot is still free, Apps Script creates a calendar event.
5. Apps Script sends booking details to Telegram.
6. Frontend shows success and reloads slot availability.

The server re-check is required: the browser must never be trusted as the source of availability.

## Setup

1. Create a standalone Google Apps Script project.
2. Copy `booking-backend/Code.gs` and `booking-backend/appsscript.json` into that project.
3. Set the Apps Script project time zone to `Asia/Tbilisi`.
4. Open `Project Settings -> Script properties` and add:

```text
TELEGRAM_BOT_TOKEN=123456:bot-token-from-BotFather
TELEGRAM_CHAT_ID=123456789
TIME_ZONE=Asia/Tbilisi
SLOT_DURATION_MINUTES=15
```

Optional:

```text
CALENDAR_ID=your-calendar-id@group.calendar.google.com
SLOT_RULES_JSON={"1":["10:00","12:30","15:00","18:00"],"2":["10:00","12:30","15:00","18:00"],"3":["10:00","12:30","15:00","18:00"],"4":["10:00","12:30","15:00","18:00"],"5":["10:00","12:30","15:00","18:00"],"6":["11:00","13:00"]}
```

If `CALENDAR_ID` is omitted, the script uses the default calendar of the Google account that deploys the Web App.

5. Optional authorization check before deployment:

In Apps Script, select `doGet` in the function dropdown and click `Run`. Google will ask for Calendar and external request permissions. A manual `Run` does not include real web request parameters, so the health response is only useful for authorization.

6. Deploy as `Web app`:

```text
Execute as: Me
Who has access: Anyone
```

7. Copy the deployed `/exec` URL and put it into `booking-config.js`:

```js
window.BOOKING_API_URL = 'https://script.google.com/macros/s/.../exec';
```

8. Commit and push `booking-config.js` to `main`.

## Quick tests

Health:

```text
https://script.google.com/macros/s/.../exec
```

Slots:

```text
https://script.google.com/macros/s/.../exec?action=slots&days=7
```

Expected response:

```json
{
  "ok": true,
  "slots": [
    {
      "startIso": "2026-06-22T10:00:00+04:00",
      "endIso": "2026-06-22T10:15:00+04:00",
      "dateKey": "2026-06-22",
      "time": "10:00",
      "label": "Mon, 22 June, 10:00",
      "available": true
    }
  ]
}
```

If Telegram is not configured, booking requests return `CONFIG_MISSING`. If another event appears in the selected interval before submission, the backend returns `SLOT_TAKEN`.
