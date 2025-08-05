import { defineStore } from 'pinia'

export const applicationStore = defineStore('app', {
  state: () => ({
    backendUp: true as boolean,
  }),
  actions: {
    setBackendDown() {
      this.backendUp = false;
    },
    setBackendUp() {
      this.backendUp = true;
    },
  },
})