import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  message: string;
  children?: ReactNode;
  onClose: () => void;
}

export function Modal({ title, message, children, onClose }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3 style={{ marginBottom: 12, color: '#ffffff' }}>{title}</h3>
        <p className="small mb-2" style={{ color: '#999999', lineHeight: 1.5 }}>{message}</p>
        {children}
      </div>
    </div>
  );
}
