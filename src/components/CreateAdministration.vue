<template>
  <main class="container main">
    <section class="main-body">
      <div class="flex flex-column mb-5">
        <div class="flex justify-content-between mb-2">
          <div class="flex align-items-center gap-3">
            <i class="pi pi-sliders-h text-gray-400 rounded" style="font-size: 1.6rem" />
            <div class="admin-page-header">{{ header }}</div>
          </div>
        </div>
        <div class="text-md text-gray-500 ml-6">{{ description }}</div>
      </div>

      <PvDivider />
      <div class="bg-gray-100 rounded p-5">
        <div class="formgrid grid mt-5">
          <div class="field col-12 xl:col-6 mb-5">
            <span class="p-float-label">
              <PvInputText
                id="administration-name"
                v-model="state.administrationName"
                class="w-full"
                data-cy="input-administration-name"
              />
              <label for="administration-name" class="w-full">Administration Name</label>
              <small
                v-if="v$.administrationName.$invalid && submitted"
                class="p-error white-space-nowrap overflow-hidden text-overflow-ellipsis"
                >Please name your administration</small
              >
            </span>
          </div>

          <div class="field col-12 xl:col-6 mb-5">
            <span class="p-float-label">
              <PvInputText
                id="administration-public-name"
                v-model="state.administrationPublicName"
                class="w-full"
                data-cy="input-administration-name-public"
              />
              <label for="administration-public-name" class="w-full">Public Administration Name</label>
              <small
                v-if="v$.administrationPublicName.$invalid && submitted"
                class="p-error white-space-nowrap overflow-hidden text-overflow-ellipsis"
                >Please provide a public-facing name for this administration</small
              >
            </span>
          </div>
        </div>
        <div class="formgrid grid">
          <div class="field col-12 md:col-6 mb-5">
            <span class="p-float-label">
              <PvCalendar
                v-model="state.dateStarted"
                class="w-full"
                :min-date="minStartDate"
                input-id="start-date"
                :number-of-months="1"
                :manual-input="false"
                show-icon
                show-button-bar
                data-cy="input-start-date"
              />
              <label for="start-date">Start Date</label>
              <small v-if="v$.dateStarted.required.$invalid && submitted" class="p-error"
                >Please select a start date.</small
              >
            </span>
          </div>
          <div class="field col-12 md:col-6">
            <span class="p-float-label">
              <PvCalendar
                v-model="state.dateClosed"
                class="w-full"
                :min-date="minEndDate"
                input-id="end-date"
                :number-of-months="1"
                :manual-input="false"
                show-icon
                show-button-bar
                data-cy="input-end-date"
              />
              <label for="end-date">End Date</label>
              <small v-if="v$.dateClosed.required.$invalid && submitted" class="p-error"
                >Please select an end date.</small
              >
            </span>
          </div>
        </div>

        <OrgPicker :orgs="orgsList" @selection="selection($event)" />

        <PvConfirmDialog group="errors" class="confirm">
          <template #message>
            <span class="flex flex-column">
              <span>{{ pickListError }}</span>
              <span v-if="nonUniqueTasks.length > 0" class="flex flex-column">
                <span>Task selections must be unique.</span>
                <span class="mt-2">The following tasks are not unique:</span>
                <span class="mt-2 font-bold">{{ nonUniqueTasks.join(', ') }}</span>
              </span>
              <span v-else>
                <span>No variants selected. You must select at least one variant to be assigned.</span>
              </span>
            </span>
          </template>
        </PvConfirmDialog>
        <TaskPicker
          :all-variants="variantsByTaskId"
          :input-variants="preSelectedVariants"
          @variants-changed="handleVariantsChanged"
        />

        <div class="flex flex-column justify-content-center mt-5">
          <div class="flex flex-column mt-2 align-items-center justify-content-center">
            <div class="flex">
              <label style="font-weight: bold" class="mb-2 mx-2">Sequential?</label>
              <span class="flex gap-2">
                <PvRadioButton v-model="state.sequential" input-id="Yes" :value="true" />
                <label for="Yes">Yes</label>
                <PvRadioButton
                  v-model="state.sequential"
                  data-cy="radio-button-not-sequential"
                  input-id="No"
                  :value="false"
                />
                <label for="No">No</label>
              </span>
              <small v-if="v$.sequential.$invalid && submitted" class="p-error mt-2"
                >Please specify sequential behavior.</small
              >
            </div>
            <div class="mt-2 mb-2">
              <PvCheckbox v-model="isTestData" :binary="true" data-cy="checkbutton-test-data" input-id="isTestData" />
              <label for="isTestData" class="ml-2">Mark As <b>Test Administration</b></label>
            </div>
          </div>
          <div class="divider mx-2 my-3" />
          <div class="mb-2 w-full flex justify-content-center">
            <PvButton :label="submitLabel" data-cy="button-create-administration" style="margin: 0" @click="submit" />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref, toRaw, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useQuery } from '@tanstack/vue-query';
import _filter from 'lodash/filter';
import _isEmpty from 'lodash/isEmpty';
import _toPairs from 'lodash/toPairs';
import _uniqBy from 'lodash/uniqBy';
import _forEach from 'lodash/forEach';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import _union from 'lodash/union';
import _groupBy from 'lodash/groupBy';
import _values from 'lodash/values';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { useAuthStore } from '@/store/auth';
import OrgPicker from '@/components/OrgPicker.vue';
import { fetchDocById, fetchDocsById } from '@/helpers/query/utils';
import { variantsFetcher } from '@/helpers/query/tasks';
import TaskPicker from './TaskPicker.vue';
import { useConfirm } from 'primevue/useconfirm';

const props = defineProps({
  adminId: { type: String, required: false, default: null },
});

const header = computed(() => {
  if (props.adminId) {
    return 'Edit an administration';
  }

  return 'Create a new administration';
});

const description = computed(() => {
  if (props.adminId) {
    return 'Use this form to edit an existing administration.';
  }
  return 'Use this form to create a new administration and assign it to organizations.';
});

const submitLabel = computed(() => {
  if (props.adminId) {
    return 'Update Administration';
  }

  return 'Create Administration';
});

const router = useRouter();
const toast = useToast();
const initialized = ref(false);
const confirm = useConfirm();

const authStore = useAuthStore();
const { roarfirekit, administrationQueryKeyIndex } = storeToRefs(authStore);

const { data: allVariants } = useQuery({
  queryKey: ['variants', 'all'],
  queryFn: () => variantsFetcher(true),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

//      +------------------------------------------+
// -----| Queries for grabbing pre-existing admins |-----
//      +------------------------------------------+
const shouldGrabAdminInfo = computed(() => {
  return initialized.value && Boolean(props.adminId);
});
const { data: preExistingAdminInfo } = useQuery({
  queryKey: ['administration', props.adminId],
  queryFn: () => fetchDocById('administrations', props.adminId),
  keepPreviousData: true,
  enabled: shouldGrabAdminInfo,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Grab districts from preExistingAdminInfo.minimalOrgs.districts
const districtsToGrab = computed(() => {
  const districtIds = _get(preExistingAdminInfo.value, 'minimalOrgs.districts', []);
  return districtIds.map((districtId) => {
    return {
      collection: 'districts',
      docId: districtId,
      select: ['name'],
    };
  });
});
const shouldGrabDistricts = computed(() => {
  return initialized.value && districtsToGrab.value.length > 0;
});
const { data: preDistricts } = useQuery({
  queryKey: ['districts', props.adminId],
  queryFn: () => fetchDocsById(districtsToGrab.value),
  keepPreviousData: true,
  enabled: shouldGrabDistricts,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// grab schools from preExistingAdminInfo.minimalOrgs.schools
const schoolsToGrab = computed(() => {
  const schoolIds = _get(preExistingAdminInfo.value, 'minimalOrgs.schools', []);
  return schoolIds.map((schoolId) => {
    return {
      collection: 'schools',
      docId: schoolId,
      select: ['name'],
    };
  });
});
const shouldGrabSchools = computed(() => {
  return initialized.value && schoolsToGrab.value.length > 0;
});

const { data: preSchools } = useQuery({
  queryKey: ['schools', 'minimalOrgs', props.adminId],
  queryFn: () => fetchDocsById(schoolsToGrab.value),
  keepPreviousData: true,
  enabled: shouldGrabSchools,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Grab classes from preExistingAdminInfo.minimalOrgs.classes
const classesToGrab = computed(() => {
  const classIds = _get(preExistingAdminInfo.value, 'minimalOrgs.classes', []);
  return classIds.map((classId) => {
    return {
      collection: 'classes',
      docId: classId,
      select: ['name'],
    };
  });
});
const shouldGrabClasses = computed(() => {
  return initialized.value && classesToGrab.value.length > 0;
});

const { data: preClasses } = useQuery({
  queryKey: ['classes', 'minimal', props.adminId],
  queryFn: () => fetchDocsById(classesToGrab.value),
  keepPreviousData: true,
  enabled: shouldGrabClasses,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Grab groups from preExistingAdminInfo.minimalOrgs.groups
const groupsToGrab = computed(() => {
  const groupIds = _get(preExistingAdminInfo.value, 'minimalOrgs.groups', []);
  return groupIds.map((id) => {
    return {
      collection: 'groups',
      docId: id,
      select: ['name'],
    };
  });
});

const shouldGrabGroups = computed(() => {
  return initialized.value && groupsToGrab.value.length > 0;
});

const { data: preGroups } = useQuery({
  queryKey: ['groups', props.adminId],
  queryFn: () => fetchDocsById(groupsToGrab.value),
  keepPreviousData: true,
  enabled: shouldGrabGroups,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Grab families from preExistingAdminInfo.families
const familiesToGrab = computed(() => {
  const familyIds = _get(preExistingAdminInfo.value, 'minimalOrgs.families', []);
  return familyIds.map((id) => {
    return {
      collection: 'families',
      docId: id,
      select: ['name'],
    };
  });
});

const shouldGrabFamilies = computed(() => {
  return initialized.value && familiesToGrab.value.length > 0;
});

const { data: preFamilies } = useQuery({
  queryKey: ['families', props.adminId],
  queryFn: () => fetchDocsById(familiesToGrab.value),
  keepPreviousData: true,
  enabled: shouldGrabFamilies,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

//      +---------------------------------+
// -----| Form state and validation rules |-----
//      +---------------------------------+
const state = reactive({
  administrationName: '',
  administrationPublicName: '',
  dateStarted: null,
  dateClosed: null,
  sequential: null,
  districts: [],
  schools: [],
  classes: [],
  groups: [],
  families: [],
});

const minStartDate = computed(() => {
  if (props.adminId && preExistingAdminInfo.value?.dateOpened) {
    return new Date(preExistingAdminInfo.value.dateOpened);
  }
  return new Date();
});

const minEndDate = computed(() => {
  if (state.dateStarted) {
    return new Date(state.dateStarted);
  }
  return new Date();
});

const rules = {
  administrationName: { required },
  administrationPublicName: { required },
  dateStarted: { required },
  dateClosed: { required },
  sequential: { required },
};
const v$ = useVuelidate(rules, state);
const pickListError = ref('');
const orgError = ref('');
const submitted = ref(false);
const isTestData = ref(false);

//      +---------------------------------+
// -----|          Org Selection          |-----
//      +---------------------------------+
const selection = (selected) => {
  for (const [key, value] of _toPairs(selected)) {
    state[key] = value;
  }
};

const orgsList = computed(() => {
  return {
    districts: preDistricts.value,
    schools: preSchools.value,
    classes: preClasses.value,
    groups: preGroups.value,
    families: preFamilies.value,
  };
});

//      +---------------------------------+
// -----|       Assessment Selection      |-----
//      +---------------------------------+
const variants = ref([]);
const preSelectedVariants = ref([]);
const variantsByTaskId = computed(() => {
  return _groupBy(allVariants.value, 'task.id');
});

const handleVariantsChanged = (newVariants) => {
  variants.value = newVariants;
};

const checkForUniqueTasks = (assignments) => {
  if (_isEmpty(assignments)) return false;
  const uniqueTasks = _uniqBy(assignments, (assignment) => assignment.taskId);
  return uniqueTasks.length === assignments.length;
};

const nonUniqueTasks = ref('');
const getNonUniqueTasks = (assignments) => {
  const grouped = _groupBy(assignments, (assignment) => assignment.taskId);
  const taskIds = _values(grouped);
  const filtered = _filter(taskIds, (taskIdArray) => taskIdArray.length > 1);
  nonUniqueTasks.value = filtered.map((taskIdArray) => taskIdArray[0].taskId);
};

const checkForRequiredOrgs = (orgs) => {
  const filtered = _filter(orgs, (org) => !_isEmpty(org));
  return Boolean(filtered.length);
};

//      +---------------------------------+
// -----|         Form submission         |-----
//      +---------------------------------+

const removeNull = (obj) => {
  // eslint-disable-next-line no-unused-vars
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null));
};

const removeUndefined = (obj) => {
  // eslint-disable-next-line no-unused-vars
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
};

const submit = async () => {
  pickListError.value = '';
  submitted.value = true;
  const isFormValid = await v$.value.$validate();
  if (isFormValid) {
    const submittedAssessments = variants.value.map((assessment) =>
      removeUndefined({
        variantId: assessment.variant.id,
        variantName: assessment.variant.name,
        taskId: assessment.task.id,
        params: toRaw(assessment.variant.params),
        // Exclude conditions key if there are no conditions to be set.
        ...(toRaw(assessment.variant.conditions || undefined) && { conditions: toRaw(assessment.variant.conditions) }),
      }),
    );

    const tasksUnique = checkForUniqueTasks(submittedAssessments);
    if (tasksUnique && !_isEmpty(submittedAssessments)) {
      const orgs = {
        districts: toRaw(state.districts).map((org) => org.id),
        schools: toRaw(state.schools).map((org) => org.id),
        classes: toRaw(state.classes).map((org) => org.id),
        groups: toRaw(state.groups).map((org) => org.id),
        families: toRaw(state.families).map((org) => org.id),
      };

      const orgsValid = checkForRequiredOrgs(orgs);
      if (orgsValid) {
        const dateClose = new Date(state.dateClosed);
        dateClose.setHours(23, 59, 59, 999);
        const args = {
          name: toRaw(state).administrationName,
          publicName: toRaw(state).administrationPublicName,
          assessments: submittedAssessments,
          dateOpen: toRaw(state).dateStarted,
          dateClose,
          sequential: toRaw(state).sequential,
          orgs: orgs,
          isTestData: isTestData.value,
        };
        if (isTestData.value) args.isTestData = true;
        if (props.adminId) args.administrationId = props.adminId;

        await roarfirekit.value
          .createAdministration(args)
          .then(() => {
            toast.add({
              severity: 'success',
              summary: 'Success',
              detail: props.adminId ? 'Administration updated' : 'Administration created',
              life: 3000,
            });
            administrationQueryKeyIndex.value += 1;

            // TODO: Invalidate for administrations query.
            // This does not work in prod for some reason.
            // queryClient.invalidateQueries({ queryKey: ['administrations'] })

            router.push({ name: 'Home' });
          })
          .catch((error) => {
            toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
            console.error('Error creating administration:', error.message);
          });
      } else {
        console.log('need at least one org');
        orgError.value = 'At least one organization needs to be selected.';
      }
    } else {
      getNonUniqueTasks(submittedAssessments);
      confirm.require({
        group: 'errors',
        header: 'Task Selections',
        icon: 'pi pi-question-circle',
        acceptLabel: 'Close',
        acceptIcon: 'pi pi-times',
      });
    }
  } else {
    console.log('form is invalid');
  }
};

//      +-----------------------------------+
// -----| Lifecycle hooks and subscriptions |-----
//      +-----------------------------------+
let unsubscribe;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

onMounted(async () => {
  if (roarfirekit.value.restConfig) init();
});

watch([preExistingAdminInfo, allVariants], ([adminInfo, allVariantInfo]) => {
  if (adminInfo && !_isEmpty(allVariantInfo)) {
    state.administrationName = adminInfo.name;
    state.administrationPublicName = adminInfo.publicName;
    state.dateStarted = new Date(adminInfo.dateOpened);
    state.dateClosed = new Date(adminInfo.dateClosed);
    state.sequential = adminInfo.sequential;
    _forEach(adminInfo.assessments, (assessment) => {
      const assessmentParams = assessment.params;
      const taskId = assessment.taskId;
      const allVariantsForThisTask = _filter(allVariantInfo, (variant) => variant.task.id === taskId);
      const found = findVariantWithParams(allVariantsForThisTask, assessmentParams);
      if (found) {
        preSelectedVariants.value = _union(preSelectedVariants.value, [found]);
      }
    });
  }
});

function findVariantWithParams(variants, params) {
  console.log(`attempting to find variant of ${variants[0].task.id}`);

  const found = _find(variants, (variant) => {
    const cleanVariantParams = removeNull(variant.variant.params);
    const cleanInputParams = removeNull(params);
    return _isEqual(cleanInputParams, cleanVariantParams);
  });

  if (found) {
    console.log('found', found);
  }
  // TODO: implement tie breakers if found.length > 1
  return found;
}
</script>

<style lang="scss">
.return-button {
  display: block;
  margin: 1rem 1.75rem;
}

.loading-container {
  width: 100%;
  text-align: center;
}

.orgs-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: -1rem;
  margin-bottom: 1rem;
}

.org-dropdown {
  margin-right: 3rem;
  margin-top: 2rem;
}

.divider {
  min-height: 100%;
  max-width: 0;
  border-left: 1px solid var(--surface-d);
}

.confirm .p-confirm-dialog-reject {
  display: none !important;
}

.confirm .p-dialog-header-close {
  display: none !important;
}

#rectangle {
  background: #fcfcfc;
  border-radius: 0.3125rem;
  border-style: solid;
  border-width: 0.0625rem;
  border-color: #e5e5e5;
  margin: 0 1.75rem;
  padding-top: 1.75rem;
  padding-left: 1.875rem;
  text-align: left;
  overflow: hidden;

  hr {
    margin-top: 2rem;
    margin-left: -1.875rem;
  }

  #heading {
    font-family: 'Source Sans Pro', sans-serif;
    font-weight: 400;
    color: #000000;
    font-size: 1.625rem;
    line-height: 2.0425rem;
  }

  #section-heading {
    font-family: 'Source Sans Pro', sans-serif;
    font-weight: 400;
    font-size: 1.125rem;
    line-height: 1.5681rem;
    color: #525252;
  }

  #administration-name {
    height: 100%;
    border-radius: 0.3125rem;
    border-width: 0.0625rem;
    border-color: #e5e5e5;
  }

  #section {
    margin-top: 1.375rem;
  }

  #section-content {
    font-family: 'Source Sans Pro', sans-serif;
    font-weight: 400;
    font-size: 0.875rem;
    line-height: 1.22rem;
    color: #525252;
    margin: 0.625rem 0rem;
  }

  .p-dropdown-label {
    font-family: 'Source Sans Pro', sans-serif;
    color: #c4c4c4;
  }

  ::placeholder {
    font-family: 'Source Sans Pro', sans-serif;
    color: #c4c4c4;
  }

  // .p-button {
  //   width: 11.5625rem;
  //   height: 2.25rem;
  //   border-radius: 3.9375rem;
  //   margin: 1.5rem 0rem;
  //   margin-right: 1.375rem;
  //   float: right;
  // }

  .hide {
    display: none;
  }
}
</style>
