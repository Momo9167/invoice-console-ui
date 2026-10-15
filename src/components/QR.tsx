// QR code as inline SVG. Pure (no hooks), so it renders in the live preview, on /print for PDFs, and on the server.
import QRCode from 'qrcode';

export function QR({ value, size = 84, className }: { value: string; size?: number; className?: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = modules.size, quiet = 2, total = n + quiet * 2;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges" role="img" aria-label={value}>
      <rect width={total} height={total} fill="#fff" />
      <path d={d} fill="#141a24" />
    </svg>
  );
}
