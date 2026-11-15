import type { FloorId, Graph, Leg, RouteResult } from './types'

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * Numbered steps for a route. Runs of walking legs collapse into one step.
 * Every leg of the route belongs to exactly one step, in order.
 */
export interface DirectionStep {
  text: string
  /** Indexes into route.legs covered by this step. */
  legs: number[]
  /** Floor where the step ends. The start step has the floor of the start node. */
  floor: FloorId
}

export function buildDirections(graph: Graph, route: RouteResult): DirectionStep[] {
  if (!route.found) return []
  const node = (id: string) => graph.nodes[id]
  const steps: DirectionStep[] = [{ text: `Start at ${node(route.from).phrase}.`, legs: [], floor: node(route.from).floor }]

  let i = 0
  while (i < route.legs.length) {
    const leg = route.legs[i]
    if (leg.edge.kind === 'walk') {
      // A run of walking legs is one step. It ends at an entrance, so that the entrance gets its own step.
      const run: number[] = []
      while (i < route.legs.length && route.legs[i].edge.kind === 'walk') {
        run.push(i++)
        if (node(route.legs[run[run.length - 1]].to).kind === 'entrance') break
      }
      const last = route.legs[run[run.length - 1]]
      const arrival = node(last.to)
      const through = run
        .slice(0, -1)
        .map((index) => node(route.legs[index].to))
        .filter((n) => n.landmark)
        .map((n) => n.phrase)
      const via = through.length > 0 ? ` through ${joinList(through)}` : ''
      const level = arrival.kind === 'entrance' ? ' Level entrance, no steps.' : ''
      steps.push({ text: `Walk${via} to ${arrival.phrase}.${level}`, legs: run, floor: arrival.floor })
      continue
    }
    if (leg.edge.kind === 'lift' || leg.edge.kind === 'stairs') {
      // Consecutive legs of the same lift or staircase are one step: "Take the lift up to Floor 3."
      const run = [i++]
      while (
        i < route.legs.length &&
        route.legs[i].edge.kind === leg.edge.kind &&
        route.legs[i].edge.name === leg.edge.name &&
        direction(graph, route.legs[i]) === direction(graph, leg)
      ) {
        run.push(i++)
      }
      const last = route.legs[run[run.length - 1]]
      steps.push({ text: describeLeg(graph, { ...leg, to: last.to }), legs: run, floor: node(last.to).floor })
      continue
    }
    steps.push({ text: describeLeg(graph, leg), legs: [i], floor: node(leg.to).floor })
    i++
  }
  return steps
}

function direction(graph: Graph, leg: Leg): 'up' | 'down' {
  return graph.nodes[leg.to].floor > graph.nodes[leg.from].floor ? 'up' : 'down'
}

function describeLeg(graph: Graph, leg: Leg): string {
  const from = graph.nodes[leg.from]
  const to = graph.nodes[leg.to]
  const direction = to.floor > from.floor ? 'up' : 'down'
  switch (leg.edge.kind) {
    case 'ramp':
      return `Take the ${leg.edge.name ?? 'ramp'} to ${to.phrase}. No steps.`
    case 'steps':
      return `Use the ${leg.edge.name ?? 'steps'} to reach ${to.phrase}.`
    case 'stairs':
      return `Take the ${leg.edge.name ?? 'stairs'} ${direction} to Floor ${to.floor}.`
    case 'lift':
      return `Take the ${leg.edge.name ?? 'lift'} ${direction} to Floor ${to.floor}.`
    case 'walk':
      return `Walk to ${to.phrase}.`
  }
}

/** "Main Entrance → Grand Staircase": entrance, every floor change and named stretches, once each. */
export function routeSummary(graph: Graph, route: RouteResult): string {
  if (!route.found) return 'No route'
  const parts: string[] = []
  let lastFloorChange: string | null = null
  let lastVia: string | null = null
  route.legs.forEach((leg) => {
    const to = graph.nodes[leg.to]
    if (to.kind === 'entrance') {
      const how =
        leg.edge.kind === 'ramp' ? ' (ramp)' : leg.edge.kind === 'steps' ? ' (front steps)' : leg.edge.kind === 'walk' ? ' (level)' : ''
      parts.push(`${to.label}${how}`)
    }
    if (leg.edge.kind === 'stairs' || leg.edge.kind === 'lift') {
      // The same lift or staircase over several floors is listed once.
      const name = capitalize(leg.edge.name ?? leg.edge.kind)
      if (name !== lastFloorChange) parts.push(name)
      lastFloorChange = name
    } else {
      lastFloorChange = null
    }
    if (leg.edge.via) {
      if (leg.edge.via !== lastVia) parts.push(leg.edge.via)
      lastVia = leg.edge.via
    } else {
      lastVia = null
    }
  })
  return parts.join(' → ')
}

/** Plain-text directions a guest can paste into an email or chat. */
export function buildGuestText(graph: Graph, route: RouteResult, profileLabel: string): string {
  if (!route.found) return ''
  const target = graph.nodes[route.to]
  const entranceLeg = route.legs.find((leg) => graph.nodes[leg.to].kind === 'entrance')
  const entrance = entranceLeg
    ? `${graph.nodes[entranceLeg.to].label}${entranceLeg.edge.kind === 'ramp' ? ' (ramp, step-free)' : entranceLeg.edge.kind === 'steps' ? ' (front steps)' : ' (level, step-free)'}`
    : 'Any entrance'
  const steps = buildDirections(graph, route)
  return [
    `Event: ${target.phrase}`,
    `Entrance: ${entrance}`,
    `Floor: ${target.floor}`,
    `Route: ${profileLabel}`,
    '',
    ...steps.map((step, index) => `${index + 1}. ${step.text}`),
  ].join('\n')
}
