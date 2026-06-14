"use client";

import React from "react";
// store will be created by Core Developer
import { useSyncStore } from "@/lib/store/useSyncStore";
import { AlertOutlined, CloudSyncOutlined } from "@ant-design/icons";

export function OfflineBanner() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const queue = useSyncStore((state) => state.queue || []);

  if (isOnline && !isSyncing) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-sm flex items-start gap-3 shadow-md transition-all duration-300 ${
        isOnline && isSyncing 
          ? 'bg-green-100 text-green-800 border-b border-green-200' 
          : 'bg-yellow-100 text-yellow-800 border-b border-yellow-200'
      }`}
    >
      <div className="mt-0.5">
        {!isOnline ? (
          <AlertOutlined className="text-lg text-yellow-600" />
        ) : (
          <CloudSyncOutlined className="text-lg text-green-600 animate-pulse" />
        )}
      </div>
      <div className="flex-1">
        {!isOnline ? (
          <>
            <p className="font-bold mb-1">Estás trabajando sin conexión.</p>
            <p className="mb-1">
              No te preocupes, los cambios que estás haciendo se están guardando localmente de forma segura.
            </p>
            <p className="m-0 text-yellow-700/80">
              La información se sincronizará automáticamente tan pronto como recuperes la conexión a internet.
            </p>
          </>
        ) : (
          <div className="flex items-center h-full">
            <p className="font-bold m-0">
              Sincronizando {queue.length > 0 ? `${queue.length} ` : ''}cambios...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
