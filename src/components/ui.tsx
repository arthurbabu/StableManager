import { Link } from "@/i18n/navigation";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 dark:border-neutral-700">
      {message}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  gray: "bg-stone-100 text-stone-600 dark:bg-neutral-800 dark:text-stone-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[color]}`}
    >
      {children}
    </span>
  );
}

export const buttonVariants = {
  primary: "bg-emerald-700 text-white hover:bg-emerald-800",
  secondary:
    "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-neutral-800 dark:text-stone-200 dark:hover:bg-neutral-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <button
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  variant = "primary",
  className = "",
  href,
}: {
  children: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  className?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-block rounded-lg px-3 py-2 text-center text-sm font-medium transition ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-stone-100 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-stone-100 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-stone-100 ${props.className ?? ""}`}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
    >
      {children}
    </label>
  );
}
