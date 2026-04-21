import { Toaster as SonnerToaster } from "sonner";
export function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      toastOptions={{
        style: {
          borderColor: "#2bb6a3",
        },
      }}
    />
  );
}
