import { useEffect, useState } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  initialKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

export default function ApiKeyModal({ open, initialKey, onSave, onClose }: Props) {
  const [value, setValue] = useState(initialKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialKey);
      setSaved(false);
    }
  }, [open, initialKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    onSave(value.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-ink-500 bg-ink-700 p-5 shadow-2xl animate-pop-in sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Закрити"
        >
          <X size={20} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-acid/15 text-acid">
            <Key size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold">OpenRouter API Key</h2>
            <p className="text-sm text-gray-400">Зберігається у Supabase</p>
          </div>
        </div>

        <label
          htmlFor="openrouter-api-key"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400"
        >
          Ключ API
        </label>
        <input
          id="openrouter-api-key"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-or-v1-..."
          autoFocus
          autoComplete="off"
          inputMode="text"
          className="input-touch w-full rounded-xl border border-ink-500 bg-ink-800 px-4 py-3 text-sm font-mono text-white outline-none transition focus:border-acid focus:shadow-acid-glow"
        />

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-ink-800 p-3 text-xs text-gray-400">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-acid" />
          <span>
            Ключ шифрується та зберігається у Supabase. Без ключа тренування
            генерується з вбудованого банку вправ — повністю офлайн.
          </span>
        </div>

        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neon hover:text-neon-glow transition"
        >
          Отримати безкоштовний ключ <ExternalLink size={12} />
        </a>

        <button
          onClick={handleSave}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-acid px-4 py-3 text-base font-bold text-ink-900 transition hover:bg-acid-glow active:scale-[0.98]"
        >
          {saved ? (
            <>
              <Check size={20} /> Збережено
            </>
          ) : (
            'Зберегти ключ'
          )}
        </button>
      </div>
    </div>
  );
}
