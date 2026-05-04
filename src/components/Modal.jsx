export default function Modal({
  open,
  onClose,
  size,
  children,
  labelledBy,
  describedBy,
  className = '',
}) {
  if (!open) return null

  const sizeClass = size ? `modal--${size}` : ''
  const modalClassName = ['modal', sizeClass, className].filter(Boolean).join(' ')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

