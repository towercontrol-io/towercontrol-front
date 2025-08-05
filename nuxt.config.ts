// https://nuxt.com/docs/api/configuration/nuxt-config
import i18n from '@nuxtjs/i18n'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/ui','@nuxtjs/i18n','@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Env Variables, uses NUXT_ prefix from ENV
      BG_CENTERED: '/front/bg-centered-2.svg',
      LOGO_MAIN: '/front/logo.png',
      SERVICE_NAME: 'IoT Tower Control',
      BACKEND_API_BASE: 'http://localhost:8091',
    }
  },
  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
    ],
    defaultLocale: 'en',
    langDir: '',
    strategy: 'no_prefix', 
  },

})


