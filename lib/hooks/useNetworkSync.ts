import { useEffect } from 'react';
import { useSyncStore } from '../store/useSyncStore';
import apiInstance from '../services/apiConfig';
import { toast } from 'sonner';

export const useNetworkSync = () => {
  const { setOnline, isOnline, queue, loadQueue, removeRequest, setSyncing, isSyncing } = useSyncStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, loadQueue]);

  useEffect(() => {
    const processQueue = async () => {
      if (isOnline && queue.length > 0 && !isSyncing) {
        setSyncing(true);
        try {
          for (const req of queue) {
            await apiInstance({
              url: req.config.url,
              method: req.config.method,
              data: req.config.data,
              headers: req.config.headers,
              params: req.config.params,
            });
            await removeRequest(req.id);
          }
          toast.success('Sincronización completada. Todos los cambios fueron guardados.');
        } catch (error) {
          console.error('Error durante la sincronización:', error);
          toast.error('Ocurrió un error al sincronizar algunos cambios.');
        } finally {
          setSyncing(false);
        }
      }
    };
    processQueue();
  }, [isOnline, queue, isSyncing, removeRequest, setSyncing]);
};
