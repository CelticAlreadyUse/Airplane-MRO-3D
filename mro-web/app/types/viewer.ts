import type { AircraftComponent } from '../data/components'

export type CameraView = 'perspective' | 'left' | 'right' | 'top' | 'front'
export interface ViewerMetrics {
  meshCount: number
  triangles: number
  loadMs: number
  fps: number
  visibleCount: number
  fileBytes: number
}
export interface ViewerApi {
  focus: () => void
  reset: () => void
  setView: (view: CameraView) => void
  retry: () => void
}
export interface ViewerReady { components: AircraftComponent[]; metrics: ViewerMetrics }
