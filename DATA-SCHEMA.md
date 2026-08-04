# Data Schema — `data/solicitations.json`

All site data lives in one file. This document defines its shape. See
`SPEC.md` §7.2 for the plain-language labels these fields render under.

## 1. Top-level structure

A single wrapper object with three keys. Taxonomies are **declared**, never
derived from the records, so that filter labels, ordering, and explanatory text
are authored rather than scraped.

```json
{
  "agencies":   [ /* Agency objects, §3.1 */ ],
  "categories": [ /* Category objects, §3.2 */ ],
  "solicitations": [ /* Solicitation objects, §2 */ ]
}
```

Filter controls render in **array order**, not alphabetically. Order the arrays
deliberately.

## 2. The solicitation object

| Key | Type | Required | Notes |
|---|---|---|---|
| `solicitationNumber` | string | yes | Unique. Serves as the record ID and the `?id=` URL parameter. Format `COL-YYYY-NNNN`. |
| `title` | string | yes | Plain-language, ~90–160 chars. No leading "RFP for". |
| `summary` | string | yes | **One or two sentences**, for the list row. Plain language. |
| `description` | string | yes | Full narrative. Multiple paragraphs, separated by `\n\n`. See §4.1 for rendering. |
| `agency` | string | yes | Must equal an `agencies[].id`. |
| `category` | string | yes | Must equal a `categories[].id`. Exactly one; never an array. |
| `status` | string | yes | One of `"open"`, `"closed"`, `"awarded"`. See §5. |
| `postedDate` | string | yes | ISO 8601 date, `YYYY-MM-DD`. No time component. |
| `deadline` | string | yes | ISO 8601 datetime **with offset**. See §4.2. |
| `questionsDeadline` | string \| null | no | Same format as `deadline`. `null` or absent omits the section. |
| `estimatedValue` | string \| null | no | **Free text.** Display-only, detail page only. Never parsed, filtered, or sorted. See §4.3. |
| `contractTerm` | string \| null | no | Free text, e.g. `"3 years, with two 1-year renewals"`. |
| `eligibility` | string \| null | no | Free text, may be multi-paragraph. Omits its section when empty. |
| `preBidMeeting` | object \| null | no | See §2.1. Omits its section when null. |
| `submission` | string | yes | Free text: how and where to send a bid. |
| `attachments` | array | yes | Array of Attachment objects (§2.2). |
| `contact` | object | yes | See §2.3. Always present. |

### 2.1 `preBidMeeting`

```json
{
  "datetime": "2026-02-20T10:00:00-06:00",
  "location": "Virtual — link provided after registration",
  "required": false
}
```

| Key | Type | Required | Notes |
|---|---|---|---|
| `datetime` | string | yes | ISO 8601 with offset. |
| `location` | string | yes | Free text. Physical address or a description of the virtual meeting. |
| `required` | boolean | yes | When `true`, the rendered section must state plainly that a business that skips the meeting cannot bid. |

### 2.2 Attachment

```json
{
  "filename": "sample-rfp.pdf",
  "label": "Statement of Work",
  "format": "PDF"
}
```

| Key | Type | Required | Notes |
|---|---|---|---|
| `filename` | string | yes | Filename only, relative to `documents/`. No path, no leading slash. Must be one of the three placeholder files in `SPEC.md` §9. |
| `label` | string | yes | The link text. Describes the document in plain language. |
| `format` | string | yes | Display string, e.g. `"PDF"`. Rendered in parentheses after the label. |

**File size is deliberately not part of this schema.** Do not add it.

### 2.3 `contact`

```json
{
  "name": "Dana Whitfield",
  "title": "Contracting Officer",
  "email": "dana.whitfield@example.gov",
  "phone": "(555) 010-4412"
}
```

All four keys are required on every record. Every opportunity names a specific
person, not a general office mailbox.

Email domains must be under `example.gov` and phone numbers must use
the `555-01XX` reserved range, so nothing in the mock data can reach a real
person.

## 3. Taxonomies

### 3.1 Agency

```json
{
  "id": "health",
  "name": "Department of Health",
  "description": "Runs public health programs, clinics, and health inspections across the state. Buys medical supplies, clinic services, software, and lab equipment.",
  "website": "https://doh.example.gov"
}
```

| Key | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Lowercase kebab-case. Stable; referenced by `solicitations[].agency`. |
| `name` | string | yes | Display name. Used in the filter, the list row, and the detail page. |
| `description` | string | yes | **Two sentences: what the agency does, and what it typically buys.** This is the tooltip text on the agency filter option. The second sentence is what actually helps a newcomer. |
| `website` | string \| null | no | Absolute URL. Fictional domain under `example.gov`. |

Provide 8–12 agencies. Suggested set, ordered as they should appear:

`transportation`, `health`, `education`, `administrative-services`,
`environment`, `public-safety`, `human-services`, `natural-resources`,
`corrections`, `revenue`

### 3.2 Category

```json
{
  "id": "it",
  "name": "Information Technology",
  "description": "Computers, networks, software, cybersecurity, and technical support."
}
```

| Key | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Lowercase kebab-case. Stable; referenced by `solicitations[].category`. |
| `name` | string | yes | Display name. **Plain language, sentence case.** No commodity codes. |
| `description` | string | yes | One sentence naming concrete examples. Tooltip text on the category filter option. |

Provide exactly these ten, in this order:

| `id` | `name` |
|---|---|
| `construction` | Construction and building |
| `it` | Information technology |
| `professional-services` | Professional services |
| `vehicles-equipment` | Vehicles and equipment |
| `facilities-maintenance` | Facilities and maintenance |
| `health-medical` | Health and medical |
| `food-agriculture` | Food and agriculture |
| `training-education` | Training and education |
| `office-supplies` | Office supplies and furniture |
| `transportation-logistics` | Transportation and logistics |

## 4. Format rules

### 4.1 Long text

`description`, `eligibility`, and `submission` may contain multiple paragraphs
separated by `\n\n`. **No Markdown, no HTML.** The renderer splits on `\n\n`
and creates one `<p>` per chunk using `textContent`. Any Markdown syntax in the
data will render literally, which is a data bug.

### 4.2 Dates and times

- `postedDate` is a **date only**: `"2026-02-02"`.
- `deadline`, `questionsDeadline`, and `preBidMeeting.datetime` are **full ISO
  8601 datetimes with an explicit UTC offset**: `"2026-03-14T14:00:00-05:00"`.
  Never omit the offset; never use a bare `Z` for what is meant to be local
  time.
- The State of Columbia is in **US Central time**. Use `-06:00` for dates
  between November 2 2025 and March 8 2026, and `-05:00` for dates between
  March 8 2026 and November 1 2026. Getting this wrong shifts every displayed
  time by an hour.
- Deadlines fall on business days at plausible hours — typically 2:00 PM or
  5:00 PM Central. Never midnight.
- Formatting is done at render time via `Intl.DateTimeFormat` in `format.js`.
  Displayed output: `March 14, 2026, 2:00 PM Central time`.

**Staleness is a known and accepted limitation.** Dates are literal, so a demo
opened long after authoring will show everything as closed. Note this in
`README.md`; do not work around it with computed offsets.

### 4.3 `estimatedValue`

Free text. It is display-only and never parsed. Vary it across the mock data so
the prototype demonstrates the realistic range:

- `"$400,000 to $600,000 over 3 years"`
- `"About $85,000"`
- `"Not to exceed $1.2 million"`
- `"Depends on how much is ordered"`
- `"Not disclosed"`

When `null` or absent, the "Estimated value" row is omitted from the key-facts
box.

## 5. Status and closure

`status` is authored data; **closure is derived**. A record is treated as
closed when:

```
status === "closed" || status === "awarded" || deadline < now
```

This means an `"open"` record with a past deadline is still treated as closed
everywhere in the UI — it is hidden under the default filter and sorts after
open records. This is intentional and prevents a stale dataset from advertising
dead deadlines as live.

Status tag text, per `SPEC.md` §4.5:

| Condition | Tag |
|---|---|
| `status === "awarded"` | `Awarded` |
| closed by any other rule | `Closed` |
| open, deadline within 7 days | `Closes in N days` (or `Closes today`, `Closes tomorrow`) |
| open, deadline beyond 7 days | *(no tag)* |

## 6. Validation rules

These must hold. Nothing enforces them at runtime — no schema validator, no
build step — so they are the author's responsibility.

1. Every `solicitationNumber` is unique.
2. Every `solicitations[].agency` matches an `agencies[].id`.
3. Every `solicitations[].category` matches a `categories[].id`.
4. Every `attachments[].filename` is one of the three files in `documents/`.
5. Every `deadline` is later than its `postedDate`.
6. Every `questionsDeadline`, when present, is earlier than its `deadline`.
7. Every `preBidMeeting.datetime`, when present, is earlier than its
   `deadline`.
8. Every datetime carries the correct Central offset for its date (§4.2).
9. Every `contact.email` is under `example.gov`.
10. Every `contact.phone` is in the `555-01XX` range.

## 7. Worked example

One complete record with every optional field populated. Use this as the
reference for tone, length, and formatting of the mock data.

```json
{
  "agencies": [
    {
      "id": "health",
      "name": "Department of Health",
      "description": "Runs public health programs, clinics, and health inspections across the state. Buys medical supplies, clinic services, software, and lab equipment.",
      "website": "https://health.example.gov"
    }
  ],
  "categories": [
    {
      "id": "it",
      "name": "Information technology",
      "description": "Computers, networks, software, cybersecurity, and technical support."
    }
  ],
  "solicitations": [
    {
      "solicitationNumber": "COL-2026-0142",
      "title": "Managed network services for 14 rural health clinics",
      "summary": "The Department of Health needs a company to run and maintain the computer networks at 14 rural clinics. You would handle the equipment, the internet connections, and day-to-day troubleshooting.",
      "description": "The Department of Health operates 14 clinics in rural parts of the state. Each clinic has between 5 and 30 staff members who need reliable internet and network access to see patients, look up records, and bill for services.\n\nRight now, each clinic manages its own equipment, and service is uneven. The department wants to hire one company to take over all 14 sites and provide consistent service across them.\n\nThe work includes supplying and installing network equipment, managing internet connections at each site, monitoring the networks for problems, and responding when something breaks. The department expects a four-hour response time during business hours and next-business-day response otherwise.\n\nYou do not need to have worked with a government before. You do need to show that you have run networks at multiple locations at once.",
      "agency": "health",
      "category": "it",
      "status": "open",
      "postedDate": "2026-02-02",
      "deadline": "2026-03-14T14:00:00-05:00",
      "questionsDeadline": "2026-02-28T17:00:00-06:00",
      "estimatedValue": "$400,000 to $600,000 over 3 years",
      "contractTerm": "3 years, with two 1-year renewals the state may choose to use",
      "eligibility": "Any business may bid. You must be registered to do business in the State of Columbia before a contract is signed, but you do not need to be registered to submit a bid.\n\nYou will need to show that your company has managed networks at three or more locations at the same time, and that you carry at least $1 million in general liability insurance.",
      "preBidMeeting": {
        "datetime": "2026-02-20T10:00:00-06:00",
        "location": "Online. Register by email with the contracting officer to receive the link.",
        "required": false
      },
      "submission": "Email your complete bid to dana.whitfield@example.gov with \"COL-2026-0142\" in the subject line.\n\nYour bid must arrive by 2:00 PM Central time on March 14, 2026. The department goes by the time the email arrives on its server, not the time you sent it. Bids that arrive late are not opened.",
      "attachments": [
        {
          "filename": "sample-rfp.pdf",
          "label": "Request for Proposals",
          "format": "PDF"
        },
        {
          "filename": "sample-attachment-a.pdf",
          "label": "Attachment A: Clinic locations and current equipment",
          "format": "PDF"
        },
        {
          "filename": "sample-pricing-worksheet.pdf",
          "label": "Pricing worksheet",
          "format": "PDF"
        }
      ],
      "contact": {
        "name": "Dana Whitfield",
        "title": "Contracting Officer",
        "email": "dana.whitfield@example.gov",
        "phone": "(555) 010-4412"
      }
    }
  ]
}
```

## 8. Mock data guidance

Record count is deliberately unspecified — decide it when the data is
generated. Whatever the count, the set must include:

- At least one record per category, so every filter option returns something.
- Records spread across most agencies.
- A mix of statuses: mostly `open`, several `closed`, at least one `awarded`.
- At least two records closing within 7 days of the authoring date, so the
  urgency tag is visible.
- At least one record with **no** `questionsDeadline`, one with no
  `preBidMeeting`, one with no `eligibility`, and one with an empty
  `attachments` array — so the omit-empty-sections behavior is exercised.
- Variety in `estimatedValue` phrasing, per §4.3.
- Contract sizes ranging from a few thousand dollars to several million, so
  the prototype does not read as only serving large firms.

Write the mock data in the voice described in `SPEC.md` §7.4. The mock data is
part of the deliverable's argument: it is where the plain-language claim is
either demonstrated or lost.
