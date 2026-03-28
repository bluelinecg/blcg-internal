// React-PDF template for Proposal documents.
// Renders a branded, printable proposal with line items, situation, and agreement fields.
// Import and pass a fully-populated Proposal (with .organization and .contact) for best output.

import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import {
  pdfStyles as s,
  COMPANY_ADDRESS,
  BRAND_STEEL,
} from './styles';
import type { Proposal } from '@/lib/types/proposals';

interface Props {
  proposal: Proposal;
}

export function ProposalPDF({ proposal }: Props) {
  const issuedDate = formatDate(proposal.createdAt);
  const expiresDate = proposal.expiresAt ? formatDate(proposal.expiresAt) : '—';

  return (
    <Document
      title={`Proposal ${proposal.proposalNumber} — ${proposal.title}`}
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
            <Text style={s.docType}>PROPOSAL</Text>
            <Text style={s.docNumber}>{proposal.proposalNumber}</Text>
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
            <Text style={s.metaLabel}>EXPIRES</Text>
            <Text style={s.metaValue}>{expiresDate}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>STATUS</Text>
            <Text style={s.metaValue}>{capitalise(proposal.status)}</Text>
          </View>
          {proposal.depositAmount != null && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>DEPOSIT</Text>
              <Text style={s.metaValue}>{formatCurrency(proposal.depositAmount)}</Text>
            </View>
          )}
        </View>

        {/* ── Proposal title ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1C2D44' }}>
            {proposal.title}
          </Text>
        </View>

        {/* ── Bill-to ────────────────────────────────────────────────────── */}
        <View style={s.billToSection}>
          <Text style={s.billToLabel}>PREPARED FOR</Text>
          {proposal.organization && (
            <Text style={s.billToName}>{proposal.organization.name}</Text>
          )}
          {proposal.contact && (
            <Text style={s.billToDetail}>
              {proposal.contact.firstName} {proposal.contact.lastName}
              {proposal.contact.title ? ` — ${proposal.contact.title}` : ''}
            </Text>
          )}
          {proposal.contact?.email && (
            <Text style={s.billToDetail}>{proposal.contact.email}</Text>
          )}
          {proposal.organization?.website && (
            <Text style={s.billToDetail}>{proposal.organization.website}</Text>
          )}
        </View>

        {/* ── Situation / scope ──────────────────────────────────────────── */}
        {proposal.situation && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionLabel}>SITUATION & SCOPE</Text>
            <View style={s.situationBox}>
              <Text style={s.situationText}>{proposal.situation}</Text>
            </View>
          </View>
        )}

        {/* ── Line items ─────────────────────────────────────────────────── */}
        {proposal.lineItems.length > 0 && (
          <View style={s.table}>
            <Text style={s.sectionLabel}>SCOPE OF WORK</Text>

            {/* Header row */}
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.colDescription]}>DESCRIPTION</Text>
              <Text style={[s.tableHeaderCell, s.colQty]}>QTY</Text>
              <Text style={[s.tableHeaderCell, s.colPrice]}>UNIT PRICE</Text>
              <Text style={[s.tableHeaderCell, s.colTotal]}>TOTAL</Text>
            </View>

            {/* Data rows */}
            {proposal.lineItems.map((item, i) => (
              <View
                key={item.id}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tableCell, s.colDescription]}>{item.description}</Text>
                <Text style={[s.tableCell, s.colQty]}>{item.quantity}</Text>
                <Text style={[s.tableCell, s.colPrice]}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={[s.tableCellBold, s.colTotal]}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Total ──────────────────────────────────────────────────────── */}
        <View style={s.totalsBlock}>
          {proposal.depositAmount != null && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Deposit Due</Text>
              <Text style={s.totalsValue}>{formatCurrency(proposal.depositAmount)}</Text>
            </View>
          )}
          <View style={s.totalsRowFinal}>
            <Text style={s.totalsFinalLabel}>Total Value</Text>
            <Text style={s.totalsFinalValue}>{formatCurrency(proposal.totalValue)}</Text>
          </View>
        </View>

        {/* ── Agreement fields (accepted proposals) ─────────────────────── */}
        {proposal.agreementSignedAt && (
          <View style={{ marginBottom: 20 }}>
            <Text style={s.sectionLabel}>AGREEMENT</Text>
            <View style={s.situationBox}>
              <View style={{ flexDirection: 'row', gap: 32 }}>
                <View>
                  <Text style={s.metaLabel}>SIGNED</Text>
                  <Text style={s.metaValue}>{formatDate(proposal.agreementSignedAt)}</Text>
                </View>
                {proposal.agreementStartDate && (
                  <View>
                    <Text style={s.metaLabel}>START DATE</Text>
                    <Text style={s.metaValue}>{formatDate(proposal.agreementStartDate)}</Text>
                  </View>
                )}
                {proposal.agreementEstimatedEndDate && (
                  <View>
                    <Text style={s.metaLabel}>EST. END DATE</Text>
                    <Text style={s.metaValue}>{formatDate(proposal.agreementEstimatedEndDate)}</Text>
                  </View>
                )}
                {proposal.governingState && (
                  <View>
                    <Text style={s.metaLabel}>GOVERNING STATE</Text>
                    <Text style={s.metaValue}>{proposal.governingState}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        {proposal.notes && (
          <View style={s.notesBox}>
            <Text style={s.sectionLabel}>NOTES</Text>
            <Text style={s.notesText}>{proposal.notes}</Text>
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
