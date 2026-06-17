import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  showCancelReason?: boolean;
  cancelReason?: string;
  onCancelReasonChange?: (reason: string) => void;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  showCancelReason = false,
  cancelReason = '',
  onCancelReasonChange,
}: ConfirmDialogProps) {
  const [localReason, setLocalReason] = useState('');

  const handleReasonChange = (value: string) => {
    if (onCancelReasonChange) {
      onCancelReasonChange(value);
    } else {
      setLocalReason(value);
    }
  };

  const reasonValue = onCancelReasonChange ? cancelReason : localReason;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            variant === 'danger' ? 'bg-red-100' : 'bg-brand-beige'
          }`}
        >
          <AlertTriangle
            className={`w-8 h-8 ${variant === 'danger' ? 'text-red-500' : 'text-brand-brown'}`}
          />
        </div>
        <p className="text-brand-taupe mb-4 whitespace-pre-line">{message}</p>
        {showCancelReason && (
          <div className="w-full mb-4 text-left">
            <label className="block text-sm font-medium text-brand-brown mb-1.5">
              取消原因
            </label>
            <textarea
              value={reasonValue}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder="请输入取消原因..."
              rows={3}
              className="input-base resize-none"
            />
          </div>
        )}
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1">
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={variant === 'danger' ? 'btn-danger flex-1' : 'btn-primary flex-1'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
