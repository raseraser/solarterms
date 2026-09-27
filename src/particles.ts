// Canvas 粒子層：疊在卡片 SVG 上，座標系同為 1080 × 1920
import type { ParticleKind, ParticleSpec } from './scenes'

interface P {
  kind: ParticleKind
  x: number; y: number; vx: number; vy: number
  r: number; a: number; va: number; life: number; phase: number; color: string
}

const W = 1080, H = 1920
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export class Particles {
  private ctx: CanvasRenderingContext2D
  private ps: P[] = []
  private specs: ParticleSpec[] = []
  private raf = 0
  private last = 0
  private ink = '#000'
  private burstTimer = 0

  constructor(private canvas: HTMLCanvasElement, private target: Element) {
    this.ctx = canvas.getContext('2d')!
    new ResizeObserver(() => this.resize()).observe(target)
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()))
  }

  private resize() {
    const r = this.target.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.round(r.width * dpr)
    this.canvas.height = Math.round(r.height * dpr)
    this.canvas.style.width = `${r.width}px`
    this.canvas.style.height = `${r.height}px`
  }

  set(specs: ParticleSpec[], ink: string) {
    this.specs = specs
    this.ink = ink
    this.ps = []
    for (const s of specs) for (let k = 0; k < s.count; k++) if (s.kind !== 'spark') this.ps.push(this.spawn(s.kind, true))
    this.start()
  }

  start() {
    if (this.raf || !this.specs.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    this.last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      this.step(dt, now / 1000)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private spawn(kind: ParticleKind, anywhere: boolean): P {
    const y0 = anywhere ? rand(0, H) : -40
    const base = { kind, x: rand(-40, W + 40), y: y0, vx: 0, vy: 0, r: 3, a: rand(0, Math.PI * 2), va: 0, life: 1, phase: rand(0, 10), color: this.ink }
    switch (kind) {
      case 'rain': return { ...base, vx: -120, vy: rand(1300, 1700), r: rand(22, 40) }
      case 'snow': return { ...base, vy: rand(50, 130), r: rand(2, 6), color: '#ffffff' }
      case 'petal': return { ...base, vy: rand(60, 120), vx: rand(20, 60), r: rand(7, 11), va: rand(-2, 2), color: Math.random() < 0.5 ? '#f2a2b4' : '#f7c6d0' }
      case 'maple': return { ...base, vy: rand(70, 140), vx: rand(-20, 30), r: rand(14, 22), va: rand(-1.5, 1.5), color: Math.random() < 0.5 ? '#d9442f' : '#e8752f' }
      case 'leaf': return { ...base, vy: rand(60, 120), vx: rand(-10, 40), r: rand(10, 16), va: rand(-1.5, 1.5), color: Math.random() < 0.5 ? '#e0a93a' : '#c98f2c' }
      case 'firefly': return { ...base, y: rand(1250, 1750), vx: rand(-15, 15), vy: rand(-10, 10), r: rand(3, 5), color: '#f5e27a' }
      case 'dew': return { ...base, y: rand(1150, 1750), r: rand(2, 4), color: '#ffffff' }
      case 'dust': return { ...base, vy: rand(-12, -4), vx: rand(-6, 6), r: rand(1.5, 3) } // 淡墨浮塵
      case 'spark': return base
    }
  }

  private step(dt: number, t: number) {
    // 煙火：每隔一段時間炸開一團
    if (this.specs.some((s) => s.kind === 'spark')) {
      this.burstTimer -= dt
      if (this.burstTimer <= 0) {
        this.burstTimer = rand(0.9, 1.8)
        const cx = rand(150, 930), cy = rand(250, 700), color = Math.random() < 0.5 ? '#f6d27a' : '#ffb199'
        for (let k = 0; k < 42; k++) {
          const a = (k / 42) * Math.PI * 2, sp = rand(160, 260)
          this.ps.push({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.5, a: 0, va: 0, life: 1, phase: 0, color })
        }
      }
    }
    for (const p of this.ps) {
      switch (p.kind) {
        case 'snow':
        case 'petal':
        case 'maple':
        case 'leaf':
          p.x += (p.vx + Math.sin(t * 1.3 + p.phase) * 30) * dt
          p.y += p.vy * dt
          p.a += p.va * dt
          break
        case 'firefly':
          p.vx += rand(-40, 40) * dt; p.vy += rand(-40, 40) * dt
          p.vx *= 0.98; p.vy *= 0.98
          p.x += p.vx * dt; p.y += p.vy * dt
          if (p.y < 1150 || p.y > 1780) p.vy *= -1
          break
        case 'spark':
          p.vy += 90 * dt
          p.x += p.vx * dt; p.y += p.vy * dt
          p.vx *= 0.97; p.vy *= 0.97
          p.life -= dt * 0.8
          break
        case 'dew':
          break
        default:
          p.x += p.vx * dt; p.y += p.vy * dt
      }
    }
    // 出界 / 熄滅的重生
    this.ps = this.ps.filter((p) => p.kind !== 'spark' || p.life > 0)
    for (let k = 0; k < this.ps.length; k++) {
      const p = this.ps[k]
      if (p.kind === 'spark' || p.kind === 'dew' || p.kind === 'firefly') continue
      if (p.y > H + 50 || p.y < -60 || p.x < -80 || p.x > W + 80) {
        const n = this.spawn(p.kind, false)
        if (p.kind === 'dust') n.y = H + 20
        this.ps[k] = n
      }
    }
  }

  private draw() {
    const c = this.ctx
    const s = this.canvas.width / W
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.canvas.width, this.canvas.height)
    c.setTransform(s, 0, 0, s, 0, 0)
    const t = performance.now() / 1000
    for (const p of this.ps) {
      c.save()
      switch (p.kind) {
        case 'rain':
          c.strokeStyle = p.color; c.globalAlpha = 0.28; c.lineWidth = 1.6
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + (p.vx / p.vy) * p.r, p.y + p.r); c.stroke()
          break
        case 'snow':
          c.fillStyle = p.color; c.globalAlpha = 0.85
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill()
          break
        case 'petal':
          c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.color; c.globalAlpha = 0.9
          c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 7); c.fill()
          break
        case 'leaf':
          c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.color; c.globalAlpha = 0.9
          c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, 7); c.fill()
          break
        case 'maple': {
          c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.color; c.globalAlpha = 0.92
          c.beginPath()
          for (let k = 0; k < 10; k++) {
            const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? p.r * 0.45 : p.r
            c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
          }
          c.closePath(); c.fill()
          break
        }
        case 'firefly': {
          const glow = 0.5 + 0.5 * Math.sin(t * 3 + p.phase)
          c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 18; c.globalAlpha = 0.25 + glow * 0.75
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill()
          break
        }
        case 'dew': {
          const tw = Math.max(0, Math.sin(t * 2 + p.phase))
          c.fillStyle = p.color; c.globalAlpha = tw * 0.9
          c.beginPath(); c.arc(p.x, p.y, p.r * tw, 0, 7); c.fill()
          break
        }
        case 'dust':
          c.fillStyle = p.color; c.globalAlpha = 0.18
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill()
          break
        case 'spark':
          c.fillStyle = p.color; c.globalAlpha = Math.max(0, p.life)
          c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill()
          break
      }
      c.restore()
    }
  }
}
