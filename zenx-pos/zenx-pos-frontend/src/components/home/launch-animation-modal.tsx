'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, X } from 'lucide-react'
import './launch-animation-modal.css'

// One 9 s loop: type on the home row, press Enter, wait 1 s while the signal runs to the printer,
// print JUST LAUNCHED, hold, tear off. The keyframes in launch-animation-modal.css use the same loop.
const ENTER_AT = 2.85
const STRIKE = 0.36 // seconds from the start of a tap until the finger reaches the key
const REACH = 0.55 // the right hand starts moving to Enter this long before the press

// When each key is struck. The right little finger also strikes Enter, after the hand slides across.
const TAPS: Record<string, number[]> = {
  F: [0.3, 1.0], J: [0.52, 1.64], D: [0.76], K: [1.22], S: [1.42], L: [1.84], A: [2.04], ';': [2.26], Enter: [ENTER_AT],
}
const fingerTaps = (key: string) => key === ';' ? [...TAPS[key], ENTER_AT] : TAPS[key]

type Point = [number, number]
type Tone = 'cream' | 'grey' | 'yellow' | 'red' | 'brown' | 'blue' | 'enter'

// [top, side, legend]
const TONES: Record<Tone, [string, string, string]> = {
  cream: ['#F5EFDE', '#CBBE9E', '#6E624E'],
  grey: ['#D6CCB5', '#A79C82', '#5E5544'],
  yellow: ['#FFCB3A', '#D49F17', '#4A3608'],
  red: ['#FF5D58', '#CC3936', '#FFF4F2'],
  brown: ['#A26F51', '#734A31', '#FFF1E6'],
  blue: ['#33B7FF', '#1886CB', '#062A42'],
  enter: ['#42DFFF', '#14A4C4', '#04313C'],
}

// The keyboard lies on a tilted plane: u runs across it, v from the back edge to the front.
const BOARD = { width: 16.6, depth: 6.7, back: 372, front: 548, centre: 500, unit: 43, lift: 6 }
const scaleAt = (v: number) => 0.82 + 0.18 * (v / BOARD.depth)
const project = (u: number, v: number, lift = 0): Point => [
  BOARD.centre + (u - BOARD.width / 2) * BOARD.unit * scaleAt(v),
  BOARD.back + (BOARD.front - BOARD.back) * (v / BOARD.depth) - lift,
]
const add = ([x, y]: Point, dx: number, dy: number): Point => [x + dx, y + dy]
const xy = ([x, y]: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`
const polygon = (points: Point[]) => points.map(point => xy(point).replace(' ', ',')).join(' ')

type KeyDef = { label: string; size: number; tone: Tone }
const key = (label: string, size = 1, tone: Tone = 'cream'): KeyDef => ({ label, size, tone })
const keys = (labels: string) => [...labels].map(label => key(label))

const ROWS: KeyDef[][] = [
  [...keys('`1234567890-='), key('⌫', 2, 'grey')],
  [key('Tab', 1.5, 'grey'), ...keys('QWERTYUIOP[]'), key('\\', 1.5)],
  [key('Caps', 1.75, 'grey'), key('A', 1, 'yellow'), key('S', 1, 'red'), key('D', 1, 'brown'), key('F', 1, 'blue'), ...keys('GH'),
    key('J', 1, 'blue'), key('K', 1, 'brown'), key('L', 1, 'red'), key(';', 1, 'yellow'), key("'"), key('Enter', 2.25, 'enter')],
  [key('Shift', 2.25, 'grey'), ...keys('ZXCVBNM,./'), key('Shift', 2.75, 'grey')],
  [key('Ctrl', 1.5, 'grey'), key('Alt', 1.5, 'grey'), key('', 9), key('Alt', 1.5, 'grey'), key('Ctrl', 1.5, 'grey')],
]

type Cap = KeyDef & { id: string; skirt: string; top: string; centre: Point; font: number }
const CAPS: Cap[] = ROWS.flatMap((row, r) => {
  let u = 0.8
  return row.map((def, i) => {
    const [u0, u1, v0, v1] = [u, u + def.size, 1 + r, 2 + r]
    u = u1
    const lift = BOARD.lift
    const top: Point[] = [project(u0 + 0.14, v0 + 0.1, lift), project(u1 - 0.14, v0 + 0.1, lift), project(u1 - 0.14, v1 - 0.26, lift), project(u0 + 0.14, v1 - 0.26, lift)]
    const skirt: Point[] = [project(u0 + 0.05, v0 + 0.06, lift), project(u1 - 0.05, v0 + 0.06, lift), project(u1 - 0.05, v1 - 0.05), project(u0 + 0.05, v1 - 0.05)]
    const centre: Point = [top.reduce((sum, [x]) => sum + x, 0) / 4, top.reduce((sum, [, y]) => sum + y, 0) / 4]
    return { ...def, id: `${r}-${i}`, skirt: polygon(skirt), top: polygon(top), centre, font: (def.label.length > 1 ? 7 : 10.5) * scaleAt(v0 + 0.5) }
  })
})
const capFor = (label: string) => CAPS.find(cap => cap.label === label)!

const delay = (at: number) => ({ '--at': `${(at - STRIKE).toFixed(2)}s` }) as CSSProperties

/** Nest one group per tap, so a key or finger can be struck more than once a loop. */
function Taps({ times, className, children }: { times: number[]; className: string; children: ReactNode }) {
  return times.reduceRight<ReactNode>((inner, at) => <g className={className} style={delay(at)}>{inner}</g>, children)
}

function Keycap({ cap }: { cap: Cap }) {
  const [top, side, legend] = TONES[cap.tone]
  const body = (
    <>
      <polygon points={cap.skirt} fill={side} stroke={side} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={cap.top} fill={top} stroke={top} strokeWidth="2" strokeLinejoin="round" />
      {cap.label && <text x={cap.centre[0]} y={cap.centre[1] + cap.font * 0.36} textAnchor="middle" fill={legend} fontSize={cap.font.toFixed(1)} fontWeight="700" className="zx-launch-legend">{cap.label}</text>}
    </>
  )
  const taps = TAPS[cap.label]
  if (!taps) return body
  const halo = cap.tone === 'enter' ? 46 : 26
  return (
    <>
      {taps.map(at => (
        <ellipse key={at} className="zx-launch-halo" style={delay(at)} cx={cap.centre[0]} cy={cap.centre[1] + 4} rx={halo} ry={halo * 0.55} fill={top} filter="url(#zx-launch-glow)" />
      ))}
      <Taps times={taps} className="zx-launch-press">
        {body}
        {taps.map(at => <polygon key={at} className="zx-launch-flash" style={delay(at)} points={cap.top} fill="#FFFFFF" />)}
      </Taps>
    </>
  )
}

function Keyboard() {
  const { width: W, depth: D } = BOARD
  const front = 24
  return (
    <g className="zx-launch-keyboard">
      <ellipse cx="500" cy="590" rx="390" ry="24" fill="#01070B" opacity=".55" filter="url(#zx-launch-soft)" />
      <polygon points={polygon([project(0, D - 0.4), project(W, D - 0.4), add(project(W, D), 0, front), add(project(0, D), 0, front)])} fill="url(#zx-launch-board-front)" stroke="#B3A584" strokeWidth="18" strokeLinejoin="round" />
      <polygon points={polygon([project(0, 0), project(W, 0), project(W, D), project(0, D)])} fill="url(#zx-launch-board)" stroke="#E9DFC6" strokeWidth="18" strokeLinejoin="round" />
      <polygon points={polygon([project(0.3, 0.15), project(W - 0.3, 0.15), project(W - 0.3, 0.75), project(0.3, 0.75)])} fill="#DDD1B4" stroke="#DDD1B4" strokeWidth="6" strokeLinejoin="round" />
      <text x={project(1.35, 0.5)[0]} y={project(1.35, 0.5)[1] + 4} fill="#8E8066" fontSize="11" fontWeight="800" letterSpacing="3" className="zx-launch-legend">ZENX</text>
      {[13.4, 14.2, 15].map((u, i) => (
        <circle key={u} cx={project(u, 0.45)[0]} cy={project(u, 0.45)[1]} r="3.4" fill={i === 1 ? '#7BE36A' : '#A99D83'} className={i === 1 ? 'zx-launch-board-led' : undefined} />
      ))}
      <polygon points={polygon([project(0.66, 0.9), project(W - 0.66, 0.9), project(W - 0.66, D - 0.62), project(0.66, D - 0.62)])} fill="#BFB292" stroke="#BFB292" strokeWidth="5" strokeLinejoin="round" />
      {CAPS.map(cap => <Keycap key={cap.id} cap={cap} />)}
      <path d={`M${xy(project(1.2, D - 0.25))}L${xy(project(4.4, D - 0.25))}`} stroke="#FFF8E8" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

type FingerSpec = { key: string; width: number; dx: number; dy: number }
// Little finger to index on the left; index to little finger on the right. The middle finger is the
// longest and widest, the little finger the shortest and narrowest.
const LEFT: FingerSpec[] = [
  { key: 'A', width: 15, dx: 13, dy: 42 },
  { key: 'S', width: 18, dx: 5, dy: 47 },
  { key: 'D', width: 19.5, dx: -4, dy: 50 },
  { key: 'F', width: 19, dx: -13, dy: 47 },
]
const RIGHT: FingerSpec[] = [
  { key: 'J', width: 19, dx: 13, dy: 47 },
  { key: 'K', width: 19.5, dx: 4, dy: 50 },
  { key: 'L', width: 18, dx: -5, dy: 47 },
  { key: ';', width: 15, dx: -13, dy: 42 },
]
const SKIN = { light: '#FFD7BC', shade: '#D58D68', line: '#B9714F', nail: '#FBDCCD', nailEdge: '#E0A68C' }

/** Points along a finger: t runs from the knuckle (0) to the tip (1); side −1 / 1 picks an edge. */
function fingerFrame(base: Point, tip: Point) {
  const [dx, dy] = [tip[0] - base[0], tip[1] - base[1]]
  const length = Math.hypot(dx, dy)
  const normal: Point = [-dy / length, dx / length]
  const at = (t: number, side = 0, half = 0): Point => [base[0] + dx * t + normal[0] * side * half, base[1] + dy * t + normal[1] * side * half]
  return { at, length }
}

/** A tapered finger: full at the knuckle, a slight swell at each joint, a rounded tip. */
function fingerOutline(base: Point, tip: Point, width: number) {
  const { at, length } = fingerFrame(base, tip)
  const radius = width * 0.4
  const end = 1 - radius / length
  const edge = (side: number) => [at(0, side, width * 0.5), at(0.42, side, width * 0.55), at(0.74, side, width * 0.45), at(end, side, radius)]
  const [l, r] = [edge(-1), edge(1)]
  return `M${xy(l[0])}C${xy(l[1])} ${xy(l[2])} ${xy(l[3])}A${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 1 ${xy(r[3])}C${xy(r[2])} ${xy(r[1])} ${xy(r[0])}Z`
}

function Finger({ base, tip, width }: { base: Point; tip: Point; width: number }) {
  const { at, length } = fingerFrame(base, tip)
  const outline = fingerOutline(base, tip, width)
  const crease = (t: number, half: number) => `M${xy(at(t, -1, half))}Q${xy(at(t + 0.035))} ${xy(at(t, 1, half))}`
  // The nail sits just short of the tip, with a curved cuticle towards the knuckle.
  const nailTip = 1 - (width * 0.24) / length
  const nailBase = 1 - (width * 0.95) / length
  const nailHalf = width * 0.26
  const nail = `M${xy(at(nailBase, -1, nailHalf))}L${xy(at(nailTip, -1, nailHalf))}A${nailHalf.toFixed(1)} ${nailHalf.toFixed(1)} 0 0 1 ${xy(at(nailTip, 1, nailHalf))}`
    + `L${xy(at(nailBase, 1, nailHalf))}Q${xy(at(nailBase - 0.07))} ${xy(at(nailBase, -1, nailHalf))}Z`
  return (
    <>
      <path d={outline} fill="#3B2A1E" opacity=".2" transform="translate(2 5)" />
      <path d={outline} fill="url(#zx-launch-finger)" stroke={SKIN.line} strokeWidth="1.1" strokeOpacity=".55" />
      <path d={`M${xy(at(0.12, -1, width * 0.26))}Q${xy(at(0.48, -1, width * 0.34))} ${xy(at(0.8, -1, width * 0.2))}`} stroke={SKIN.light} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".7" />
      <path d={crease(0.42, width * 0.28)} stroke={SKIN.line} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity=".45" />
      <path d={crease(0.47, width * 0.2)} stroke={SKIN.line} strokeWidth=".9" strokeLinecap="round" fill="none" opacity=".3" />
      <path d={crease(0.72, width * 0.22)} stroke={SKIN.line} strokeWidth="1" strokeLinecap="round" fill="none" opacity=".4" />
      <path d={nail} fill={SKIN.nail} stroke={SKIN.nailEdge} strokeWidth=".9" />
      <path d={`M${xy(at(nailBase + 0.03, -1, nailHalf * 0.4))}L${xy(at(nailTip - 0.02, -1, nailHalf * 0.4))}`} stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
    </>
  )
}

function Hand({ specs, side }: { specs: FingerSpec[]; side: 'left' | 'right' }) {
  const m = side === 'left' ? 1 : -1 // towards the thumb
  const fingers = specs.map(spec => {
    const tip = add(capFor(spec.key).centre, 0, 4)
    return { ...spec, tip, knuckle: add(tip, spec.dx, spec.dy) }
  })
  const [pinky, ring, middle, index] = side === 'left' ? fingers : [...fingers].reverse()
  const knuckles = fingers.map(finger => finger.knuckle)
  const wrist: Point = [knuckles.reduce((sum, [x]) => sum + x, 0) / 4 + m * 10, Math.max(...knuckles.map(([, y]) => y)) + 70]
  // Back of the hand: the knuckle line, the full side under the index finger and thumb, the narrower wrist.
  const palm = `M${xy(add(pinky.knuckle, -m * 8, 2))}Q${xy(add(ring.knuckle, -m * 6, -11))} ${xy(add(middle.knuckle, 0, -9))}Q${xy(add(index.knuckle, m * 2, -9))} ${xy(add(index.knuckle, m * 10, -1))}`
    + `C${xy(add(index.knuckle, m * 22, 14))} ${xy(add(wrist, m * 40, -26))} ${xy(add(wrist, m * 31, 14))}L${xy(add(wrist, -m * 29, 14))}`
    + `C${xy(add(wrist, -m * 33, -22))} ${xy(add(pinky.knuckle, -m * 17, 22))} ${xy(add(pinky.knuckle, -m * 8, 2))}Z`
  const tendons = fingers.map(finger => `M${xy(add(finger.knuckle, 0, 8))}Q${xy([(finger.knuckle[0] * 2 + wrist[0]) / 3, (finger.knuckle[1] + wrist[1]) / 2])} ${xy(add(wrist, (finger.knuckle[0] - wrist[0]) * 0.3, -12))}`)
  // The thumb rests on its side on the space bar.
  const thumbBase = add(index.knuckle, -m * 6, 52)
  const thumbTip: Point = [index.knuckle[0] + m * 50, capFor('').centre[1] + 4]
  const forearm = `M${xy(add(wrist, -30, -2))}L${xy(add(wrist, 31, -2))}L${xy(add(wrist, 44 - m * 70, 110))}L${xy(add(wrist, -44 - m * 70, 110))}Z`
  const sleeve = `M${xy(add(wrist, -46 - m * 26, 40))}Q${xy(add(wrist, -m * 22, 30))} ${xy(add(wrist, 46 - m * 26, 40))}L${xy(add(wrist, 70 - m * 90, 140))}L${xy(add(wrist, -70 - m * 90, 140))}Z`
  const strikes = fingers.flatMap(finger => fingerTaps(finger.key))

  const body = (
    <g className="zx-launch-hand-idle">
      <path d={forearm} fill="url(#zx-launch-arm)" />
      <path d={sleeve} fill="url(#zx-launch-sleeve)" />
      <path d={`M${xy(add(wrist, -46 - m * 26, 40))}Q${xy(add(wrist, -m * 22, 30))} ${xy(add(wrist, 46 - m * 26, 40))}`} stroke="#EAF2F6" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Taps times={strikes} className="zx-launch-hand-tap">
        <path d={palm} fill="#3B2A1E" opacity=".18" transform="translate(3 7)" />
        <Finger base={thumbBase} tip={thumbTip} width={22} />
        <path d={palm} fill="url(#zx-launch-palm)" />
        {tendons.map(d => <path key={d} d={d} stroke={SKIN.shade} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".22" />)}
        {side === 'left' ? (
          <g>
            <path d={`M${xy(add(wrist, -32, 0))}L${xy(add(wrist, 33, 0))}`} stroke="#1B262D" strokeWidth="13" strokeLinecap="round" />
            <circle cx={wrist[0] + 2} cy={wrist[1] - 1} r="11.5" fill="#0D171D" stroke="#9DB3BC" strokeWidth="2" />
            <path d={`M${wrist[0] - 4} ${wrist[1] - 4}A6 6 0 0 1 ${wrist[0] + 7} ${wrist[1] - 3}`} stroke="#42DFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ) : null}
        {fingers.map(finger => (
          <g key={finger.key} style={{ '--kx': `${finger.knuckle[0].toFixed(1)}px`, '--ky': `${finger.knuckle[1].toFixed(1)}px` } as CSSProperties}>
            <Taps times={fingerTaps(finger.key)} className="zx-launch-tap">
              <Finger base={finger.knuckle} tip={finger.tip} width={finger.width} />
            </Taps>
          </g>
        ))}
        {knuckles.map(knuckle => <ellipse key={xy(knuckle)} cx={knuckle[0]} cy={knuckle[1] + 1} rx="5" ry="3" fill={SKIN.light} opacity=".6" />)}
      </Taps>
    </g>
  )
  if (side === 'left') return <g className="zx-launch-hand">{body}</g>

  // The right hand slides across so its little finger lands on Enter.
  const semicolon = capFor(';').centre
  const enter = capFor('Enter').centre
  const reach = { '--at': `${(ENTER_AT - REACH).toFixed(2)}s`, '--reach-x': `${((enter[0] - semicolon[0]) * 0.72).toFixed(1)}px`, '--reach-y': `${(enter[1] - semicolon[1]).toFixed(1)}px` } as CSSProperties
  return <g className="zx-launch-hand zx-launch-reach" style={reach}>{body}</g>
}

function Printer() {
  const tear = Array.from({ length: 21 }, (_, i) => `L${(418 + i * 8.2).toFixed(1)} ${i % 2 ? 48 : 54}`).join('')
  const bars = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2]
  let barX = 440
  return (
    <g className="zx-launch-printer">
      <ellipse cx="500" cy="346" rx="178" ry="17" fill="#01070B" opacity=".6" filter="url(#zx-launch-soft)" />
      <g className="zx-launch-printer-body">
        <rect x="360" y="252" width="280" height="90" rx="20" fill="url(#zx-launch-printer-front)" />
        <path d="M384 210H616Q632 210 636 226L642 262H358L364 226Q368 210 384 210Z" fill="url(#zx-launch-printer-top)" stroke="#4E6672" strokeWidth="1.5" />
        <path d="M376 250H624" stroke="#566F7C" strokeOpacity=".7" strokeWidth="2" />
        <rect x="402" y="232" width="196" height="9" rx="4.5" fill="#05090C" />
      </g>

      <g clipPath="url(#zx-launch-slot)">
        <g className="zx-launch-paper">
          <g className="zx-launch-paper-sway">
            <path d={`M418 240V54${tear}V240Z`} fill="#0B1418" opacity=".22" transform="translate(5 4)" />
            <path d={`M418 240V54${tear}V240Z`} fill="url(#zx-launch-paper)" />
            <text x="500" y="80" textAnchor="middle" fill="#0F2744" fontSize="10.5" fontWeight="800" letterSpacing="4.2" className="zx-launch-display">ZENXPOS</text>
            <path d="M432 92H568" stroke="#A3B1B7" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="500" y="131" textAnchor="middle" fill="#0F2744" fontSize="35" fontWeight="800" letterSpacing="1" className="zx-launch-display">JUST</text>
            <text x="500" y="162" textAnchor="middle" fill="url(#zx-launch-ink)" fontSize="25.5" fontWeight="800" letterSpacing=".5" className="zx-launch-display">LAUNCHED</text>
            <text x="500" y="184" textAnchor="middle" fill="#55657A" fontSize="8.5" fontWeight="700" letterSpacing="2.4">★ NOW LIVE ★</text>
            <path d="M432 194H568" stroke="#A3B1B7" strokeWidth="1.5" strokeDasharray="3 3" />
            {bars.map((bar, i) => {
              const x = barX
              barX += bar + 3.2
              return <rect key={i} x={x} y="201" width={bar} height="20" fill="#16212B" />
            })}
          </g>
        </g>
      </g>

      <g className="zx-launch-printer-body">
        <path d="M404 241H596" stroke="#9FB4BD" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 2" />
        <path d="M362 262H638" stroke="#7C97A3" strokeOpacity=".5" strokeWidth="1.5" />
        <text x="390" y="300" fill="#8FB0BC" fontSize="11" fontWeight="800" letterSpacing="3" className="zx-launch-display">ZENXPOS</text>
        <rect x="548" y="287" width="38" height="16" rx="8" fill="#0A1217" stroke="#41606C" />
        <circle cx="610" cy="295" r="5.5" fill="#F5B53D" className="zx-launch-led-idle" />
        <g className="zx-launch-led-live">
          <circle cx="610" cy="295" r="13" fill="#58F08A" opacity=".2" />
          <circle cx="610" cy="295" r="5.5" fill="#58F08A" />
        </g>
        <path d="M384 330H616" stroke="#42DFFF" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  )
}

const CONFETTI = [
  [-118, -62, 220, '#FFCB3A'], [-96, -88, -140, '#FF5D58'], [-134, -10, 90, '#33B7FF'], [-112, 26, 160, '#42DFFF'],
  [-88, -34, -120, '#7BE36A'], [108, -66, -200, '#33B7FF'], [92, -92, 120, '#FFCB3A'], [130, -12, -90, '#A26F51'],
  [114, 24, 200, '#FF5D58'], [88, -36, 140, '#42DFFF'], [-60, -96, -60, '#FFCB3A'], [62, -98, 70, '#FF5D58'],
] as const

function LaunchScene() {
  const cable = `M${xy(project(3.4, 0.1))}C${xy(add(project(3.4, 0.1), -26, -40))} 318 320 340 304S348 286 362 290`
  return (
    <svg className="zx-launch-scene" viewBox="0 0 1000 620" role="img" aria-labelledby="zx-launch-art-title">
      <title id="zx-launch-art-title">Two hands type on a colourful retro keyboard and press Enter. A second later the receipt printer prints a Just Launched slip. The animation repeats.</title>
      <defs>
        <linearGradient id="zx-launch-board" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#EFE6CF" /><stop offset="1" stopColor="#DCCFB0" /></linearGradient>
        <linearGradient id="zx-launch-board-front" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#C4B593" /><stop offset="1" stopColor="#9E906F" /></linearGradient>
        <linearGradient id="zx-launch-printer-front" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2C3D47" /><stop offset="1" stopColor="#131D23" /></linearGradient>
        <linearGradient id="zx-launch-printer-top" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3F5560" /><stop offset="1" stopColor="#273842" /></linearGradient>
        <linearGradient id="zx-launch-paper" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#ECF1EF" /></linearGradient>
        <linearGradient id="zx-launch-ink" x1="430" y1="0" x2="570" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#1593C0" /><stop offset="1" stopColor="#0F2744" /></linearGradient>
        <linearGradient id="zx-launch-sleeve" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#284D78" /><stop offset="1" stopColor="#132B47" /></linearGradient>
        <linearGradient id="zx-launch-palm" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#F6C3A2" /><stop offset=".55" stopColor="#F0B28C" /><stop offset="1" stopColor="#DD9A75" /></linearGradient>
        <linearGradient id="zx-launch-finger" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#EFAE88" /><stop offset="1" stopColor="#F8C8A9" /></linearGradient>
        <linearGradient id="zx-launch-arm" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#DE9C77" /><stop offset="1" stopColor="#C98562" /></linearGradient>
        <filter id="zx-launch-soft" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="12" /></filter>
        <filter id="zx-launch-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9" /></filter>
        <clipPath id="zx-launch-slot"><rect x="340" y="-200" width="320" height="436.5" /></clipPath>
      </defs>

      <g className="zx-launch-camera">
        <ellipse cx="500" cy="230" rx="250" ry="150" fill="#42DFFF" opacity=".06" filter="url(#zx-launch-soft)" />
        <path d={cable} fill="none" stroke="#24333C" strokeWidth="6" strokeLinecap="round" />
        <path d={cable} fill="none" stroke="#42DFFF" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="12 88" className="zx-launch-signal" />
        <Printer />
        <g className="zx-launch-confetti">
          {CONFETTI.map(([x, y, r, colour], i) => (
            <rect key={i} x="496" y="117" width={i % 3 ? 9 : 6} height={i % 3 ? 5 : 11} rx="1.5" fill={colour} style={{ '--x': `${x}px`, '--y': `${y}px`, '--r': `${r}deg` } as CSSProperties} />
          ))}
        </g>
        <Keyboard />
        <Hand specs={LEFT} side="left" />
        <Hand specs={RIGHT} side="right" />
      </g>
    </svg>
  )
}

export function LaunchAnimationModal() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const dialog = dialogRef.current
    if (visible && dialog && !dialog.open) dialog.showModal()
  }, [visible])

  if (!visible) return null

  const close = () => dialogRef.current?.close()

  return (
    <dialog
      ref={dialogRef}
      className="zx-launch-dialog"
      aria-labelledby="zx-launch-heading"
      onClose={() => setVisible(false)}
      onClick={event => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="zx-launch-panel">
        <button className="zx-launch-close" type="button" aria-label="Close launch animation" autoFocus onClick={close}><X size={20} aria-hidden="true" /></button>
        <header className="zx-launch-header">
          <div>
            <p className="zx-launch-kicker"><span className="zx-launch-live-dot" /> ZENXPOS · NOW LIVE</p>
            <h2 id="zx-launch-heading">Your next chapter starts here.</h2>
          </div>
          <p className="zx-launch-date"><CalendarDays size={15} aria-hidden="true" /> Launched date: <time dateTime="2026-11-06">06th Nov 2026</time></p>
        </header>
        <div className="zx-launch-stage"><LaunchScene /></div>
        <footer className="zx-launch-footer">
          <span><i /> Billing to receipt, every step in sync.</span>
          <Link href="/pricing#quote" onClick={close}>Request a quote <ArrowRight size={16} aria-hidden="true" /></Link>
        </footer>
      </div>
    </dialog>
  )
}
