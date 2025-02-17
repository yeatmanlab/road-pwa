<template>
  <div v-if="spinner" class="loading-blur">
    <AppSpinner />
  </div>
  <div id="signin-container">
    <section id="signin">
      <header>
        <div class="signin-logo">
          <PvImage v-if="isLevante" src="/LEVANTE/Levante_Logo.png" alt="LEVANTE Logo" width="200" />
          <ROARLogoShort v-else />
        </div>
      </header>
      <h1 v-if="!isLevante">{{ $t('pageSignIn.welcome') }}</h1>
      <section class="signin-options">
        <section class="signin-option-container signin-option-userpass">
          <h4 class="signin-option-title">{{ $t('pageSignIn.login') }}</h4>
          <div id="languageSelect" class="m-4 flex justify-content-center">
            <LanguageSelector />
          </div>
          <SignIn :invalid="incorrect" @submit="authWithEmail" />
        </section>
        <section class="signin-option-container signin-option-providers">
          <h4 class="signin-option-title">{{ $t('pageSignIn.loginWith') }}</h4>
          <div class="flex">
            <PvButton label="Sign in with Google" class="signin-button" @click="authWithGoogle">
              <img src="../assets/provider-google-logo.svg" alt="The Google Logo" class="signin-button-icon" />
              <span>Google</span>
            </PvButton>
            <PvButton v-if="!isLevante" class="signin-button" @click="authWithClever">
              <img src="../assets/provider-clever-logo.svg" alt="The Clever Logo" class="signin-button-icon" />
              <span>Clever</span>
            </PvButton>
            <PvButton v-if="!isLevante" class="signin-button" @click="authWithClassLink">
              <img src="../assets/provider-classlink-logo.png" alt="The ClassLink Logo" class="signin-button-icon" />
              <span>ClassLink</span>
            </PvButton>
          </div>
        </section>
        <!-- <section class="signin-option-container signin-option-providers">
          <div class="flex flex-row justify-content-center w-full">
            <p class="signin-option-title text-sm">Don't have an account yet?</p>
            <PvButton label="Register" class="signin-button w-3" @click="router.push({ name: 'Register' })" />
          </div>
        </section> -->
      </section>
      <footer style="display: none">
        <!-- TODO: figure out a link for this -->
        <a href="#trouble">{{ $t('pageSignIn.havingTrouble') }}</a>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref, toRaw, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import SignIn from '@/components/auth/SignIn.vue';
import ROARLogoShort from '@/assets/RoarLogo-Short.vue';
import { useAuthStore } from '@/store/auth';
import { isMobileBrowser } from '@/helpers';
import { fetchDocById } from '../helpers/query/utils';

const incorrect = ref(false);
const isLevante = import.meta.env.MODE === 'LEVANTE';
const authStore = useAuthStore();
const router = useRouter();

const { spinner, authFromClever, authFromClassLink } = storeToRefs(authStore);

authStore.$subscribe(() => {
  if (authStore.uid) {
    if (authStore.userData && isLevante) {
      if (
        toRaw(authStore.userData?.userType?.toLowerCase()) === 'parent' ||
        toRaw(authStore.userData?.userType?.toLowerCase()) === 'teacher'
      ) {
        router.push({ name: 'Survey' });
        return;
      }
    }

    if (authFromClever.value) {
      router.push({ name: 'CleverLanding' });
    } else {
      router.push({ name: 'Home' });
    }
    if (authFromClassLink.value) {
      router.push({ name: 'ClassLinkLanding' });
    } else {
      router.push({ name: 'Home' });
    }
  }
});

const authWithGoogle = () => {
  if (isMobileBrowser()) {
    authStore.signInWithGoogleRedirect();
  } else {
    // authStore.signInWithGoogleRedirect();
    authStore
      .signInWithGooglePopup()
      .then(async () => {
        if (authStore.uid) {
          const userData = await fetchDocById('users', authStore.uid);
          const userClaims = await fetchDocById('userClaims', authStore.uid);
          authStore.userData = userData;
          authStore.userClaims = userClaims;
        }
      })
      .catch((e) => {
        console.log('caught error', e);
        spinner.value = false;
      });

    spinner.value = true;
  }
};

const authWithClever = () => {
  if (isMobileBrowser()) {
    authStore.signInWithCleverRedirect();
  } else {
    authStore.signInWithCleverRedirect();
    // authStore.signInWithCleverPopup();
    spinner.value = true;
  }
};

const authWithClassLink = () => {
  console.log('---> authWithClassLink');
  if (isMobileBrowser()) {
    authStore.signInWithClassLinkRedirect();
  } else {
    authStore.signInWithClassLinkRedirect();
    // authStore.signInWithCleverPopup();
    spinner.value = true;
  }
};

const authWithEmail = (state) => {
  // If username is supplied instead of email
  // turn it into our internal auth email
  incorrect.value = false;
  let creds = toRaw(state);
  if (creds.useLink && !creds.usePassword) {
    authStore.initiateLoginWithEmailLink({ email: creds.email }).then(() => {
      router.push({ name: 'AuthEmailSent' });
    });
  } else {
    if (!creds.email.includes('@')) {
      creds.email = `${creds.email}@roar-auth.com`;
    }

    authStore
      .logInWithEmailAndPassword(creds)
      .then(async () => {
        if (authStore.uid) {
          const userData = await fetchDocById('users', authStore.uid);
          const userClaims = await fetchDocById('userClaims', authStore.uid);
          authStore.userData = userData;
          authStore.userClaims = userClaims;
        }

        spinner.value = true;
      })
      .catch((e) => {
        incorrect.value = true;
        if (['auth/user-not-found', 'auth/wrong-password'].includes(e.code)) {
          return;
        } else {
          throw e;
        }
      });
  }
};

onMounted(() => {
  document.body.classList.add('page-signin');
  if (authStore.cleverOAuthRequested) {
    authStore.cleverOAuthRequested = false;
    authWithClever();
  }
  if (authStore.classLinkOAuthRequested) {
    authStore.classLinkOAuthRequested = false;
    authWithClassLink();
  }
});

onBeforeUnmount(() => {
  document.body.classList.remove('page-signin');
});
</script>

<style scoped>
.loading-blur {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.7);
  padding-top: 21vh;
}
</style>
