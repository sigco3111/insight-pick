
import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 48, message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4" role="status" aria-live="polite">
      <LoaderCircle className="animate-spin text-primary" style={{ width: size, height: size }} aria-hidden="true" />
      {message && <p className="mt-2 text-neutral-700 dark:text-neutral-300">{message}</p>}
      <span className="sr-only">{message || "로딩 중..."}</span>
    </div>
  );
};

export default LoadingSpinner;