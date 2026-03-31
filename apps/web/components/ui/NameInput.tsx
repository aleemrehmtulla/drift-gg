import { MAX_PLAYER_NAME_LENGTH } from "@repo/shared";
import { useUISound } from "@/hooks/useUISound";

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string | null;
  onErrorClear?: () => void;
}

export function NameInput({
  value,
  onChange,
  onSubmit,
  error,
  onErrorClear,
}: NameInputProps) {
  const { playKeystroke, playDelete } = useUISound();

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value.slice(0, MAX_PLAYER_NAME_LENGTH);
          v.length < value.length ? playDelete() : playKeystroke();
          onChange(v);
          onErrorClear?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder="your name"
        maxLength={MAX_PLAYER_NAME_LENGTH}
        className="w-full rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
        autoComplete="off"
      />
      {error && (
        <p className="text-sm font-medium text-[var(--error)]">{error}</p>
      )}
    </>
  );
}
