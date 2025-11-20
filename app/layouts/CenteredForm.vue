<script setup lang="ts">
  const config = useRuntimeConfig();
  const router = useRouter();
  const route = useRoute();
  const appStore = applicationStore();
  const appConfig = useAppConfig();
  const colorMode = useColorMode();

  const backgroundImage = config.public.BG_CENTERED;

    // -----
    // Redirect to login page if the user is not logged in for the private pages
    if (
        route.path.includes('/private/') 
        && ( appStore.getBackendJWT() === null || appStore.isJWTExpired() )
    ) {
        router.push('/front/public/login');
    }

    // -----
    // Set the color scheme and appearance
    const colorSchemeRaw =
      config.public.FORCE_COLOR_SCHEME !== ''
        ? config.public.FORCE_COLOR_SCHEME
        : (config.public.DEFAULT_COLOR_SCHEME || '');

    const forcedColors = colorSchemeRaw
      .split(',')
      .map(c => c.trim())
      .filter(Boolean); // enlève les vides

    if (forcedColors.length >= 1 && forcedColors[0] !== undefined) {
      appConfig.ui.colors.primary = forcedColors[0];
    }
    if (forcedColors.length >= 2 && forcedColors[1] !== undefined) {
      appConfig.ui.colors.neutral = forcedColors[1];
    }
    if ( config.public.FORCE_APPEARANCE_MODE !== '' ) {
      colorMode.preference = config.public.FORCE_APPEARANCE_MODE;
    } else if (config.public.DEFAULT_APPEARANCE_MODE !== '') {
      colorMode.preference = config.public.DEFAULT_APPEARANCE_MODE;
    }

</script>

<template>
  <div :style="`min-height: 100vh; width: 100%; 
        z-index: 1; overflow-y: auto; position: relative; 
        display: flex; 
        background: url('${backgroundImage}') center center / cover rgb(240, 242, 245); 
        box-sizing: border-box;
        justify-content: center;`">
        <div class="max-w-md lg:max-w-4xl mx-auto my-auto px-4 py-8 h-auto">
          <slot />
        </div>
        <ToolsToasterDisconnected />
  </div>
</template>