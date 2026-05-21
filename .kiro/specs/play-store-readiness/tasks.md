# Implementation Plan: Play Store Readiness

## Overview

This plan migrates the existing single-screen FlexOps Invoice Portal into a Play Store launch-ready Android app. The migration follows the 12-step ordered refactor from the design document, where the app remains buildable and shippable at every step. Each step is one PR; tests are added in the same PR as the code they exercise.

## Tasks

- [ ] 1. Baseline lock — testing infrastructure setup
  - [ ] 1.1 Add testing dependencies and configure vitest
    - Add `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, and `pdf-parse` to `devDependencies`
    - Create `vitest.config.ts` with `jsdom` test environment for component tests and a `node` project for pure-function tests
    - Add test scripts to `package.json` (`"test": "vitest run"`, `"test:watch": "vitest"`)
    - Snapshot and commit `package-lock.json`
    - _Requirements: All (testing infrastructure supports every requirement)_

- [ ] 2. Pure-function core modules
  - [ ] 2.1 Implement `src/lib/validator.ts`
    - Create the Validator module with `sanitizeString`, all per-field validators (`validateBrandName`, `validateProjectTitle`, `validateEmail`, `validatePhone`, `validateAddress`, `validateInvoiceNumber`, `validateLineItemDescription`, `validateAmount`, `validateQuantity`, `validateTaxPercentage`, `validateCurrencyCode`, `validateLogoFile`), and composite validators (`validateInvoiceDraft`, `validateClientDraft`, `validateProfileDraft`, `validateOnboardingDraft`)
    - Define `FieldCode`, `FieldError`, and `Result<T>` types
    - Implement sanitization: trim, collapse internal control chars (ASCII < 0x20 except `\n` and `\t`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [ ]* 2.2 Write property tests for Validator (P1: field acceptance)
    - **Property 1: Validator field acceptance agrees with predicate**
    - For each field, generate random inputs and assert `validateField(s).ok` agrees with the documented predicate
    - 200 iterations per field; parameterized over the full field set
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 1.10, 1.11**

  - [ ]* 2.3 Write property tests for Validator (P2: sanitization idempotence)
    - **Property 2: Sanitization is idempotent and strips control characters**
    - Assert `sanitize(sanitize(s)) === sanitize(s)` and no forbidden control chars remain
    - 200 iterations with targeted control-char generators
    - **Validates: Requirements 1.9**

  - [ ]* 2.4 Write property tests for Validator (P3: composite draft errors)
    - **Property 3: Composite draft validation returns one error per failing field**
    - Generate drafts with random invalid subsets; assert error count equals invalid field count
    - 200 iterations
    - **Validates: Requirements 1.12**

  - [ ] 2.5 Implement `src/lib/currency.ts`
    - Create Currency_Formatter with `CurrencyCode` type, `SUPPORTED_CURRENCIES` array, `getCurrencyMeta`, `format`, `parse`, and `roundToCents`
    - Support USD, INR, EUR, GBP with correct symbol, position, and locale
    - Use `Intl.NumberFormat` for locale-correct grouping
    - _Requirements: 14.1, 14.2, 14.6, 14.7_

  - [ ]* 2.6 Write property tests for Currency_Formatter (P4: round-trip)
    - **Property 4: Currency round-trip**
    - Assert `parse(format(n, c), c) === n` to 2dp for all supported currencies
    - 200 iterations per currency using `fc.double({min:0, max:9_999_999.99, noNaN:true})`
    - **Validates: Requirements 14.2, 14.6**

  - [ ]* 2.7 Write property tests for Currency_Formatter (P5: two decimal places)
    - **Property 5: Currency format has exactly two decimal places**
    - Assert `format(n, c)` contains exactly two digits after the decimal separator
    - 200 iterations per currency
    - **Validates: Requirements 14.2**

  - [ ] 2.8 Implement `src/lib/tax.ts`
    - Create Tax_Calculator with `computeTax`, `computeTotals`, and `formatTaxLabel`
    - Use `roundToCents` from currency module for half-up rounding
    - _Requirements: 15.1, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 2.9 Write property tests for Tax_Calculator (P6: matches formula)
    - **Property 6: Tax computation matches the rounded formula**
    - Assert `computeTax(subtotal, taxPct) === roundHalfUp(subtotal * taxPct / 100, 2)`
    - 200 iterations
    - **Validates: Requirements 15.3, 15.6**

  - [ ]* 2.10 Write property tests for Tax_Calculator (P7: linear scaling)
    - **Property 7: Tax is linear in the subtotal (metamorphic)**
    - Assert `computeTax(2*s, r) === 2 * computeTax(s, r)` within one cent
    - 200 iterations
    - **Validates: Requirements 15.3**

  - [ ] 2.11 Implement `src/lib/clock.ts`
    - Create Clock interface with `now()`, `todayLocalISODate()`, `nowUtcISO()`
    - Export `systemClock` (production) and `fixedClock(at: Date)` (tests)
    - _Requirements: 7.4, 16.5_

  - [ ] 2.12 Implement `src/lib/invoiceStatus.ts`
    - Create Invoice_Status_FSM with `ALLOWED_TRANSITIONS`, `canTransition`, `applyTransition`, and `autoMarkOverdue`
    - Implement timestamp side-effects (`sentAt`, `paidAt`, `archivedAt`) using injected Clock
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 2.13 Write property tests for Invoice_Status_FSM (P8: transitions match table)
    - **Property 8: Status transitions match the allowed table**
    - Test all 25 (from, to) pairs; assert `applyTransition.ok` iff `to ∈ ALLOWED_TRANSITIONS[from]`
    - 100 iterations per pair
    - **Validates: Requirements 16.1, 16.3, 16.4, 16.6**

  - [ ]* 2.14 Write property tests for Invoice_Status_FSM (P9: auto-overdue)
    - **Property 9: Auto-overdue marks exactly past-due Sent invoices**
    - Generate arrays of invoices with arbitrary statuses and due dates; assert correct marking
    - 200 iterations with `fc.array(arbitraryInvoice)` + `arbitraryClock`
    - **Validates: Requirements 16.5**

  - [ ] 2.15 Create `src/domain/types.ts` with all domain type definitions
    - Define `LineItem`, `Invoice`, `Client`, `Profile`, `AppSettings`, `Task`, `RemittanceSnapshot`, `OnboardingPayload`, `DemoMigrationFlag`, draft types, and `SliceData`
    - _Requirements: 1.1, 14.1, 16.1_

- [ ] 3. Checkpoint — Pure-function core
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Storage_Manager + Migration_Manager + Demo_Data_Detector
  - [ ] 4.1 Implement `src/services/storageManager.ts`
    - Create `StorageManager` interface with `hydrate`, `writeSlice`, `readSlice`, `clearAll`, `bindReactiveWriter`
    - Implement `flexops:v{N}:` key namespacing with `SCHEMA_VERSION` field on every persisted slice
    - Implement debounced reactive writer (coalesce within 16 ms window, settle within 100 ms)
    - Handle quota-exceeded, unavailable, and JSON errors gracefully (toast, retain in-memory state)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8_

  - [ ] 4.2 Implement `src/services/migrationManager.ts`
    - Create `MigrationManager` with `runUpgrades` (ordered, halt-on-failure) and `clearDemoSeed` (idempotent)
    - Implement `migrate_apex_to_v2` migration for legacy `apex_*` keys
    - Implement `migrate_v1_to_v2` migration adding status/taxPct/currency/snapshots
    - _Requirements: 4.6, 4.7, 3.2, 3.5_

  - [ ] 4.3 Implement `src/services/demoDataDetector.ts`
    - Create `Demo_Data_Detector` with `DEMO_BRAND_NAMES` constant and `detectDemoSeed` function
    - Match entities by brand name against the Demo_Seed_Set
    - Return `DemoScanResult` with `found`, `clientIds`, and `invoiceIds`
    - _Requirements: 3.1, 3.6_

  - [ ]* 4.4 Write property tests for Migration_Manager (P10: idempotent, preserving, removing)
    - **Property 10: Migration_Manager is idempotent, preserving, and removing**
    - Generate mixed demo + real entity states; assert idempotence, preservation of user entities, removal of demo entities
    - 200 iterations
    - **Validates: Requirements 3.5, 3.6, 2.4**

  - [ ]* 4.5 Write property tests for Storage_Manager (P11: round-trip)
    - **Property 11: Storage_Manager round-trip and namespace invariant**
    - Assert `readSlice(writeSlice(name, s))` equals `s`; assert key prefix and schemaVersion field
    - 200 iterations with `fc.record(arbitraryAppState)`
    - **Validates: Requirements 4.3, 4.5**

  - [ ]* 4.6 Write property tests for Storage_Manager (P12: coalescing)
    - **Property 12: Storage_Manager coalesces writes within a 16 ms window**
    - Use fake timers; assert single `setItem` for rapid mutations, multiple for spaced mutations
    - 100 iterations
    - **Validates: Requirements 4.1**

  - [ ]* 4.7 Write property tests for Storage_Manager (P13: crash safety)
    - **Property 13: Storage_Manager preserves previous bytes on write failure**
    - Force `setItem` throw; assert previous value remains intact
    - 100 iterations
    - **Validates: Requirements 4.4**

- [ ] 5. Checkpoint — Persistence layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. State_Store + reactive persistence
  - [ ] 6.1 Implement `src/state/store.tsx`
    - Create `AppState` interface, `Action` union type, and `reducer` function
    - Implement `StoreProvider` with React context + `useReducer`
    - Wire reactive persistence: `useEffect` per slice calls debounced `Storage_Manager` writer on state change
    - Implement `StoreApi` high-level commands (validate + dispatch + persist)
    - Export `useStore()` and `useAppState()` hooks
    - _Requirements: 4.1, 4.2, 4.3, 2.1_

  - [ ] 6.2 Implement `src/services/authService.ts`
    - Create `AuthService` interface wrapping Firebase Auth
    - Implement `isFirebaseEnabled` detection, `subscribe`, `login`, `register`, `logout`, `deleteCurrentUser`
    - Handle offline-bypass mode gracefully
    - _Requirements: 12.4_

  - [ ] 6.3 Implement `src/services/firestoreSync.ts`
    - Create `FirestoreSync` interface with `start`, `pushProfile`, `pushClient`, `pushInvoice`, `deleteClient`, `deleteInvoice`, `recursivelyDeleteUser`
    - Implement as dynamic import (lazy-loaded) to keep it out of main bundle
    - Mirror State_Store writes to Firestore when Firebase is configured
    - _Requirements: 4.1, 12.4_

- [ ] 7. Migrate components to State_Store, deprecate FirebaseContext
  - [ ] 7.1 Refactor `App.tsx`, `ClientCard.tsx`, `InvoicePreview.tsx`, `SettingsModal.tsx`, `Login.tsx` to consume `useStore()`
    - Replace all `useFirebase()` calls with `useStore()` / `useAppState()`
    - Wire form submissions through Validator → dispatch → persist flow
    - _Requirements: 1.8, 4.1, 4.2_

  - [ ] 7.2 Delete `FirebaseContext.tsx` and remove `DEFAULT_CLIENTS` / `DEFAULT_PROFILE` constants
    - Remove the demo seed data arrays entirely from the codebase
    - Add `migrate_apex_to_v2` one-shot migration that reads old `apex_*` keys on first boot
    - _Requirements: 2.4, 3.1_

  - [ ]* 7.3 Write property test (P26: no code path produces Demo_Seed_Set entities)
    - **Property 26: No code path produces Demo_Seed_Set entities**
    - Generate random action sequences from empty state; assert no demo brand names appear
    - 100 iterations
    - **Validates: Requirements 2.4**

- [ ] 8. Checkpoint — State management migration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. PDF_Generator replaces pdfService
  - [ ] 9.1 Add `jspdf` and `jspdf-autotable` to dependencies
    - Install as direct production dependencies
    - Verify no CDN script tags remain in `index.html`
    - _Requirements: 5.2, 5.3_

  - [ ] 9.2 Implement `src/pdf/prettyPrinter.ts`
    - Create layout functions: `drawHeader`, `drawClientBlock`, `drawLineItemsTable`, `drawTotals`, `drawRemittanceFooter`, `drawLogo`, and `layoutInvoice`
    - Implement dynamic `finalY` math for totals/footer placement
    - Handle pagination when line-items overflow a single page
    - Use Helvetica as primary font; US Letter format (612 × 792 pt)
    - Render logo within 120 × 60 pt bounding box preserving aspect ratio
    - _Requirements: 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ] 9.3 Implement `src/pdf/pdfGenerator.ts`
    - Create `generateInvoicePdf` function returning `PdfOutput` (blob + dataUri + pageCount)
    - Inject Clock for deterministic timestamps (no ambient `Date.now()`)
    - Implement `PdfGenerationError` with `stage` field for typed error reporting
    - Ensure byte-equivalent output for identical inputs
    - _Requirements: 5.4, 5.8, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 9.4 Wire PDF_Generator into Invoice_Builder_View
    - Replace `compileInvoicePDF` import with dynamic `import('../pdf/pdfGenerator')`
    - Delete `src/services/pdfService.ts` and remove `<script src="...html2pdf.js">` from `index.html`
    - Remove `html2pdf.js` and `html2canvas` from `package.json` if present
    - _Requirements: 5.1_

  - [ ]* 9.5 Write property tests for PDF (P14: text round-trip)
    - **Property 14: PDF text round-trip**
    - Generate valid invoices; extract text from PDF blob using `pdf-parse`; assert all text fields present as substrings
    - 100 iterations
    - **Validates: Requirements 5.5, 6.1, 6.2, 6.3, 6.4**

  - [ ]* 9.6 Write property tests for PDF (P15: layout invariant)
    - **Property 15: PDF layout invariant**
    - Generate invoices with 1–50 line items; assert no element exceeds page bounds or overlaps
    - 100 iterations with custom layout-recording wrapper
    - **Validates: Requirements 6.6, 6.7**

  - [ ]* 9.7 Write property tests for PDF (P16: determinism)
    - **Property 16: PDF generation is deterministic**
    - Two invocations with same input + fixed clock produce byte-equal output
    - 100 iterations
    - **Validates: Requirements 5.4, 7.3, 7.4**

  - [ ]* 9.8 Write property tests for PDF (P17: output forms agree)
    - **Property 17: PDF output forms agree**
    - Assert blob type, size bounds, dataUri prefix, and base64-decoded bytes equal blob bytes
    - 100 iterations
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 9.9 Write property tests for PDF (P18: failure preserves input)
    - **Property 18: PDF generation failure preserves input and emits typed error**
    - Mock jsPDF/autoTable throws; assert `PdfGenerationError` with correct stage; no partial output
    - 100 iterations
    - **Validates: Requirements 5.8, 7.5**

  - [ ]* 9.10 Write property tests for PDF (P19: logo bounding-box)
    - **Property 19: Logo bounding-box and aspect ratio preservation**
    - Generate random logo dimensions; assert rendered size ≤ 120×60 and aspect ratio within 1%
    - 200 iterations
    - **Validates: Requirements 6.8, 13.4**

- [ ] 10. Checkpoint — PDF pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Native share intent
  - [ ] 11.1 Add `@capacitor/share` and `@capacitor/filesystem` to dependencies
    - Install as production dependencies
    - _Requirements: 8.2_

  - [ ] 11.2 Implement `src/native/shareService.ts`
    - Create `ShareService` with `isNative()` and `share(blob, fileName)` methods
    - Implement native path: write PDF to cache → get URI → invoke share sheet → cleanup after 60s
    - Implement web fallback: `createObjectURL` + anchor click download
    - Sanitize file name to match `invoice-{invoiceNumber}.pdf` pattern (no path separators)
    - Handle permission denied and filesystem errors gracefully
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 11.3 Wire Share_Service into Invoice_Builder_View
    - Connect "Share PDF" button to `generateInvoicePdf` → `share(blob, fileName)` flow
    - Display appropriate error messages for share failures
    - _Requirements: 8.1, 8.3_

  - [ ]* 11.4 Write property tests for Share_Service (P20: file name pattern)
    - **Property 20: Share_Service file name pattern**
    - Generate valid invoice numbers; assert file name matches `/^invoice-[A-Za-z0-9-]{1,24}\.pdf$/`
    - 200 iterations
    - **Validates: Requirements 8.5**

  - [ ]* 11.5 Write integration tests for Share_Service with Capacitor mocks
    - Test native happy path: assert call order `writeFile` → `getUri` → `Share.share` → delayed `deleteFile`
    - Test web fallback with `Capacitor.isNativePlatform = false`
    - Test permission denied and filesystem error scenarios
    - _Requirements: 8.1, 8.4, 8.6_

- [ ] 12. Routing + new views
  - [ ] 12.1 Add `wouter` to dependencies and create `src/router/routes.tsx`
    - Define `ROUTES` constant with all route paths
    - Create `AppRouter` component with `Switch` and `Route` for each view
    - Implement onboarding gate (redirect to `/onboarding` if not onboarded)
    - _Requirements: 11.5, 2.1_

  - [ ] 12.2 Convert `App.tsx` to `AppRouter` host
    - Replace single-screen render with `<AppRouter />` component
    - Extract current main content into `ControlCenterView`
    - Extract invoice editing into `InvoiceBuilderView`
    - _Requirements: 11.5_

  - [ ] 12.3 Implement `src/views/OnboardingView.tsx`
    - Prompt for brand name (1–80 chars), contact email, and default currency
    - Validate all fields via Validator before allowing entry to main workspace
    - Block navigation to invoice creation until onboarding passes
    - Render inline errors per Requirement 1 criterion 8
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ] 12.4 Implement `src/views/ArchiveView.tsx`
    - Show all clients and invoices with status `Archived` or `Paid`
    - Render empty-state message when no entities match
    - Render error state with "Retry" action on data load failure
    - _Requirements: 11.1, 11.7_

  - [ ] 12.5 Implement `src/views/ReportsView.tsx`
    - Show total revenue (sum of `Paid` grand totals), total outstanding (sum of `Sent` + `Overdue`)
    - Show invoice count per status (Draft, Sent, Paid, Overdue, Archived)
    - Format all monetary values using Currency_Formatter with user's default currency
    - Render error state with "Retry" action on data load failure
    - _Requirements: 11.2, 11.6, 11.7, 16.7_

  - [ ] 12.6 Implement `src/views/SupportView.tsx`
    - Include at least 5 FAQ entries covering creating, sending, and marking invoices as paid
    - Implement contact action: invoke device email composer or show selectable address + copy-to-clipboard
    - _Requirements: 11.3, 11.4_

  - [ ] 12.7 Implement `src/views/PrivacyPolicyView.tsx` and `src/views/TermsView.tsx`
    - Render privacy policy from in-app JSX markup (no network required)
    - Include sections: data collected, purposes, third-party services, retention, user rights, contact, effective date
    - Render terms from in-app JSX markup (no network required)
    - Include sections: acceptable use, disclaimer, limitation of liability, governing-law placeholder, effective date
    - Reachable from settings menu in ≤ 2 taps
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_

  - [ ] 12.8 Wire sidebar navigation to all new views
    - Ensure every sidebar entry navigates to a real, functional screen
    - No sidebar entry produces no observable navigation or only a console log
    - _Requirements: 11.5_

  - [ ]* 12.9 Write property tests for Reports_View (P21: aggregates match formulas)
    - **Property 21: Reports_View aggregates match formulas**
    - Generate arbitrary invoice arrays; render ReportsView; assert revenue/outstanding/counts match formulas
    - 100 iterations with RTL render + text query
    - **Validates: Requirements 11.2, 11.6, 16.7**

  - [ ]* 12.10 Write property tests for Archive_View (P22: lists exactly archived/paid)
    - **Property 22: Archive_View lists exactly archived/paid entities**
    - Generate arbitrary app state; render ArchiveView; assert correct entity set
    - 100 iterations with RTL render + element count
    - **Validates: Requirements 11.1**

  - [ ]* 12.11 Write property tests for Sidebar (P23: every entry navigates)
    - **Property 23: Every sidebar entry navigates to a working view**
    - Parameterized test over all sidebar entries; assert route change and no Error_Boundary fallback
    - **Validates: Requirements 11.5**

- [ ] 13. Checkpoint — Routing and views
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Status FSM + auto-overdue + invoice fields
  - [ ] 14.1 Add `status`, `taxPct`, `currency` fields to invoice forms
    - Update invoice creation form to include status (default `Draft`), tax percentage, and currency selector
    - Wire per-invoice currency override and per-invoice tax override
    - Add due date field to invoice form
    - _Requirements: 16.1, 16.2, 14.4, 15.2_

  - [ ] 14.2 Wire `autoMarkOverdue` on app launch
    - Call `autoMarkOverdue(invoices, clock)` during State_Store hydration
    - Dispatch `AUTO_MARK_OVERDUE` action after hydration completes
    - _Requirements: 16.5_

  - [ ] 14.3 Implement `migrate_v1_to_v2` migration for existing invoices
    - Add default `status: 'Draft'`, `taxPct: settings.defaultTaxPct`, `currency: settings.defaultCurrency` to existing invoices
    - Add `LineItem.id` via `crypto.randomUUID()` to existing line items
    - _Requirements: 4.6, 16.2_

  - [ ] 14.4 Add status transition UI controls
    - Add buttons/actions for allowed transitions (Draft→Sent, Sent→Paid, etc.)
    - Show error message for disallowed transitions
    - Record `sentAt`/`paidAt`/`archivedAt` timestamps on transition
    - _Requirements: 16.1, 16.3, 16.4, 16.6_

- [ ] 15. Account deletion + Error_Boundary + legal views
  - [ ] 15.1 Implement `src/services/accountDeletionService.ts`
    - Create `AccountDeletionService` with halt-on-first-failure semantics
    - Implement ordered deletion: Firestore → Storage → Auth → local cache
    - Handle offline-bypass mode (clear local only, complete within 5s)
    - Return `DeletionResult` with `failedAt` step name on failure
    - _Requirements: 12.1, 12.4, 12.5, 12.6, 12.7_

  - [ ] 15.2 Implement account deletion UI in Settings
    - Add "Delete account and data" action in settings menu (≤ 2 taps from main workspace)
    - Implement confirmation modal requiring user to type "DELETE" exactly
    - Handle dismiss/cancel (preserve all data unchanged)
    - Show confirmation toast on success; navigate to login screen
    - Show error message naming failing step on failure
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_

  - [ ] 15.3 Implement `src/components/ErrorBoundary.tsx`
    - Create Error_Boundary with per-scope crash budget tracking (ring buffer of throw timestamps)
    - Render fallback UI with apology message (≤ 200 chars), "Reload" button, and "Report" link
    - Implement persistent fallback after 3+ throws within 10 seconds
    - "Report" navigates to Support_View; "Reload" re-mounts subtree without WebView reload
    - Log to Firebase when configured, console otherwise
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

  - [ ] 15.4 Wrap all routes and modals with Error_Boundary
    - Ensure every top-level route and modal mount point is wrapped
    - No route or modal mounts outside an Error_Boundary
    - _Requirements: 17.1, 17.6_

  - [ ]* 15.5 Write property tests for Account_Deletion (P24: halt on first failure)
    - **Property 24: Account_Deletion halts on first failure**
    - Generate random failing step; assert steps before complete, steps after not invoked, data preserved
    - 100 iterations
    - **Validates: Requirements 12.4, 12.6**

  - [ ]* 15.6 Write property tests for Error_Boundary (P25: crash budget)
    - **Property 25: Error_Boundary crash budget**
    - Generate synthetic throw timestamp sequences; assert persistent fallback triggers at correct threshold
    - 100 iterations
    - **Validates: Requirements 17.5**

- [ ] 16. Checkpoint — Account deletion and error handling
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Logo + accent color + multi-currency UI + tax UI
  - [ ] 17.1 Implement logo upload in Settings
    - Add file input accepting PNG/JPEG, ≤ 2 MiB
    - Validate via `validateLogoFile`; show inline error for invalid uploads
    - Persist logo as data URL via Storage_Manager
    - Re-render invoice preview with new logo within 2 seconds
    - Add "Remove logo" action to clear persisted logo
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ] 17.2 Implement accent color picker in Settings
    - Provide fixed palette of 4–8 color options
    - Persist selection via Storage_Manager; re-render preview within 2 seconds
    - Apply accent color to invoice headings in preview and PDF
    - _Requirements: 13.8, 13.9_

  - [ ] 17.3 Implement multi-currency UI in Settings and Invoice forms
    - Add default currency selector in Settings (USD, INR, EUR, GBP)
    - Add per-invoice currency override selector
    - Re-render preview and PDF with new currency within 500 ms
    - _Requirements: 14.3, 14.4, 14.5_

  - [ ] 17.4 Implement configurable tax rate UI in Settings and Invoice forms
    - Add default tax percentage input in Settings ([0, 100], 2dp)
    - Add per-invoice tax override input
    - Display tax label with percentage (e.g., "Tax (7.5%)") — no hardcoded "5%"
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.7_

- [ ] 18. Demo cleanup prompt
  - [ ] 18.1 Wire Demo_Data_Detector to startup modal
    - On app launch, if `detectDemoSeed` finds demo entities and no migration flag is recorded, show one-time modal
    - Show modal within 3 seconds of app readiness
    - _Requirements: 3.1_

  - [ ] 18.2 Implement Clear / Keep / Dismiss paths
    - "Clear demo data": delete all Demo_Seed_Set entities, record flag `cleared`
    - "Keep for now": record flag `deferred`, do not show again
    - Dismiss (tap outside / back): treat as `deferred`
    - Show non-dismissible progress indicator during cleanup; reject concurrent writes
    - Handle partial failure: do not record flag, show error toast, retry on next launch
    - _Requirements: 3.2, 3.3, 3.4, 3.7, 3.8_

  - [ ] 18.3 Implement Empty_State_View for primary panels
    - Render placeholder UI with action-labeled button when clients/invoices/archive/reports panels are empty
    - Button navigates to corresponding creation flow
    - _Requirements: 2.3_

- [ ] 19. Checkpoint — UI features complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Bundle split + Capacitor build + Play Store assets
  - [ ] 20.1 Configure `manualChunks` in `vite.config.ts`
    - Split into chunks: `index` (≤ 250 KB gzipped), `pdf` (≤ 200 KB), `firebase` (≤ 220 KB), `legal` (≤ 15 KB)
    - Ensure PDF and Firebase chunks are loaded via dynamic `import()` at first need
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 20.2 Add `bundle-size.test.ts` CI gate
    - Import build manifest and assert each chunk is within budget
    - _Requirements: 5.3_

  - [ ] 20.3 Update `capacitor.config.json` and sync Android project
    - Set `appId: "com.freelancer.invoiceportal"`, `appName: "FlexOps Invoice"`, `webDir: "dist"`
    - Add Filesystem plugin config
    - Run `npx cap sync android`
    - _Requirements: 8.2_

  - [ ] 20.4 Add smoke tests for build hygiene
    - Repo-grep test: no `html2pdf` or `html2canvas` imports in `src/`
    - Repo-grep test: no hardcoded `* 0.05` or `* 5 / 100` tax multiplier in `src/`
    - Repo-grep test: no ambient `Date.now()` or `new Date()` in PDF code
    - Font smoke test: assert `doc.getFont().fontName === 'Helvetica'`
    - Page format smoke test: assert page width 612 and height 792
    - _Requirements: 5.1, 5.6, 5.7, 7.4, 15.5_

  - [ ] 20.5 Generate Play Store assets placeholder structure
    - Create directory structure for icon (512×512), adaptive icon, feature graphic (1024×500), screenshots
    - Document required assets in a README with specs
    - _Requirements: Play Store compliance_

- [ ] 21. Final checkpoint — Full build validation
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run lint && vitest run && npm run build` to confirm full pipeline passes.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each migration step
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The app remains buildable and shippable at every step — each top-level task is one PR
- TypeScript is used throughout (React 19 + TypeScript + Vite + Capacitor 8)
- The migration plan preserves the existing `FirebaseContext` until Step 4, allowing parallel operation during transition

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.15"] },
    { "id": 1, "tasks": ["2.1", "2.5", "2.8", "2.11", "2.12"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.6", "2.7", "2.9", "2.10", "2.13", "2.14"] },
    { "id": 3, "tasks": ["4.1", "4.3"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.4", "4.5", "4.6", "4.7"] },
    { "id": 6, "tasks": ["6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["7.2"] },
    { "id": 10, "tasks": ["7.3"] },
    { "id": 11, "tasks": ["9.1"] },
    { "id": 12, "tasks": ["9.2", "9.3"] },
    { "id": 13, "tasks": ["9.4"] },
    { "id": 14, "tasks": ["9.5", "9.6", "9.7", "9.8", "9.9", "9.10"] },
    { "id": 15, "tasks": ["11.1"] },
    { "id": 16, "tasks": ["11.2"] },
    { "id": 17, "tasks": ["11.3", "11.4", "11.5"] },
    { "id": 18, "tasks": ["12.1"] },
    { "id": 19, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6", "12.7"] },
    { "id": 20, "tasks": ["12.8"] },
    { "id": 21, "tasks": ["12.9", "12.10", "12.11"] },
    { "id": 22, "tasks": ["14.1", "14.2", "14.3", "14.4"] },
    { "id": 23, "tasks": ["15.1", "15.3"] },
    { "id": 24, "tasks": ["15.2", "15.4"] },
    { "id": 25, "tasks": ["15.5", "15.6"] },
    { "id": 26, "tasks": ["17.1", "17.2", "17.3", "17.4"] },
    { "id": 27, "tasks": ["18.1", "18.3"] },
    { "id": 28, "tasks": ["18.2"] },
    { "id": 29, "tasks": ["20.1"] },
    { "id": 30, "tasks": ["20.2", "20.3", "20.4", "20.5"] }
  ]
}
```
