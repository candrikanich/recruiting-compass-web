export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  handler: () => void | Promise<void>;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}
