import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowOfflineAlert(false);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowOfflineAlert(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOfflineAlert) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        Keine Verbindung. Verzug-Updates können nicht gespeichert werden.
      </AlertDescription>
    </Alert>
  );
}
