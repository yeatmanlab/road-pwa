<template>
  <div>
    <div v-if="!noGamesAvailable || consentSpinner">
      <div v-if="isFetching || consentSpinner" class="loading-container">
        <AppSpinner style="margin-bottom: 1rem" />
        <span>{{ $t('homeParticipant.loadingAssignments') }}</span>
      </div>
      <div v-else>
        <h2 v-if="adminInfo?.length == 1" class="p-float-label dropdown-container">
          {{ adminInfo.at(0).publicName || adminInfo.at(0).name }}
        </h2>
        <div class="flex flex-row-reverse align-items-end gap-2 justify-content-between">
          <div
            v-if="optionalAssessments.length !== 0"
            class="switch-container flex flex-row align-items-center justify-content-end mr-6 gap-2"
          >
            <PvInputSwitch
              v-model="showOptionalAssessments"
              input-id="switch-optional"
              data-cy="switch-show-optional-assessments"
            />
            <label for="switch-optional" class="mr-2 text-gray-500">{{
              $t('homeParticipant.showOptionalAssignments')
            }}</label>
          </div>
          <div
            v-if="adminInfo?.length > 1"
            class="flex flex-row justify-center align-items-center p-float-label dropdown-container gap-4 w-full"
          >
            <div class="assignment-select-container flex flex-row justify-content-between justify-content-start">
              <div class="flex flex-column align-content-start justify-content-start w-3">
                <PvDropdown
                  v-if="adminInfo.every((admin) => admin.publicName)"
                  v-model="selectedAdmin"
                  :options="adminInfo ?? []"
                  option-label="publicName"
                  input-id="dd-assignment"
                  data-cy="dropdown-select-administration"
                  @change="toggleShowOptionalAssessments"
                />
                <PvDropdown
                  v-else
                  v-model="selectedAdmin"
                  :options="adminInfo ?? []"
                  option-label="name"
                  input-id="dd-assignment"
                  data-cy="dropdown-select-administration"
                  @change="toggleShowOptionalAssessments"
                />
                <label for="dd-assignment">{{ $t('homeParticipant.selectAssignment') }}</label>
              </div>
            </div>
          </div>
        </div>
        <div class="tabs-container">
          <ParticipantSidebar :total-games="totalGames" :completed-games="completeGames" :student-info="studentInfo" />
          <Transition name="fade" mode="out-in">
            <GameTabs
              v-if="showOptionalAssessments"
              :games="optionalAssessments"
              :sequential="isSequential"
              :user-data="userData"
            />
            <GameTabs v-else :games="requiredAssessments" :sequential="isSequential" :user-data="userData" />
          </Transition>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="col-full text-center">
        <h1>{{ $t('homeParticipant.noAssignments') }}</h1>
        <p class="text-center">{{ $t('homeParticipant.contactAdministrator') }}</p>
        <router-link :to="{ name: 'SignOut' }">
          <PvButton :label="$t('navBar.signOut')" class="no-underline" icon="pi pi-sign-out" />
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import _filter from 'lodash/filter';
import _get from 'lodash/get';
import _head from 'lodash/head';
import _find from 'lodash/find';
import _without from 'lodash/without';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import { storeToRefs } from 'pinia';
import { useQuery } from '@tanstack/vue-query';
import { fetchDocById, fetchDocsById, fetchSubcollection } from '../helpers/query/utils';
import { getUserAssignments } from '../helpers/query/assignments';

let GameTabs, ParticipantSidebar;
const isLevante = import.meta.env.MODE === 'LEVANTE';
let unsubscribe;
const initialized = ref(false);
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

const authStore = useAuthStore();
const { roarfirekit, uid, consentSpinner, userQueryKeyIndex, assignmentQueryKeyIndex } = storeToRefs(authStore);

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

onMounted(async () => {
  GameTabs = (await import('../components/GameTabs.vue')).default;
  ParticipantSidebar = (await import('../components/ParticipantSidebar.vue')).default;
  if (roarfirekit.value.restConfig) init();
});

const gameStore = useGameStore();
const { selectedAdmin } = storeToRefs(gameStore);

const {
  isLoading: isLoadingUserData,
  isFetching: isFetchingUserData,
  data: userData,
} = useQuery({
  queryKey: ['userData', uid, userQueryKeyIndex],
  queryFn: () => fetchDocById('users', uid.value),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const {
  isLoading: isLoadingAssignments,
  isFetching: isFetchingAssignments,
  data: assignmentInfo,
} = useQuery({
  queryKey: ['assignments', uid, assignmentQueryKeyIndex],
  queryFn: () => getUserAssignments(uid.value),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 min
  // For MEFS, since it is opened in a separate tab
  refetchOnWindowFocus: 'always',
});

const administrationIds = computed(() => (assignmentInfo.value ?? []).map((assignment) => assignment.id));
const administrationQueryEnabled = computed(() => !isLoadingAssignments.value);

const {
  isLoading: isLoadingAdmins,
  isFetching: isFetchingAdmins,
  data: adminInfo,
} = useQuery({
  queryKey: ['administrations', uid, administrationIds],
  queryFn: () =>
    fetchDocsById(
      administrationIds.value.map((administrationId) => {
        return {
          collection: 'administrations',
          docId: administrationId,
          select: ['name', 'publicName', 'sequential', 'assessments'],
        };
      }),
    ),
  keepPreviousData: true,
  enabled: administrationQueryEnabled,
  staleTime: 5 * 60 * 1000,
});

const taskIds = computed(() => (selectedAdmin.value?.assessments ?? []).map((assessment) => assessment.taskId));

const {
  isLoading: isLoadingTasks,
  isFetching: isFetchingTasks,
  data: taskInfo,
} = useQuery({
  queryKey: ['tasks', uid, taskIds],
  queryFn: () => {
    return fetchDocsById(
      taskIds.value.map((taskId) => ({
        collection: 'tasks',
        docId: taskId,
      })),
      'app',
    );
  },
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000,
});

const { data: surveyResponsesData } = useQuery({
  queryKey: ['surveyResponses', uid],
  queryFn: () => fetchSubcollection(`users/${uid.value}`, 'surveyResponses'),
  keepPreviousData: true,
  enabled: initialized.value && import.meta.env.MODE === 'LEVANTE',
  staleTime: 5 * 60 * 1000,
});

const isLoading = computed(() => {
  return isLoadingUserData.value || isLoadingAssignments.value || isLoadingAdmins.value || isLoadingTasks.value;
});

const isFetching = computed(() => {
  return isFetchingUserData.value || isFetchingAssignments.value || isFetchingAdmins.value || isFetchingTasks.value;
});

const noGamesAvailable = computed(() => {
  if (isFetching.value || isLoading.value) return false;
  return assessments.value.length === 0;
});

const showOptionalAssessments = ref(null);
const toggleShowOptionalAssessments = () => {
  showOptionalAssessments.value = null;
};

// Assessments to populate the game tabs.
// Generated based on the current selected admin Id
const assessments = computed(() => {
  if (!isFetching.value && selectedAdmin.value && (taskInfo.value ?? []).length > 0) {
    const fetchedAssessments = _without(
      selectedAdmin.value.assessments.map((assessment) => {
        // Get the matching assessment from assignmentInfo
        const matchingAssignment = _find(assignmentInfo.value, { id: selectedAdmin.value.id });
        const matchingAssessments = matchingAssignment?.assessments ?? [];
        const matchingAssessment = _find(matchingAssessments, { taskId: assessment.taskId });

        // If no matching assessments were found, then this assessment is not assigned to the user.
        // It is in the administration but the user does not meet the conditional requirements for assignment.
        // Return undefined, which will be filtered out using lodash _without above.
        if (!matchingAssessment) return undefined;
        const optionalAssessment = _find(matchingAssessments, { taskId: assessment.taskId, optional: true });
        const combinedAssessment = {
          ...matchingAssessment,
          ...optionalAssessment,
          ...assessment,
          taskData: {
            ..._find(taskInfo.value ?? [], { id: assessment.taskId }),
            variantURL: _get(assessment, 'params.variantURL'),
          },
        };
        return combinedAssessment;
      }),
      undefined,
    );

    if (authStore.userData.userType === 'student' && import.meta.env.MODE === 'LEVANTE') {
      // This is just to mark the card as complete
      if (gameStore.isSurveyCompleted || surveyResponsesData.value?.length) {
        fetchedAssessments.forEach((assessment) => {
          if (assessment.taskId === 'Survey') {
            assessment.completedOn = new Date();
          }
        });
      }
    }

    return fetchedAssessments;
  }
  return [];
});

const requiredAssessments = computed(() => {
  return _filter(assessments.value, (assessment) => !assessment.optional);
});

const optionalAssessments = computed(() => {
  return _filter(assessments.value, (assessment) => assessment.optional);
});

// Grab the sequential key from the current admin's data object
const isSequential = computed(() => {
  return (
    _get(
      _find(adminInfo.value, (admin) => {
        return admin.id === selectedAdmin.value.id;
      }),
      'sequential',
    ) ?? true
  );
});

// Total games completed from the current list of assessments
let totalGames = computed(() => {
  return requiredAssessments.value.length ?? 0;
});

// Total games included in the current assessment
let completeGames = computed(() => {
  return _filter(requiredAssessments.value, (task) => task.completedOn).length ?? 0;
});

// Set up studentInfo for sidebar
const studentInfo = computed(() => {
  if (isLevante) {
    return null;
  }
  return {
    grade: _get(userData.value, 'studentData.grade'),
  };
});

watch(
  adminInfo,
  () => {
    const selectedAdminId = selectedAdmin.value?.id;
    const allAdminIds = (adminInfo.value ?? []).map((admin) => admin.id);
    // If there is no selected admin or if the selected admin is not in the list
    // of all administrations choose the first one from adminInfo
    if (allAdminIds.length > 0 && (!selectedAdminId || !allAdminIds.includes(selectedAdminId))) {
      selectedAdmin.value = _head(adminInfo.value);
    }
  },
  { immediate: true },
);
</script>
<style scoped>
.tabs-container {
  display: flex;
  flex-direction: row;
  max-width: 100vw;
  padding: 2rem;
  gap: 2rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dropdown-container {
  margin-top: 2rem;
  margin-left: 2rem;
}

.assignment-select-container {
  min-width: 100%;
}

.switch-container {
  min-width: 24%;
}

@media screen and (max-width: 1100px) {
  .tabs-container {
    flex-direction: row;
  }
}

.loading-container {
  width: 100%;
  text-align: center;
}
</style>
