import { Toast } from '@reviewsha/ui';
import { useUiStore } from '../../stores/ui.store';

export function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);
  return (
    <div className="toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} onClose={() => removeToast(toast.id)}>
          {toast.message}
        </Toast>
      ))}
    </div>
  );
}
