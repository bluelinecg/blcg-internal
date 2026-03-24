'use client';

// Confirmation dialog for destructive actions.
// In "blocked" mode (when blockedBy is provided), the confirm button is disabled
// and the blocking dependencies are listed — the user must resolve them first.
// In normal mode, shows a standard "are you sure?" with a confirm/cancel pair.
//
// Props:
//   isOpen       — controls visibility
//   onClose      — callback to cancel/dismiss
//   onConfirm    — callback when user confirms (only available when not blocked)
//   title        — dialog heading
//   description  — body text explaining what will happen
//   confirmLabel — label for the confirm button (default: 'Delete')
//   confirmVariant — 'danger' | 'primary' (default: 'danger')
//   blockedBy    — array of dependency strings that block deletion; if non-empty, confirm is disabled

import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  blockedBy?: string[];
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  blockedBy = [],
  isLoading = false,
}: ConfirmDialogProps) {
  const isBlocked = blockedBy.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-gray-600">{description}</p>

        {isBlocked && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">Cannot delete — resolve these first:</p>
            <ul className="space-y-0.5">
              {blockedBy.map((dep, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  {dep}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isBlocked || isLoading}
          >
            {isLoading ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
