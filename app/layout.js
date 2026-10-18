import "./globals.css";

export const metadata = {
  title: "Señal perdida",
  description: "Un noticiero, una desaparición y las evidencias que quedaron.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
