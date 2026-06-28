<script setup lang="ts">
import type { AlertPopupItf } from '~/types';

const { t, locale } = useI18n();
const nuxtApp = useNuxtApp();
const toast   = useToast();

const POLL_INTERVAL_MS = 30_000;

// ── State ────────────────────────────────────────────────────────────────────
const unreadCount = ref(0);
const overlayOpen = ref(false);
const popups      = ref<AlertPopupItf[]>([]);

// Toaster circuit: tracks the highest timeMs seen so far.
// Initialised to Date.now() so only notifications arriving after page load are shown.
const since = ref(Date.now());

let badgeIntervalId   = 0 as any;
let toasterIntervalId = 0 as any;

// ── Helpers ──────────────────────────────────────────────────────────────────
function criticalityColor(c: string): 'error' | 'warning' | 'info' {
    if (c === 'DANGER')  return 'error';
    if (c === 'WARNING') return 'warning';
    return 'info'; // INFO and DEFAULT → blue
}

function criticalityIcon(c: string): string {
    if (c === 'DANGER')  return 'i-lucide-circle-alert';
    if (c === 'WARNING') return 'i-lucide-triangle-alert';
    return 'i-lucide-info'; // INFO and DEFAULT
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

// ── Circuit 1 — Badge (safe, no side effects) ─────────────────────────────────
async function refreshBadge() {
    const res = await nuxtApp.$apiBackendAlerts.alertPopupCount();
    if (res.success) unreadCount.value = res.success.unreadCount;
}

// ── Circuit 2 — Toaster (safe, no side effects) ───────────────────────────────
async function pollNewAlerts() {
    const res = await nuxtApp.$apiBackendAlerts.alertPopupNew(since.value);
    if (!res.success || res.success.length === 0) return;

    const entries = res.success;
    // Advance the pointer to avoid showing the same entries again
    since.value = Math.max(...entries.map(e => e.timeMs));
    // Show one toast for the most recent entry
    const latest = entries[entries.length - 1]!;
    toast.add({
        title:       criticalityLabel(latest.criticality),
        description: latest.message,
        color:       criticalityColor(latest.criticality),
        icon:        criticalityIcon(latest.criticality),
    });
}

// ── Bell click ────────────────────────────────────────────────────────────────
async function openOverlay() {
    overlayOpen.value = true;
    const res = await nuxtApp.$apiBackendAlerts.alertPopupList();
    if (res.success) popups.value = res.success;
    nuxtApp.$apiBackendAlerts.alertPopupMarkViewed(); // fire-and-forget
    unreadCount.value = 0; // optimistic local clear
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
    refreshBadge();
    badgeIntervalId   = setInterval(refreshBadge,    POLL_INTERVAL_MS);
    toasterIntervalId = setInterval(pollNewAlerts,   POLL_INTERVAL_MS);
});

onUnmounted(() => {
    clearInterval(badgeIntervalId);
    clearInterval(toasterIntervalId);
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
