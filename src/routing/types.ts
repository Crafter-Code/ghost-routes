export type FloorId = 1 | 2

export type EdgeKind = 'walk' | 'ramp' | 'steps' | 'stairs' | 'lift'

export type Profile = 'steps-allowed' | 'step-free'

export type NodeKind = 'outdoor' | 'entrance' | 'corridor' | 'stairs' | 'lift' | 'room'

export interface GraphNode {
  id: string
  /** Short name, e.g. "Room 204". */
  label: string
  /** Name used inside sentences, e.g. "Room 204 (Gold Room)". */
  phrase: string
  floor: FloorId
  /** Position in the floor's SVG viewBox. */
  x: number
  y: number
  kind: NodeKind
  /** Named in collapsed walking steps ("Walk through the lobby to ..."). */
  landmark?: boolean
}

export interface GraphEdge {
  id: string
  /** Edges are undirected; from/to only fix the stored order. */
  from: string
  to: string
  kind: EdgeKind
  /** Estimated seconds with a loaded cart. Must be > 0. */
  cost: number
  /** Human name, e.g. "Grand Staircase", "lift", "side ramp". */
  name?: string
  /** Shown when this edge is closed, e.g. "The lift is out of service." */
  closedMessage?: string
}

export interface Graph {
  nodes: Readonly<Record<string, GraphNode>>
  edges: readonly GraphEdge[]
}

/** One traversal of an edge in a given direction. */
export interface Leg {
  edge: GraphEdge
  from: string
  to: string
}

export interface RouteResult {
  found: boolean
  from: string
  to: string
  profile: Profile
  /** Ordered node ids, start to target. Empty when not found. */
  nodes: string[]
  /** Ordered legs; legs[i] goes nodes[i] -> nodes[i + 1]. Empty when not found. */
  legs: Leg[]
  /** Sum of leg costs; Infinity when not found. */
  cost: number
}

export interface GhostTrail {
  /** Baseline legs before the first closed leg (may be empty). */
  legs: Leg[]
  /** Node where the trail ends: the `from` node of the first closed leg. */
  endsAt: string
  /** The first closed edge on the baseline route. */
  blockedBy: GraphEdge
}
