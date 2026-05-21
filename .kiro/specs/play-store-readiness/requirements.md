# Requirements Document

## Introduction

This spec covers the refactor of the existing single-screen "FlexOps / Apex Invoice Portal" web app (React 19 + TypeScript + Vite + Capacitor 8 + Firebase) into a Google Play Store launch-ready Android application.

The work is organized into three primary tracks plus a set of cross-cutting v1 must-haves:

- **Track 1**: Data lifecycle, input validation, and clean state initialization (no demo seed data).
- **Track 2**: Native client-side PDF compiler engine (jsPDF + jspdf-autotable, fully offline, vector text).
- **Track 3**: Play Store compliance and native Android capabilities (functional sidebar, native share intent, in-app legal pages, account deletion).
- **v1 Must-Haves**: Logo/branding, invoice status (Paid/Sent/Overdue), multi-currency, configurable tax rates, error boundaries.

Items explicitly out of scope for v1 are listed at the end of this document and are not requirements.

> **Decision (resolved during requirements review):** Option A confirmed. Archive_View, Reports_View, and Support_View will all be built for v1.

## Glossary

- **FlexOps_App**: The Capacitor-wrapped React application as a whole; the on-device product the user installs from Play Store.
- **Validator**: The pure-function module responsible for sanitizing and validating all user input.
- **Storage_Manager**: The module that abstracts persistent local storage (currently `localStorage`) for app state, providing serialize/deserialize and write-on-mutation semantics.
- **State_Store**: The reactive in-memory state container (React state/context) that holds clients, invoices, settings, and tasks.
- **Demo_Data_Detector**: The module that recognizes the legacy seeded demo entities ("Aether Design Labs", "Helios Launchpad", "Stellar Flow") in stored state.
- **Migration_Manager**: The module that runs versioned, idempotent migrations against persisted state on app launch.
- **Onboarding_View**: The first-launch UI shown when no real user data exists.
- **Empty_State_View**: The placeholder UI rendered in primary panels when no entities exist.
- **PDF_Generator**: The local engine that compiles an invoice domain object into a PDF document using jsPDF + jspdf-autotable, returning either a data URI or a Blob.
- **Pretty_Printer**: The deterministic layout function inside PDF_Generator that places header, client metadata, line-items table, totals, and remittance footnotes onto a Letter-format page.
- **Share_Service**: The Capacitor-backed module that writes a PDF Blob to a temporary file and invokes the native Android share sheet.
- **Currency_Formatter**: The pure-function module that formats and parses monetary amounts for the supported currencies (USD, INR, EUR, GBP).
- **Tax_Calculator**: The pure-function module that computes tax line items from a configurable percentage and a subtotal.
- **Privacy_Policy_View**: The in-app screen rendering the privacy policy content.
- **Terms_View**: The in-app screen rendering the terms of service content.
- **Account_Deletion_Service**: The module that performs the user-initiated account-and-data deletion workflow.
- **Archive_View**: The in-app screen listing completed/archived clients and invoices (Track 3, Option A).
- **Reports_View**: The in-app screen showing simple revenue and outstanding totals (Track 3, Option A).
- **Support_View**: The in-app screen offering help content and a contact email/link (Track 3, Option A).
- **Error_Boundary**: A React error boundary component that catches render-time exceptions and renders a fallback UI instead of crashing the WebView.
- **Invoice**: The domain object describing a single invoice (number, dates, client ref, line items, tax %, currency, status, remittance snapshot).
- **Line_Item**: A row inside an invoice (description, quantity, rate, amount).
- **Demo_Seed_Set**: The exact set of legacy seeded entities — clients named "Aether Design Labs", "Helios Launchpad", and "Stellar Flow", and any line items copied verbatim from the original hardcoded sample.

## Requirements

---

## Track 1: Data Lifecycle, Validation, and State Initialization

### Requirement 1: Input Validation Schema

**User Story:** As a freelancer entering client and invoice data, I want every field to be validated and sanitized, so that I cannot save invalid, malformed, or oversized data that would corrupt my records or produce a broken PDF.

#### Acceptance Criteria

1. THE Validator SHALL expose a single typed schema (or set of typed functional helpers) that covers brand name, project title, client email, address, phone, invoice number, line-item description, quantity, rate, tax percentage, currency code, and bank/remittance fields.
2. WHEN a brand name or project title is submitted, THE Validator SHALL reject values whose trimmed length is 0 or greater than 80 characters.
3. WHEN an amount or rate is submitted, THE Validator SHALL accept only finite numbers in the inclusive range `[0.01, 9_999_999.99]` with at most two decimal places, and SHALL reject `NaN`, `Infinity`, negative values, values with more than two decimal places, and non-numeric strings.
4. WHEN an invoice number is submitted, THE Validator SHALL accept only strings matching the regex `^[A-Za-z0-9-]{1,24}$`.
5. WHEN a currency code is submitted, THE Validator SHALL accept only codes from the supported set defined in Requirement 14.
6. WHEN an email address is submitted, THE Validator SHALL accept only values that match the regex `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` AND have total length in the inclusive range `[3, 254]` characters.
7. THE Validator SHALL enforce a maximum length of 500 characters on any free-text field (description, address, support message body) and SHALL reject values whose trimmed length is 0 or greater than 500 characters.
8. IF any validation rule fails, THEN THE Validator SHALL return a structured error object containing `field` (string), `code` (machine-readable enum), and `message` (human-readable, ≤ 200 characters); the FlexOps_App SHALL render that message inline next to the field within 200 ms of submission AND SHALL NOT persist any part of the rejected input to Storage_Manager.
9. WHERE a string field accepts user input, THE Validator SHALL strip leading and trailing whitespace and SHALL collapse internal control characters (ASCII < 0x20 except `\n` and `\t`) before length checks are applied.
10. WHEN a quantity is submitted, THE Validator SHALL accept only integers in the inclusive range `[1, 9999]`. WHEN a tax percentage is submitted, THE Validator SHALL accept only finite numbers in the inclusive range `[0, 100]` with at most two decimal places.
11. WHEN a phone number is submitted, THE Validator SHALL accept only strings matching the regex `^\+?[0-9 ()-]{7,20}$`.
12. IF a single submission produces multiple validation errors, THEN THE Validator SHALL return all errors in a single structured array (one entry per failing field), and THE FlexOps_App SHALL render every error inline next to its corresponding field.

#### Correctness Properties

- **Invariant**: For any input `x`, if `validate(x).ok === true`, then the returned `value` satisfies the schema (length, range, format) by construction.
- **Idempotence**: `sanitize(sanitize(x)) === sanitize(x)` for every field.
- **Round-trip**: For every accepted value `v`, `validate(sanitize(v)).value === sanitize(v)`.

---

### Requirement 2: First-Launch Empty State and Onboarding

**User Story:** As a brand-new user opening the app for the first time, I want to see a polished empty state that guides me into setting up my own brand and first client, so that the app does not look pre-populated with fake company data.

#### Acceptance Criteria

1. WHEN the FlexOps_App completes a cold start AND the Storage_Manager reports no persisted user-created clients and no persisted user-created invoices, THE FlexOps_App SHALL render the Onboarding_View instead of the main workspace within 2 seconds of readiness.
2. THE Onboarding_View SHALL prompt for the user's brand name (1–80 chars), contact email (Validator-accepted per Requirement 1), and default currency (one of the supported ISO 4217 codes from Requirement 14) before allowing entry to the main workspace.
3. WHEN a primary panel (clients list, invoices list, archive, reports) is empty after onboarding completes, THE FlexOps_App SHALL render the Empty_State_View for that panel with a visible, enabled, action-labeled button (e.g., "Create your first client") that navigates to the corresponding creation flow.
4. THE FlexOps_App SHALL NOT, on any code path, write any element of the Demo_Seed_Set into Storage_Manager or State_Store.
5. WHILE the Onboarding_View is shown, THE FlexOps_App SHALL block navigation to invoice creation until the required onboarding fields pass Validator checks (Requirement 1).
6. IF the user submits the Onboarding_View with one or more invalid fields, THEN THE FlexOps_App SHALL render inline error messages per Requirement 1 criterion 8 AND SHALL NOT persist any part of the submitted input AND SHALL keep the user on the Onboarding_View.

---

### Requirement 3: Demo Data Migration for Existing Users

**User Story:** As an existing user whose installed app already contains the legacy demo seed data, I want the app to detect that data and offer to clear it on next launch, so that I do not have fake clients polluting my real records.

#### Acceptance Criteria

1. WHEN the FlexOps_App starts AND the Demo_Data_Detector finds at least one entity matching the Demo_Seed_Set by stable identifier (entity type + brand name) in persisted state AND no migration-decision flag is recorded, THE FlexOps_App SHALL show a one-time modal within 3 seconds offering "Clear demo data" and "Keep for now".
2. WHEN the user selects "Clear demo data", THE Migration_Manager SHALL delete every entity in the Demo_Seed_Set from Storage_Manager AND SHALL record a migration-decision flag value `cleared`.
3. WHEN the user selects "Keep for now", THE Migration_Manager SHALL record a migration-decision flag value `deferred` AND SHALL NOT show the modal again on subsequent launches.
4. WHEN the user dismisses the modal without making a selection (e.g., taps outside, presses back), THE FlexOps_App SHALL treat the dismissal as `deferred` and SHALL record the flag accordingly.
5. THE Migration_Manager SHALL be idempotent: invoking the demo-cleanup migration two or more times in succession SHALL produce the same persisted state as invoking it once.
6. IF persisted state contains a mix of demo entities and real user-created entities, THEN THE Migration_Manager SHALL only delete the demo entities AND SHALL preserve every user-created entity's identifier, content, and relationships unchanged.
7. WHILE cleanup is in progress, THE FlexOps_App SHALL display a non-dismissible progress indicator AND SHALL reject any concurrent write to Storage_Manager.
8. IF cleanup fails partway (storage error, partial delete), THEN THE Migration_Manager SHALL NOT record the migration-decision flag, SHALL surface a non-blocking error toast, and SHALL retry the prompt on the next launch.

#### Correctness Properties

- **Idempotence**: `migrate(migrate(state)) === migrate(state)`.
- **Preservation**: For every entity `e` in `state` that is NOT in Demo_Seed_Set, `e` is present in `migrate(state)` with identical fields.
- **Removal**: For every entity `e` in `state` that IS in Demo_Seed_Set, `e` is NOT present in `migrate(state)` once the user accepted cleanup.

---

### Requirement 4: Reactive Persistence on Every Mutation

**User Story:** As a user editing an invoice, I want every change I make to be saved automatically, so that I never lose work to a refresh, app kill, or device restart.

#### Acceptance Criteria

1. WHEN any mutation to State_Store occurs (create, update, delete on clients, invoices, line items, settings, tasks), THE Storage_Manager SHALL serialize the affected slice and write it to localStorage within 100 ms of the mutation, coalescing successive mutations on the same slice within a 16 ms window into a single write.
2. WHEN the FlexOps_App starts AND persisted data exists, THE Storage_Manager SHALL load that data and hydrate State_Store within 2 seconds of the application bootstrap, before the first render of the main workspace.
3. WHEN the FlexOps_App starts AND no persisted data exists, THE Storage_Manager SHALL initialize State_Store to an empty schema-conformant default (no demo seed) before the first render.
4. IF serialization or write to localStorage fails (quota exceeded, unavailable, JSON error), THEN THE Storage_Manager SHALL surface a non-blocking error toast for at least 5 seconds offering a "Retry" action, SHALL retain the in-memory state without loss, AND SHALL NOT throw.
5. THE Storage_Manager SHALL namespace all keys under a single prefix `flexops:v{N}:` (where `{N}` is the schema version) AND SHALL include a `schemaVersion` field in each persisted slice.
6. IF the persisted schema version is older than the current code version, THEN THE Migration_Manager SHALL run the registered upgrade migrations in order AND SHALL block State_Store hydration until they complete.
7. IF a registered upgrade migration fails, THEN THE Migration_Manager SHALL preserve the original persisted slice unchanged, SHALL surface an error toast, AND SHALL halt further migrations for that slice.
8. IF persisted data is corrupted or fails JSON.parse on read, THEN THE Storage_Manager SHALL log the corruption, fall back to the schema-conformant default for that slice, AND surface a non-blocking notice; the corrupted bytes SHALL NOT be overwritten until the user takes a deliberate action that triggers a write.

#### Correctness Properties

- **Round-trip**: For every valid `state`, `deserialize(serialize(state))` is structurally equal to `state`.
- **Crash safety**: If a write begins, either the new state is fully persisted or the previous state remains intact (no half-written JSON observable on next load).

---

## Track 2: Native Client-Side PDF Compiler Engine

### Requirement 5: Replace html2pdf/html2canvas with Local jsPDF Engine

**User Story:** As a user generating an invoice PDF on a device with no internet, I want the PDF to be produced entirely on-device with selectable, searchable text, so that recipients can copy text and the app works offline.

#### Acceptance Criteria

1. THE FlexOps_App SHALL NOT list `html2pdf.js` or `html2canvas` in `package.json` dependencies, SHALL NOT import them from any source file, AND SHALL NOT include them in the production build output.
2. THE FlexOps_App SHALL bundle `jspdf` and `jspdf-autotable` locally as direct dependencies.
3. THE FlexOps_App SHALL NOT load any PDF-related library or font from a CDN at runtime; all assets required to produce a PDF SHALL be present in the bundled application.
4. WHEN the user requests an invoice PDF AND the device has no network connectivity, THE PDF_Generator SHALL produce a PDF whose fields, line items, totals, page count, and visual layout are byte-equivalent to the same input executed with network connectivity.
5. WHEN the PDF_Generator emits a PDF, every text element in the resulting document SHALL be rendered as vector text that is selectable via standard PDF viewer text-selection AND searchable via Ctrl+F substring match in Adobe Reader, Chrome PDF viewer, and Android Files preview.
6. THE PDF_Generator SHALL render text using Helvetica as the primary font, with the PDF standard 14 fonts (Times, Courier) as documented fallbacks if Helvetica metrics are unavailable in the runtime.
7. THE PDF_Generator SHALL output pages in standard US Letter format using point units (612 × 792 pt).
8. IF PDF generation fails (jsPDF error, autotable error, out-of-memory), THEN THE PDF_Generator SHALL surface a clear error message identifying the failing stage, SHALL NOT write any partial file, AND SHALL preserve the input invoice data unchanged.

---

### Requirement 6: Invoice PDF Layout

**User Story:** As a recipient of an invoice, I want a clean, professional layout with all the standard invoice elements clearly placed, so that I can read, audit, and pay it without confusion.

#### Acceptance Criteria

1. THE Pretty_Printer SHALL render a company profile header within the top 80 points of the first page, containing brand name (≤ 80 chars), postal address (≤ 200 chars across up to 3 lines), and contact email (≤ 254 chars).
2. THE Pretty_Printer SHALL render a client metadata block containing a "BILLED TO" label, the client's name (≤ 80 chars) and address (≤ 200 chars), the payment method label, the invoice issue date in ISO 8601 (YYYY-MM-DD) format, and the due date in ISO 8601 format.
3. THE Pretty_Printer SHALL render the line items as a striped autoTable with columns Description (left-aligned, ≤ 500 chars per cell, wrap), Quantity (right-aligned, integer 1–9999), Rate (right-aligned, two decimal places with currency symbol per Requirement 14), and Line Total (right-aligned, two decimal places with currency symbol).
4. THE Pretty_Printer SHALL render, below the line-items table, a totals block containing Subtotal (two decimal places), Tax with the configured percentage shown in the label (e.g., "Tax (8%)" or "Tax (7.5%)"), and Grand Total (two decimal places); all monetary values SHALL be formatted via Currency_Formatter (Requirement 14).
5. THE Pretty_Printer SHALL render a remittance footnotes block within the bottom 80 points of the final page containing bank name, account number, routing number, and SWIFT code, sourced from the user's saved bank settings.
6. THE Pretty_Printer SHALL compute the Y-coordinate of the totals block and the remittance block dynamically from the autoTable's reported `finalY` value, so that no element overlaps another or is clipped off the page for any number of line items between 1 and 50.
7. IF the line-items table would overflow a single page, THEN THE Pretty_Printer SHALL paginate the table AND SHALL render the totals and remittance blocks on the final page only.
8. WHERE the user has uploaded a logo (Requirement 13), THE Pretty_Printer SHALL render the logo in the header area within a 120 × 60 pt bounding box while preserving the source aspect ratio.
9. WHERE the user's bank settings are entirely empty, THE Pretty_Printer SHALL render the remittance block with the heading "Payment Details" and a single line "Contact issuer for payment instructions."

#### Correctness Properties

- **Text round-trip**: For every Invoice `inv`, the text extracted from `pdf(inv)` SHALL contain (substring) every Validator-accepted text field of `inv` (brand name, client name, invoice number, every line item description, formatted subtotal, formatted grand total).
- **Numeric invariant**: The Grand Total printed in the PDF SHALL equal `subtotal + tax`, where `subtotal = sum(line.qty * line.rate)` and `tax = round_to_cents(subtotal * taxPct / 100)`, computed by Tax_Calculator (Requirement 15).
- **Layout invariant**: For every Invoice with 1–50 line items, no rendered element's bounding box SHALL extend below `pageHeight - bottomMargin` or overlap any other element's bounding box on the same page.

---

### Requirement 7: PDF Output Forms

**User Story:** As a developer integrating the PDF with native sharing, I want the PDF_Generator to expose both a data URI and a Blob, so that I can pick the right form for preview, save, or share.

#### Acceptance Criteria

1. WHEN the PDF_Generator is invoked with valid input, THE PDF_Generator SHALL return a `Blob` of MIME type `application/pdf` with size in the inclusive range `(0, 25_000_000]` bytes.
2. WHEN the PDF_Generator is invoked with valid input, THE PDF_Generator SHALL also expose a function returning a base64 data URI string with prefix `data:application/pdf;base64,` whose decoded bytes are byte-equivalent to the Blob output for the same input.
3. WHEN the PDF_Generator is invoked twice with deeply-equal inputs (including the same injected clock value), THE PDF_Generator SHALL produce outputs whose byte length and byte content are equal.
4. WHERE timestamps appear in the PDF, THE PDF_Generator SHALL source them from the injected clock parameter AND SHALL NOT read from `Date.now()`, `new Date()`, or any other ambient clock.
5. IF PDF generation fails, THEN the Blob and data URI functions SHALL throw a typed error identifying the failing stage AND SHALL NOT return a partial or empty PDF; the input invoice data SHALL be preserved unchanged.

---

## Track 3: Play Store Compliance and Native Android Capabilities

### Requirement 8: Native Android Share Intent for Invoice PDFs

**User Story:** As a user on Android, I want to share an invoice PDF directly to WhatsApp, Email, Drive, or Files via the native share sheet, so that I do not have to first download then re-attach.

#### Acceptance Criteria

1. WHEN the user taps the "Share PDF" action AND the FlexOps_App is running inside a Capacitor Android container AND the PDF Blob size is in the inclusive range `[1, 25_000_000]` bytes, THE Share_Service SHALL write the PDF Blob to the Capacitor Filesystem cache directory AND SHALL invoke the native Android share sheet with that file URI within 2 seconds.
2. THE Share_Service SHALL use `@capacitor/share` and `@capacitor/filesystem` plugins for file I/O and intent invocation; no other native bridges SHALL be introduced for this requirement.
3. WHEN the FlexOps_App is running outside a Capacitor container (web preview), THE Share_Service SHALL fall back to a browser download of the same PDF Blob.
4. IF the user denies a runtime permission required for sharing, THEN THE Share_Service SHALL surface a dismissible in-app message naming the missing permission and the blocked action AND SHALL NOT crash the app.
5. THE Share_Service SHALL name the shared file using the pattern `invoice-{invoiceNumber}.pdf`, where `invoiceNumber` is sanitized per Requirement 1 criterion 4.
6. IF writing the temp PDF file fails (filesystem error, quota), THEN THE Share_Service SHALL surface an error message naming the filesystem failure AND SHALL NOT invoke the share sheet AND SHALL NOT leave a partial file behind.
7. WHEN the user cancels the share sheet without selecting a target, THE Share_Service SHALL treat the action as a no-op AND SHALL NOT show an error.
8. WHEN a share operation completes (success or cancel), THE Share_Service SHALL delete the temp PDF file from the cache directory within 60 seconds.

---

### Requirement 9: In-App Privacy Policy

**User Story:** As a Play Store reviewer (and as a user concerned about privacy), I want to find a privacy policy inside the app, so that the app meets Google's mandatory disclosure requirements.

#### Acceptance Criteria

1. THE FlexOps_App SHALL include a Privacy_Policy_View reachable from the settings menu in no more than 2 taps from the main workspace, without requiring sign-in.
2. THE Privacy_Policy_View SHALL render a structurally compliant policy template with visible section headings covering: data collected (email, profile, invoice content), purposes, third-party services used (Firebase Auth, Firestore, Storage), data retention period, user rights, contact email, and effective date.
3. THE Privacy_Policy_View SHALL render its content from in-app markup (JSX/HTML template) AND SHALL render fully when the device has no network connectivity.

---

### Requirement 10: In-App Terms of Service

**User Story:** As a Play Store reviewer, I want to find the terms of service inside the app, so that the app's legal posture is clear before install.

#### Acceptance Criteria

1. THE FlexOps_App SHALL include a Terms_View reachable from the settings menu in no more than 2 taps from the main workspace, without requiring sign-in.
2. THE Terms_View SHALL render an in-app template with visible section headings covering acceptable use, disclaimer, limitation of liability, governing-law placeholder, and effective date.
3. THE Terms_View SHALL render its content from in-app markup AND SHALL render fully when the device has no network connectivity.

---

### Requirement 11: Functional Sidebar Navigation

**User Story:** As a user clicking the existing sidebar entries, I want each link to open a real, functional screen, so that the app does not violate Google's "Minimum Functionality" policy.

#### Acceptance Criteria

1. WHEN the user opens "Client Archive" from the sidebar, THE FlexOps_App SHALL render the Archive_View within 2 seconds, scoped to the currently authenticated user (or the local-only profile in offline-bypass mode), showing all clients and invoices whose status is `Archived` or `Paid`. WHERE no entities match, THE Archive_View SHALL render an empty-state message naming the view.
2. WHEN the user opens "Financial Reports" from the sidebar, THE FlexOps_App SHALL render the Reports_View within 2 seconds showing total revenue (sum of grand totals for `Paid` invoices), total outstanding (sum for `Sent` and `Overdue`), and a count of invoices for each of the five statuses (`Draft`, `Sent`, `Paid`, `Overdue`, `Archived`), scoped to the current user.
3. WHEN the user opens "Support" from the sidebar, THE FlexOps_App SHALL render the Support_View within 2 seconds containing at least 5 FAQ entries and a how-to summary covering creating an invoice, sending an invoice, and marking an invoice as paid.
4. WHEN the user activates the contact action inside Support_View, THE FlexOps_App SHALL invoke the device email composer pre-filled with a support address and the app version. IF no email handler is available, THEN THE FlexOps_App SHALL display the support address as selectable text and a copy-to-clipboard action.
5. THE FlexOps_App SHALL NOT ship any sidebar entry whose activation produces no observable navigation, no observable view change, or only a console log.
6. WHILE Reports_View is shown, all monetary values SHALL be formatted using Currency_Formatter (Requirement 14) in the user's selected default currency.
7. IF Archive_View or Reports_View fails to load its underlying data, THEN THE view SHALL render an error state with a "Retry" action AND SHALL NOT navigate the user away from the current view.

---

### Requirement 12: Account and Data Deletion

**User Story:** As a signed-in user, I want a one-button workflow to delete my account and all my data from the app, so that my rights are honored and Google's 2023 account-deletion policy is satisfied.

#### Acceptance Criteria

1. WHILE a user is signed in, THE FlexOps_App SHALL show an "Delete account and data" action inside the settings menu, reachable in no more than 2 taps from the main workspace.
2. WHEN the user activates the delete action, THE FlexOps_App SHALL show a confirmation modal that requires the user to type the case-sensitive text "DELETE" into a text field AND tap a separate "Confirm" button before proceeding.
3. WHEN the user dismisses the confirmation modal or submits a confirmation that does not exactly match "DELETE", THE FlexOps_App SHALL cancel the workflow AND SHALL preserve all user data unchanged.
4. WHEN the user confirms deletion, THE Account_Deletion_Service SHALL execute, in order: delete the Firebase Auth user, delete every Firestore document owned by that user, delete every Storage object owned by that user, and clear the device's Storage_Manager cache for that user. The full sequence SHALL complete within 30 seconds for accounts with up to 1000 invoices.
5. WHEN deletion completes successfully, THE FlexOps_App SHALL sign the user out, return to the login screen, AND show a confirmation toast for 3–5 seconds.
6. IF any step of the deletion fails, THEN THE Account_Deletion_Service SHALL halt at that step, SHALL preserve all unprocessed data sources unchanged, SHALL NOT mark the account as deleted, AND SHALL show an error message naming the failing step (auth / firestore / storage / local cache).
7. WHILE the FlexOps_App is running in offline-bypass mode (no Firebase), THE Account_Deletion_Service SHALL clear local Storage_Manager state only, complete within 5 seconds, AND surface a notice for at least 3 seconds explaining that no remote data exists.

---

## v1 Cross-Cutting Must-Haves

### Requirement 13: Logo Upload and Branding Customization

**User Story:** As a freelancer who wants polished invoices, I want to upload my own logo and pick brand colors, so that my invoices look like mine and not generic.

#### Acceptance Criteria

1. THE FlexOps_App SHALL allow the user, from the Settings modal, to upload a logo image (PNG or JPEG) of file size in the inclusive range `[1, 2_097_152]` bytes (≤ 2 MiB).
2. WHEN a logo is uploaded successfully, THE FlexOps_App SHALL persist it via Storage_Manager (data URL, or Firebase Storage when configured).
3. WHEN a logo is uploaded successfully, THE FlexOps_App SHALL re-render the invoice preview using the new logo within 2 seconds.
4. IF a logo is present, THEN THE Pretty_Printer SHALL include it in the PDF header per Requirement 6 criterion 8.
5. IF an upload exceeds the size limit, THEN THE Validator SHALL reject the upload AND THE FlexOps_App SHALL show an inline error naming the size limit AND SHALL NOT modify the previously persisted logo (if any).
6. IF an upload is not PNG or JPEG, THEN THE Validator SHALL reject the upload AND THE FlexOps_App SHALL show an inline error naming the supported formats AND SHALL NOT modify the previously persisted logo.
7. THE FlexOps_App SHALL provide a "Remove logo" action that clears the persisted logo AND restores the default text-only header in the invoice preview and PDF.
8. THE FlexOps_App SHALL allow the user to choose a single accent color for invoice headings from a fixed palette of between 4 and 8 options; exactly one option SHALL be selected at any time, with a defined default selection on first launch.
9. WHEN the accent color is changed, THE FlexOps_App SHALL persist the new selection via Storage_Manager AND SHALL re-render the invoice preview within 2 seconds.

---

### Requirement 14: Multi-Currency Support

**User Story:** As a freelancer billing clients in different countries, I want to set the currency per invoice, so that totals display correctly for the recipient.

#### Acceptance Criteria

1. THE Currency_Formatter SHALL support, at minimum, the ISO 4217 codes `USD`, `INR`, `EUR`, and `GBP`.
2. WHEN formatting an amount for a supported currency, THE Currency_Formatter SHALL render the amount with the currency's standard symbol in its standard position (USD/GBP prefix, EUR prefix in en locales, INR prefix), the locale-appropriate thousands separator, exactly two decimal places, and half-up rounding.
3. THE FlexOps_App SHALL allow the user to select a default currency in Settings AND SHALL persist that selection via Storage_Manager.
4. THE FlexOps_App SHALL allow the user to override the currency on a per-invoice basis.
5. WHEN an invoice's currency is changed, THE FlexOps_App SHALL re-render the live preview AND the PDF output (Requirement 6) using the new currency within 500 ms, without altering the underlying numeric values.
6. THE Currency_Formatter SHALL NOT perform foreign-exchange conversion in v1; the displayed numeric value SHALL equal the stored numeric value.
7. IF an unsupported currency code is requested, THEN THE Currency_Formatter SHALL fall back to USD AND log a warning naming the unsupported code; the FlexOps_App SHALL surface a non-blocking notice to the user.

#### Correctness Properties

- **Round-trip**: For every supported currency `c` and every accepted numeric value `n`, `parse(format(n, c))` SHALL equal `n` to two decimal places.
- **Two-decimal invariant**: `format(n, c)` SHALL contain exactly two digits after the decimal separator for any non-negative `n`.

---

### Requirement 15: Configurable Tax Rate

**User Story:** As a freelancer subject to varying tax jurisdictions, I want to set the tax percentage myself, so that hardcoded 5% does not produce wrong invoices.

#### Acceptance Criteria

1. THE FlexOps_App SHALL allow the user to configure a default tax percentage in Settings, with allowed values in the inclusive range `[0, 100]` to two decimal places, AND SHALL persist that value via Storage_Manager.
2. THE FlexOps_App SHALL allow the user to override the tax percentage per invoice with the same range and precision constraints; if no per-invoice override is set, the invoice SHALL use the configured default from criterion 1.
3. WHEN computing tax for an invoice, THE Tax_Calculator SHALL return `round_to_cents(subtotal * taxPct / 100)` using half-up rounding.
4. WHEN tax is rendered in the live preview and the PDF, THE FlexOps_App SHALL include the percentage in the label formatted with up to two decimal places and no trailing zeros (e.g., "Tax (7.5%)", "Tax (8%)"), AND SHALL NOT display a hardcoded "5%".
5. THE FlexOps_App SHALL NOT contain any code path that uses a hardcoded `0.05` or `5` as a tax multiplier.
6. WHEN the tax percentage is exactly `0`, THE Tax_Calculator SHALL return `0` AND THE FlexOps_App SHALL render the label as "Tax (0%)".
7. IF an invalid tax percentage is submitted (out of range, more than two decimals, NaN, non-numeric), THEN THE Validator SHALL reject the input per Requirement 1 criterion 10 AND THE FlexOps_App SHALL NOT persist the value.

#### Correctness Properties

- **Linear scaling (metamorphic)**: For any subtotal `s` and rate `r`, `tax(2s, r)` SHALL equal `2 * tax(s, r)` within one cent of rounding.
- **Boundary**: `tax(s, 0) === 0` AND `tax(0, r) === 0` for all valid `s, r`.

---

### Requirement 16: Invoice Status Tracking

**User Story:** As a freelancer juggling many invoices, I want each invoice to carry an explicit status (Draft, Sent, Paid, Overdue), so that I can see what is owed and what is closed.

#### Acceptance Criteria

1. THE FlexOps_App SHALL store a `status` field on every Invoice with allowed values `Draft`, `Sent`, `Paid`, `Overdue`, AND `Archived`. Allowed transitions SHALL be: `Draft → Sent`, `Sent → Paid`, `Sent → Overdue`, `Overdue → Paid`, and `Paid → Archived`.
2. WHEN a new invoice is created, THE FlexOps_App SHALL set its status to `Draft`.
3. WHEN the user marks an invoice as `Sent`, THE FlexOps_App SHALL persist that status AND SHALL store a `sentAt` timestamp in ISO 8601 UTC format.
4. WHEN the user marks an invoice as `Paid`, THE FlexOps_App SHALL persist that status AND SHALL store a `paidAt` timestamp in ISO 8601 UTC format.
5. WHEN the FlexOps_App starts AND any invoice has status `Sent` AND its due date (interpreted as end-of-day in the user's local timezone) is earlier than today (also local timezone), THE FlexOps_App SHALL set that invoice's status to `Overdue`.
6. IF the user attempts a status transition that is not in the allowed set from criterion 1, THEN THE FlexOps_App SHALL reject the transition AND surface a non-blocking error message naming the disallowed transition.
7. THE Reports_View (Requirement 11) SHALL aggregate revenue from `Paid` invoices, outstanding amounts from `Sent` and `Overdue` invoices, AND SHALL exclude `Draft` and `Archived` invoices from both aggregates.

---

### Requirement 17: Error Boundaries

**User Story:** As a user, I want the app to recover gracefully from a render-time crash in any one screen, so that the whole app does not white-screen.

#### Acceptance Criteria

1. THE FlexOps_App SHALL wrap each top-level navigation route AND each modal dialog mount point with an Error_Boundary component such that no top-level route or modal mounts outside an Error_Boundary.
2. WHEN a child of an Error_Boundary throws during render, THE Error_Boundary SHALL render a fallback UI within 1 second containing an apology message of ≤ 200 characters, a "Reload" button, and a "Report" link.
3. WHEN the user activates the "Report" link, THE FlexOps_App SHALL navigate to the Support_View (Requirement 11).
4. WHEN the user activates the "Reload" button, THE FlexOps_App SHALL re-mount the failing subtree within 2 seconds without reloading the WebView AND without affecting siblings outside the boundary.
5. IF the same Error_Boundary's child throws again immediately after Reload (more than 3 throws within 10 seconds), THEN THE Error_Boundary SHALL stop attempting to re-render the subtree AND SHALL display a persistent fallback inviting the user to contact Support.
6. WHILE a render error is active in one Error_Boundary, the rest of the app outside that boundary SHALL remain interactive (taps, navigation, scrolling).
7. WHERE Firebase logging is configured, THE Error_Boundary SHALL log the error message and component stack to the Firebase logger.
8. WHERE Firebase logging is not configured, THE Error_Boundary SHALL log the error message and component stack to the device console.

---

## Out of Scope for v1 (Deferred)

The following items are explicitly deferred per the user's instruction and are NOT requirements of this spec:

- Recurring invoices
- Time tracking
- Mileage tracking
- Expenses tracking
- Receipt scanner
- Multi-business support (multiple sender profiles in a single account)
- Payment gateway integration (Stripe / Razorpay / UPI)

These will be considered for a future v1.x or v2 spec.
