<script setup lang="ts">
  const config = useRuntimeConfig();
  const router = useRouter();
  const route = useRoute();
  const appStore = applicationStore();

  const backgroundImage = config.public.BG_CENTERED;

    // -----
    // Redirect to login page if the user is not logged in for the private pages
    if (
        route.path.includes('/private/') 
        && ( appStore.getBackendJWT() === null || appStore.isJWTExpired() )
    ) {
        router.push('/front/public/login');
    }


</script>

<template>
  <div :style="`height: 100vh; width: 100%; 
        z-index: 1; overflow: hidden; position: relative; 
        display: flex; 
        background: url('${backgroundImage}') center center / cover rgb(240, 242, 245); 
        box-sizing: border-box;
        justify-content: center;`">
        <div style="max-width: 500px; position: absolute; 
            top: 47%; left: 50%; transform: translate(-50%, -50%); 
            height: auto;">
          <slot />
        </div>
        <ToolsToasterDisconnected />
  </div>
</template>