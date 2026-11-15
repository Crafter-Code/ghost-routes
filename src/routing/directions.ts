import type { Graph, Leg, RouteResult } from './types'

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
}

export function buildDirections(graph: Graph, route: RouteResult): DirectionStep[] {
  if (!route.found) return []
  const node = (id: string) => graph.nodes[id]
  const steps: DirectionStep[] = [{ text: `Start at ${node(route.from).phrase}.`, legs: [] }]

  let i = 0
  while (i < route.legs.length) {
    const leg = route.legs[i]
    if (leg.edge.kind === 'walk') {
      const run: number[] = []
      while (i < route.legs.length && route.legs[i].edge.kind === 'walk') run.push(i++)
      const last = route.legs[run[run.length - 1]]
      const through = run
        .slice(0, -1)
        .map((index) => node(route.legs[index].to))
        .filter((n) => n.landmark)
        .map((n) => n.phrase)
      const via = through.length > 0 ? ` through ${joinList(through)}` : ''
      steps.push({ text: `Walk${via} to ${node(last.to).phrase}.`, legs: run })
      continue
    }
    steps.push({ text: describeLeg(graph, leg), legs: [i] })
    i++
  }
  return steps
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

/** "Main Entrance → Grand Staircase": entrance plus every floor change. */
export function routeSummary(graph: Graph, route: RouteResult): string {
  if (!route.found) return 'No route'
  const parts: string[] = []
  route.legs.forEach((leg) => {
    const to = graph.nodes[leg.to]
    if (to.kind === 'entrance') {
      const how = leg.edge.kind === 'ramp' ? ' (ramp)' : leg.edge.kind === 'steps' ? ' (front steps)' : ''
      parts.push(`${to.label}${how}`)
    }
    if (leg.edge.kind === 'stairs' || leg.edge.kind === 'lift') {
      parts.push(capitalize(leg.edge.name ?? leg.edge.kind))
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
    ? `${graph.nodes[entranceLeg.to].label}${entranceLeg.edge.kind === 'ramp' ? ' (ramp, step-free)' : entranceLeg.edge.kind === 'steps' ? ' (front steps)' : ''}`
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
