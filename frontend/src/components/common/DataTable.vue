<template>
  <div class="data-table-container">
    <!-- 表格头部工具栏 -->
    <div v-if="$slots.toolbar" class="table-toolbar">
      <slot name="toolbar"></slot>
    </div>
    
    <!-- 加载状态 -->
    <LoadingSpinner v-if="loading" :text="loadingText" />
    
    <!-- 空状态 -->
    <div v-else-if="!data.length" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">{{ emptyText }}</p>
    </div>
    
    <!-- 数据表格 -->
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th v-if="selectable" class="select-column">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th 
              v-for="column in columns" 
              :key="column.key"
              :class="[
                'table-header',
                { 'sortable': column.sortable },
                { 'text-center': column.align === 'center' },
                { 'text-right': column.align === 'right' }
              ]"
              :style="{ width: column.width }"
              @click="column.sortable && handleSort(column.key)"
            >
              {{ column.title }}
              <span v-if="column.sortable" class="sort-indicator">
                <span :class="{ active: sortKey === column.key && sortOrder === 'asc' }">↑</span>
                <span :class="{ active: sortKey === column.key && sortOrder === 'desc' }">↓</span>
              </span>
            </th>
            <th v-if="$slots.actions" class="actions-column">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(item, index) in data" 
            :key="getRowKey(item, index)"
            :class="{ 'selected': selectedItems.includes(getRowKey(item, index)) }"
          >
            <td v-if="selectable" class="select-column">
              <input 
                type="checkbox" 
                :checked="selectedItems.includes(getRowKey(item, index))"
                @change="toggleSelect(getRowKey(item, index))"
              />
            </td>
            <td 
              v-for="column in columns" 
              :key="column.key"
              :class="[
                'table-cell',
                { 'text-center': column.align === 'center' },
                { 'text-right': column.align === 'right' }
              ]"
            >
              <slot 
                :name="`column-${column.key}`" 
                :item="item" 
                :value="getNestedValue(item, column.key)"
                :index="index"
              >
                {{ formatValue(getNestedValue(item, column.key), column) }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="actions-column">
              <slot name="actions" :item="item" :index="index"></slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 分页 -->
    <Pagination 
      v-if="pagination && !loading && pagination.totalItems > 0"
      :current-page="pagination.currentPage"
      :total-pages="pagination.totalPages"
      :total-items="pagination.totalItems"
      :show-page-numbers="pagination.showPageNumbers"
      @page-change="$emit('page-change', $event)"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';
import Pagination from './Pagination.vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '加载中...'
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  rowKey: {
    type: [String, Function],
    default: 'id'
  },
  selectable: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['page-change', 'sort-change', 'selection-change']);

const selectedItems = ref([]);
const sortKey = ref('');
const sortOrder = ref('asc');

const isAllSelected = computed(() => {
  return props.data.length > 0 && selectedItems.value.length === props.data.length;
});

const getRowKey = (item, index) => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(item, index);
  }
  return item[props.rowKey] || index;
};

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const formatValue = (value, column) => {
  if (column.formatter && typeof column.formatter === 'function') {
    return column.formatter(value);
  }
  return value;
};

const toggleSelect = (key) => {
  const index = selectedItems.value.indexOf(key);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(key);
  }
  emit('selection-change', selectedItems.value);
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = [];
  } else {
    selectedItems.value = props.data.map((item, index) => getRowKey(item, index));
  }
  emit('selection-change', selectedItems.value);
};

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  emit('sort-change', { key: sortKey.value, order: sortOrder.value });
};

defineExpose({
  selectedItems,
  clearSelection: () => {
    selectedItems.value = [];
    emit('selection-change', []);
  }
});
</script>

<style scoped>
.data-table-container {
  width: 100%;
}

.table-toolbar {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-text {
  margin: 0;
  font-size: 1.1rem;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.table-header {
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  position: relative;
}

.table-header.sortable {
  cursor: pointer;
  user-select: none;
}

.table-header.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  display: inline-flex;
  flex-direction: column;
  margin-left: 0.5rem;
  font-size: 0.7rem;
  line-height: 0.8;
}

.sort-indicator span {
  color: #ccc;
  transition: color 0.2s;
}

.sort-indicator span.active {
  color: #007bff;
}

.table-cell {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: middle;
}

.select-column {
  width: 40px;
  text-align: center;
}

.actions-column {
  width: 120px;
  text-align: center;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

tbody tr:hover {
  background: #f8f9fa;
}

tbody tr.selected {
  background: #e3f2fd;
}

@media (max-width: 768px) {
  .table-header,
  .table-cell {
    padding: 0.5rem;
    font-size: 0.9rem;
  }
  
  .actions-column {
    width: 100px;
  }
}
</style>