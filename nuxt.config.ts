// https://nuxt.com/docs/api/configuration/nuxt-config
import i18n from '@nuxtjs/i18n'

// List of i18 files
const fileNames = [
    'common',   // related to user, groups... management
    'capture',  // related to capture endpoints
    'tickets',  // related to ticketing system
]
//i18n helper function
function getFileList(locale: string) {
    return fileNames.map(name => `${locale}/${name}.json`)
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/ui','@nuxtjs/i18n','@pinia/nuxt', '@nuxtjs/mdc'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Env Variables, uses NUXT_PUBLIC_ prefix from ENV
      BG_CENTERED: '/front/bg-centered-2.svg',
      LOGO_MAIN: '/front/logo.png',
      LOGO_HOME: '/front/logo.png',
      AVATAR_DEFAULT: '/front/avatar.png',
      SERVICE_NAME: 'IoT Tower Control',
      BACKEND_API_BASE: 'http://localhost:8091',  // Backend API base URL
      EULA_LINK: 'https://foo.bar/eula',          // Link / External page with the EULA
      DOCUMENTATION_LINK: 'https://github.com/disk91/IoTowerControl-community/wiki', // Link to External documentation ( displayes when set )
      SUPPORT_LINK: '',                           // Link to External support / '' internal when enable
      APIDOC_LINK: '',                            // Link to External API documentation (displayed when set)
      FORCE_INVITE_CODE : '',                     // If set, this code will be used for registration, this allows on backend to force application specific processing
      DISABLE_INVITE_CODE: false,                 // If true, the invite code field will not be displayed on registration, FORCE_INVITE_CODE is applied but hidden
      FORCE_COLOR_SCHEME: '',                     // If set, with a color scheme (primary,neutral) (see MainLayout.vue), this will force the color and remove the user ability to change it.
      DEFAULT_COLOR_SCHEME: '',                   // Default color scheme if FORCE_COLOR_SCHEME is not set, the user will be allowed to change it.
      FORCE_APPEARANCE_MODE: '',                  // If set, this will force the light/dark mode and remove the user ability to change it.
      DEFAULT_APPEARANCE_MODE: '',                // Default light/dark mode if FORCE_LIGHT_MODE is not set, the user will be allowed to change it.
      ENABLE_2FA: true,                           // If true, the 2FA will be enabled and the user will be able to configure it
      ENABLE_2FA_AUTHENTICATOR: true,             // If true, the Authenticator 2FA will be enabled
      ENABLE_2FA_EMAIL: false,                    // If true, the Email 2FA will be enabled
      ENABLE_2FA_SMS: false,                      // If true, the SMS 2FA will be enabled
      ENABLE_BILLING_FEATURES: false,             // If true, the billing features will be enabled (pro version)
      ENABLE_TICKETING_FEATURES: false,           // If true, the ticketing features will be enabled (pro version)
      ENABLE_DANGER_FEATURES: true,               // If true, the user-danger features will be enabled 
      ENABLE_DANGER_DELETE_ACCOUNT: true,         // If true, the user will be able immediately delete his account
    }
  },
  i18n: {
    locales: [
      { code: 'en', name: 'English', files: getFileList('en') },
      { code: 'fr', name: 'Français', files: getFileList('fr') },
    ],
    detectBrowserLanguage: {
      useCookie: false,
    },
    defaultLocale: 'en',
    langDir: '',
    strategy: 'no_prefix', 
  },

})


