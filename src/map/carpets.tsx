import type { FloorId } from '../routing/types'

/** Original carpet artwork for this project, one pattern per floor. */

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

const HEX_W = Math.sqrt(3) * 10
const HEX_H = 30

/** Floor 1: nested hexagons in the spirit of 1970s hotel carpets. */
function Hexagons({ id }: { id: string }) {
  const tiles: [number, number][] = [
    [HEX_W / 2, 10],
    [0, 25],
    [HEX_W, 25],
    [0, -5],
    [HEX_W, -5],
  ]
  return (
    <pattern id={id} width={HEX_W} height={HEX_H} patternUnits="userSpaceOnUse" patternTransform="scale(1.1)">
      <rect width={HEX_W} height={HEX_H} fill="var(--carpet-base)" />
      {tiles.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <polygon points={hexPoints(cx, cy, 9.2)} fill="var(--carpet-ring)" />
          <polygon points={hexPoints(cx, cy, 6.4)} fill="var(--carpet-base)" />
          <polygon points={hexPoints(cx, cy, 4.2)} fill="var(--carpet-core)" />
        </g>
      ))}
    </pattern>
  )
}

/** Floor 2: lantern diamonds on a lattice. */
function Lanterns({ id }: { id: string }) {
  return (
    <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="var(--carpet-base)" />
      <path d="M0 0L24 24M24 0L0 24" stroke="var(--carpet-core)" strokeWidth="2" />
      <path d="M12 3L18 12L12 21L6 12Z" fill="var(--carpet-ring)" />
      <path d="M12 8L15 12L12 16L9 12Z" fill="var(--carpet-glow)" />
    </pattern>
  )
}

/** Floor 3: crescent moons and small stars. */
function Moons({ id }: { id: string }) {
  return (
    <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
      <rect width="28" height="28" fill="var(--carpet-night)" />
      <path d="M11 4a8 8 0 1 0 0 16a6 6 0 1 1 0-16z" fill="var(--carpet-ring)" />
      <circle cx="22" cy="21" r="1.8" fill="var(--carpet-glow)" />
      <circle cx="24" cy="7" r="1.2" fill="var(--carpet-glow)" />
    </pattern>
  )
}

export function CarpetPattern({ id, floor }: { id: string; floor: FloorId }) {
  if (floor === 2) return <Lanterns id={id} />
  if (floor === 3) return <Moons id={id} />
  return <Hexagons id={id} />
}
