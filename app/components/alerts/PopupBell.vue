<script setup lang="ts">
import type { AlertPopupItf } from '~/types';

const { t, locale } = useI18n();
const nuxtApp = useNuxtApp();

const POLL_INTERVAL_MS = 30_000;

// ── State ────────────────────────────────────────────────────────────────────
const unreadCount = ref(0);
const overlayOpen = ref(false);
const popups      = ref<AlertPopupItf[]>([]);

let badgeIntervalId = 0 as any;

// ── Helpers ──────────────────────────────────────────────────────────────────
function criticalityColor(c: string): 'error' | 'warning' | 'info' | 'neutral' {
    if (c === 'DANGER')  return 'error';
    if (c === 'WARNING') return 'warning';
    if (c === 'INFO')    return 'info';
    return 'neutral';
}

function criticalityLabel(c: string): string {
    const map: Record<string, string> = {
        INFO:    t('alertsPopup.criticalityInfo'),
        WARNING: t('alertsPopup.criticalityWarning'),
        DANGER:  t('alertsPopup.criticalityDanger'),
        DEFAULT: t('alertsPopup.criticalityDefault'),
    };
    return map[c] ?? c;
}

function relativeTime(ms: number): string {
    const diffMs = Date.now() - ms;
    if (diffMs < 60_000) return t('alertsPopup.justNow');
    const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
    const diffSec = diffMs / 1000;
    if (diffSec < 3600)  return rtf.format(-Math.floor(diffSec / 60), 'minute');
    if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), 'hour');
    return rtf.format(-Math.floor(diffSec / 86400), 'day');
}

// ── Badge polling (no side effects) ──────────────────────────────────────────
async function refreshBadge() {
    const res = await nuxtApp.$apiBackendAlerts.alertPopupCount();
    if (res.success) unreadCount.value = res.success.unreadCount;
}

// ── Bell click ────────────────────────────────────────────────────────────────
async function openOverlay() {
    overlayOpen.value = true;
    const res = await nuxtApp.$apiBackendAlerts.alertPopupList();
    if (res.success) popups.value = res.success;
    nuxtApp.$apiBackendAlerts.alertPopupMarkViewed(); // fire-and-forget — server marks all as viewed
    unreadCount.value = 0; // optimistic local clear
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
    refreshBadge();
    badgeIntervalId = setInterval(refreshBadge, POLL_INTERVAL_MS);
});

onUnmounted(() => {
    clearInterval(badgeIntervalId);
});
</script>

<template>
    <UTooltip :text="$t('menu.alarmsNotifications')" :shortcuts="['N']">
        <UButton color="neutral" variant="ghost" square @click="openOverlay">
            <UChip
                v-if="unreadCount > 0"
                :text="unreadCount > 9 ? '9+' : String(unreadCount)"
                color="error"
                size="lg"
                inset
            >
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
            </UChip>
            <UIcon v-else name="i-lucide-bell" class="size-5 shrink-0" />
        </UButton>
    </UTooltip>

    <USlideover v-model:open="overlayOpen" :title="$t('alertsPopup.title')" side="right">
        <template #body>
            <div
                v-if="popups.length === 0"
                class="flex items-center justify-center h-32 text-sm text-muted"
            >
                {{ $t('alertsPopup.noNotifications') }}
            </div>
            <ul v-else class="divide-y divide-default">
                <li
                    v-for="popup in popups"
                    :key="popup.alertId + popup.timeMs"
                    class="flex gap-3 px-4 py-3"
                >
                    <UBadge
                        :color="criticalityColor(popup.criticality)"
                        variant="soft"
                        size="sm"
                        class="mt-0.5 shrink-0"
                    >
                        {{ criticalityLabel(popup.criticality) }}
                    </UBadge>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-highlighted break-words">{{ popup.message }}</p>
                        <p class="text-xs text-muted mt-1">{{ relativeTime(popup.timeMs) }}</p>
                    </div>
                </li>
            </ul>
        </template>
    </USlideover>
</template>
