# PDF Document Generation

## Status: Complete

## Overview
Implemented branded PDF generation for proposals and invoices using `@react-pdf/renderer`.
Supports direct download and email delivery via Gmail attachment.

## Library Choice: @react-pdf/renderer
Selected over Puppeteer because it is serverless-compatible (no Chromium binary required),
pure React component approach, and TypeScript-friendly. Vercel-safe.

## What Was Built

### PDF Templates
- `lib/pdf/styles.ts` — Shared brand styles: BLCG navy/blue/steel palette, typography, table layout
- `lib/pdf/proposal-template.tsx` — Proposal PDF: header, meta row, bill-to, situation, line items, totals, agreement fields, footer
- `lib/pdf/invoice-template.tsx` — Invoice PDF: header, meta row, bill-to, line items with isIncluded support, totals (subtotal/tax/deposit/balance), footer

### API Routes
- `app/api/proposals/[id]/pdf` — GET returns `application/pdf` inline download
- `app/api/invoices/[id]/pdf` — GET returns `application/pdf` inline download
- `app/api/proposals/[id]/send` — POST generates PDF, sends via Gmail as `multipart/mixed` attachment
- `app/api/invoices/[id]/send` — POST generates PDF, sends via Gmail as `multipart/mixed` attachment

### UI
- Proposals page: **PDF** button (opens in new tab) + **Send** button (modal with from/to/cc/subject/body)
- Finances page (Invoices tab): same PDF + Send buttons per invoice row

### Tests
- 22 unit tests covering auth guards, 404 handling, PDF headers, Gmail send call, and MIME encoding
- All 4 test files pass

## Files Changed
- `package.json` — added `@react-pdf/renderer`
- `lib/pdf/styles.ts` — NEW
- `lib/pdf/proposal-template.tsx` — NEW
- `lib/pdf/invoice-template.tsx` — NEW
- `app/api/proposals/[id]/pdf/route.ts` — NEW
- `app/api/proposals/[id]/pdf/route.test.ts` — NEW
- `app/api/proposals/[id]/send/route.ts` — NEW
- `app/api/proposals/[id]/send/route.test.ts` — NEW
- `app/api/invoices/[id]/pdf/route.ts` — NEW
- `app/api/invoices/[id]/pdf/route.test.ts` — NEW
- `app/api/invoices/[id]/send/route.ts` — NEW
- `app/api/invoices/[id]/send/route.test.ts` — NEW
- `app/(dashboard)/proposals/page.tsx` — added PDF/Send buttons + SendPdfModal
- `app/(dashboard)/finances/page.tsx` — added PDF/Send buttons + SendInvoicePdfModal

## Key Decisions
- Used `eslint-disable @typescript-eslint/no-explicit-any` on `React.createElement()` call to
  `renderToBuffer` — required because the @react-pdf/renderer JSX element type is not compatible
  with standard `React.ReactElement`; this is a known library type gap, not a logic issue.
- MIME attachment built manually (same approach as `/api/emails/send`) to avoid adding another
  email library dependency. Base64 split into 76-char lines per RFC 2045.

## Verification
- TypeScript: zero errors in new files
- Tests: 22/22 pass
- Send modal: pre-populated subject/body, success feedback, 1500ms auto-close
