<template>
  <main class="container main">
    <section class="main-body">
      <div class="flex flex-column mb-5">
        <div class="flex justify-content-between mb-2">
          <div class="flex align-items-center gap-3">
            <i class="pi pi-folder-open text-gray-400 rounded" style="font-size: 1.6rem" />
            <div class="admin-page-header">List Organizations</div>
          </div>
        </div>
        <div class="text-md text-gray-500 ml-6">View organizations asssigned to your account.</div>
      </div>
      <PvTabView v-if="claimsLoaded" v-model:activeIndex="activeIndex" lazy class="mb-7">
        <PvTabPanel v-for="orgType in orgHeaders" :key="orgType" :header="orgType.header">
          <div class="grid column-gap-3 mt-2">
            <div
              v-if="activeOrgType === 'schools' || activeOrgType === 'classes'"
              class="col-12 md:col-6 lg:col-3 xl:col-3 mt-3"
            >
              <span class="p-float-label">
                <PvDropdown
                  v-model="selectedDistrict"
                  input-id="district"
                  :options="allDistricts"
                  option-label="name"
                  option-value="id"
                  :placeholder="districtPlaceholder"
                  :loading="isLoadingDistricts"
                  class="w-full"
                  data-cy="dropdown-parent-district"
                />
                <label for="district">District</label>
              </span>
            </div>
            <div v-if="orgType.id === 'classes'" class="col-12 md:col-6 lg:col-3 xl:col-3 mt-3">
              <span class="p-float-label">
                <PvDropdown
                  v-model="selectedSchool"
                  input-id="school"
                  :options="allSchools"
                  option-label="name"
                  option-value="id"
                  :placeholder="schoolPlaceholder"
                  :loading="isLoadingSchools"
                  class="w-full"
                  data-cy="dropdown-parent-school"
                />
                <label for="school">School</label>
              </span>
            </div>
          </div>
          <RoarDataTable
            v-if="tableData"
            :key="tableKey"
            :columns="tableColumns"
            :data="tableData"
            sortable
            :loading="isLoading || isFetching"
            :allow-filtering="false"
            @export-all="exportAll"
          />
          <AppSpinner v-else />
        </PvTabPanel>
      </PvTabView>
      <AppSpinner v-else />
    </section>
  </main>
</template>
<script setup>
import { orgFetcher, orgFetchAll, orgPageFetcher } from '@/helpers/query/orgs';
import { orderByDefault, exportCsv, fetchDocById } from '@/helpers/query/utils';
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuery } from '@tanstack/vue-query';
import { useAuthStore } from '@/store/auth';
import _get from 'lodash/get';
import _head from 'lodash/head';

const initialized = ref(false);
const orgsQueryKeyIndex = ref(0);

const selectedDistrict = ref(undefined);
const selectedSchool = ref(undefined);
const orderBy = ref(orderByDefault);

const districtPlaceholder = computed(() => {
  if (isLoadingDistricts.value) {
    return 'Loading...';
  }
  return 'Select a district';
});

const schoolPlaceholder = computed(() => {
  if (isLoadingSchools.value) {
    return 'Loading...';
  }
  return 'Select a school';
});

// Authstore and Sidebar
const authStore = useAuthStore();
const { roarfirekit, uid, userQueryKeyIndex } = storeToRefs(authStore);

const { isLoading: isLoadingClaims, data: userClaims } = useQuery({
  queryKey: ['userClaims', uid, userQueryKeyIndex],
  queryFn: () => fetchDocById('userClaims', uid.value),
  keepPreviousData: true,
  enabled: initialized,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const isSuperAdmin = computed(() => Boolean(userClaims.value?.claims?.super_admin));
const adminOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

const orgHeaders = computed(() => {
  const headers = {
    districts: { header: 'Districts', id: 'districts' },
    schools: { header: 'Schools', id: 'schools' },
    classes: { header: 'Classes', id: 'classes' },
    groups: { header: 'Groups', id: 'groups' },
  };

  if (isSuperAdmin.value) return headers;

  const result = {};
  if ((adminOrgs.value?.districts ?? []).length > 0) {
    result.districts = { header: 'Districts', id: 'districts' };
    result.schools = { header: 'Schools', id: 'schools' };
    result.classes = { header: 'Classes', id: 'classes' };
  }
  if ((adminOrgs.value?.schools ?? []).length > 0) {
    result.schools = { header: 'Schools', id: 'schools' };
    result.classes = { header: 'Classes', id: 'classes' };
  }
  if ((adminOrgs.value?.classes ?? []).length > 0) {
    result.classes = { header: 'Classes', id: 'classes' };
  }
  if ((adminOrgs.value?.groups ?? []).length > 0) {
    result.groups = { header: 'Groups', id: 'groups' };
  }
  return result;
});

const activeIndex = ref(0);
const activeOrgType = computed(() => {
  return Object.keys(orgHeaders.value)[activeIndex.value];
});

const claimsLoaded = computed(() => !isLoadingClaims.value);

const { isLoading: isLoadingDistricts, data: allDistricts } = useQuery({
  queryKey: ['districts', uid, orgsQueryKeyIndex],
  queryFn: () => orgFetcher('districts', undefined, isSuperAdmin, adminOrgs),
  keepPreviousData: true,
  enabled: claimsLoaded,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const schoolQueryEnabled = computed(() => {
  return claimsLoaded.value && selectedDistrict.value !== undefined;
});

const { isLoading: isLoadingSchools, data: allSchools } = useQuery({
  queryKey: ['schools', uid, selectedDistrict, orgsQueryKeyIndex],
  queryFn: () => orgFetcher('schools', selectedDistrict, isSuperAdmin, adminOrgs),
  keepPreviousData: true,
  enabled: schoolQueryEnabled,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const {
  isLoading,
  isFetching,
  data: orgData,
} = useQuery({
  queryKey: ['orgsPage', uid, activeOrgType, selectedDistrict, selectedSchool, orderBy, orgsQueryKeyIndex],
  queryFn: () =>
    orgPageFetcher(
      activeOrgType,
      selectedDistrict,
      selectedSchool,
      orderBy,
      ref(100000),
      ref(0),
      isSuperAdmin,
      adminOrgs,
    ),
  keepPreviousData: true,
  enabled: claimsLoaded,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const exportAll = async () => {
  const exportData = await orgFetchAll(
    activeOrgType,
    selectedDistrict,
    selectedSchool,
    orderBy,
    isSuperAdmin,
    adminOrgs,
  );
  console.log('Exporting all:', exportData);
  exportCsv(exportData, `roar-${activeOrgType.value}.csv`);
};

const tableColumns = computed(() => {
  const columns = [
    { field: 'name', header: 'Name', dataType: 'string', pinned: true, sort: true },
    { field: 'abbreviation', header: 'Abbreviation', dataType: 'string', sort: true },
    { field: 'address.formattedAddress', header: 'Address', dataType: 'string', sort: true },
    { field: 'tags', header: 'Tags', dataType: 'array', chip: true, sort: false },
  ];

  if (['districts', 'schools'].includes(activeOrgType.value)) {
    columns.push(
      { field: 'mdrNumber', header: 'MDR Number', dataType: 'string', sort: false },
      { field: 'ncesId', header: 'NCES ID', dataType: 'string', sort: false },
    );
  }

  if (['districts', 'schools', 'classes'].includes(activeOrgType.value)) {
    columns.push({ field: 'clever', header: 'Clever', dataType: 'boolean', sort: false });
    columns.push({ field: 'classlink', header: 'ClassLink', dataType: 'boolean', sort: false });
  }

  columns.push({
    link: true,
    routeName: 'ListUsers',
    routeTooltip: 'View users',
    routeLabel: 'Users',
    routeIcon: 'pi pi-user',
    sort: false,
  });

  return columns;
});

const tableData = computed(() => {
  if (isLoading.value) return [];
  return orgData.value.map((org) => {
    return {
      ...org,
      routeParams: {
        orgType: activeOrgType.value,
        orgId: org.id,
        orgName: org.name,
        tooltip: 'View Users in ' + org.name,
      },
    };
  });
});

let unsubscribe;
const initTable = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) initTable();
});

onMounted(() => {
  if (roarfirekit.value.restConfig) initTable();
});

watch(allDistricts, (newValue) => {
  selectedDistrict.value = _get(_head(newValue), 'id');
});

watch(allSchools, (newValue) => {
  selectedSchool.value = _get(_head(newValue), 'id');
});

const tableKey = ref(0);
watch([selectedDistrict, selectedSchool], () => {
  tableKey.value += 1;
});
</script>
