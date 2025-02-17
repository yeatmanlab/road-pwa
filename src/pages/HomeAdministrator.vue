<template>
  <main class="container main">
    <section class="main-body">
      <div>
        <div class="flex flex-column">
          <div class="flex flex-row flex-wrap align-items-center justify-content-between mb-3 gap-3">
            <div class="flex flex-column gap-2">
              <div class="flex align-items-center flex-wrap gap-3 mb-2">
                <i class="pi pi-list text-gray-400 rounded" style="font-size: 1.6rem" />
                <div class="admin-page-header">View Administrations</div>
              </div>
              <div class="text-md text-gray-500 ml-6">Lists administrations assigned to your account</div>
            </div>
            <div class="flex align-items-center gap-2">
              <div class="flex gap-3 align-items-center justify-content-start">
                <div class="flex flex-column gap-1">
                  <small id="search-help" class="text-gray-400">Search by administration name</small>
                  <div class="flex align-items-center">
                    <PvInputGroup>
                      <PvAutoComplete
                        v-model="searchInput"
                        placeholder="Search Administrations"
                        :suggestions="searchSuggestions"
                        data-cy="search-input"
                        @complete="autocomplete"
                        @keyup.enter="onSearch"
                      />
                      <PvButton icon="pi pi-search" class="text-xs" @click="onSearch" />
                    </PvInputGroup>
                  </div>
                </div>
              </div>
              <div class="flex flex-column gap-1">
                <small for="dd-sort" class="text-gray-400">Sort by</small>
                <PvDropdown
                  v-model="sortKey"
                  input-id="dd-sort"
                  :options="sortOptions"
                  option-label="label"
                  data-cy="dropdown-sort-administrations"
                  @change="onSortChange($event)"
                />
              </div>
            </div>
          </div>
          <div
            v-if="search.length > 0"
            class="flex align-items-center gap-3 text-gray-700 px-4 py-3 my-1 bg-gray-100 rounded"
          >
            <div>
              You searched for <strong>{{ search }}</strong>
            </div>
            <PvButton text class="text-xs p-2" @click="clearSearch"> Clear Search </PvButton>
          </div>
        </div>
        <div v-if="initialized && !isLoadingAdministrations">
          <PvBlockUI :blocked="isFetchingAdministrations">
            <PvDataView
              :key="dataViewKey"
              :value="filteredAdministrations"
              paginator
              paginator-position="both"
              :total-records="filteredAdministrations?.length"
              :rows="pageLimit"
              :rows-per-page-options="[3, 5, 10, 25]"
              data-key="id"
              :sort-order="sortOrder"
              :sort-field="sortField"
            >
              <template #list="slotProps">
                <div class="mb-2 w-full">
                  <CardAdministration
                    v-for="item in slotProps.items"
                    :id="item.id"
                    :key="item.id"
                    :title="getTitle(item, isSuperAdmin)"
                    :stats="item.stats"
                    :dates="item.dates"
                    :assignees="item.assignedOrgs"
                    :assessments="item.assessments"
                    :public-name="item.publicName ?? item.name"
                    :show-params="isSuperAdmin"
                    :is-super-admin="isSuperAdmin"
                    data-cy="h2-card-admin-title"
                  />
                </div>
              </template>
              <template #empty>
                <div>
                  {{
                    isLevante
                      ? 'There are no administrations to display. You can create an administration by navigating to the' +
                        'Create administration page from the dropdown menu.'
                      : 'There are no administrations to display. Please contact a lab administrator to add you as an admin' +
                        ' to an administration.'
                  }}
                </div>
              </template>
            </PvDataView>
          </PvBlockUI>
        </div>
        <div v-else class="loading-container">
          <AppSpinner style="margin-bottom: 1rem" />
          <span class="uppercase font-light text-sm text-gray-600">Loading Administrations</span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { orderByDefault, fetchDocById } from '@/helpers/query/utils';
import { administrationPageFetcher, getTitle } from '../helpers/query/administrations';
import CardAdministration from '@/components/CardAdministration.vue';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/vue-query';

const initialized = ref(false);
const page = ref(0);
const searchSuggestions = ref([]);
const adminSearchTokens = ref([]);
const searchInput = ref('');
const search = ref('');
const pageLimit = ref(10);
const isLevante = import.meta.env.MODE === 'LEVANTE';

const authStore = useAuthStore();

const { roarfirekit, uid, administrationQueryKeyIndex, userClaimsQueryKeyIndex } = storeToRefs(authStore);

const { isLoading: isLoadingClaims, data: userClaims } = useQuery({
  queryKey: ['userClaims', uid, userClaimsQueryKeyIndex],
  queryFn: () => fetchDocById('userClaims', uid.value),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

let unsubscribeInitializer;
const init = () => {
  if (unsubscribeInitializer) unsubscribeInitializer();
  initialized.value = true;
};

unsubscribeInitializer = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

onMounted(() => {
  if (roarfirekit.value.restConfig) init();
});

const isSuperAdmin = computed(() => Boolean(userClaims.value?.claims?.super_admin));
const adminOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);
const exhaustiveAdminOrgs = computed(() => userClaims.value?.claims?.adminOrgs);
const orderBy = ref(orderByDefault);
const canQueryAdministrations = computed(() => {
  return initialized.value && !isLoadingClaims.value;
});

const {
  isLoading: isLoadingAdministrations,
  isFetching: isFetchingAdministrations,
  data: administrations,
} = useQuery({
  queryKey: ['administrations', uid, orderBy, ref(0), ref(10000), isSuperAdmin, administrationQueryKeyIndex],
  queryFn: () => administrationPageFetcher(orderBy, ref(10000), ref(0), isSuperAdmin, adminOrgs, exhaustiveAdminOrgs),
  keepPreviousData: true,
  enabled: canQueryAdministrations,
  staleTime: 5 * 60 * 1000, // 5 minutes
  onSuccess: (data) => {
    for (const admin of data) {
      adminSearchTokens.value.push(...admin.name.toLowerCase().split(' '));
    }
    // remove duplicates from array
    adminSearchTokens.value = [...new Set(adminSearchTokens.value)];
    if (!search.value) filteredAdministrations.value = data;
    else {
      filteredAdministrations.value = data?.filter((item) =>
        item.name.toLowerCase().includes(search.value.toLowerCase()),
      );
    }
  },
});

const filteredAdministrations = ref(administrations.value);

const clearSearch = () => {
  search.value = '';
  searchInput.value = '';
  filteredAdministrations.value = administrations.value;
};

const onSearch = () => {
  search.value = searchInput.value;
  if (!search.value) filteredAdministrations.value = administrations.value;
  else {
    const searchedAdministrations = administrations.value.filter((item) =>
      item.name.toLowerCase().includes(search.value.toLowerCase()),
    );
    filteredAdministrations.value = searchedAdministrations;
  }
};

const autocomplete = () => {
  searchSuggestions.value = adminSearchTokens.value.filter((item) =>
    item.toLowerCase().includes(searchInput.value.toLowerCase()),
  );
};

const sortOptions = ref([
  {
    label: 'Name (ascending)',
    value: [
      {
        field: { fieldPath: 'name' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'Name (descending)',
    value: [
      {
        field: { fieldPath: 'name' },
        direction: 'DESCENDING',
      },
    ],
  },
  {
    label: 'Start date (ascending)',
    value: [
      {
        field: { fieldPath: 'dates.start' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'Start date (descending)',
    value: [
      {
        field: { fieldPath: 'dates.start' },
        direction: 'DESCENDING',
      },
    ],
  },
  {
    label: 'End date (ascending)',
    value: [
      {
        field: { fieldPath: 'dates.end' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'End date (descending)',
    value: [
      {
        field: { fieldPath: 'dates.end' },
        direction: 'DESCENDING',
      },
    ],
  },
  {
    label: 'Creation date (ascending)',
    value: [
      {
        field: { fieldPath: 'dates.created' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'Creation date (descending)',
    value: [
      {
        field: { fieldPath: 'dates.created' },
        direction: 'DESCENDING',
      },
    ],
  },
]);
const sortKey = ref(sortOptions.value[0]);
const sortOrder = ref();
const sortField = ref();
const dataViewKey = ref(0);

const onSortChange = (event) => {
  dataViewKey.value += 1;
  page.value = 0;
  const value = event.value.value;
  const sortValue = event.value;

  if (!isSuperAdmin.value && sortValue[0].field.fieldPath === 'name') {
    // catches edge case where a partner admin should sort by the public name attribute
    sortField.value = 'publicName';
  } else {
    sortField.value = value[0].field?.fieldPath;
  }
  if (value[0].direction === 'DESCENDING') {
    sortOrder.value = -1;
  } else {
    sortOrder.value = 1;
  }

  sortKey.value = sortValue;
};
</script>

<style scoped>
.card-container {
  display: flex;
  flex-direction: row;
  margin: 0 0 2rem;
  flex: 1;
  gap: 1rem;
}

.card-wrapper {
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.card-title {
  text-align: left;
  height: 100%;
}

.card-button {
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  width: 100%;
  text-align: center;
}
</style>
