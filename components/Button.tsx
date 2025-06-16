import { JSX } from "preact";

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  children: JSX.Element | string;
}

export function Button(props: ButtonProps) {
  return (
    <button
      {...props}
      class={`px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-700 transition-colors ${props.class || ""}`}
    >
      {props.children}
    </button>
  );
} 