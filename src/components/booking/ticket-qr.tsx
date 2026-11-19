import QRCode from "qrcode";

/** Render the ticket code as a local vector image in both server and client views. */
export function TicketQr({
  value,
  label,
  size = 120,
  className,
}: {
  value: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const margin = 4;
  const extent = modules.size + margin * 2;
  const paths: string[] = [];

  for (let row = 0; row < modules.size; row++) {
    let start = -1;
    for (let column = 0; column <= modules.size; column++) {
      const dark =
        column < modules.size && modules.data[row * modules.size + column];
      if (dark && start === -1) start = column;
      if (!dark && start !== -1) {
        const width = column - start;
        paths.push(`M${start + margin} ${row + margin}h${width}v1h-${width}z`);
        start = -1;
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${extent} ${extent}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={className}
      shapeRendering="crispEdges"
      data-ticket-qr
    >
      <rect width={extent} height={extent} fill="#fff" />
      <path d={paths.join("")} fill="#111" />
    </svg>
  );
}
