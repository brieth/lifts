import { useState } from 'react';

/**
 * Numeric input whose display clears on focus, so the first keystroke starts a
 * fresh value (typing replaces the old one). It never selects text, which
 * avoids the mobile copy/paste callout that a select-all triggers. The old
 * value is only cleared visually — focusing and leaving without typing keeps
 * it — and it shows as a faded placeholder while the box is focused.
 */
export function NumField({
  value,
  placeholder,
  inputMode = 'numeric',
  onValue,
}: {
  value: number;
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal';
  onValue: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <input
      type="number"
      inputMode={inputMode}
      value={editing ? '' : value || ''}
      placeholder={editing && value ? String(value) : placeholder}
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={(e) => {
        setEditing(false);
        onValue(Number(e.target.value));
      }}
    />
  );
}
