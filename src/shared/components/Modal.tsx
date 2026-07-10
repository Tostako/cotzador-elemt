import type { ReactNode } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ModalProps {
  title: string;
  message: string;
  children?: ReactNode;
  onClose: () => void;
}

export function Modal({ title, message, children, onClose }: ModalProps) {
  useEscapeKey(onClose);
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3 style={{ marginBottom: 12, color: '#ffffff' }}>{title}</h3>
        <p className="small mb-2" style={{ color: '#999999', lineHeight: 1.5 }}>{message}</p>
        {children}
      </div>
    </div>
  );
}
