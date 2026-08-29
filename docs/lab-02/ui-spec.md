# Lab 2 Zen Green UI Specification

## 1. Design Intent and Tokens

TokTickIT Lab 2 uses a calm, professional, task-focused Zen Green design. The interface should remain visually consistent across Development Requester Selection, Create Ticket, My Tickets, and Requester Ticket Detail, while making editable, read-only, validation, loading, success, warning, and failure states easy to distinguish.

| Token | Value | Intended use |
|---|---|---|
| `--color-primary` | `#006B3C` | Application header, primary actions, and strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tabs/navigation, focus accents, links, and hover states |
| `--color-pale-green` | `#EAF6EF` | Selected states, success backgrounds, and subtle section emphasis |
| `--color-page` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, forms, tables, and confirmation surfaces |
| `--color-text` | `#17352A` | Main dark charcoal-green text |
| `--color-muted` | `#52665D` | Secondary/supporting text |
| `--color-border` | `#CBD8D1` | Neutral editable-field borders and dividers |
| `--color-readonly-bg` | `#F0F3EF` | Read-only field/background treatment |
| `--color-readonly-border` | `#B9C6BF` | Read-only field boundary |
| `--color-error` | `#8B1E1E` | Error text, invalid borders, and error icons |
| `--color-error-bg` | `#FCECEC` | Error callouts |
| `--color-warning` | `#8A5500` | Warning/partial-success text and icons |
| `--color-warning-bg` | `#FFF4D6` | Warning/partial-success callouts |
| `--focus-ring` | `0 0 0 3px rgba(0, 107, 60, .28)` | Visible keyboard focus |
| `--surface-shadow` | `0 2px 10px rgba(23, 53, 42, .08)` | Restrained card elevation |

Error, warning, success, priority, status, and removal meaning must always include readable text and/or an understandable icon. Color is supplementary rather than the only state indicator.

---

## 2. Typography and Spacing

- Use the existing Bootstrap/system font stack rather than adding a new font dependency.
- Base text is approximately `16px` with comfortable line height.
- Page titles are approximately `28–32px`.
- Section titles are approximately `20–24px`.
- Supporting text should remain comfortably readable and should not be reduced merely to fit a layout.
- Use a consistent spacing scale based on `4, 8, 12, 16, 24, 32, 48px`.
- Labels appear above controls with consistent font weight and spacing.
- Related controls use approximately `16px` spacing.
- Major sections use approximately `24–32px` spacing.
- Main content is centered with a sensible maximum width near `1200px`.
- Summary, Description, validation messages, and Attachment filenames must wrap rather than force horizontal page scrolling.

---

## 3. Application Shell and Navigation

The application shell provides:

- TokTickIT application identity;
- My Tickets navigation;
- Create Ticket navigation;
- the currently selected Development Requester;
- a Change Requester action;
- a clear active-page indication; and
- responsive mobile navigation.

The selected Development Requester must be visibly presented as a Lab 2 testing context rather than authenticated identity.

Active navigation uses text and/or icon treatment plus a visual selected state. Where applicable, use `aria-current="page"`.

If no valid Development Requester is selected, Requester-scoped screens must not display requester-owned data and the user is returned to Development Requester Selection.

Ticket Detail is contextual and does not require a third persistent primary navigation item.

---

## 4. Development Requester Selection

The screen contains:

- TokTickIT title/identity;
- heading: `Select a Development Requester`;
- explanation that this selector is for Lab 2 testing only and is not login/authentication;
- Development Requester dropdown;
- active Requesters loaded from PostgreSQL through the API;
- Continue button;
- loading state;
- no-active-Requester empty state;
- safe API-failure state with Retry; and
- keyboard-accessible form controls.

Each Requester option displays enough information to distinguish the seeded identity, using name and email.

Continue is the primary action and remains unavailable until a valid Requester is selected.

After Continue:

- persist only the selected Requester integer ID in browser-tab `sessionStorage`;
- establish the Development Requester context; and
- enter the requester-facing application.

If a persisted Requester ID is missing, malformed, unknown, or inactive, clear that invalid value before showing requester-owned data and return to this selection screen.

Changing Requester:

- persists the newly selected Requester ID;
- clears requester-specific form/query/pagination/detail/file/validation/success/failure state; and
- reloads requester-specific data for the new context.

No password, role, session-authentication, or secure-login language appears on this screen.

---

## 5. Controls and Feedback

### 5.1 Field States

**Editable**

- white background;
- clear neutral border;
- persistent visible label.

**Read-only**

- visually distinct soft gray-green or warm-ivory style;
- normal readable text;
- no appearance that suggests the user can edit it.

**Invalid**

- dark-red border and/or icon;
- field-level validation text directly below or beside the associated field;
- `aria-invalid="true"` where appropriate;
- validation message associated programmatically with the field.

**Disabled**

- clearly distinct from enabled controls;
- cannot be activated;
- explanation is visible nearby when the reason is not obvious.

**Focused**

- visible focus ring;
- no layout shift.

Required fields show a visible red `*`. The asterisk does not replace a validation message. Accessible text must also communicate that the field is required.

Placeholder text never replaces a visible field label.

Inputs use a consistent control height. Description is taller than single-line inputs and may resize only if resizing does not break the responsive layout.

### 5.2 Button Hierarchy

| Type/state | Presentation and use |
|---|---|
| Primary | Solid primary green; dominant action such as Create Ticket or Continue |
| Secondary | White surface with primary-green border/text; alternative action such as Cancel or Retry |
| Tertiary | Text/link-style action for secondary navigation or lightweight operations |
| Destructive | Dark-red text/border or pale error treatment; used for Remove Attachment confirmation |
| Disabled | Native/non-interactive disabled state, visually distinct |
| Busy | Retains width, shows spinner plus visible action text such as `Creating ticket...`, and cannot be activated again |

Buttons must contain visible text for actions whose meaning would otherwise be unclear. Icons may support text but must not replace unclear action wording.

Every icon-only control must have both:

- an accessible label; and
- a tooltip.

### 5.3 Validation and Submission Feedback

- Validation messages appear near their associated field.
- On submission with multiple invalid fields, focus moves to the first invalid field.
- The Submit button shows a visible busy state and is disabled while the Ticket create request is processing.
- Recoverable validation/API failure retains user-editable values as required by `specification.md`.
- Successful creation clearly displays the official backend-generated Ticket Number and a next action.

### 5.4 Attachment Removal Confirmation

Selecting Remove on an active Attachment expands a clear confirmation interaction for that Attachment.

The confirmation shows:

- Attachment original filename;
- required Removal Reason field;
- Cancel action; and
- clearly labeled `Remove attachment` destructive action.

Removal Reason follows the approved `3–200` trimmed-character rule.

The confirmation must be keyboard operable, must not hide the consequence of removal, and must make clear that removed metadata remains visible while download becomes unavailable.

---

## 6. Create Ticket

### 6.1 Required Information and Editability

| Field | Before creation | After successful creation / detail |
|---|---|---|
| Ticket Number | Read-only `Generated after creation` | Official backend value, read-only |
| Ticket Date | Read-only `Set after creation` | Human-readable `createdAt`, read-only |
| Requester | Selected Development Requester, read-only | Read-only |
| Category | Required active select | Read-only on created Ticket |
| Related System | Required active select | Read-only on created Ticket |
| Ticket Summary | Required editable text, `5–120` trimmed chars | Read-only |
| Requested Priority | Required select: `LOW`, `MEDIUM`, `HIGH` | Read-only |
| Description | Required editable textarea, `10–2000` trimmed chars | Read-only |
| Attachments | Optional file selection | Upload state/actions |

### 6.2 Layout

**Desktop (`>= 992px`)**

- compact compatible fields may use two columns;
- Ticket Number/Ticket Date/Requester are grouped as Ticket identity/context;
- Summary and Description span sufficient width;
- Attachments have a separate clearly labeled section;
- primary and secondary actions appear at the bottom.

**Tablet (`768–991px`)**

- two columns only where practical;
- Summary, Description, and Attachment area receive full or sufficient width.

**Mobile (`< 768px`)**

- fields stack vertically in logical order;
- actions remain touch-friendly;
- no horizontal page scrolling.

### 6.3 Reference Data

Category and Related System values are loaded from the backend/database.

While reference data is loading:

- controls communicate Loading;
- Ticket submission is unavailable;
- already entered editable text is not cleared.

If either required active list is empty:

- the affected control is unavailable;
- visible text explains that Ticket creation is currently unavailable;
- Ticket submission is blocked; and
- already entered editable values remain.

If either reference-data request fails:

- show a safe failure message for the failed Category or Related System request;
- provide Retry for the failed resource;
- preserve any successfully loaded reference list and all entered editable values; and
- keep Ticket submission blocked until both required lists are available.

### 6.4 Attachment Selection

The file-selection area states:

- allowed types: JPG/JPEG, PNG, WEBP, PDF;
- maximum `5 MB` per file as stated by Lab 2, interpreted by the team as `5 MiB (5,242,880 bytes)` for implementation/testing; and
- maximum five active Attachments per Ticket.

Selected files show:

- original filename;
- readable file size/type;
- `Selected` state; and
- Remove-from-selection action.

Client-side validation may reject obviously invalid files before upload, but backend validation remains authoritative.

Invalid file feedback appears next to the file and does not remove otherwise valid selected files.

### 6.5 Create Ticket States

**Initial**

- selected Requester visible;
- system fields shown as pending/read-only;
- editable fields ready;
- reference data available or loading.

**Loading**

- reference data communicates loading;
- submission is unavailable until required reference data is ready.

**Validation Failure**

- field-level messages appear;
- focus moves to the first invalid field;
- no create request is sent for frontend-invalid input;
- entered values remain.

**Submitting**

- primary action reads `Creating ticket...`;
- duplicate activation is disabled;
- the same logical `clientRequestId` is retained while the logical create attempt is unresolved;
- if the outcome becomes ambiguous because the response is lost or the network fails, freeze the Ticket fields and retry only the same payload with the same `clientRequestId` until the outcome is resolved.

**Success**

- clear success message;
- official Ticket Number prominently shown;
- Current Status shown as `New`;
- next action uses `Create another Ticket` for the current Create Ticket increment; `View Ticket` and `My Tickets` become available only when their later Lab 2 increments are implemented.

**Partial Attachment Success**

If Ticket creation succeeds but one or more post-create Attachment uploads fail:

- the Ticket remains successful;
- official Ticket Number stays visible;
- successful files remain uploaded;
- failed filenames are shown safely;
- eligible local files may be manually retried while still mounted;
- after navigation, retry requires the user to reselect the local file.

After an ambiguous/lost Attachment-upload response, reload Attachment metadata before offering another manual retry. Do not automatically repeat the upload.

**Ticket Creation Failure**

- show safe failure text;
- retain editable Ticket values and eligible selected files while mounted;
- offer Retry where appropriate;
- do not create a new logical request ID merely because the outcome was uncertain;
- while an ambiguous create outcome is unresolved, keep the Ticket fields frozen and retry only the same payload with the same `clientRequestId`;
- after a definitive failure known to have created no Ticket, unchanged data may retry with the same ID, but editing Ticket data starts a new logical submission and generates a new UUID.

---

## 7. My Tickets

### 7.1 Query Controls

My Tickets includes:

- search for Ticket Number or Summary;
- Category filter;
- Requested Priority filter;
- Current Status filter;
- sort field;
- sort direction;
- page-size selector;
- pagination controls;
- Clear search/filters action; and
- Create Ticket action.

Search is submitted using the Search action or Enter key.

Changing search, filter, sort, or page size resets the client to page `1`.

Clear resets search/filter/sort/pagination controls to documented defaults.

Pagination shows:

- current page;
- total pages/items where available;
- Previous;
- Next; and
- page size choices `10`, `20`, `50`.

Boundary controls use native disabled semantics.

### 7.2 Desktop Table

Desktop columns, in order:

1. Ticket Number
2. Created
3. Summary
4. Category
5. Requested Priority
6. Current Status
7. Last Updated

Ticket Number or a visible View action opens Ticket Detail.

Summary may wrap and must not force page-level horizontal scrolling.

### 7.3 Mobile Representation

Below `768px`, My Tickets uses readable ticket cards.

Each card contains:

- Ticket Number;
- Summary;
- Created;
- Category;
- Requested Priority;
- Current Status;
- Last Updated; and
- one clear `View ticket` action.

### 7.4 Badges

Requested Priority badges display:

- Low;
- Medium;
- High.

Current Status displays:

- New.

Badge text remains visible. Priority/status meaning does not rely on color alone.

High priority does not use ordinary error styling because priority is not an error state.

### 7.5 List States

**Loading**

- query controls remain visible;
- result region communicates loading;
- stale rows are not presented as current results.

**Empty**

- the selected Requester owns zero Tickets with no search/filter restrictions;
- message clearly states `No tickets yet`;
- Create Ticket action is available.

**No Results**

- the selected Requester owns Tickets but the current search/filter combination matches none;
- message explains that current restrictions found no Tickets;
- Clear search/filters action is available.

When a restricted query returns zero items, issue one additional unrestricted request under the same Requester context: `GET /api/tickets?page=1&pageSize=10`.

- unrestricted `totalItems > 0` => No Results;
- unrestricted `totalItems = 0` => Empty.

**Out-of-range Page Recovery**

If the API returns:

- `totalItems > 0`; and
- requested page greater than `totalPages`;

the UI requests the last valid page once and shows Loading during recovery.

**Failure**

- display safe error text;
- offer Retry using the current documented query state;
- do not display stale rows as though they are current.

---

## 8. Requester Ticket Detail and Attachments

### 8.1 Ticket Detail

The screen contains:

- Back to My Tickets action;
- official Ticket Number;
- Current Status `New`;
- Created/Ticket Date;
- Last Updated;
- Requester;
- Category;
- Related System;
- Ticket Summary;
- Requested Priority;
- Description; and
- Attachments section.

Ticket information is read-only and visually distinct from Attachment actions.

Description preserves readable line breaks/wrapping.

Do not render:

- Public Comments;
- Internal Notes;
- Actions Taken;
- IT Staff controls;
- Ticket assignment/reassignment;
- IT Priority editing; or
- Ticket status-change controls.

### 8.2 Ticket Detail States

**Loading**

- read-only detail region communicates loading.

**Unavailable**

- used for missing/non-disclosable cross-Requester Ticket access;
- text does not speculate whether another Requester owns the Ticket.

**Failure**

- safe error message;
- Retry/reload action where appropriate.

### 8.3 Attachment Upload on Ticket Detail

Ticket Detail allows the selected Development Requester to add Attachments to the existing owned Ticket.

- provide a file chooser and explicit Upload action;
- apply the same type, size, validation, and safe-failure rules as Create Ticket;
- show Selected and Uploading states and prevent duplicate upload activation while busy;
- when five active Attachments exist, disable new upload selection/action and explain the active limit;
- after a successful soft removal reduces the active count below five, enable upload again;
- after successful upload or removal, refresh Attachment metadata and parent Ticket data so Attachment state and Last Updated reflect the server result.

### 8.4 Attachment States

| State | Required presentation/actions |
|---|---|
| Selected | Original filename, type/size, `Selected`, remove-from-selection |
| Uploading | Spinner/status text; duplicate upload action unavailable |
| Active | Original filename, type, size, uploaded time, `Active`, Download, Remove |
| Invalid | Error icon/text and safe correction guidance; no upload until corrected |
| Removed | `Removed`, removed time, removal reason, retained metadata; no Download/preview/remove action |
| Unavailable | Safe unavailable text; no internal path/storage detail |

Attachment filenames must wrap safely and remain readable at all supported widths.

Download actions include enough accessible text to identify the file.

Removed Attachment metadata remains visible exactly as defined by the API/specification contract.

---

## 9. Responsive Rules

| Viewport | Required behavior |
|---|---|
| Desktop `>= 992px` | Centered sensible max-width layout; multi-column Create/Detail; My Tickets table |
| Tablet `768–991px` | Two columns where practical; Summary/Description/Attachments preserve sufficient width; filters wrap cleanly |
| Mobile `< 768px` | Single-column forms; My Tickets cards; touch-friendly actions; filenames wrap; no horizontal page scrolling |

At every supported width:

- no clipped labels;
- no overlapping validation/messages;
- no hidden required buttons/actions;
- no unreadable Attachment names;
- no unintended horizontal page scrolling; and
- filters, pagination, Attachment controls, empty states, and navigation remain usable.

---

## 10. Accessibility Rules

- Every form control has a programmatic name and visible label where appropriate.
- Required/invalid/help text is associated with its field.
- Keyboard order follows logical visual/document order.
- Focus indicators remain visible.
- Validation submission moves focus to the first invalid field.
- Icon-only controls require both an accessible label and tooltip.
- Buttons include visible text when icons alone would be unclear.
- Disabled controls cannot be activated and remain visually distinguishable.
- Busy/loading regions communicate their state using accessible status text and/or appropriate busy semantics.
- Success, warning, error, priority, Current Status, Active, and Removed meanings include text or an understandable icon and never rely on color alone.

---

## 11. Visual Inspection Checklist and Evidence Paths

The finished implementation must be compared against this file and the approved Lab 2 visual direction rather than personal memory.

Visual review confirms:

- [x] Zen Green tokens and intended uses are consistent.
- [x] Editable and read-only fields are clearly distinguishable.
- [x] Required markers and field-level validation are placed consistently.
- [x] Primary, secondary, tertiary, destructive, disabled, and busy button styles are consistent.
- [x] Development Requester identity and active navigation remain clear.
- [x] Create Ticket Initial, Validation, Submitting, Success, Failure, and invalid-Attachment states are understandable.
- [x] My Tickets Loading, Empty, No Results, and Failure states are distinct.
- [x] Desktop My Tickets uses the approved table structure.
- [x] Mobile My Tickets uses the approved card structure.
- [x] Requested Priority and Current Status badges are consistent.
- [x] Ticket Detail remains read-only and visually separates Attachment actions.
- [x] Active, Uploading, Invalid, Removed, and Unavailable Attachment states are visually distinct.
- [x] No clipped labels, overlapping messages, hidden required buttons, unreadable filenames, or unintended horizontal overflow exist.
- [x] Filters, pagination, Attachment controls, and empty states remain usable at desktop, tablet, and mobile widths.
- [x] No excluded authentication, IT Staff, Public Comment, Internal Note, Actions Taken, assignment, IT Priority edit, or later status-workflow UI appears.

Required implementation evidence is stored under the course repository artifact structure:

```text
artifacts/lab-02/screenshots/
├── requester-selection/
│   └── requester-selection-desktop.png
├── create-ticket/
│   ├── create-ticket-desktop.png
│   ├── create-ticket-validation-mobile.png
│   └── create-ticket-partial-failure-tablet.png
├── my-tickets/
│   ├── my-tickets-desktop.png
│   ├── my-tickets-empty-desktop.png
│   └── my-tickets-no-results-mobile.png
└── ticket-detail/
    ├── ticket-detail-desktop.png
    └── ticket-detail-removed-attachment-mobile.png
```

Playwright must capture successful evidence at representative desktop, tablet, and mobile viewport sizes. The planned Test DD viewports are:

- Desktop: `1440×900`
- Tablet: `834×1112`
- Mobile: `390×844`

Screenshots are implementation evidence and must not be marked complete until the corresponding implemented screen has actually been tested and inspected.
