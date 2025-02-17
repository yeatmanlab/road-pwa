<template>
  <div id="register-container">
    <section id="register">
      <header>
        <div class="signin-logo">
          <ROARLogoShort />
        </div>
      </header>
      <div>
        <div v-if="activeIndex === 0" class="register-title">
          <h1 align="center">Register for ROAR</h1>
          <p align="center">Enter your information to create an account.</p>
        </div>
        <div v-else class="register-title">
          <h1 align="center">Register your child</h1>
          <p align="center">Enter your child's information to create their ROAR account.</p>
        </div>
        <div v-if="spinner === false">
          <KeepAlive>
            <component :is="activeComp()" @submit="handleSubmit($event)" />
          </KeepAlive>
          <div
            v-if="isSuperAdmin"
            class="flex flex-row justify-content-center align-content-center z-2 absolute ml-5"
            style="margin-top: -5rem; margin-bottom: 4rem"
          >
            <PvCheckbox :model-value="isTestData" :binary="true" name="isTestDatalabel" @change="updateState" />
            <label for="isTestDatalabel" class="ml-2">This is test data</label>
          </div>
          <div v-if="activeIndex === 1">
            <PvButton
              class="justify-start z-1 hover:surface-300 hover:text-900 border-none"
              style="margin-top: -3.2rem; width: 11rem; margin-left: 2rem"
              @click="activeIndex = 0"
              ><i class="pi pi-arrow-left mr-2"></i> Back
            </PvButton>
          </div>
        </div>
        <div v-else class="loading-container flex text-center justify-content-center align-content-center">
          <AppSpinner style="margin-bottom: 1rem" />
          <span class="flex text-center">Creating Family</span>
        </div>
        <PvDialog
          v-model:visible="isDialogVisible"
          :header="dialogHeader"
          :style="{ width: '25rem' }"
          :position="position"
          :modal="true"
          :draggable="false"
        >
          <p>{{ dialogMessage }}</p>
          <PvButton @click="closeDialog">Close</PvButton>
        </PvDialog>
      </div>
    </section>
  </div>
</template>

<script setup>
import Register from '../components/auth/RegisterParent.vue';
import RegisterStudent from '../components/auth/RegisterStudent.vue';
import ROARLogoShort from '@/assets/RoarLogo-Short.vue';
import { ref, onMounted, onBeforeUnmount, watch, toRaw, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { fetchDocById } from '@/helpers/query/utils';
import router from '../router';

const authStore = useAuthStore();
const { roarfirekit, uid } = storeToRefs(authStore);
const initialized = ref(false);
const spinner = ref(false);
let unsubscribe;

const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

onMounted(() => {
  if (roarfirekit.value.restConfig) init();
});

// const claimsLoaded = computed(() => !isLoadingClaims.value);

const { data: userClaims } = useQuery({
  queryKey: ['userClaims', uid],
  queryFn: () => fetchDocById('userClaims', uid.value),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const isSuperAdmin = computed(() => Boolean(userClaims.value?.claims?.super_admin));

const activeIndex = ref(0); // Current active step
const isTestData = ref(false);

const parentInfo = ref(null);
const studentInfo = ref(null);
const dialogHeader = ref('');
const dialogMessage = ref('');

const isDialogVisible = ref(false);

const showDialog = () => {
  isDialogVisible.value = true;
};

const closeDialog = () => {
  isDialogVisible.value = false;
  router.push({ name: 'SignIn' });
};

async function handleParentSubmit(data) {
  try {
    parentInfo.value = data;
    activeIndex.value = 1;
  } catch (error) {
    dialogHeader.value = 'Error!';
    dialogMessage.value = error.message;
    showDialog();
  }
}

async function handleStudentSubmit(data) {
  try {
    studentInfo.value = data;
  } catch (error) {
    dialogHeader.value = 'Error!';
    dialogMessage.value = error.message;
    showDialog();
  }
}

async function handleSubmit(event) {
  if (activeComp() == RegisterStudent) {
    handleStudentSubmit(event);
  } else {
    handleParentSubmit(event);
    activeIndex.value = 1;
    activeComp();
  }
}

function updateState() {
  isTestData.value = !isTestData.value;
}

function activeComp() {
  if (activeIndex.value === 0) {
    return Register;
  } else {
    return RegisterStudent;
  }
}

watch([parentInfo, studentInfo], ([newParentInfo, newStudentInfo]) => {
  if (newParentInfo && newStudentInfo) {
    spinner.value = true;
    const rawParentInfo = toRaw(newParentInfo);
    const rawStudentInfo = toRaw(newStudentInfo);
    const parentUserData = {
      name: {
        first: rawParentInfo.firstName,
        last: rawParentInfo.lastName,
      },
    };
    const studentSendObject = rawStudentInfo.map((student) => {
      return {
        email: student.studentUsername,
        password: student.password,
        userData: {
          name: {
            first: student.firstName,
            middle: student.middleName,
            last: student.lastName,
          },
          activationCode: student.activationCode,
          grade: student.grade,
          dob: student.dob,
          gender: student.gender,
          ell_status: student.ell,
          iep_status: student.IEPStatus,
          frl_status: student.freeReducedLunch,
          race: student.race,
          hispanic_ethnicity: student.hispanicEthnicity,
          home_language: student.homeLanguage,
        },
      };
    });
    authStore
      .createNewFamily(
        rawParentInfo.ParentEmail,
        rawParentInfo.password,
        parentUserData,
        studentSendObject,
        isTestData.value,
      )
      .then(() => {
        spinner.value = false;
        dialogHeader.value = 'Success!';
        dialogMessage.value = 'Your family has been created!';
        showDialog();
      });
  }
});

onMounted(() => {
  document.body.classList.add('page-register');
});

onBeforeUnmount(() => {
  document.body.classList.remove('page-register');
});
</script>

<style scoped>
.step-container {
  width: 40%;
  margin: auto;
}

.step-container {
  width: 26.875rem;
  margin-top: 3rem;
}

.submit-button {
  margin: auto;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  background-color: #e5e5e5;
  color: black;
  border: none;
  width: 11.75rem;
  justify-content: center;
  align-items: center;
}
.submit-button:hover {
  background-color: #8c1515;
  color: #e5e5e5;
}
#register .form-submit {
  justify-content: center;
  margin-top: 2rem;
  align-items: center;
  display: flex;
}
</style>
