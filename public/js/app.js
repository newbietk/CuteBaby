const { createApp, ref, computed, watch, onMounted } = Vue;

const app = createApp({
  setup() {
    // ===== Reactive State =====
    const currentTab = ref('home');
    const showModal = ref(false);
    const modalType = ref('feeding');
    const editingId = ref(null);
    const activities = ref([]);
    const stats = ref({
      feeding: { count: 0, totalAmount: 0 },
      urination: { count: 0 },
      bowel: { count: 0 },
      sleep: { count: 0, totalMinutes: 0 },
    });
    const selectedDate = ref(getToday());
    const typeFilter = ref('all');
    const form = ref({
      start_time: '',
      end_time: '',
      amount: null,
      note: '',
    });
    const rangeData = ref([]);
    const statsRange = ref('week');
    const rangeStart = ref('');
    const rangeEnd = ref('');

    // ===== Helpers =====
    function getToday() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function toDatetimeLocal(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const y = d.getFullYear();
      const mo = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      const h = String(d.getHours()).padStart(2,'0');
      const mi = String(d.getMinutes()).padStart(2,'0');
      return `${y}-${mo}-${day}T${h}:${mi}`;
    }

    function toISODateTime(localStr) {
      if (!localStr) return '';
      return localStr + ':00+08:00';
    }

    function formatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function typeLabel(type) {
      const map = { feeding: '喂奶', urination: '尿尿', bowel: '拉屎', sleep: '睡觉' };
      return map[type] || type;
    }

    function sleepDuration(start, end) {
      if (!start || !end) return '';
      const diff = (new Date(end) - new Date(start)) / 60000;
      const h = Math.floor(diff / 60);
      const m = Math.round(diff % 60);
      if (h > 0) return `${h}小时${m}分钟`;
      return `${m}分钟`;
    }

    function formatHours(minutes) {
      if (!minutes || minutes === 0) return '0h';
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      if (h > 0 && m > 0) return `${h}h${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }

    function formatDateCN(dateStr) {
      const d = new Date(dateStr);
      const w = ['日','一','二','三','四','五','六'];
      return `${d.getMonth()+1}月${d.getDate()}日 周${w[d.getDay()]}`;
    }

    function barWidth(val, max) {
      if (!max || max === 0) return '0%';
      return Math.min(100, (val / max) * 100) + '%';
    }

    // ===== Data Loading =====
    async function loadActivities() {
      const params = { limit: 200 };
      const tab = currentTab.value;
      if (tab === 'home') {
        params.date = getToday();
      } else if (tab === 'history') {
        params.date = selectedDate.value;
        if (typeFilter.value !== 'all') params.type = typeFilter.value;
      }
      try {
        const res = await API.get('/activities', params);
        activities.value = res.data;
      } catch (e) {
        console.error('加载记录失败:', e);
      }
    }

    async function loadStats() {
      try {
        stats.value = await API.get('/stats/daily', { date: getToday() });
      } catch (e) {
        console.error('加载统计失败:', e);
      }
    }

    async function loadData() {
      await Promise.all([loadActivities(), loadStats()]);
    }

    async function loadRangeStats() {
      if (!rangeStart.value || !rangeEnd.value) return;
      try {
        rangeData.value = await API.get('/stats/range', { start: rangeStart.value, end: rangeEnd.value });
      } catch (e) {
        console.error('加载范围统计失败:', e);
      }
    }

    // ===== Range Summary (computed from rangeData) =====
    const rangeSummary = computed(() => {
      if (rangeData.value.length === 0) return null;
      const total = {
        feeding: { count: 0, totalAmount: 0 },
        urination: { count: 0 },
        bowel: { count: 0 },
        sleep: { count: 0, totalMinutes: 0 },
      };
      for (const d of rangeData.value) {
        total.feeding.count += d.feeding.count;
        total.feeding.totalAmount += d.feeding.totalAmount;
        total.urination.count += d.urination.count;
        total.bowel.count += d.bowel.count;
        total.sleep.count += d.sleep.count;
        total.sleep.totalMinutes += d.sleep.totalMinutes;
      }
      return total;
    });

    // ===== Max values for bar charts =====
    const maxAmount = computed(() => Math.max(1, ...rangeData.value.map(d => d.feeding.totalAmount)));
    const maxSleep = computed(() => Math.max(1, ...rangeData.value.map(d => d.sleep.totalMinutes)));
    const maxUrination = computed(() => Math.max(1, ...rangeData.value.map(d => d.urination.count)));
    const maxBowel = computed(() => Math.max(1, ...rangeData.value.map(d => d.bowel.count)));

    // ===== Modal =====
    function openModal(type, activity = null) {
      modalType.value = type;
      if (activity) {
        editingId.value = activity.id;
        form.value = {
          start_time: toDatetimeLocal(activity.start_time),
          end_time: toDatetimeLocal(activity.end_time),
          amount: activity.amount,
          note: activity.note || '',
        };
      } else {
        editingId.value = null;
        const now = new Date();
        const local = toDatetimeLocal(now.toISOString());
        form.value = {
          start_time: local,
          end_time: local,
          amount: null,
          note: '',
        };
      }
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
    }

    async function saveRecord() {
      const body = {
        type: modalType.value,
        start_time: toISODateTime(form.value.start_time),
      };
      if (modalType.value === 'sleep' && form.value.end_time) {
        body.end_time = toISODateTime(form.value.end_time);
      }
      if (modalType.value === 'feeding' && form.value.amount) {
        body.amount = parseInt(form.value.amount);
      }
      if (form.value.note) {
        body.note = form.value.note;
      }

      try {
        if (editingId.value) {
          await API.put(`/activities/${editingId.value}`, body);
        } else {
          await API.post('/activities', body);
        }
        closeModal();
        await loadData();
        if (currentTab.value === 'stats') {
          await loadRangeStats();
        }
      } catch (e) {
        alert(e.message);
      }
    }

    async function deleteRecord(id) {
      if (!confirm('确定要删除这条记录吗？')) return;
      try {
        await API.delete(`/activities/${id}`);
        await loadData();
        if (currentTab.value === 'stats') {
          await loadRangeStats();
        }
      } catch (e) {
        alert(e.message);
      }
    }

    // ===== Date Navigation =====
    function prevDay() {
      const d = new Date(selectedDate.value);
      d.setDate(d.getDate() - 1);
      selectedDate.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function nextDay() {
      const d = new Date(selectedDate.value);
      d.setDate(d.getDate() + 1);
      selectedDate.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function goToday() {
      selectedDate.value = getToday();
    }

    // ===== Stats Range =====
    function setStatsRange(range) {
      statsRange.value = range;
      const now = new Date();
      const today = getToday();
      if (range === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        rangeStart.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        rangeEnd.value = today;
      } else if (range === 'month') {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        rangeStart.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        rangeEnd.value = today;
      }
      loadRangeStats();
    }

    // ===== Watchers =====
    watch(currentTab, async (tab) => {
      if (tab === 'home') {
        await loadData();
      } else if (tab === 'history') {
        await loadActivities();
      } else if (tab === 'stats') {
        if (!rangeStart.value) setStatsRange('week');
        await loadRangeStats();
      }
    });

    watch(selectedDate, async () => {
      if (currentTab.value === 'history') {
        await loadActivities();
      }
    });

    // ===== Init =====
    onMounted(async () => {
      await loadData();
    });

    return {
      currentTab, showModal, modalType, editingId, activities, stats,
      selectedDate, typeFilter, form, rangeData, statsRange, rangeStart, rangeEnd,
      rangeSummary, maxAmount, maxSleep, maxUrination, maxBowel,
      getToday, formatTime, typeLabel, sleepDuration, formatHours, formatDateCN, barWidth,
      loadActivities, loadStats, loadData, loadRangeStats,
      openModal, closeModal, saveRecord, deleteRecord,
      prevDay, nextDay, goToday, setStatsRange,
    };
  },
});

app.mount('#app');
