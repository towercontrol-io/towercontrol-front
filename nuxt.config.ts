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
      BACKEND_API_BASE: 'http://localhost:8091',  // Backend API base URL
      EULA_LINK: 'https://foo.bar/eula',          // Link / External page with the EULA 
      FORCE_INVITE_CODE : '',                     // If set, this code will be used for registration, this allows on backend to force application specific processing
      DISABLE_INVITE_CODE: false,                  // If true, the invite code field will not be displayed on registration, FORCE_INVITE_CODE is applied but hidden
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


