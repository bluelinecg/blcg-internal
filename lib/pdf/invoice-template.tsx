// React-PDF template for Invoice documents.
// Renders a branded, printable invoice with line items, totals, and payment details.
// Import and pass a fully-populated Invoice (with .organization) for best output.

import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import {
  pdfStyles as s,
  COMPANY_ADDRESS,
  BRAND_BLUE,
  BRAND_STEEL,
} from './styles';
import type { Invoice } from '@/lib/types/finances';

interface Props {
  invoice: Invoice;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ach:          'ACH / Bank Transfer',
  check:        'Check',
  credit_card:  'Credit Card',
};

export function InvoicePDF({ invoice }: Props) {
  const issuedDate = formatDate(invoice.createdAt);
  const dueDate    = formatDate(invoice.dueDate);
  const paidDate   = invoice.paidDate ? formatDate(invoice.paidDate) : null;

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={COMPANY_ADDRESS.name}
    >
      <Page size="LETTER" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>{COMPANY_ADDRESS.name}</Text>
            <Text style={s.brandMeta}>{COMPANY_ADDRESS.line1}</Text>
            <Text style={s.brandMeta}>{COMPANY_ADDRESS.website}</Text>
          </View>
          <View style={s.docTypeBlock}>
            <Text style={s.docType}>INVOICE</Text>
            <Text style={s.docNumber}>{invoice.invoiceNumber}</Text>
            {invoice.proposalId && (
              <Text style={{ fontSize: 9, color: BRAND_BLUE, marginTop: 2 }}>
                Ref: {invoice.proposalId}
              </Text>
            )}
          </View>
        </View>

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <View style={s.divider} />

        {/* ── Meta row ───────────────────────────────────────────────────── */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>ISSUED</Text>
            <Text style={s.metaValue}>{issuedDate}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>DUE</Text>
            <Text style={s.metaValue}>{dueDate}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>TERMS</Text>
            <Text style={s.metaValue}>{invoice.paymentTerms}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>STATUS</Text>
            <Text style={s.metaValue}>{capitalise(invoice.status)}</Text>
          </View>
          {invoice.paymentMethod && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>PAYMENT METHOD</Text>
              <Text style={s.metaValue}>{PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}</Text>
            </View>
          )}
          {paidDate && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>PAID</Text>
              <Text style={s.metaValue}>{paidDate}</Text>
            </View>
          )}
        </View>

        {/* ── Bill-to ────────────────────────────────────────────────────── */}
        <View style={s.billToSection}>
          <Text style={s.billToLabel}>BILL TO</Text>
          {invoice.organization ? (
            <>
              <Text style={s.billToName}>{invoice.organization.name}</Text>
              {invoice.organization.address && (
                <Text style={s.billToDetail}>{invoice.organization.address}</Text>
              )}
              {invoice.organization.phone && (
                <Text style={s.billToDetail}>{invoice.organization.phone}</Text>
              )}
            </>
          ) : (
            <Text style={s.billToDetail}>—</Text>
          )}
        </View>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        {invoice.lineItems.length > 0 && (
          <View style={s.table}>
            <Text style={s.sectionLabel}>SERVICES</Text>

            {/* Header row */}
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.colDescription]}>DESCRIPTION</Text>
              <Text style={[s.tableHeaderCell, s.colQty]}>QTY</Text>
              <Text style={[s.tableHeaderCell, s.colPrice]}>RATE</Text>
              <Text style={[s.tableHeaderCell, s.colIncluded]}>INCLUDED</Text>
              <Text style={[s.tableHeaderCell, s.colTotal]}>AMOUNT</Text>
            </View>

            {/* Data rows */}
            {invoice.lineItems.map((item, i) => (
              <View
                key={item.id}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <View style={[s.colDescription, { flexDirection: 'column' }]}>
                  <Text style={s.tableCell}>{item.description}</Text>
                  {item.subDescription && (
                    <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 1 }}>
                      {item.subDescription}
                    </Text>
                  )}
                </View>
                <Text style={[s.tableCell, s.colQty]}>
                  {item.quantity != null ? item.quantity : '—'}
                </Text>
                <Text style={[s.tableCell, s.colPrice]}>
                  {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                </Text>
                <Text style={[s.tableCell, s.colIncluded]}>
                  {item.isIncluded ? 'Included' : ''}
                </Text>
                <Text style={[s.tableCellBold, s.colTotal]}>
                  {item.isIncluded ? '$0' : formatCurrency(item.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Totals block ───────────────────────────────────────────────── */}
        <View style={s.totalsBlock}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.tax > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Tax</Text>
              <Text style={s.totalsValue}>{formatCurrency(invoice.tax)}</Text>
            </View>
          )}
          {invoice.depositAmount != null && invoice.depositAmount > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Deposit Applied</Text>
              <Text style={s.totalsValue}>({formatCurrency(invoice.depositAmount)})</Text>
            </View>
          )}
          <View style={s.totalsRowFinal}>
            <Text style={s.totalsFinalLabel}>
              {invoice.balanceDue != null ? 'Balance Due' : 'Total'}
            </Text>
            <Text style={s.totalsFinalValue}>
              {formatCurrency(invoice.balanceDue ?? invoice.total)}
            </Text>
          </View>
        </View>

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.sectionLabel}>NOTES</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY_ADDRESS.name} · {COMPANY_ADDRESS.website}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>

        {/* ── Accent bar ─────────────────────────────────────────────────── */}
        <View
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            right:           0,
            height:          4,
            backgroundColor: BRAND_STEEL,
          }}
          fixed
        />

      </Page>
    </Document>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });
}

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
