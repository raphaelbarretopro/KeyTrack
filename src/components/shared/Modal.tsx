import type { PropsWithChildren } from 'react'

interface ModalProps extends PropsWithChildren {
  title: string
  onClose: () => void
}

export const Modal = ({ children, title, onClose }: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6 backdrop-blur-sm sm:py-8">
    <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-panel sm:max-h-[calc(100vh-4rem)]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-teal">KeyTrack</p>
          <h3 className="text-2xl font-semibold text-brand-ink">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
        >
          Fechar
        </button>
      </div>
      {children}
    </div>
  </div>
)