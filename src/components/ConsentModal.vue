<template>
  <PvToast />
  <PvConfirmDialog group="templating" class="confirm" :close-on-escape="false">
    <template #message>
      <div class="scrolling-box">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="markdownToHtml"></div>
      </div>
    </template>
  </PvConfirmDialog>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { marked } from 'marked';
import { useAuthStore } from '@/store/auth';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const i18n = useI18n();

const props = defineProps({
  consentText: { type: String, require: true, default: 'Text Here' },
  consentType: { type: String, require: true, default: 'Consent' },
});
const consentHeader = {
  tos: 'Terms of Service',
  consent: 'Consent',
  assent: 'Assent',
  'assent-es': 'Asentimiento',
};
const emit = defineEmits(['accepted', 'delayed']);

const confirm = useConfirm();
const toast = useToast();

const markdownToHtml = computed(() => {
  return marked(props.consentText);
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { consentSpinner } = storeToRefs(authStore);

onMounted(() => {
  const delayPromise = delay(8000);
  confirm.require({
    group: 'templating',
    header: props.consentType.includes('-es')
      ? `Formulario de ${consentHeader[props.consentType]}`
      : `${consentHeader[props.consentType]} Form`,
    icon: 'pi pi-question-circle',
    acceptLabel: i18n.t('consentModal.acceptButton'),
    acceptIcon: 'pi pi-check',
    accept: async () => {
      toast.add({
        severity: 'info',
        summary: i18n.t('consentModal.toastHeader'),
        detail: props.consentType.includes('-es')
          ? `Estado de ${consentHeader[props.consentType]} actualizado`
          : `${consentHeader[props.consentType]} status updated.`,
        life: 3000,
      });
      emit('accepted');
      consentSpinner.value = true;
      await delayPromise.then(() => {
        consentSpinner.value = false;
        emit('delayed');
      });
    },
  });
});
</script>

<style>
.scrolling-box {
  width: 50vw;
  height: 50vh;
  min-width: 33vw;
  min-height: 25vh;
  padding: 1rem;
  overflow: scroll;
  border: 2px solid var(--surface-d);
  border-radius: 5px;
}

.confirm .p-confirm-dialog-reject {
  display: none !important;
}

.confirm .p-dialog-header-close {
  display: none !important;
}
</style>
