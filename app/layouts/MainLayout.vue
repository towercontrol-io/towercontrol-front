<script setup lang="ts">
  import type { UserBasicProfileResponse,GroupsHierarchySimplified,UserConfigResponse, PrivTicketPendingResponseItf } from '~/types';
  import type { AvatarProps, NavigationMenuItem } from '@nuxt/ui'
  import type { DropdownMenuItem } from '@nuxt/ui'
import { is } from 'valibot';

  const { t, setLocale } = useI18n();
  const router = useRouter();
  const route = useRoute();
  const appStore = applicationStore();
  const config = useRuntimeConfig();
  const logoImage : string = config.public.LOGO_HOME as string;
  const avatarDefault : string = config.public.AVATAR_DEFAULT as string;
  const billingEnabled : boolean = config.public.ENABLE_BILLING_FEATURES as boolean;
  const ticketsEnabled : boolean = config.public.ENABLE_TICKETING_FEATURES as boolean;
  const supportLink : string = config.public.SUPPORT_LINK as string;
  const faqLink : string = config.public.FAQ_LINK as string;
  const documentationLink : string = config.public.DOCUMENTATION_LINK as string;
  const apiDocumentationLink : string = config.public.APIDOC_LINK as string;
  const colorMode = useColorMode();
  const appConfig = useAppConfig();
  const nuxtApp = useNuxtApp();

  const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
  const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone'];


  // -----
  // Redirect to login page if the user is not logged in for the private pages
  if (
        route.path.includes('/private/') 
   && ( appStore.getBackendJWT() === null || appStore.isJWTExpired() )
  ) {
    router.push({ path: '/front/public/login', query: { redirect: route.fullPath } });
  }


  // -----------------------------------------------------
  // Main interface behavior
  const mainData = reactive({
      open : false as boolean,
  });

  defineProps<{
    collapsed?: boolean
  }>();


  // ------------------------------------------------------------
  // Load the profile data (from cache most of the time, but auto-refresh that way)

  const { $apiBackendUsers } = useNuxtApp();
  const userProfile = ref<UserBasicProfileResponse | null>(null);
  const userConfig = ref<UserConfigResponse | null>(null);  

  // ------------------------------------------------------------
  // Ticket notification management

  const ticketRefreshInterval = ref() as any;
  const jwtCheckInterval = ref() as any;

  // ------------------------------------------------------------
  // User activity tracking for session renewal
  const lastUserActivity = ref<number>(Date.now());
  const SESSION_INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
  const SESSION_RENEW_THRESHOLD = 60 * 1000;       // renew if < 1 minute remaining

  const updateLastActivity = () => { lastUserActivity.value = Date.now(); };

  const ticketPending = ref({
      pending: 0,
      assigned : 0
  } as PrivTicketPendingResponseItf ) as any;

  // ------------------------------------------------------------
  // Page initialisation

  const getPendingTichets = () => {
    useNuxtApp().$apiBackendTickets.ticketsModulePrivatePendingTicket().then((res) => {
      if (res.success) {
        ticketPending.value = res.success;
      }
    }).catch (error => {
      // do nothing, will try again in next slot
    });
  };


  onMounted(() => {
    if (route.path.includes('/private/')) {
      // Track user activity to decide whether to renew the session
      document.addEventListener('mousemove', updateLastActivity, { passive: true });
      document.addEventListener('click', updateLastActivity, { passive: true });
      document.addEventListener('keydown', updateLastActivity, { passive: true });

      jwtCheckInterval.value = setInterval(async () => {
        const jwt = appStore.getBackendJWT();
        if (jwt === null || appStore.isJWTExpired()) {
          clearInterval(jwtCheckInterval.value);
          router.push({ path: '/front/public/login', query: { redirect: route.fullPath } });
          return;
        }

        // Check if the JWT expires in less than 1 minute
        const timeUntilExpiry = appStore.renewJWTbefore - Date.now();
        if (timeUntilExpiry < SESSION_RENEW_THRESHOLD) {
          const inactiveDuration = Date.now() - lastUserActivity.value;
          if (inactiveDuration <= SESSION_INACTIVITY_LIMIT) {
            // User was active recently: renew the session silently
            await $apiBackendUsers.getUserSessionUpgrade('').catch(() => {});
          }
          // If inactive > 5 min, do nothing: the JWT will expire and be caught on the next tick
        }
      }, 10000);
    }

    const ticketRefreshDelay = (appStore.isSupportAdmin()?5000:60000); // 5s for admin, 60s for regular users

    $apiBackendUsers.getUserProfile().then((res) => {
        userProfile.value = res;
        $apiBackendUsers.getUserModuleConfig().then((res) => {
            userConfig.value = res;
            getPendingTichets();
            if ( ticketsEnabled && (!supportLink || supportLink == '') && userConfig && userConfig.value?.nonCommunityEdition  ) {
              ticketRefreshInterval.value = setInterval(() => {
                getPendingTichets();
              }, ticketRefreshDelay);
            }
        }).catch((err) => {
          // do nothing, will try again later
        });
    }).catch((err) => {
        // do nothing, will try again later
    });

  });

   
  onUnmounted(() => {
    document.removeEventListener('mousemove', updateLastActivity);
    document.removeEventListener('click', updateLastActivity);
    document.removeEventListener('keydown', updateLastActivity);
    if (jwtCheckInterval.value) {
      clearInterval(jwtCheckInterval.value);
    }
    if (ticketRefreshInterval.value) {
      clearInterval(ticketRefreshInterval.value);
    }
  });



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

  // ---
  // Apply user Locale if set and the color preferences, or keep browser default locale
  watch(userProfile, (profile) => {
    // set the language
    if (profile?.language) {
      switch (profile.language) {
        case 'fr': setLocale('fr'); break;
        case 'en': setLocale('en'); break;
      }
    }
    // set the color preferences
    if ( config.public.FORCE_APPEARANCE_MODE == '' && profile ) {
      let appearanceMode = $apiBackendUsers.getCustomField(profile, 'basic_uimode');
      if (appearanceMode) {
        colorMode.preference = appearanceMode;
      }
    }
    if ( config.public.FORCE_COLOR_SCHEME == ''  && profile ) {
      let primary = $apiBackendUsers.getCustomField(profile, 'basic_uicolor');
      if (primary) {
        appConfig.ui.colors.primary = primary;
      }
      let neutral = $apiBackendUsers.getCustomField(profile, 'basic_uineutral');
      if (neutral) {
        appConfig.ui.colors.neutral = neutral;
      }
    }
  }, { immediate: true });


  let getName = function () : string {
    let name : string = 'John Doe';
    if ( userProfile.value && (userProfile.value.firstName || userProfile.value.lastName) ) {
        if ( userProfile.value.firstName ) {
          name = userProfile.value.firstName;
        }
        if ( userProfile.value.lastName ) {
          name += ((userProfile.value.firstName)?' ':'') + userProfile.value.lastName;
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

  // ==================================================================================
  // Right side menus
  // ==================================================================================

  // -------------------------------------------------------------------
  // top right : access to the admin pages

  const dynTopRightMenu = computed<NavigationMenuItem[]>( () => {
    const topItems: NavigationMenuItem[] = [];
    topItems.push({ label: `${t('menu.home')}`,icon: 'i-lucide-house',to: '/front/private/home',onSelect: () => {mainData.open = false}});  
    if ( appStore.isUserAdmin() ) {
      topItems.push({ label: `${t('menu.userAdmin')}`,icon: 'i-lucide-user-round-cog',to: '/front/private/users',onSelect: () => {mainData.open = false}});  
    }
    if ( appStore.isSupportAdmin() && userConfig.value?.nonCommunityEdition) {
      topItems.push({ label: `${t('menu.supportAdmin')}`,icon: 'i-lucide-headset',to: '/front/private/support', badge:ticketPending.value.pending, onSelect: () => {mainData.open = false}});  
    }
    if ( appStore.isFilesAdmin() ) {
      topItems.push({ label: `${t('menu.filesAdmin')}`,icon: 'i-lucide-folder-bookmark',to: '/front/private/files-admin',onSelect: () => {mainData.open = false}});  
    }
    if ( appStore.isAuditAdmin() ) {
      topItems.push({ label: `${t('menu.auditAdmin')}`,icon: 'i-lucide-scroll-text',to: '/front/private/audit',onSelect: () => {mainData.open = false}});  
    }
    if ( appStore.isAlertTemplate() ) {
      topItems.push({ label: `${t('menu.alertTemplates')}`,icon: 'i-lucide-file-exclamation-point',to: '/front/private/alerts-template',onSelect: () => {mainData.open = false}});  
    }


    // Add custom menu items when exists
    config.public.CUSTOM_MENU_ITEMS.forEach((item: any) => {
      topItems.push({
        label: t(item.label),
        icon: item.icon,
        to: item.to,
        target: item.target || '_self',
        onSelect: () => {mainData.open = false}
      } as NavigationMenuItem);
    });

    return topItems;
  });


  // -----------------------------------------------------------------
  // Center right : group menus

  const groupsLoadContext = reactive({
    loading : false,
    error : null as string | null,
    groups : undefined as GroupsHierarchySimplified[] | undefined,
    dynGroupsMenu : [] as NavigationMenuItem[],
  });

  const addItemToList = (list: NavigationMenuItem[], item: GroupsHierarchySimplified) => {
    let name = (item.name === "groups-default-group")? t("common."+item.name) : item.name;
    let desc = (item.name === "groups-default-group")? t("common."+item.description) : item.description;

    let canHaveSub = false;
    if (   appStore.isGroupAdmin() || appStore.isGroupLocalAdmin() 
        || item.roles.includes('ROLE_GROUP_ADMIN') 
        || item.roles.includes('ROLE_GROUP_LADMIN') 
    ) {
      if ( (item.name == "groups-default-group") && userConfig.value?.subGroupUnderVirtualAllowed ) {
        canHaveSub = true;
      } else if ( item.name != "groups-default-group" ) {
        canHaveSub = true;
      }
    }

    if ( item.children && item.children.length > 0 || canHaveSub) {
      const children : NavigationMenuItem[] = [];
      if ( item.children && item.children.length > 0 ) {
        for ( const child of item.children ) {
          addItemToList(children, child);
        }
      }
      if ( canHaveSub ) {
        children.push({
          label: `${t('common.createSubGroup')}`,
          icon: 'i-lucide-plus',
          to: `/front/private/groups/create/${item.shortId}/`,
          onSelect: () => {mainData.open = false }
        } as NavigationMenuItem);  
      }
      list.push({
        label: name,
        description: desc,
        icon: 'i-lucide-folder',
        to: `/front/private/groups/show/${item.shortId}/`,
        defaultOpen: false,
        children: children
      } as NavigationMenuItem);
      return;
    } else {
      list.push({
        label: name,
        description: desc,
        icon: 'i-lucide-folder',
        to: `/front/private/groups/show/${item.shortId}/`,
        onSelect: () => {mainData.open = false }
      } as NavigationMenuItem);
    }
  };

  async function buildGroupsMenu() {
    const items : NavigationMenuItem[] = [];
    groupsLoadContext.loading = true;
    groupsLoadContext.error = null;
    $apiBackendUsers.userModuleGetGroupsHierarchy().then((res) => {
        groupsLoadContext.loading = false;
        if (res.success) {
          groupsLoadContext.groups = res.success;
          // Build the structure
          items.push({
            label: `${t('common.groups')}`, type: 'label'
          } as NavigationMenuItem
          );
          for ( const g of groupsLoadContext.groups ) {
            addItemToList(items, g);
          }
          if ( appStore.isGroupAdmin() ) {
            items.push({
              label: `${t('common.createGroup')}`,
              icon: 'i-lucide-plus',
              to: `/front/private/groups/create/root/`,
              onSelect: () => {mainData.open = false }
            } as NavigationMenuItem);  
          }

          groupsLoadContext.dynGroupsMenu.splice(0, groupsLoadContext.dynGroupsMenu.length, ...items);
        } else  if (res.error) {
          groupsLoadContext.error = t('login.'+res.error.message);
        }
    }).catch((err) => {
        groupsLoadContext.loading = false;
        groupsLoadContext.error  = t('common.unknownError');
    });
  };
  nuxtApp.hook("usermng:groupUpdate" as any, buildGroupsMenu);
  nuxtApp.callHook("usermng:groupUpdate" as any);



  // -------------------------------------------------------------------
  // bottom right : access to the user links (support, documentation, etc...)

  const dynRightMenu = computed<NavigationMenuItem[]>( () => {
    const items: NavigationMenuItem[] = [];
    if ( documentationLink && documentationLink !== '' ) {
      items.push(
        { label: `${t('menu.documentation')}`, icon: 'i-lucide-book-open-text', to: documentationLink, target: '_blank' }
      );
    }
    if ( apiDocumentationLink && apiDocumentationLink !== '' ) {
      items.push(
        { label: `${t('menu.apiDocumentation')}`, icon: 'i-lucide-plug', to: apiDocumentationLink },
      );
    }
    if ( ticketsEnabled ) {
      if ( faqLink && faqLink !== '' ) {
        // use external FAQ link
        items.push({ label: `${t('menu.faq')}`, target: "_blank", to: faqLink, icon: 'i-lucide-message-circle-question-mark',onSelect: () => {mainData.open = false } },);
      } else {
        // use internal ticketing system when NCE
        if ( userConfig.value?.nonCommunityEdition ) {
          items.push({ label: `${t('menu.faq')}`, to: '/front/private/faq', icon: 'i-lucide-message-circle-question-mark',onSelect: () => {mainData.open = false } } );
        }
      }

      if ( supportLink && supportLink !== '' ) {
        // use external support link
        items.push({ label: `${t('menu.support')}`, target: "_blank", to: supportLink, icon: 'i-lucide-message-circle',onSelect: () => {mainData.open = false } },);
      } else {
        // use internal ticketing system when NCE
        if ( userConfig.value?.nonCommunityEdition ) {
          items.push({ label: `${t('menu.support')}`, to: '/front/private/tickets', icon: 'i-lucide-sticker',onSelect: () => {mainData.open = false } } );
        }
      }
    }
    return items;
  });





/*
  const rightMenu = computed<NavigationMenuItem[][]>(() => {
    
    const items : NavigationMenuItem[][] = [
      [
        
        { label: `${t('menu.inbox')}`,icon: 'i-lucide-inbox',to: '/inbox',badge: '4',onSelect: () => {mainData.open = false} },
        { label: `${t('menu.settings')}`,icon: 'i-lucide-settings', to: '/settings', defaultOpen: true,type: 'trigger',children: 
          [
            { label: 'xxx',to: '/settings',exact: true,onSelect: () => {mainData.open = false } },
            { label: 'xxx',to: '/settings/security',onSelect: () => {mainData.open = false } },
          ]
        }
      ]
    ];
    const items : NavigationMenuItem[][] = [];
    items.push(dynTopRightMenu.value);
    items.push(dynRightMenu.value);
    return items;
  });
*/


  // ==================================================================================
  // TOP RIGHT : search menu helper
  // ==================================================================================
  const groups = computed(() => [
    { id: 'links', label: `${t('menu.searchGoTo')}`, items: groupsLoadContext.dynGroupsMenu.flat() },
    { id: 'code', label: `${t('menu.searchOther')}`,
          items: [
            { id: 'source', label: 'View page source', icon: 'i-simple-icons-github',to: `https://github.com/nuxt-ui-pro/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,target: '_blank'}
          ]
    }
  ]);



  // ==================================================================================
  // BOTTOM RIGHT : user menu with profile, settings, logout, etc...
  // ==================================================================================

  const userMenuItems = computed<DropdownMenuItem[][]>(() => {
    
    let items = [
      [
        { type: 'label', label: getName(), avatar: getAvatar()} 
      ],
      [
        { label: `${t('menu.profile')}`, icon: 'i-lucide-user', to: '/front/private/profile'},
      ]
    ] as DropdownMenuItem[][];

    if ( true || appStore.isApikeyCreator() /* we can see the previously created keys */) {
      items[1]!.push({ label: `${t('menu.apikeys')}`, icon: 'i-lucide-key-round', to: '/front/private/apikeys' });
    }

    if ( appStore.isCaptureEndpointCreator() ) {
      items[1]!.push({ label: `${t('menu.captureEndpoints')}`, icon: 'i-lucide-plug-zap', to: '/front/private/endpoints' });
    }

    if ( billingEnabled ) {
      items[1]!.push({ label: `${t('menu.billing')}`, icon: 'i-lucide-credit-card', to: '/front/private/billing' });
    }

    items[1]!.push({ label: `${t('menu.files')}`, icon: 'i-lucide-folder-bookmark', to: '/front/private/files' });

    const themeItems = { 
       label: `${t('menu.theme')}`, icon: 'i-lucide-palette', children: 
          [
            { label: `${t('menu.thprimary')}`, slot: 'chip', chip: appConfig.ui.colors.primary,content: { align: 'center', collisionPadding: 16},
              children: colors.map(color => ({ label: color, chip: color, slot: 'chip', checked: appConfig.ui.colors.primary === color, type: 'checkbox',
                  onSelect: (e) => { e.preventDefault(); appConfig.ui.colors.primary = color; onPrimaryChange(color);}
              }))
            },
            { label: `${t('menu.thneutral')}`, slot: 'chip', chip: appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral, content: { align: 'end', collisionPadding: 16 }, 
              children: neutrals.map(color => ({ label: color, chip: color === 'neutral' ? 'old-neutral' : color, slot: 'chip', type: 'checkbox', checked: appConfig.ui.colors.neutral === color,
                  onSelect: (e) => { e.preventDefault(); appConfig.ui.colors.neutral = color; onNeutralChange(color);}
              }))
            }
          ]
    } as DropdownMenuItem;
    const appearanceItems = { 
      label: `${t('menu.appearance')}`, icon: 'i-lucide-sun-moon',children: 
        [
          { label: `${t('menu.light')}`, icon: 'i-lucide-sun', type: 'checkbox', checked: colorMode.value === 'light',
            onSelect(e: Event) { e.preventDefault();colorMode.preference = 'light';onAppearanceChange('light'); },
          },
          { label: `${t('menu.dark')}`, icon: 'i-lucide-moon', type: 'checkbox', checked: colorMode.value === 'dark',
            onUpdateChecked(checked: boolean) { if (checked) { colorMode.preference = 'dark';onAppearanceChange('dark'); }},
            onSelect(e: Event) { e.preventDefault() }
          }
        ]
    } as DropdownMenuItem;

    const themeGroup: DropdownMenuItem[] = [];
    if (config.public.FORCE_COLOR_SCHEME === '') {
      themeGroup.push(themeItems);
    }
    if ( config.public.FORCE_APPEARANCE_MODE === '' ) {
      themeGroup.push(appearanceItems);
    }
    if ( themeGroup.length > 0 ) {
      items.push(themeGroup)
    }
    items.push(
      /*
      [
        { label: 'to remove',icon: 'i-lucide-layout-template',children: 
        [ 
            { label: 'Starter',to: 'https://ui-pro-starter.nuxt.dev/'}, 
            { label: 'Landing',to: 'https://landing-template.nuxt.dev/'}
        ] 
        }
      ],
      */
      [
      { label: `${t('menu.logout')}`, icon: 'i-lucide-log-out', to: '/front/private/signout' }
      ]
   );
  return items;
});

  // ==================================================================================
  // Interface udpdate & Hooks handling
  // ==================================================================================


  async function onPrimaryChange (color: string) {
    if ( appStore.getUserLogin() != null) {
       const res = await $apiBackendUsers.putUserCustomFieldRequest(appStore.getUserLogin() || '', 'basic_uicolor', color);
    }  
  };

  async function onNeutralChange (color: string) {
    if ( appStore.getUserLogin() != null) {
       const res = await $apiBackendUsers.putUserCustomFieldRequest(appStore.getUserLogin() || '', 'basic_uineutral', color);
    }
  };

  async function  onAppearanceChange (appearance: string) {
    if ( appStore.getUserLogin() != null) {
       const res = await $apiBackendUsers.putUserCustomFieldRequest(appStore.getUserLogin() || '', 'basic_uimode', appearance );
    }
  };

  // --- refresh profile on update
  nuxtApp.hook('profile:refresh' as any, async () => {
      const p = await $apiBackendUsers.getUserProfile();
      userProfile.value = p;
  });


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
        <div class="flex flex-col items-start gap-0.5">
          <img 
            :src="logoImage" 
            alt="IoT Tower Control Logo" 
            class="h-8 w-auto sm:h-12 md:h-12"
            @click="router.push('/front/private/home')"
          />
          <span v-if="!collapsed" class="text-[10px] text-dimmed leading-none">v{{ config.public.VERSION }}</span>
        </div>
      </template>

      <!-- Main menu on the right of the page -->
      <template #default="{ collapsed }">
        <UDashboardSearchButton 
           :collapsed="collapsed" 
           :label="t('menu.searchBox')"
           class="bg-transparent ring-default" 
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items=dynTopRightMenu
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items=groupsLoadContext.dynGroupsMenu
          orientation="vertical"
          tooltip
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items=dynRightMenu
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
    <UDashboardPanel id="main" :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <UDashboardNavbar :title=pageTitle :ui="{ right: 'gap-3' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <UTooltip 
              v-if="(ticketsEnabled && (!supportLink || supportLink == '') && userConfig && userConfig.nonCommunityEdition )" 
              :text="$t('menu.supportTickets')" >
              <UButton
                v-if="appStore.isSupportAdmin()"
                color="neutral"
                variant="ghost"
                square
                @click="router.push('/front/private/support');"
              >
                <UChip v-if="ticketPending.pending > 0" color="error" size="lg" inset>
                  <UIcon name="i-lucide-sticker" class="size-5 shrink-0" />
                </UChip>
                <UIcon v-if="ticketPending.pending == 0" name="i-lucide-sticker" class="size-5 shrink-0" />
              </UButton>
              <UButton
                v-else
                color="neutral"
                variant="ghost"
                square
                @click="router.push('/front/private/tickets');"
              >
                <UChip v-if="ticketPending.pending > 0" color="success" size="lg" inset>
                  <UIcon name="i-lucide-sticker" class="size-5 shrink-0" />
                </UChip>
                <UIcon v-if="ticketPending.pending == 0" name="i-lucide-sticker" class="size-5 shrink-0" />
              </UButton>
            </UTooltip>

            <UTooltip :text="$t('menu.alarmsNotifications')" :shortcuts="['N']">
              <UButton
                color="neutral"
                variant="ghost"
                square
              >
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UButton>
            </UTooltip>
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <slot/>
      </template>
    </UDashboardPanel>

    <!-- <NotificationsSlideover /> -->
    <ToolsToasterDisconnected />
  </UDashboardGroup>

</template>