import { set } from '@nuxt/ui/runtime/utils/index.js';
import { defineStore } from 'pinia'

export const applicationStore = defineStore('app', {
  state: () => ({
    backendUp: true as boolean,
    backendJWT: null as string | null,
    refreshJWT: null as string | null,
    renewJWTbefore : 0 as number,           // Timestamp in milliseconds
    userEmail: null as string | null,
    userLogin: null as string | null,
    user2faSize: 0 as number,
    user2faType: '' as string,
    userAdmin: false as boolean | null,
    groupLocalAdmin: false as boolean | null,
    groupAdmin: false as boolean | null,
  }),
  actions: {
    clearStore() {
      this.backendUp = true;
      this.backendJWT = null;
      this.refreshJWT = null;
      this.renewJWTbefore = 0;
      this.userEmail = null;
      this.userLogin = null;
      this.user2faSize = 0;
      this.user2faType = '';
      this.userAdmin = false;
      this.groupLocalAdmin = false;
      this.groupAdmin = false;
    },
    setBackendDown() {
      this.backendUp = false;
    },
    setBackendUp() {
      this.backendUp = true;
    },
    isBackendUp() : boolean{
        return this.backendUp;
    },
    setBackendJWT(token: string) {
      this.backendJWT = token;
    },
    getBackendJWT(): string | null {
      return this.backendJWT;
    },
    setRefreshJWT(token: string) {
      this.refreshJWT = token;
    },
    getRefreshJWT(): string | null {
      return this.refreshJWT;
    },
    setRenewJWTbefore(timestamp: number | null) {
       if (timestamp === null || timestamp <= 0) {
          this.renewJWTbefore = 0;
       } else {
           this.renewJWTbefore = timestamp;
       }
    },
    isJWTToBeRenewed(): boolean {
      if (this.renewJWTbefore <= 0) {
        return false;
      }
      const currentTime = (Date.now()+ 15 * 60 * 1000); // Current time + 15 minutes in milliseconds
      return currentTime >= this.renewJWTbefore;
    },
    isJWTExpired(): boolean {
      if (this.renewJWTbefore <= 0) {
        return true;
      }
      return Date.now() >= this.renewJWTbefore;
    },
    setUserEmail(email: string | null) {
      this.userEmail = email;
    },
    setUserLogin(login: string | null) {
      this.userLogin = login;
    },
    getUserEmail(): string | null {
      return this.userEmail;
    },
    getUserLogin(): string | null {
      return this.userLogin;
    },
    setUser2faSize(size: number) {
      this.user2faSize = size;
    },
    getUser2faSize(): number {
      return this.user2faSize;
    },
    setUser2faType(type: string) {
      this.user2faType = type;
    },
    getUser2faType(): string {
      return this.user2faType;
    },
    setUserAdmin(isAdmin: boolean) {
      this.userAdmin = isAdmin;
    },
    isUserAdmin(): boolean | null {
      return this.userAdmin;
    },
    setGroupLocalAdmin(isAdmin: boolean) {
      this.groupLocalAdmin = isAdmin;
    },
    isGroupLocalAdmin(): boolean | null {
      return this.groupLocalAdmin;
    },
    setGroupAdmin(isAdmin: boolean) {
      this.groupAdmin = isAdmin;
    },
    isGroupAdmin(): boolean | null {
      return this.groupAdmin;
    },
  },
 });