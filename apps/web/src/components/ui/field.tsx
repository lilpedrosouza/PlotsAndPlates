import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

const controlClass = cn(
  "w-full min-w-0 bg-surface text-foreground text-base",
  "border border-rule-strong rounded-md px-3.5",
  "placeholder:text-soft outline-none transition-colors duration-fast",
  "hover:border-foreground/60 focus-visible:border-brand focus-visible:outline-offset-0",
  "aria-invalid:border-danger disabled:opacity-50 disabled:cursor-not-allowed",
  "plots:bg-sunken plots:border-rule-strong",
);

type FieldShellProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Texto à direita do rótulo, como um contador de caracteres. */
  aside?: ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Rótulo sempre visível, dica e erro ligados ao controle por aria-describedby. */
export function FieldShell({ label, hint, error, aside, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-micro text-[0.8125rem] text-soft">
          {label}
        </label>
        {aside ? <span className="font-micro text-xs text-soft">{aside}</span> : null}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "children"> & Omit<FieldShellProps, "children"> & {
  /** Elemento fixo antes do texto, como o "@" do username. */
  prefix?: string;
};

export function TextField({ label, hint, error, aside, className, prefix, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} aside={aside} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          {prefix ? (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-soft">
              {prefix}
            </span>
          ) : null}
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, "h-12", prefix && "pl-8")}
            {...props}
          />
        </div>
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "children"> & Omit<FieldShellProps, "children">;

export function TextAreaField({ label, hint, error, aside, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} aside={aside} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, "min-h-24 resize-y py-3 leading-relaxed")}
          {...props}
        />
      )}
    </FieldShell>
  );
}
