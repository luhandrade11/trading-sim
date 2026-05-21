"use client";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#080c14]/80 backdrop-blur-md"
        onClick={onCancel}
      />
      <div className="relative bg-[#0d1117] border border-[#1e2a42] rounded-2xl p-7 w-full max-w-sm card-shadow">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
          danger ? "bg-rose-500/10 border border-rose-500/20" : "bg-amber-400/10 border border-amber-400/20"
        }`}>
          <span className="text-xl">{danger ? "⚠" : "◆"}</span>
        </div>

        <h3 className="text-white font-bold text-base mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-7">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white border border-[#1e2a42] hover:border-[#2d4070] transition-all font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              danger
                ? "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white"
                : "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#080c14]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
