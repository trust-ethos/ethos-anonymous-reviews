import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export interface ToastData {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
  }>;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-900 border-green-700 text-green-100";
      case "error":
        return "bg-red-900 border-red-700 text-red-100";
      case "info":
      default:
        return "bg-blue-900 border-blue-700 text-blue-100";
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case "error":
        return (
          <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div class={`max-w-sm w-full border rounded-lg shadow-lg p-4 ${getToastStyles()} animate-slide-in`}>
      <div class="flex items-start">
        <div class="flex-shrink-0">
          {getIcon()}
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium">
            {toast.title}
          </p>
          <p class="mt-1 text-sm opacity-90">
            {toast.message}
          </p>
          {toast.actions && toast.actions.length > 0 && (
            <div class="mt-3 flex space-x-2">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.onClick) action.onClick();
                    if (action.href) window.open(action.href, '_blank');
                  }}
                  class="text-sm font-medium underline hover:no-underline opacity-90 hover:opacity-100"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => onClose(toast.id)}
            class="inline-flex text-gray-400 hover:text-gray-200 focus:outline-none"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export const toasts = useSignal<ToastData[]>([]);

export function addToast(toast: Omit<ToastData, "id">) {
  const id = crypto.randomUUID();
  toasts.value = [...toasts.value, { ...toast, id }];
}

export function removeToast(id: string) {
  toasts.value = toasts.value.filter(toast => toast.id !== id);
}

export default function ToastContainer() {
  return (
    <div class="fixed top-4 right-4 z-50 space-y-2">
      {toasts.value.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
} 