// Shared PDF styles and brand constants for @react-pdf/renderer templates.
// All PDF templates import from here to ensure consistent branding.

import { StyleSheet } from '@react-pdf/renderer';

// Brand colours — kept in sync with lib/constants/brand.ts
export const BRAND_NAVY  = '#1C2D44';
export const BRAND_BLUE  = '#2B6DB5';
export const BRAND_STEEL = '#8BACC8';
export const GRAY_50     = '#F9FAFB';
export const GRAY_200    = '#E5E7EB';
export const GRAY_500    = '#6B7280';
export const GRAY_700    = '#374151';
export const GRAY_900    = '#111827';

// Company sender block shown on every document
export const COMPANY_ADDRESS = {
  name:    'Blue Line Consulting Group',
  line1:   'hello@bluelinecg.com',
  website: 'bluelinecg.com',
};

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    fontSize:        10,
    color:           GRAY_900,
    paddingTop:      48,
    paddingBottom:   48,
    paddingLeft:     52,
    paddingRight:    52,
    backgroundColor: '#FFFFFF',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   32,
  },
  brandBlock: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize:   18,
    fontFamily: 'Helvetica-Bold',
    color:      BRAND_NAVY,
    marginBottom: 3,
  },
  brandMeta: {
    fontSize: 9,
    color:    GRAY_500,
    marginBottom: 1,
  },
  docTypeBlock: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize:   22,
    fontFamily: 'Helvetica-Bold',
    color:      BRAND_NAVY,
    letterSpacing: 1,
  },
  docNumber: {
    fontSize:   11,
    color:      BRAND_BLUE,
    marginTop:  4,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND_NAVY,
    marginBottom:      20,
  },
  dividerThin: {
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
    marginVertical:    12,
  },

  // ── Meta row (Issued / Due / Status) ─────────────────────────────────────
  metaRow: {
    flexDirection:  'row',
    gap:            24,
    marginBottom:   24,
  },
  metaItem: {
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize:     8,
    fontFamily:   'Helvetica-Bold',
    color:        GRAY_500,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom:  3,
  },
  metaValue: {
    fontSize: 10,
    color:    GRAY_900,
  },

  // ── Bill-to block ─────────────────────────────────────────────────────────
  billToSection: {
    marginBottom: 24,
  },
  billToLabel: {
    fontSize:     8,
    fontFamily:   'Helvetica-Bold',
    color:        GRAY_500,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom:  6,
  },
  billToName: {
    fontSize:   12,
    fontFamily: 'Helvetica-Bold',
    color:      BRAND_NAVY,
    marginBottom: 2,
  },
  billToDetail: {
    fontSize:     9,
    color:        GRAY_700,
    marginBottom: 1,
  },

  // ── Section heading ───────────────────────────────────────────────────────
  sectionLabel: {
    fontSize:     8,
    fontFamily:   'Helvetica-Bold',
    color:        GRAY_500,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom:  8,
  },

  // ── Situation / narrative block ───────────────────────────────────────────
  situationBox: {
    backgroundColor: GRAY_50,
    borderRadius:    4,
    padding:         12,
    marginBottom:    24,
  },
  situationText: {
    fontSize:    10,
    color:       GRAY_700,
    lineHeight:  1.6,
  },

  // ── Line items table ──────────────────────────────────────────────────────
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection:  'row',
    backgroundColor: BRAND_NAVY,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius:   3,
    marginBottom:   2,
  },
  tableHeaderCell: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      '#FFFFFF',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection:   'row',
    paddingVertical:  7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  tableRowAlt: {
    backgroundColor: GRAY_50,
  },
  tableCell: {
    fontSize: 9,
    color:    GRAY_700,
  },
  tableCellBold: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      GRAY_900,
  },

  // Column widths — description flex:1, others fixed
  colDescription: { flex: 1 },
  colQty:         { width: 36, textAlign: 'right' },
  colPrice:       { width: 72, textAlign: 'right' },
  colTotal:       { width: 72, textAlign: 'right' },
  colIncluded:    { width: 80, textAlign: 'right' },

  // ── Totals block ──────────────────────────────────────────────────────────
  totalsBlock: {
    alignSelf:    'flex-end',
    width:        220,
    marginBottom: 24,
  },
  totalsRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color:    GRAY_700,
  },
  totalsValue: {
    fontSize: 9,
    color:    GRAY_900,
  },
  totalsRowFinal: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    borderTopWidth:  2,
    borderTopColor:  BRAND_NAVY,
    paddingTop:      8,
    marginTop:       4,
  },
  totalsFinalLabel: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      BRAND_NAVY,
  },
  totalsFinalValue: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      BRAND_NAVY,
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  notesBox: {
    marginBottom: 24,
  },
  notesText: {
    fontSize:   9,
    color:      GRAY_700,
    lineHeight: 1.6,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position:   'absolute',
    bottom:     28,
    left:       52,
    right:      52,
    flexDirection:  'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop:     8,
  },
  footerText: {
    fontSize: 8,
    color:    GRAY_500,
  },
});
