import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgba(16, 20, 28, 0.82)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#F5F7FF',
          backdropFilter: 'blur(24px)',
          borderRadius: '18px',
        },
      }}
    />
  );
}
