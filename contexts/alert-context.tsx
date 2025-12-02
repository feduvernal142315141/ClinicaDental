"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

type AlertType = "confirm" | "success" | "error";

interface AlertState {
  type: AlertType;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

interface AlertContextType {
  showConfirm: (options: Omit<AlertState, "type">) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  close: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showConfirm = (options: Omit<AlertState, "type">) =>
    setAlert({ ...options, type: "confirm" });

  const showSuccess = (title: string, description?: string) =>
    setAlert({ type: "success", title, description });

  const showError = (title: string, description?: string) =>
    setAlert({ type: "error", title, description });

  const close = () => setAlert(null);

  return (
    <AlertContext.Provider value={{ showConfirm, showSuccess, showError, close }}>
      {children}

      <AlertDialog open={!!alert} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alert?.title}</AlertDialogTitle>
            {alert?.description && (
              <AlertDialogDescription>
                {alert.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter>
            {alert?.type === "confirm" ? (
              <>
                <AlertDialogCancel>
                  {alert.cancelText ?? "Cancelar"}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    alert.onConfirm?.();
                    close();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {alert.confirmText ?? "Confirmar"}
                </AlertDialogAction>
              </>
            ) : (
              <Button onClick={close} className={cn(
                alert?.type === "success" && "bg-green-600 hover:bg-green-700",
                alert?.type === "error" && "bg-destructive hover:bg-destructive/90"
              )}>
                OK
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used within AlertProvider");
  return context;
}
