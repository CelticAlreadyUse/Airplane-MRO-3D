export function useColorTheme() {
  const dark = ref(false)
  const key = 'mro-color-theme'
  let system: MediaQueryList | undefined
  let explicit = false
  function apply(value: boolean) {
    dark.value = value
    document.documentElement.dataset.theme = value ? 'dark' : 'light'
    document.documentElement.style.colorScheme = value ? 'dark' : 'light'
  }
  function read() {
    let saved: string | null = null
    try { saved = localStorage.getItem(key) } catch { /* Theme still works without storage. */ }
    explicit = saved === 'light' || saved === 'dark'
    apply(explicit ? saved === 'dark' : !!system?.matches)
  }
  function followSystem() { if (!explicit) apply(!!system?.matches) }
  function sync(event: StorageEvent) { if (event.key === key || event.key === null) read() }
  function toggle() {
    explicit = true
    apply(!dark.value)
    try { localStorage.setItem(key, dark.value ? 'dark' : 'light') } catch { /* Session-only fallback. */ }
  }
  onMounted(() => {
    system = window.matchMedia('(prefers-color-scheme: dark)')
    read()
    system.addEventListener('change', followSystem)
    window.addEventListener('storage', sync)
  })
  onBeforeUnmount(() => {
    system?.removeEventListener('change', followSystem)
    window.removeEventListener('storage', sync)
  })
  return { dark, toggle }
}
