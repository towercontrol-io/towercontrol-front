<script setup lang="ts">
  import type { UserBasicProfileResponse } from '~/types';
  import type { AvatarProps, NavigationMenuItem } from '@nuxt/ui'
  import type { DropdownMenuItem } from '@nuxt/ui'
  const { t } = useI18n();
  const router = useRouter();
  const route = useRoute();
  const appStore = applicationStore();
  const config = useRuntimeConfig()
  const logoImage : string = config.public.LOGO_HOME as string;
  const avatarDefault : string = config.public.AVATAR_DEFAULT as string;
  const colorMode = useColorMode()
  const appConfig = useAppConfig()

  const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
  const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone'];

  // -----
  // Redirect to login page if the user is not logged in for the private pages
  if (
        route.path.includes('/private/') 
   && ( appStore.getBackendJWT() === null || appStore.isJWTExpired() )
  ) {
    router.push('/front/public/login');
  }

  // ----
  // Load the profile data (from cache most of the time, but auto-refresh that way)
  const { $apiBackendUsers } = useNuxtApp();
  const { data : userProfile, profileLoadPending, profileLoadError, profileRefresh } = useAsyncData<UserBasicProfileResponse>(
      () => `user-profile-response`, 
      () => $apiBackendUsers.getUserProfile()
  );


  let getName = function () : string {
    let name : string = 'John Doe';
    if ( userProfile.value && (userProfile.value.firstName || userProfile.value.lastName) ) {
        if ( userProfile.value.firstName ) {
          name = userProfile.value.firstName;
        }
        if ( userProfile.value.lastName ) {
          name += (userProfile.value.firstName)?' ':'' + userProfile.value.lastName;
        }
    } else if ( userProfile.value && userProfile.value.email ) {
        name = userProfile.value.email;
    }
    return name;
  };

  let getAvatar = function () : AvatarProps {
    let avatar : string = avatarDefault;
    return { src: avatar, alt: getName() };
  };

  const user = ref({
    name: getName(),
    avatar: getAvatar(),
  });

  const pageTitle = computed(() => {
    if (route.meta.layoutProps && route.meta.layoutProps.title as string) {
      let title = route.meta.layoutProps.title as string;
      return t('menu.' + title);
    } else {
      return t('menu.' + route.name?.toString() || 'unknown');
    }
  });

  // ----
  // Main interface behavior
  const mainData = reactive({
      open : false as boolean,
  });

  defineProps<{
    collapsed?: boolean
  }>();

  /**
   * Menu on the right side of the page, 2 menus, one for the top and one for the bottom.
   */
  const rightMenu = [
    [
      { label: `${t('menu.home')}`,icon: 'i-lucide-house',to: '/front/private/home',onSelect: () => {mainData.open = false}},
      { label: `${t('menu.inbox')}`,icon: 'i-lucide-inbox',to: '/inbox',badge: '4',onSelect: () => {mainData.open = false} },
      { label: `${t('menu.settings')}`,icon: 'i-lucide-settings', to: '/settings', defaultOpen: true,type: 'trigger',children: 
        [
          { label: 'General',to: '/settings',exact: true,onSelect: () => {mainData.open = false } },
          { label: 'Security',to: '/settings/security',onSelect: () => {mainData.open = false } },
        ]
      }
    ], [
      { label: `${t('menu.suport')}`, to: '/front/private/tickets', icon: 'i-lucide-message-circle',onSelect: () => {mainData.open = false } },
      { label: `${t('menu.documentation')}`, icon: 'i-lucide-book-open-text', to: 'https://github.com/disk91/IoTowerControl-community/wiki',target: '_blank' },
      { label: `${t('menu.apiDocumentation')}`, icon: 'i-lucide-plug', to: '...',target: '_blank' },
    ]
  ] satisfies NavigationMenuItem[][];


  /**
   * List of links accessible with the search entry.
   * It's a list of the existing link like in the link id and a list on unlisted link that are accessible via this search.
   */
  const groups = computed(() => [
    { id: 'links', label: `${t('menu.searchGoTo')}`, items: rightMenu.flat() },
    { id: 'code', label: `${t('menu.searchOther')}`,
          items: [
            { id: 'source', label: 'View page source', icon: 'i-simple-icons-github',to: `https://github.com/nuxt-ui-pro/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,target: '_blank'}
          ]
    }
  ]);

  /**
   * User menu items
   */
  const userMenuItems = computed<DropdownMenuItem[][]>(() => ([
    [
      { type: 'label', label: getName(), avatar: getAvatar()} 
    ],
    [
      { label: `${t('menu.profile')}`, icon: 'i-lucide-user' },
      { label: `${t('menu.billing')}`, icon: 'i-lucide-credit-card' },
      { label: `${t('menu.settings')}`,icon: 'i-lucide-settings',to: '/settings'}
    ],
    [
      { label: `${t('menu.theme')}`, icon: 'i-lucide-palette', children: 
       [
        { label: `${t('menu.thprimary')}`, slot: 'chip', chip: appConfig.ui.colors.primary,content: { align: 'center', collisionPadding: 16},
          children: colors.map(color => ({ label: color, chip: color, slot: 'chip', checked: appConfig.ui.colors.primary === color, type: 'checkbox',
              onSelect: (e) => {
                e.preventDefault();
                appConfig.ui.colors.primary = color;
              }
          }))
        },
        { label: `${t('menu.thneutral')}`, slot: 'chip', chip: appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral, content: { align: 'end', collisionPadding: 16 }, 
          children: neutrals.map(color => ({ label: color, chip: color === 'neutral' ? 'old-neutral' : color, slot: 'chip', type: 'checkbox', checked: appConfig.ui.colors.neutral === color,
              onSelect: (e) => {
                e.preventDefault();
                appConfig.ui.colors.neutral = color;
              }
          }))
        }
       ]
      },
      { label: `${t('menu.appearance')}`, icon: 'i-lucide-sun-moon',children: 
        [
          { label: `${t('menu.light')}`, icon: 'i-lucide-sun', type: 'checkbox', checked: colorMode.value === 'light',
            onSelect(e: Event) { e.preventDefault();colorMode.preference = 'light'; }
          },
          { label: `${t('menu.dark')}`, icon: 'i-lucide-moon', type: 'checkbox', checked: colorMode.value === 'dark',
            onUpdateChecked(checked: boolean) { if (checked) { colorMode.preference = 'dark' }},
            onSelect(e: Event) { e.preventDefault() }
          }
        ]
      }
    ],
    [
      { label: 'to remove',icon: 'i-lucide-layout-template',children: 
       [ 
          { label: 'Starter',to: 'https://ui-pro-starter.nuxt.dev/'}, 
          { label: 'Landing',to: 'https://landing-template.nuxt.dev/'}
       ] 
      }
    ],
    [
     { label: `${t('menu.logout')}`, icon: 'i-lucide-log-out', to: '/front/private/signout' }
    ]
  ]));

</script>

<template>
 <UDashboardGroup unit="rem">


    <UDashboardSidebar
      id="default"
      v-model:open="mainData.open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <!-- Top left corner with logo icon -->
      <template #header="{ collapsed }">
          <img 
            :src="logoImage" 
            alt="IoT Tower Control Logo" 
            class="h-8 w-auto sm:h-12 md:h-12"
            @click="router.push('/front/private/home')"
          />
      </template>

      <!-- Main menu on the right of the page -->
      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="rightMenu[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="rightMenu[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            v-bind="{
              ...user,
              label: collapsed ? undefined : getName(),
              trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
            }"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="data-[state=open]:bg-elevated"
            :ui="{
              trailingIcon: 'text-dimmed'
            }"
          />
          <template #chip-leading="{ item }">
            <span
              :style="{
                '--chip-light': `var(--color-${(item as any).chip}-500)`,
                '--chip-dark': `var(--color-${(item as any).chip}-400)`
              }"
              class="ms-0.5 size-2 rounded-full bg-(--chip-light) dark:bg-(--chip-dark)"
            />
          </template>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <!-- Search popup associated to the search button on the right menu -->
    <UDashboardSearch :groups="groups" />

    <!-- The main page content, depends on the current route -->
    <UDashboardPanel id="main">
      <template #header>
        <UDashboardNavbar :title=pageTitle :ui="{ right: 'gap-3' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <UTooltip text="Notifications" :shortcuts="['N']">
              <UButton
                color="neutral"
                variant="ghost"
                square
                
              >
                <UChip color="error" inset>
                  <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
                </UChip>
              </UButton>
            </UTooltip>
          </template>
        </UDashboardNavbar>
        <!--
        <UDashboardToolbar>
          <template #left>
             toolbar
          </template>
        </UDashboardToolbar>
         -->
      </template>
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <!-- <NotificationsSlideover /> -->
    <ToolsToasterDisconnected />
  </UDashboardGroup>

</template>