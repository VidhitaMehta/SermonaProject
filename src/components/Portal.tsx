import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders modals directly into <body>. Needed because the frosted-glass panels use
 * `backdrop-filter`, which would otherwise trap `position: fixed` popups inside the panel.
 */
export const Portal = ({ children }: { children: ReactNode }) =>
  typeof document === 'undefined' ? null : createPortal(<div className="modal-root">{children}</div>, document.body);
