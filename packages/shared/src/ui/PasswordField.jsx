import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { TextField } from "./TextField.jsx";

/**
 * Password input with a show/hide button — on a phone, seeing what you typed beats
 * typing it twice. forwardRef for react-hook-form.
 */
export const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <TextField
      ref={ref}
      icon={Lock}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      }
      {...props}
    />
  );
});
