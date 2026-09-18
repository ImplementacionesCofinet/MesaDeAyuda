import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mesa de ayuda · Cofinet",
  description:
    "Canal único de requerimientos del área de Datos y TI: estado, etapa, responsable y fecha estimada de cierre siempre visibles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
