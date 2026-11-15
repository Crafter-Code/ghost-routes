import { HOTEL, START } from '../routing/hotel'
import type { ScenarioPlan } from '../routing/plan'
import type { FloorId, Leg } from '../routing/types'
import { BUILDING, CORRIDOR, FLOORS, VIEWBOX, type RoomShape } from './layout'

const nodeAt = (id: string) => HOTEL.nodes[id]

/** Legs drawn on this floor: both ends on the floor and not a floor change. */
function legsOnFloor(legs: readonly Leg[], floor: FloorId): Leg[] {
  return legs.filter((leg) => nodeAt(leg.from).floor === floor && nodeAt(leg.to).floor === floor)
}

function pathFor(legs: readonly Leg[]): string {
  return legs.map((leg) => `M${nodeAt(leg.from).x},${nodeAt(leg.from).y}L${nodeAt(leg.to).x},${nodeAt(leg.to).y}`).join('')
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

const HEX_W = Math.sqrt(3) * 10
const HEX_H = 30

/** Own artwork: nested hexagons in the spirit of 1970s hotel carpets. */
function CarpetPattern({ id }: { id: string }) {
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

function Room({ room, carpetId, highlighted }: { room: RoomShape; carpetId: string; highlighted: 'target' | 'moved-from' | null }) {
  const cx = room.labelX ?? room.x + room.width / 2
  const cy = room.labelY ?? room.y + room.height / 2
  const variant = room.variant ?? 'room'
  return (
    <g className={`room room--${variant}${highlighted ? ` room--${highlighted}` : ''}`}>
      <rect
        x={room.x}
        y={room.y}
        width={room.width}
        height={room.height}
        fill={variant === 'carpet' ? `url(#${carpetId})` : undefined}
      />
      {variant === 'stairs' &&
        Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="stair-tread" x1={room.x + 30 + i * 16} x2={room.x + 30 + i * 16} y1={room.y + 40} y2={room.y + room.height - 30} />
        ))}
      {room.number ? (
        <>
          <text className="room-number" x={cx} y={cy + 6} textAnchor="middle">
            {room.number}
          </text>
          <text className="room-name" x={cx} y={cy + 28} textAnchor="middle">
            {room.name}
          </text>
        </>
      ) : (
        <text className={variant === 'carpet' ? 'room-name room-name--on-carpet' : 'room-name'} x={cx} y={variant === 'stairs' ? room.y + 26 : cy + 5} textAnchor="middle">
          {room.name}
        </text>
      )}
    </g>
  )
}

function LockIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="lock" transform={`translate(${x - 16} ${y - 18})`}>
      <rect x="0" y="0" width="32" height="36" rx="7" className="lock__badge" />
      <path d="M10 15v-4a6 6 0 0 1 12 0v4" className="lock__shackle" />
      <rect x="8" y="15" width="16" height="13" rx="2.5" className="lock__body" />
    </g>
  )
}

function GhostIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="ghost-icon" transform={`translate(${x - 14} ${y - 44})`}>
      <path d="M2 30V14a12 12 0 0 1 24 0v16l-4-3-4 3-4-3-4 3-4-3z" />
      <circle cx="10" cy="14" r="2.2" className="ghost-icon__eye" />
      <circle cx="18" cy="14" r="2.2" className="ghost-icon__eye" />
    </g>
  )
}

function describeFloor(plan: ScenarioPlan, floor: FloorId): string {
  const parts = [`Floor ${floor} plan.`]
  const target = nodeAt(plan.target)
  if (target.floor === floor) parts.push(`${target.label} is on this floor.`)
  if (plan.route.found && legsOnFloor(plan.route.legs, floor).length > 0) parts.push('The active route is drawn as a solid line.')
  if (plan.ghost && legsOnFloor(plan.ghost.legs, floor).length > 0) {
    parts.push(`A dashed ghost trail shows the old route. It ends at ${nodeAt(plan.ghost.endsAt).phrase}.`)
  }
  if (plan.closed.size > 0) parts.push('The lift is marked out of service.')
  return parts.join(' ')
}

export function FloorPlan({ plan, floor }: { plan: ScenarioPlan; floor: FloorId }) {
  const layout = FLOORS.find((f) => f.floor === floor)!
  const carpetId = `carpet-${floor}`
  const route = plan.route.found ? legsOnFloor(plan.route.legs, floor) : []
  const ghost = plan.ghost ? legsOnFloor(plan.ghost.legs, floor) : []
  const closedEdges = HOTEL.edges.filter((e) => plan.closed.has(e.id))
  const floorChanges = plan.route.found
    ? plan.route.legs.filter((leg) => leg.edge.kind === 'stairs' || leg.edge.kind === 'lift')
    : []
  const target = nodeAt(plan.target)
  const start = nodeAt(START)
  const titleId = `floor-${floor}-title`
  const descId = `floor-${floor}-desc`

  return (
    <figure className="floor" data-testid={`floor-${floor}`}>
      <figcaption className="floor__title">{layout.title}</figcaption>
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${layout.outdoor ? VIEWBOX.height : 360}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className="floor__svg"
      >
        <title id={titleId}>{layout.title}</title>
        <desc id={descId}>{describeFloor(plan, floor)}</desc>
        <defs>
          <CarpetPattern id={carpetId} />
        </defs>

        {layout.outdoor && (
          <g className="outdoor" aria-hidden="true">
            <rect x="0" y="345" width={VIEWBOX.width} height="95" className="outdoor__paving" />
            <rect x="625" y="0" width="75" height="440" className="outdoor__paving" />
            <text x="420" y="432" className="outdoor__label" textAnchor="middle">Hotel forecourt</text>
            {/* Front steps */}
            {Array.from({ length: 4 }, (_, i) => (
              <line key={i} className="front-step" x1="296" x2="344" y1={348 + i * 6} y2={348 + i * 6} />
            ))}
            {/* Side ramp */}
            <rect x="646" y="214" width="28" height="180" className="ramp" />
            {Array.from({ length: 6 }, (_, i) => (
              <path key={i} className="ramp__chevron" d={`M652 ${380 - i * 28}l8 -8l8 8`} />
            ))}
            <text x="686" y="300" className="outdoor__label" transform="rotate(-90 686 300)" textAnchor="middle">Side ramp</text>
          </g>
        )}

        <g aria-hidden="true">
          <rect {...CORRIDOR} fill={`url(#${carpetId})`} className="corridor" />
          {layout.rooms.map((room) => (
            <Room
              key={room.id}
              room={room}
              carpetId={carpetId}
              highlighted={room.id === plan.target ? 'target' : room.id === plan.state.movedFrom ? 'moved-from' : null}
            />
          ))}
          <rect {...BUILDING} className="outer-wall" />
          {layout.doors.map(([x1, y1, x2, y2]) => (
            <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} className="door-gap" />
          ))}
        </g>

        <g aria-hidden="true">
          {ghost.length > 0 && (
            <path d={pathFor(ghost)} className="ghost-trail" data-testid={`ghost-trail-${floor}`} />
          )}
          {route.length > 0 && (
            <>
              <path d={pathFor(route)} className="route-casing" />
              <path d={pathFor(route)} className="route" data-testid={`route-${floor}`} />
            </>
          )}

          {floorChanges.map((leg) => {
            const from = nodeAt(leg.from)
            const to = nodeAt(leg.to)
            const here = from.floor === floor ? from : to.floor === floor ? to : null
            if (!here) return null
            const text = from.floor === floor ? `${to.floor > from.floor ? '↑' : '↓'} Floor ${to.floor}` : `from Floor ${from.floor}`
            return (
              <g key={`${leg.edge.id}-${floor}`} className="floor-change" transform={`translate(${here.x} ${here.y})`}>
                <rect x="-44" y="-44" width="88" height="24" rx="12" />
                <text y="-27" textAnchor="middle">{text}</text>
              </g>
            )
          })}

          {closedEdges.flatMap((edge) =>
            [edge.from, edge.to]
              .map(nodeAt)
              .filter((n) => n.floor === floor)
              .map((n) => (
                <g key={`${edge.id}-${n.id}`} data-testid={`lock-${n.id}`}>
                  <LockIcon x={n.x} y={n.y} />
                  <text x={n.x} y={n.y + 34} textAnchor="middle" className="lock__label">Out of service</text>
                </g>
              )),
          )}

          {plan.ghost && nodeAt(plan.ghost.endsAt).floor === floor && (
            <g data-testid="ghost-end">
              <GhostIcon x={nodeAt(plan.ghost.endsAt).x - 34} y={nodeAt(plan.ghost.endsAt).y + 6} />
            </g>
          )}

          {start.floor === floor && (
            <g className="marker marker--start" transform={`translate(${start.x} ${start.y})`}>
              <circle r="9" />
              <text x="-16" y="5" textAnchor="end">Start</text>
            </g>
          )}
          {target.floor === floor && (
            <g className="marker marker--target" transform={`translate(${target.x} ${target.y})`}>
              <path d="M0 0c-9-12-13-17-13-24a13 13 0 0 1 26 0c0 7-4 12-13 24z" />
              <circle cy="-24" r="4.5" className="marker__dot" />
            </g>
          )}
        </g>
      </svg>
    </figure>
  )
}
