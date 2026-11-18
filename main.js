/*
 * Graph Touch Pinch — local fix for two-finger pinch-zoom in the graph view on Windows touchscreens.
 *
 * Why: Obsidian's graph only runs its built-in pinch code for TouchEvents. Obsidian on Windows
 * (Electron) does not expose TouchEvents at all ("ontouchstart" in window === false); fingers arrive
 * only as PointerEvents, which the graph treats like a mouse drag, so two fingers just pan.
 * Fix: watch touch pointers in the capture phase. While two fingers are down on a graph, hide those
 * events from the graph and apply the same zoom/pan math Obsidian uses for its own pinch.
 * One-finger dragging, mouse and wheel are left untouched.
 */
const { Plugin } = require("obsidian");

const GRAPH_TYPES = ["graph", "localgraph"];

module.exports = class GraphTouchPinch extends Plugin {
  onload() {
    this.pointers = new Map(); // pointerId -> {x, y}
    this.pinch = null; // {renderer, prevMid, prevDist2}

    const opts = { capture: true, passive: false };
    this.registerDomEvent(window, "pointerdown", (e) => this.onDown(e), opts);
    this.registerDomEvent(window, "pointermove", (e) => this.onMove(e), opts);
    this.registerDomEvent(window, "pointerup", (e) => this.onUp(e), opts);
    this.registerDomEvent(window, "pointercancel", (e) => this.onUp(e), opts);
  }

  findRenderer(target) {
    for (const type of GRAPH_TYPES) {
      for (const leaf of this.app.workspace.getLeavesOfType(type)) {
        const r = leaf.view && leaf.view.renderer;
        if (r && r.px && r.interactiveEl && (r.interactiveEl === target || r.interactiveEl.contains(target))) return r;
      }
    }
    return null;
  }

  onDown(e) {
    if (e.pointerType !== "touch") return;
    if (this.pointers.size === 0) {
      this.renderer = this.findRenderer(e.target);
      if (!this.renderer) return;
    } else if (!this.renderer) {
      return;
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      this.startPinch();
      // The graph never sees the second finger, so it can't restart a one-finger pan with it.
      e.stopImmediatePropagation();
      e.preventDefault();
    } else if (this.pointers.size > 2) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }

  onMove(e) {
    if (e.pointerType !== "touch" || !this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!this.pinch) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    this.updatePinch();
  }

  onUp(e) {
    if (e.pointerType !== "touch" || !this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pinch && this.pointers.size < 2) {
      const r = this.pinch.renderer;
      this.pinch = null;
      // No fling after a pinch: clear any pan velocity left from before / set on release.
      r.panvX = r.panvY = 0;
      window.setTimeout(() => { r.panvX = r.panvY = 0; }, 0);
    }
    if (this.pointers.size === 0) this.renderer = null;
  }

  twoPoints() {
    const it = this.pointers.values();
    return [it.next().value, it.next().value];
  }

  startPinch() {
    const r = this.renderer;
    // If the first finger grabbed a node, let go of it.
    const node = r.dragNode;
    if (node) {
      node.fx = null;
      node.fy = null;
      r.dragNode = null;
      try { r.worker && r.worker.postMessage({ alphaTarget: 0, forceNode: { id: node.id, x: null, y: null } }); } catch (_) {}
    }
    const [a, b] = this.twoPoints();
    this.pinch = { renderer: r, prevMid: this.mid(a, b), prevDist2: this.dist2(a, b) };
  }

  updatePinch() {
    const p = this.pinch;
    const r = p.renderer;
    if (!r.px || r.destroyed) { this.pinch = null; return; }
    const [a, b] = this.twoPoints();
    const mid = this.mid(a, b);
    const d2 = this.dist2(a, b);
    if (p.prevDist2 > 0 && d2 > 0) {
      // Same math as Obsidian's own pinch handler (coordinates in device pixels).
      const dpr = window.devicePixelRatio;
      const rect = r.interactiveEl.getBoundingClientRect();
      const px = (mid.x - rect.x) * dpr, py = (mid.y - rect.y) * dpr;
      const ppx = (p.prevMid.x - rect.x) * dpr, ppy = (p.prevMid.y - rect.y) * dpr;
      r.zoomCenterX = px;
      r.zoomCenterY = py;
      r.setPan(r.panX + (px - ppx), r.panY + (py - ppy));
      r.targetScale = r.targetScale * Math.sqrt(d2 / p.prevDist2);
      r.panvX = r.panvY = 0;
      r.changed();
    }
    p.prevMid = mid;
    p.prevDist2 = d2;
  }

  mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
};
