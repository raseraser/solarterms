// 底部彈出面板：背景點擊 / Esc / 把手往下拖都會關閉
export class Sheet {
  private panel: HTMLElement
  private returnFocus: Element | null = null
  onClose: () => void = () => {}

  constructor(public root: HTMLElement) {
    this.panel = root.querySelector('.sheet-panel')!
    root.querySelector('.sheet-backdrop')!.addEventListener('click', () => this.close())
    root.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape') this.close() })
    this.dragToClose(root.querySelector('.sheet-handle')!)
  }

  get isOpen() { return !this.root.hidden }

  open() {
    if (this.isOpen) return
    this.returnFocus = document.activeElement
    this.root.hidden = false
    requestAnimationFrame(() => {
      this.root.classList.add('open')
      this.panel.focus({ preventScroll: true })
    })
  }

  close() {
    if (!this.isOpen) return
    this.root.classList.remove('open')
    this.panel.style.transform = ''
    const done = () => { this.root.hidden = true; this.onClose() }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done()
    else setTimeout(done, 220)
    if (this.returnFocus instanceof HTMLElement) this.returnFocus.focus({ preventScroll: true })
  }

  private dragToClose(handle: HTMLElement) {
    let y0: number | null = null
    handle.addEventListener('pointerdown', (e) => { y0 = e.clientY; handle.setPointerCapture(e.pointerId); this.panel.style.transition = 'none' })
    handle.addEventListener('pointermove', (e) => {
      if (y0 === null) return
      this.panel.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`
    })
    const end = (e: PointerEvent) => {
      if (y0 === null) return
      const dy = e.clientY - y0
      y0 = null
      this.panel.style.transition = ''
      if (dy > 80) this.close()
      else this.panel.style.transform = ''
    }
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }
}
