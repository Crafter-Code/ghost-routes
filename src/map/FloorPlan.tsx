import { useId } from 'react'
import { HOTEL, START } from '../routing/hotel'
import type { ScenarioPlan } from '../routing/plan'
import type { FloorId, GraphEdge, Leg } from '../routing/types'
import { CarpetPattern } from './carpets'
import { floorRides, legsOnFloor, lockSpots, type LockSpot } from './floorData'
import { doorFor, layoutFor, VIEW_WIDTH, type RoomShape } from './layout'

const nodeAt = (id: string) => HOTEL.nodes[id]

/** One polyline per run of connected legs, so dashes and joins stay continuous. */
function pathFor(legs: readonly Leg[]): string {
  let d = ''
  let last: string | null = null
  for (const leg of legs) {
    const from = nodeAt(leg.from)
    const to = nodeAt(leg.to)
    if (leg.from !== last) d += `M${from.x},${from.y}`
    d += `L${to.x},${to.y}`
    last = leg.to
  }
  return d
}

function Room({ room, carpetId, state }: { room: RoomShape; carpetId: string; state: 'target' | 'moved-from' | null }) {
  const cx = room.labelX ?? room.x + room.width / 2
  const cy = room.labelY ?? room.y + room.height / 2
  const variant = room.variant ?? 'room'
  return (
    <g className={`room room--${variant}${state ? ` room--${state}` : ''}`}>
      <rect x={room.x} y={room.y} width={room.width} height={room.height} fill={variant === 'carpet' ? `url(#${carpetId})` : undefined} />
      {variant === 'stairs' &&
        Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="stair-tread" x1={room.x + 34 + i * 16} x2={room.x + 34 + i * 16} y1={room.y + 40} y2={room.y + room.height - 26} />
        ))}
      {variant === 'library' &&
        // Bookshelves along the south wall
        Array.from({ length: 13 }, (_, i) => (
          <rect key={i} className="shelf" x={room.x + 12 + i * 20} y={room.y + room.height - 20} width={16} height={12} rx={1.5} />
        ))}
      {variant === 'hall' && (
        // A crescent moon inlaid in the floor of the Moonlight Hall
        <g className="hall-moon">
          <path d={`M${room.x + 70} ${room.y + 26}a34 34 0 1 0 0 68a44 44 0 0 1 0-68z`} />
          <circle cx={room.x + 112} cy={room.y + 36} r={3} />
          <circle cx={room.x + 128} cy={room.y + 70} r={2} />
          <circle cx={room.x + 100} cy={room.y + 96} r={2.4} />
        </g>
      )}
      {variant === 'gallery' &&
        // Portraits hung on the east wall
        [0, 1].map((i) => (
          <rect key={i} className="portrait" x={room.x + room.width - 18} y={room.y + 22 + i * 46} width={10} height={30} rx={2} />
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
        <text
          className={variant === 'carpet' ? 'room-name room-name--on-carpet' : 'room-name'}
          x={cx}
          y={variant === 'stairs' ? room.y + 26 : cy + 5}
          textAnchor="middle"
          transform={room.verticalName ? `rotate(-90 ${cx} ${cy + 5})` : undefined}
        >
          {room.name}
        </text>
      )}
      {variant === 'stairs' && room.stairNote && (
        <text className="stair-note" x={cx} y={room.y + room.height - 8} textAnchor="middle">
          {room.stairNote}
        </text>
      )}
    </g>
  )
}

function LockIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="lock" transform={`translate(${x - 14} ${y - 16})`}>
      <rect x="0" y="0" width="28" height="32" rx="6" className="lock__badge" />
      <path d="M9 13v-3.5a5 5 0 0 1 10 0V13" className="lock__shackle" />
      <rect x="7" y="13" width="14" height="12" rx="2.5" className="lock__body" />
    </g>
  )
}

function GhostIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="ghost-icon" transform={`translate(${x - 14} ${y - 30})`}>
      <path d="M2 30V14a12 12 0 0 1 24 0v16l-4-3-4 3-4-3-4 3-4-3z" />
      <circle cx="10" cy="14" r="2.2" className="ghost-icon__eye" />
      <circle cx="18" cy="14" r="2.2" className="ghost-icon__eye" />
    </g>
  )
}

/** Caption beside a lock (right of it when it fits, else under it), kept inside the drawing. */
function Caption({ x, y, text, strong, height }: { x: number; y: number; text: string; strong?: boolean; height: number }) {
  const width = text.length * 7.2 + 14
  const fitsRight = x + 18 + width <= VIEW_WIDTH - 2
  const left = fitsRight ? x + 18 : Math.min(Math.max(x - width / 2, 2), VIEW_WIDTH - width - 2)
  const top = fitsRight ? y - 10 : Math.min(y + 20, height - 24)
  return (
    <g className={`caption${strong ? ' caption--strong' : ''}`}>
      <rect x={left} y={top} width={width} height={20} rx={10} />
      <text x={left + width / 2} y={top + 14} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

function closedCaption(edge: GraphEdge): string {
  return edge.kind === 'lift' ? 'Out of service' : (edge.closedLabel ?? 'Closed')
}

function describeFloor(plan: ScenarioPlan, floor: FloorId, locks: LockSpot[]): string {
  const parts = [`Floor ${floor} plan.`]
  const target = nodeAt(plan.target)
  if (target.floor === floor) parts.push(`${target.label} is on this floor.`)
  if (plan.route.found && legsOnFloor(plan.route.legs, floor).length > 0) parts.push('The active route is drawn as a solid line.')
  for (const ride of floorRides(plan.route)) {
    if (nodeAt(ride.from).floor === floor) parts.push(`The route takes the ${ride.name} to Floor ${nodeAt(ride.to).floor}.`)
    else if (nodeAt(ride.to).floor === floor) parts.push(`The route arrives by the ${ride.name} from Floor ${nodeAt(ride.from).floor}.`)
  }
  if (plan.ghostDrawn && legsOnFloor(plan.ghostDrawn.legs, floor).length > 0 && plan.ghost) {
    parts.push(`A dashed ghost trail shows the old route. It ends at ${nodeAt(plan.ghost.endsAt).phrase}.`)
  }
  if (plan.failure && nodeAt(plan.failure.at).floor === floor) {
    parts.push(`Marked: ${plan.failure.label}, at ${nodeAt(plan.failure.at).phrase}.`)
  }
  const messages = [...new Set(locks.map((lock) => lock.edge.closedMessage ?? `${closedCaption(lock.edge)}.`))]
  if (messages.some((m) => m.includes('lift'))) parts.push('The lift is marked out of service.')
  for (const m of messages.filter((m) => !m.includes('lift'))) parts.push(m)
  return parts.join(' ')
}

/**
 * Which animations this render carries. Each value is the signature of the plan part that changed
 * (used as a React key, so a new change restarts the animation); null shows the final state.
 * App clears all three when the visitor switches floors or selects a step, so nothing replays.
 */
export interface MapAnimation {
  /** The old route turns into the dashed ghost trail. */
  ghost: string | null
  /** The detour draws in from the point where the routes part. */
  detour: string | null
  /** The door of the room the event moved to lights up. */
  door: string | null
}

const STILL: MapAnimation = { ghost: null, detour: null, door: null }

export interface FloorPlanProps {
  plan: ScenarioPlan
  floor: FloorId
  /** Small drawing for the floor switcher: no text, no test ids, hidden from assistive tech. */
  compact?: boolean
  /** Indexes into plan.route.legs to highlight (the selected text step). */
  highlight?: readonly number[]
  animation?: MapAnimation
}

export function FloorPlan({ plan, floor, compact = false, highlight = [], animation = STILL }: FloorPlanProps) {
  const layout = layoutFor(floor)
  const uid = useId().replace(/:/g, '')
  const carpetId = `carpet-${floor}-${uid}`
  const route = plan.route.found ? legsOnFloor(plan.route.legs, floor) : []
  // A detour: legs from the divergence point on are the newly found way round.
  const parted = plan.route.found && plan.divergeAt !== null ? plan.divergeAt : null
  const freshLegs = parted === null ? [] : legsOnFloor(plan.route.legs.slice(parted), floor)
  const sharedLegs = parted === null ? route : legsOnFloor(plan.route.legs.slice(0, parted), floor)
  const anim = compact ? STILL : animation
  // The door of the room the event moved to: the door its last leg passes, else the room node.
  const lastLeg = plan.route.found ? plan.route.legs[plan.route.legs.length - 1] : null
  const litDoor =
    plan.state.movedFrom && lastLeg && nodeAt(plan.target).floor === floor
      ? (doorFor(lastLeg.edge.id, floor) ?? nodeAt(plan.target))
      : null
  const ghost = plan.ghostDrawn ? legsOnFloor(plan.ghostDrawn.legs, floor) : []
  const highlighted = highlight.map((i) => plan.route.legs[i]).filter(Boolean)
  const highlightOnFloor = legsOnFloor(highlighted, floor)
  // Floor changes in the highlighted step: ring the lift or stair door on this floor.
  const highlightRings = [...new Set(highlighted.filter((leg) => nodeAt(leg.from).floor !== nodeAt(leg.to).floor).flatMap((leg) => [leg.from, leg.to]))]
    .map(nodeAt)
    .filter((n) => n.floor === floor)
  const rides = floorRides(plan.route)
  const locks = lockSpots(plan.closed, floor)
  const failure = plan.failure && nodeAt(plan.failure.at).floor === floor ? plan.failure : null
  const failureSpot = failure ? (locks.find((lock) => lock.edge.id === failure.edge.id) ?? { ...nodeAt(failure.at), key: failure.at, horizontal: false }) : null
  const target = nodeAt(plan.target)
  const start = nodeAt(START)
  const titleId = `floor-${floor}-title-${uid}`
  const descId = `floor-${floor}-desc-${uid}`
  const testId = (id: string) => (compact ? undefined : id)

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${layout.height}`}
      className={`floor__svg${compact ? ' floor__svg--compact' : ''}`}
      {...(compact ? { 'aria-hidden': true, focusable: false } : { role: 'img', 'aria-labelledby': `${titleId} ${descId}` })}
    >
      {!compact && <title id={titleId}>{layout.title}</title>}
      {!compact && <desc id={descId}>{describeFloor(plan, floor, locks)}</desc>}
      <defs>
        <CarpetPattern id={carpetId} floor={floor} />
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0" stopColor="var(--glow)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--glow)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {layout.outdoor && (
        <g className="outdoor" aria-hidden="true">
          <rect x="0" y="345" width={VIEW_WIDTH} height="95" className="outdoor__paving" />
          <rect x="625" y="0" width="75" height={layout.height} className="outdoor__paving" />
          {/* Gravel garden path up to the Garden Entrance */}
          <path d="M455 346 L455 372 Q455 404 420 410" className="gravel" />
          {/* Front steps */}
          {Array.from({ length: 4 }, (_, i) => (
            <line key={i} className="front-step" x1="296" x2="344" y1={348 + i * 6} y2={348 + i * 6} />
          ))}
          {/* Side ramp up to the Side Entrance */}
          <rect x="646" y="186" width="28" height="208" className="ramp" />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} className="ramp__chevron" d={`M652 ${384 - i * 28}l8 -8l8 8`} />
          ))}
          {!compact && (
            <>
              <text x="210" y="428" className="outdoor__label" textAnchor="middle">Hotel forecourt</text>
              <text x="530" y="392" className="outdoor__label" textAnchor="middle">Garden path</text>
              <text x="688" y="300" className="outdoor__label" transform="rotate(-90 688 300)" textAnchor="middle">Side ramp</text>
            </>
          )}
        </g>
      )}

      <g aria-hidden="true">
        {layout.corridors.map((c) => (
          <rect key={`${c.x}-${c.y}`} {...c} fill={`url(#${carpetId})`} className="corridor" />
        ))}
        {layout.rooms.map((room) =>
          compact ? (
            <rect
              key={room.id}
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              className={`room-mini room-mini--${room.variant ?? 'room'}${room.id === plan.target ? ' room-mini--target' : ''}`}
            />
          ) : (
            <Room
              key={room.id}
              room={room}
              carpetId={carpetId}
              state={room.id === plan.target ? 'target' : room.id === plan.state.movedFrom ? 'moved-from' : null}
            />
          ),
        )}
        <rect {...layout.building} className="outer-wall" />
        {layout.doors.map(({ gap: [x1, y1, x2, y2] }) => (
          <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} className="door-gap" />
        ))}
      </g>

      <g aria-hidden="true">
        {ghost.length > 0 && (
          <g
            key={anim.ghost ?? 'still'}
            className={anim.ghost ? 'anim-ghost' : undefined}
            data-testid={testId(`ghost-trail-${floor}`)}
            data-anim={anim.ghost ? 'ghost' : undefined}
          >
            <path d={pathFor(ghost)} className="ghost-trail-casing" />
            <path d={pathFor(ghost)} className="ghost-trail" />
          </g>
        )}
        {highlightOnFloor.length > 0 && (
          <path d={pathFor(highlightOnFloor)} className="route-highlight" data-testid={testId(`highlight-${floor}`)} />
        )}
        {freshLegs.length > 0 && (
          // Soft amber halo under the way round, so the detour stands out after it is drawn.
          <path
            key={`halo-${anim.detour ?? 'still'}`}
            d={pathFor(freshLegs)}
            className={`route-halo${anim.detour ? ' anim-halo' : ''}`}
            data-testid={testId(`detour-${floor}`)}
          />
        )}
        {route.length > 0 && (
          <g data-testid={testId(`route-${floor}`)}>
            {sharedLegs.length > 0 && <path d={pathFor(sharedLegs)} className="route-casing" />}
            {freshLegs.length > 0 && (
              <path
                key={`casing-${anim.detour ?? 'still'}`}
                d={pathFor(freshLegs)}
                pathLength={1}
                className={`route-casing${anim.detour ? ' anim-draw' : ''}`}
              />
            )}
            {sharedLegs.length > 0 && <path d={pathFor(sharedLegs)} className="route" />}
            {freshLegs.length > 0 && (
              <path
                key={`route-${anim.detour ?? 'still'}`}
                d={pathFor(freshLegs)}
                pathLength={1}
                className={`route${anim.detour ? ' anim-draw' : ''}`}
                data-anim={anim.detour ? 'detour' : undefined}
              />
            )}
          </g>
        )}
        {litDoor && (
          <g
            key={anim.door ?? 'still'}
            className={`lit-door${anim.door ? ' anim-door' : ''}`}
            data-testid={testId('lit-door')}
            data-anim={anim.door ? 'door' : undefined}
          >
            <circle cx={litDoor.x} cy={litDoor.y} r={40} className="lit-door__glow" fill={`url(#glow-${uid})`} />
            <circle cx={litDoor.x} cy={litDoor.y} r={20} className="lit-door__ring" />
          </g>
        )}
        {highlightRings.map((n) => (
          <circle key={n.id} cx={n.x} cy={n.y} r={17} className="step-ring" data-testid={testId(`highlight-${floor}`)} />
        ))}

        {!compact &&
          rides.flatMap((ride) => {
            const from = nodeAt(ride.from)
            const to = nodeAt(ride.to)
            const up = to.floor > from.floor
            const badges: { node: typeof from; text: string }[] = []
            if (from.floor === floor) badges.push({ node: from, text: `${up ? '↑' : '↓'} Floor ${to.floor}` })
            if (to.floor === floor) badges.push({ node: to, text: `from Floor ${from.floor}` })
            return badges.map(({ node, text }) => (
              <g
                key={`${ride.from}-${ride.to}-${node.id}`}
                className="floor-change"
                transform={`translate(${node.x} ${node.y})`}
                data-testid={`floor-change-${node.id}`}
              >
                <rect x="-46" y="-48" width="92" height="24" rx="12" />
                <text y="-31" textAnchor="middle">{text}</text>
              </g>
            ))
          })}

        {locks
          .filter((lock) => lock.key !== failureSpot?.key)
          .map((lock) => (
            <g key={lock.key} data-testid={testId(`lock-${lock.key}`)}>
              <LockIcon x={lock.x} y={lock.y} />
              {!compact && <Caption x={lock.x} y={lock.y} text={closedCaption(lock.edge)} height={layout.height} />}
            </g>
          ))}

        {failure && failureSpot && (
          <g data-testid={testId('failure-marker')} className="failure">
            <g data-testid={testId(`lock-${failureSpot.key}`)}>
              <LockIcon x={failureSpot.x} y={failureSpot.y} />
            </g>
            <g data-testid={testId('ghost-end')}>
              {/* Beside a lift or entrance lock; under and to the right of a door lock, clear of the room number. */}
              <GhostIcon
                x={failureSpot.horizontal ? failureSpot.x + 34 : failureSpot.x - 30}
                y={failureSpot.horizontal ? failureSpot.y + 46 : failureSpot.y}
              />
            </g>
            {!compact && <Caption x={failureSpot.x} y={failureSpot.y} text={failure.label} strong height={layout.height} />}
          </g>
        )}

        {start.floor === floor && (
          <g className="marker marker--start" transform={`translate(${start.x} ${start.y})`}>
            <circle r={compact ? 12 : 9} />
            {!compact && <text x="-16" y="5" textAnchor="end">Start</text>}
          </g>
        )}
        {target.floor === floor && (
          <g className="marker marker--target" transform={`translate(${target.x} ${target.y})${compact ? ' scale(1.6)' : ''}`}>
            <path d="M0 0c-9-12-13-17-13-24a13 13 0 0 1 26 0c0 7-4 12-13 24z" />
            <circle cy="-24" r="4.5" className="marker__dot" />
          </g>
        )}
      </g>
    </svg>
  )
}
