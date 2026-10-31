export default defineNuxtConfig({
  compatibilityDate: '2026-10-30',
  devtools: { enabled: false },
  css: [
    '@fontsource-variable/dm-sans',
    '@fontsource/ibm-plex-mono/400.css',
    '~/assets/main.css',
    '~/assets/findings.css',
    '~/assets/theme.css',
    '~/assets/manuals.css',
    '~/assets/operations.css',
    '~/assets/severity.css',
    '~/assets/classification.css',
    '~/assets/materials.css',
    '~/assets/repairs.css',
    '~/assets/backup-reports.css',
    '~/assets/dashboard.css',
  ],
  app: {
    head: {
      title: 'Mantiq · Caravan MRO Demo',
      htmlAttrs: { lang: 'id' },
      script: [{ innerHTML: `(()=>{let t;try{t=localStorage.getItem('mro-color-theme')}catch{}const d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'})()` }],
      meta: [{ name: 'description', content: 'Prototipe lokal eksplorasi komponen Cessna 208 Caravan.' }],
    },
  },
})
