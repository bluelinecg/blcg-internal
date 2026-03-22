// Renders a colored Badge for a client's status value.
// Props:
//   status — 'active' | 'inactive' | 'prospect'

import { Badge } from '@/components/ui';
import type { ClientStatus } from '@/lib/types/clients';

interface StatusBadgeProps {
  status: ClientStatus;
}

const STATUS_MAP: Record<ClientStatus, { label: string; variant: 'green' | 'blue' | 'gray' }> = {
  active: { label: 'Active', variant: 'green' },
  prospect: { label: 'Prospect', variant: 'blue' },
  inactive: { label: 'Inactive', variant: 'gray' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = STATUS_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}
