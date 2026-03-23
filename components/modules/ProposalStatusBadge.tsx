// Maps ProposalStatus to the appropriate Badge variant and label.

import { Badge } from '@/components/ui';
import type { ProposalStatus } from '@/lib/types/proposals';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

const STATUS_CONFIG: Record<ProposalStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
  draft:    { variant: 'gray',   label: 'Draft' },
  sent:     { variant: 'blue',   label: 'Sent' },
  viewed:   { variant: 'yellow', label: 'Viewed' },
  accepted: { variant: 'green',  label: 'Accepted' },
  declined: { variant: 'red',    label: 'Declined' },
  expired:  { variant: 'gray',   label: 'Expired' },
};

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const { variant, label } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
