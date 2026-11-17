/** Logotipo oficial. `light` usa la versión con "Tax" en blanco para fondos oscuros. */
export function Logo({ light = false, className = "h-8" }: { light?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={light ? "/logo-light.png" : "/logo.png"} alt="Rapid Tax" width={769} height={166} className={`${className} w-auto`} />
  );
}
