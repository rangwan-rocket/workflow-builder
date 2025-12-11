<template>
  <div class="workflow-builder" :style="rootStyle">
    <!-- Sidebar Node Palette -->
    <div
      v-if="!isReadOnly"
      class="sidebar"
      :style="sidebarStyle"
    >
      <div class="node-palette">
        <div
          v-for="nodeType in nodeTypes"
          :key="nodeType.type"
          class="palette-node"
          :style="{ '--node-color': getNodeColor(nodeType.type) }"
          draggable="true"
          @dragstart="onDragStart($event, nodeType.type)"
        >
          <div class="palette-node-content">
            <span class="palette-node-title">{{ nodeType.label }}</span>
            <span class="palette-node-desc">{{ nodeType.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Canvas -->
    <div
      ref="canvasRef"
      class="canvas-container"
      :style="canvasStyle"
      @drop="onDrop"
      @dragover.prevent
      @dragenter.prevent
    >
      <VueFlow
        ref="vueFlowRef"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="customNodeTypes"
        :default-edge-options="defaultEdgeOptions"
        :nodes-draggable="!isReadOnly"
        :nodes-connectable="!isReadOnly"
        :edges-updatable="!isReadOnly"
        :elements-selectable="true"
        :zoom-on-scroll="true"
        :pan-on-scroll="false"
        :pan-on-drag="true"
        :default-viewport="{ x: 0, y: 0, zoom: 1 }"
        :fit-view-on-init="false"
        @node-click="onNodeClick"
        @connect="onConnect"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @keydown="onKeyDown"
        @pane-ready="onPaneReady"
      >
        <Background :color="gridColorValue" :gap="16" />
        <Controls v-if="!isReadOnly" position="bottom-right" />
      </VueFlow>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, h, markRaw, nextTick } from 'vue';
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

// SVG Icons for node actions
const EditIcon = () => h('svg', { 
  width: '14', 
  height: '14', 
  viewBox: '0 0 24 24', 
  fill: 'none', 
  stroke: 'currentColor', 
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
  h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
]);

const DeleteIcon = () => h('svg', { 
  width: '14', 
  height: '14', 
  viewBox: '0 0 24 24', 
  fill: 'none', 
  stroke: 'currentColor', 
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round'
}, [
  h('polyline', { points: '3 6 5 6 21 6' }),
  h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
  h('line', { x1: '10', y1: '11', x2: '10', y2: '17' }),
  h('line', { x1: '14', y1: '11', x2: '14', y2: '17' })
]);

// Helper to create node action toolbar
const createNodeActions = (props, showEdit, showDelete) => {
  const actions = [];
  
  if (showEdit) {
    actions.push(
      h('button', {
        class: 'node-action-btn node-action-edit',
        onClick: (e) => {
          e.stopPropagation();
          props.data?.onEdit?.(props.id);
        },
        title: 'Edit node'
      }, [h(EditIcon)])
    );
  }
  
  if (showDelete) {
    actions.push(
      h('button', {
        class: 'node-action-btn node-action-delete',
        onClick: (e) => {
          e.stopPropagation();
          props.data?.onDelete?.(props.id);
        },
        title: 'Delete node'
      }, [h(DeleteIcon)])
    );
  }
  
  if (actions.length === 0) return null;
  
  return h('div', { class: 'node-actions-toolbar' }, actions);
};

// Node icon mapping
const nodeIconMap = {
  condition: '🔀',
  message: '✉️',
  wait: '⏱️',
  api: '🔌',
  action: '⚡',
  trigger: '🎯',
  test: '🧪',
};

// Custom Node Components - Shopify Flow style with LEFT/RIGHT handles
const ConditionNode = {
  name: 'ConditionNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'condition-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#3B82F6' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Condition'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#3B82F6' } }, '🔀'),
          ]),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-true',
            class: 'flow-handle flow-handle-right',
            style: { top: '35%' },
          }),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-false',
            class: 'flow-handle flow-handle-right',
            style: { top: '65%' },
          }),
        ]
      );
  },
};

const MessageNode = {
  name: 'MessageNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'message-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#10B981' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Send Message'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#10B981' } }, '✉️'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
        ]
      );
  },
};

const WaitNode = {
  name: 'WaitNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'wait-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#F59E0B' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Wait'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#F59E0B' } }, '⏱️'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
        ]
      );
  },
};

const ApiNode = {
  name: 'ApiNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'api-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#8B5CF6' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'API Call'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#8B5CF6' } }, '🔌'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
        ]
      );
  },
};

// Action node (for your database "action" type)
const ActionNode = {
  name: 'ActionNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'action-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#EC4899' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Action'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#EC4899' } }, '⚡'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
        ]
      );
  },
};

// Trigger node (for your database "trigger" type) - only has output (right side)
const TriggerNode = {
  name: 'TriggerNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'trigger-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#6366F1' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, props.data?.label || 'Trigger'),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': props.data?.color || '#6366F1' } }, '🎯'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
          h(Handle, { type: 'source', position: Position.Right, id: 'default', class: 'flow-handle flow-handle-right', style: { top: '70%' } }),
        ]
      );
  },
};

const TestNode = {
  name: 'TestNode',
  props: ['id', 'data', 'selected'],
  setup(props) {
    const showEdit = computed(() => props.data?.showEditAction !== false);
    const showDelete = computed(() => props.data?.showDeleteAction !== false);
    
    return () =>
      h(
        'div',
        {
          class: ['flow-node', 'test-node', { selected: props.selected }],
          style: { '--node-color': '#EC4899' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input', class: 'flow-handle flow-handle-left' }),
          h('div', { class: 'node-body' }, [
            h('span', { class: 'node-label' }, 'TEST - ' + (props.data?.label || 'Working!')),
            h('div', { class: 'node-icon-badge', style: { '--badge-color': '#EC4899' } }, '🧪'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output', class: 'flow-handle flow-handle-right' }),
        ]
      );
  },
};

export default {
  name: 'WorkflowBuilder',
  components: {
    VueFlow,
    Background,
    Controls,
  },
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],
  setup(props, { emit, expose }) {
    const canvasRef = ref(null);
    const vueFlowRef = ref(null);
    const nodes = ref([]);
    const edges = ref([]);
    const draggedType = ref(null);
    const isInitialLoad = ref(true);

    // Custom node types registration
    const customNodeTypes = {
      condition: markRaw(ConditionNode),
      message: markRaw(MessageNode),
      wait: markRaw(WaitNode),
      api: markRaw(ApiNode),
      action: markRaw(ActionNode),
      trigger: markRaw(TriggerNode),
      test: markRaw(TestNode),
    };

    // Default edge options - light, curved bezier with dotted line and arrow
    const defaultEdgeOptions = {
      type: 'default', // bezier curve
      animated: true,
      style: { 
        stroke: '#B5B5B5', 
        strokeWidth: 1.5,
        strokeDasharray: '4 4',
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#B5B5B5',
        width: 16,
        height: 16,
      },
    };

    // Node palette configuration - Shopify Flow style with descriptions
    const nodeTypes = [
      { type: 'trigger', label: 'Trigger', description: 'Start workflow when event occurs' },
      { type: 'condition', label: 'Condition', description: 'Branch based on conditions' },
      { type: 'action', label: 'Action', description: 'Perform an action or operation' },
      { type: 'message', label: 'Message', description: 'Send message to customer' },
      { type: 'wait', label: 'Wait', description: 'Wait for a set amount of time' },
      { type: 'api', label: 'API Call', description: 'Send HTTP request to service' },
    ];

    // Exposed Variables
    const { value: workflowData, setValue: setWorkflowData } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'workflowData',
        type: 'object',
        defaultValue: { nodes: [], edges: [] },
      });

    const { value: isDirty, setValue: setIsDirty } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'isDirty',
        type: 'boolean',
        defaultValue: false,
      });

    const { value: nodeCount, setValue: setNodeCount } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'nodeCount',
        type: 'number',
        defaultValue: 0,
      });

    const { value: edgeCount, setValue: setEdgeCount } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'edgeCount',
        type: 'number',
        defaultValue: 0,
      });

    const { value: validationErrors, setValue: setValidationErrors } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'validationErrors',
        type: 'array',
        defaultValue: [],
      });

    const { value: selectedNodeId, setValue: setSelectedNodeId } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'selectedNodeId',
        type: 'string',
        defaultValue: '',
      });

    const { value: selectedNodeData, setValue: setSelectedNodeData } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: 'selectedNodeData',
        type: 'object',
        defaultValue: {},
      });

    // Computed styles
    const isReadOnly = computed(() => props.content?.readOnly === true);

    const rootStyle = computed(() => ({
      '--sidebar-width': props.content?.sidebarWidth || '150px',
      '--sidebar-bg': props.content?.sidebarBackground || '#F9FAFB',
      '--canvas-bg': props.content?.canvasBackground || '#FFFFFF',
    }));

    const sidebarStyle = computed(() => ({
      width: props.content?.sidebarWidth || '150px',
      backgroundColor: props.content?.sidebarBackground || '#F9FAFB',
    }));

    const canvasStyle = computed(() => ({
      backgroundColor: props.content?.canvasBackground || '#FFFFFF',
    }));

    const gridColorValue = computed(() => props.content?.gridColor || '#E5E7EB');

    // Get node color based on type
    const getNodeColor = (type) => {
      const colors = {
        trigger: props.content?.triggerNodeColor || '#6366F1',
        condition: props.content?.conditionNodeColor || '#3B82F6',
        action: props.content?.actionNodeColor || '#EC4899',
        message: props.content?.messageNodeColor || '#10B981',
        wait: props.content?.waitNodeColor || '#F59E0B',
        api: props.content?.apiNodeColor || '#8B5CF6',
      };
      return colors[type] || '#6B7280';
    };

    // Node action visibility
    const showEditAction = computed(() => props.content?.showEditAction !== false);
    const showDeleteAction = computed(() => props.content?.showDeleteAction !== false);

    // Default data structures for each node type
    const getDefaultNodeData = (type) => {
      const defaults = {
        trigger: {
          label: 'New Trigger',
          event: null,
        },
        condition: {
          label: 'New Condition',
          groups_operator: 'AND',
          groups: [],
        },
        action: {
          label: 'New Action',
          action_type: null,
          message: '',
        },
        message: {
          label: 'New Message',
          channel: null,
          template_id: null,
          subject: '',
          content: '',
          json_content: null,
        },
        wait: {
          label: 'New Wait',
          duration: 1,
          unit: 'days',
        },
        api: {
          label: 'New API Call',
          method: 'POST',
          url: '',
          headers: {},
          body: '',
          timeout_seconds: 30,
          retry_count: 2,
        },
      };
      return defaults[type] || { label: `New ${type}` };
    };

    // Strip internal fields from node data for clean event emission
    const getCleanNodeData = (data) => {
      if (!data) return {};
      const { color, showEditAction, showDeleteAction, onEdit, onDelete, ...cleanData } = data;
      return cleanData;
    };

    // Build clean node object for event emission
    const buildNodeEvent = (node) => {
      if (!node) return null;
      return {
        id: node.id,
        type: node.type,
        position: { ...node.position },
        data: getCleanNodeData(node.data),
      };
    };

    // Node action handlers
    const handleNodeEdit = (nodeId) => {
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;
      
      const nodeEvent = buildNodeEvent(node);
      
      setSelectedNodeId(nodeId);
      setSelectedNodeData(nodeEvent);
      
      emit('trigger-event', {
        name: 'node-edit',
        event: nodeEvent,
      });
    };
    
    const handleNodeDelete = (nodeId) => {
      if (isReadOnly.value) return;
      
      const node = nodes.value.find(n => n.id === nodeId);
      if (!node) return;
      
      // Build event before removing node
      const nodeEvent = buildNodeEvent(node);
      
      // Remove the node
      nodes.value = nodes.value.filter(n => n.id !== nodeId);
      
      // Remove connected edges
      edges.value = edges.value.filter(
        e => e.source !== nodeId && e.target !== nodeId
      );
      
      // Clear selection if deleted node was selected
      if (selectedNodeId.value === nodeId) {
        setSelectedNodeId('');
        setSelectedNodeData({});
      }
      
      setIsDirty(true);
      updateVariables();
      
      emit('trigger-event', {
        name: 'node-deleted',
        event: nodeEvent,
      });
      
      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });
    };

    // Data format conversion: Database → Vue Flow
    // Handles both field formats:
    // - node_name (DB field) or node_config.label (old format)
    // - from_node_id/to_node_id (DB fields) or source/target (Vue Flow format)
    const dbToVueFlow = (dbNodes, dbEdges) => {
      const vfNodes = (dbNodes || []).map((node) => {
        const nodeType = node?.node_type || 'message';
        // Get label from node_name (DB) or node_config.label (fallback)
        const label = node?.node_name || node?.node_config?.label || `New ${nodeType}`;
        
        return {
          id: node?.id || crypto.randomUUID(),
          type: nodeType,
          position: {
            x: Number(node?.position_x) || 100,
            y: Number(node?.position_y) || 100,
          },
          data: {
            label,
            ...(node?.node_config || {}),
            color: getNodeColor(nodeType),
            showEditAction: showEditAction.value,
            showDeleteAction: showDeleteAction.value,
            onEdit: handleNodeEdit,
            onDelete: handleNodeDelete,
          },
        };
      });

      const vfEdges = (dbEdges || []).map((edge) => ({
        id: edge?.id || crypto.randomUUID(),
        // Handle both DB format (from_node_id/to_node_id) and Vue Flow format (source/target)
        source: edge?.from_node_id || edge?.source || '',
        target: edge?.to_node_id || edge?.target || '',
        sourceHandle: edge?.source_handle || edge?.sourceHandle || 'output',
        targetHandle: edge?.target_handle || edge?.targetHandle || 'input',
        label: edge?.edge_label || edge?.label || undefined,
        type: 'smoothstep',
        animated: false,
      }));

      return { nodes: vfNodes, edges: vfEdges };
    };

    // Data format conversion: Vue Flow → Database
    const vueFlowToDb = (vfNodes, vfEdges) => {
      const dbNodes = (vfNodes || []).map((node) => {
        // Extract clean config without internal fields
        const cleanData = { ...node?.data };
        delete cleanData.color;
        delete cleanData.showEditAction;
        delete cleanData.showDeleteAction;
        delete cleanData.onEdit;
        delete cleanData.onDelete;
        
        return {
          id: node?.id,
          node_type: node?.type,
          node_name: node?.data?.label || `New ${node?.type}`,
          position_x: node?.position?.x || 0,
          position_y: node?.position?.y || 0,
          node_config: cleanData,
        };
      });

      const dbEdges = (vfEdges || []).map((edge) => ({
        id: edge?.id,
        from_node_id: edge?.source,
        to_node_id: edge?.target,
        source_handle: edge?.sourceHandle || 'output',
        edge_label: edge?.label || null,
      }));

      return { nodes: dbNodes, edges: dbEdges };
    };

    // Update exposed variables
    const updateVariables = () => {
      const currentNodes = nodes.value || [];
      const currentEdges = edges.value || [];

      setNodeCount(currentNodes.length);
      setEdgeCount(currentEdges.length);
      setWorkflowData({
        nodes: currentNodes,
        edges: currentEdges,
      });
    };

    // Validation logic
    const validate = () => {
      const errors = [];
      const currentNodes = nodes.value || [];
      const currentEdges = edges.value || [];

      // Check if at least 1 node exists
      if (currentNodes.length === 0) {
        errors.push('No nodes in workflow');
      }

      // Check for disconnected nodes
      if (currentNodes.length > 0) {
        const connectedNodeIds = new Set();
        currentEdges.forEach((edge) => {
          connectedNodeIds.add(edge?.source);
          connectedNodeIds.add(edge?.target);
        });

        // If there's only one node, it's allowed to be disconnected
        if (currentNodes.length > 1) {
          currentNodes.forEach((node) => {
            if (!connectedNodeIds.has(node?.id)) {
              const label = node?.data?.label || node?.type || 'Unknown';
              errors.push(`Node "${label}" is disconnected`);
            }
          });
        }
      }

      setValidationErrors(errors);

      if (errors.length > 0) {
        emit('trigger-event', {
          name: 'validation-failed',
          event: { errors },
        });
      }

      return { valid: errors.length === 0, errors };
    };

    // Save action
    const save = () => {
      const validation = validate();

      if (!validation.valid) {
        return { valid: false, errors: validation.errors };
      }

      const { nodes: dbNodes, edges: dbEdges } = vueFlowToDb(
        nodes.value,
        edges.value
      );

      setIsDirty(false);

      emit('trigger-event', {
        name: 'workflow-saved',
        event: { nodes: dbNodes, edges: dbEdges },
      });

      return { nodes: dbNodes, edges: dbEdges };
    };

    // Clear action
    const clear = () => {
      nodes.value = [];
      edges.value = [];
      setSelectedNodeId('');
      setSelectedNodeData({});
      setIsDirty(true);
      updateVariables();

      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });

      return { success: true };
    };

    // Update node config action
    const updateNodeConfig = (nodeId, config) => {
      if (!nodeId || !config) {
        return { success: false, error: 'nodeId and config are required' };
      }

      const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) {
        return { success: false, error: 'Node not found' };
      }

      // Update the node's data while preserving internal fields
      const existingNode = nodes.value[nodeIndex];
      const updatedNode = {
        ...existingNode,
        data: {
          ...config,
          color: getNodeColor(existingNode.type),
          showEditAction: showEditAction.value,
          showDeleteAction: showDeleteAction.value,
          onEdit: handleNodeEdit,
          onDelete: handleNodeDelete,
        },
      };

      // Update nodes array
      nodes.value = [
        ...nodes.value.slice(0, nodeIndex),
        updatedNode,
        ...nodes.value.slice(nodeIndex + 1),
      ];

      // Update selected node data if this is the selected node
      if (selectedNodeId.value === nodeId) {
        setSelectedNodeData(buildNodeEvent(updatedNode));
      }

      setIsDirty(true);
      updateVariables();

      emit('trigger-event', {
        name: 'workflow-changed',
        event: { is_dirty: true },
      });

      return { success: true, node: buildNodeEvent(updatedNode) };
    };

    // Add node helper function
    const addNode = (type, x, y) => {
      const defaultData = getDefaultNodeData(type);
      
      const newNode = {
        id: crypto.randomUUID(),
        type,
        position: { x, y },
        data: {
          ...defaultData,
          color: getNodeColor(type),
          showEditAction: showEditAction.value,
          showDeleteAction: showDeleteAction.value,
          onEdit: handleNodeEdit,
          onDelete: handleNodeDelete,
        },
      };

      nodes.value = [...nodes.value, newNode];

      if (!isInitialLoad.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
      return newNode;
    };

    // Drag and Drop handlers
    const onDragStart = (event, type) => {
      if (isReadOnly.value) return;
      draggedType.value = type;
      event.dataTransfer.setData('application/vueflow', type);
      event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = (event) => {
      event.preventDefault();
      if (isReadOnly.value) return;

      const type = event.dataTransfer.getData('application/vueflow');
      console.log('[WorkflowBuilder] Drop event - type:', type);
      if (!type) {
        console.log('[WorkflowBuilder] No type in dataTransfer, using draggedType:', draggedType.value);
      }
      
      const nodeType = type || draggedType.value;
      if (!nodeType) return;

      const bounds = canvasRef.value?.getBoundingClientRect();
      if (!bounds) {
        console.log('[WorkflowBuilder] No canvas bounds');
        return;
      }

      // Calculate position relative to canvas
      let x = event.clientX - bounds.left;
      let y = event.clientY - bounds.top;

      // Get the Vue Flow instance to access viewport
      const vfInstance = vueFlowRef.value;
      console.log('[WorkflowBuilder] VueFlow instance:', vfInstance);
      
      if (vfInstance?.viewport) {
        const { viewport } = vfInstance;
        console.log('[WorkflowBuilder] Viewport:', viewport);
        x = (x - viewport.x) / viewport.zoom;
        y = (y - viewport.y) / viewport.zoom;
      }

      console.log('[WorkflowBuilder] Adding node at:', { x, y, type: nodeType });
      const newNode = addNode(nodeType, x, y);
      console.log('[WorkflowBuilder] New node created:', newNode);
      console.log('[WorkflowBuilder] Total nodes:', nodes.value.length, nodes.value);
      
      draggedType.value = null;
    };

    // Node click handler
    const onNodeClick = (event) => {
      const node = event.node;
      if (!node) return;

      const nodeEvent = buildNodeEvent(node);

      setSelectedNodeId(node.id);
      setSelectedNodeData(nodeEvent);

      emit('trigger-event', {
        name: 'node-selected',
        event: nodeEvent,
      });
    };

    // Connection handler
    const onConnect = (params) => {
      if (isReadOnly.value) return;

      const newEdge = {
        id: crypto.randomUUID(),
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle || 'output',
        targetHandle: params.targetHandle || 'input',
      };

      edges.value = [...edges.value, newEdge];

      if (!isInitialLoad.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
    };

    // Changes handlers
    const onNodesChange = (changes) => {
      if (isInitialLoad.value) return;

      const hasRealChanges = changes.some(
        (change) =>
          change.type === 'position' ||
          change.type === 'remove' ||
          change.type === 'add'
      );

      if (hasRealChanges && !isReadOnly.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
    };

    const onEdgesChange = (changes) => {
      if (isInitialLoad.value) return;

      const hasRealChanges = changes.some(
        (change) => change.type === 'remove' || change.type === 'add'
      );

      if (hasRealChanges && !isReadOnly.value) {
        setIsDirty(true);
        emit('trigger-event', {
          name: 'workflow-changed',
          event: { is_dirty: true },
        });
      }

      updateVariables();
    };

    // Pane ready handler
    const onPaneReady = (instance) => {
      console.log('[WorkflowBuilder] Pane ready, instance:', instance);
      // Store the instance for later use
      if (nodes.value.length > 0) {
        console.log('[WorkflowBuilder] Fitting view to nodes');
        nextTick(() => {
          instance.fitView({ padding: 0.2 });
        });
      }
    };

    // Keyboard handler for delete
    const onKeyDown = (event) => {
      if (isReadOnly.value) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.value.filter((n) => n.selected);
        const selectedEdges = edges.value.filter((e) => e.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

          nodes.value = nodes.value.filter((n) => !n.selected);
          edges.value = edges.value.filter(
            (e) =>
              !e.selected &&
              !selectedNodeIds.has(e.source) &&
              !selectedNodeIds.has(e.target)
          );

          setSelectedNodeId('');
          setSelectedNodeData({});
          setIsDirty(true);

          emit('trigger-event', {
            name: 'workflow-changed',
            event: { is_dirty: true },
          });

          updateVariables();
        }
      }
    };

    // Watch for initial data changes
    watch(
      () => [props.content?.initialNodes, props.content?.initialEdges],
      ([newNodes, newEdges]) => {
        console.log('[WorkflowBuilder] Initial data changed:', { newNodes, newEdges });
        isInitialLoad.value = true;

        const { nodes: vfNodes, edges: vfEdges } = dbToVueFlow(
          newNodes,
          newEdges
        );

        console.log('[WorkflowBuilder] Converted to VueFlow format:', { vfNodes, vfEdges });
        
        nodes.value = vfNodes;
        edges.value = vfEdges;

        console.log('[WorkflowBuilder] nodes.value is now:', nodes.value);

        setIsDirty(false);
        updateVariables();

        // Fit view after nodes are set
        nextTick(() => {
          if (vueFlowRef.value && vfNodes.length > 0) {
            console.log('[WorkflowBuilder] Fitting view after initial load');
            vueFlowRef.value.fitView({ padding: 0.2 });
          }
          setTimeout(() => {
            isInitialLoad.value = false;
          }, 100);
        });
      },
      { immediate: true, deep: true }
    );

    // Watch nodes array and fit view
    watch(
      () => nodes.value.length,
      (newLength, oldLength) => {
        console.log('[WorkflowBuilder] Node count changed:', oldLength, '->', newLength);
        if (newLength > 0 && vueFlowRef.value) {
          nextTick(() => {
            console.log('[WorkflowBuilder] Triggering fitView');
            vueFlowRef.value.fitView({ padding: 0.2 });
          });
        }
      }
    );

    // Watch for readOnly changes
    watch(
      () => props.content?.readOnly,
      () => {
        // No specific action needed, computed handles it
      }
    );

    // Watch for color and action changes to update existing nodes
    watch(
      () => [
        props.content?.conditionNodeColor,
        props.content?.messageNodeColor,
        props.content?.waitNodeColor,
        props.content?.apiNodeColor,
        props.content?.showEditAction,
        props.content?.showDeleteAction,
      ],
      () => {
        nodes.value = nodes.value.map((node) => ({
          ...node,
          data: {
            ...node.data,
            color: getNodeColor(node.type),
            showEditAction: showEditAction.value,
            showDeleteAction: showDeleteAction.value,
            onEdit: handleNodeEdit,
            onDelete: handleNodeDelete,
          },
        }));
      },
      { deep: true }
    );

    // Expose actions
    expose({
      save,
      validate,
      clear,
      updateNodeConfig,
    });

    /* wwEditor:start */
    const isEditing = computed(() => props.wwEditorState?.isEditing);
    /* wwEditor:end */

    return {
      canvasRef,
      vueFlowRef,
      nodes,
      edges,
      nodeTypes,
      customNodeTypes,
      defaultEdgeOptions,
      isReadOnly,
      rootStyle,
      sidebarStyle,
      canvasStyle,
      gridColorValue,
      getNodeColor,
      onDragStart,
      onDrop,
      onNodeClick,
      onConnect,
      onNodesChange,
      onEdgesChange,
      onKeyDown,
      onPaneReady,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    };
  },
};
</script>

<style scoped lang="scss">
@import 'polaris-weweb-styles';

// Root element with Polaris tokens
.workflow-builder {
  @include polaris-tokens;
  display: grid !important;
  grid-template-columns: auto 1fr;
  gap: 0;
  width: 100%;
  height: 100%;
  min-height: 500px;
  overflow: hidden;
  font-family: var(--p-font-family-sans);
  background: var(--p-color-bg-surface-secondary);
}

// Sidebar - Shopify Flow style
.sidebar {
  grid-column: 1;
  padding: 0;
  background: var(--p-color-bg-surface);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: var(--p-border-width-025) solid var(--p-color-border);
  width: 220px;
}

// Node palette layout
.node-palette {
  display: flex;
  flex-direction: column;
}

// Palette nodes - Shopify Flow action list style (like image 2)
.palette-node {
  display: flex;
  align-items: stretch;
  padding: 0;
  background: var(--p-color-bg-surface);
  border: none;
  border-bottom: var(--p-border-width-025) solid var(--p-color-border);
  cursor: grab;
  transition: background 0.15s ease;

  // Left color accent bar
  &::before {
    content: '';
    width: 4px;
    background: var(--node-color);
    flex-shrink: 0;
  }

  &:hover {
    background: var(--p-color-bg-surface-hover);
  }

  &:active {
    cursor: grabbing;
    background: var(--p-color-bg-surface-active);
  }

  &:last-child {
    border-bottom: none;
  }
}

.palette-node-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  flex: 1;
  min-width: 0;
}

.palette-node-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--p-color-text);
  line-height: 1.3;
}

.palette-node-desc {
  font-size: 12px;
  font-weight: 400;
  color: var(--p-color-text-secondary);
  line-height: 1.4;
}

// Canvas container
.canvas-container {
  grid-column: 2;
  min-width: 300px;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--p-color-bg-surface-secondary);
}

// ============================================
// Vue Flow specific styles - Shopify Flow design
// Using Polaris variables where possible
// ============================================

:deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__node) {
  padding: 0;
  border: none;
  background: transparent;
}

// Shopify Flow style nodes - with shadow and selection border
:deep(.flow-node) {
  background: #FFFFFF;
  border: 1px solid #E1E3E5;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  min-width: 180px;
  max-width: 280px;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    border-color: #C9CCCF;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
  }
  
  // Show action toolbar on hover
  &:hover .node-actions-toolbar {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }
}

// Selection state - rounded border frame like Shopify Flow (image 1)
:deep(.flow-node.selected) {
  border: 2px solid #202223;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
}

// Node body content - using Polaris inline layout
:deep(.node-body) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-space-300);
  padding: var(--p-space-400);
}

:deep(.node-label) {
  font-size: var(--p-font-size-325);
  font-weight: var(--p-font-weight-semibold);
  color: var(--p-color-text);
  line-height: var(--p-font-line-height-400);
  flex: 1;
}

// Icon badge (positioned on right like Shopify Flow)
:deep(.node-icon-badge) {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--badge-color, var(--p-color-bg-fill-brand)) 15%, white);
  border-radius: var(--p-border-radius-200);
  font-size: 16px;
  flex-shrink: 0;
}

// Node actions toolbar (appears on hover) - using Polaris card style
:deep(.node-actions-toolbar) {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  display: flex;
  gap: var(--p-space-100);
  background: var(--p-color-bg-surface);
  border: var(--p-border-width-025) solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  padding: var(--p-space-100);
  box-shadow: var(--p-shadow-400);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 10;
}

// Action buttons - using Polaris button plain style as base
:deep(.node-action-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--p-border-radius-100);
  background: transparent;
  color: var(--p-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--p-color-bg-surface-hover);
    color: var(--p-color-text);
  }
  
  svg {
    flex-shrink: 0;
  }
}

:deep(.node-action-edit:hover) {
  background: var(--p-color-bg-fill-info-secondary);
  color: var(--p-color-text-info);
}

:deep(.node-action-delete:hover) {
  background: var(--p-color-bg-fill-critical-secondary);
  color: var(--p-color-text-critical);
}

// Handle styles - left/right positioning
:deep(.flow-handle) {
  width: 10px !important;
  height: 10px !important;
  background: #FFFFFF !important;
  border: 2px solid #C9CCCF !important;
  border-radius: 50% !important;
  transition: all 0.15s ease;

  &:hover {
    background: #2C6ECB !important;
    border-color: #2C6ECB !important;
    transform: scale(1.3);
  }
}

:deep(.flow-handle-left) {
  left: -6px !important;
}

:deep(.flow-handle-right) {
  right: -6px !important;
}

:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  background: #FFFFFF;
  border: 2px solid #C9CCCF;
  transition: all 0.15s ease;

  &:hover {
    background: #2C6ECB;
    border-color: #2C6ECB;
    transform: scale(1.3);
  }
}

:deep(.vue-flow__handle-left) {
  left: -6px;
}

:deep(.vue-flow__handle-right) {
  right: -6px;
}

// Edge styles - light, curved bezier with dotted line (like Shopify Flow)
:deep(.vue-flow__edge-path) {
  stroke: #B5B5B5 !important;
  stroke-width: 1.5 !important;
  stroke-dasharray: 4 4 !important;
  stroke-linecap: round !important;
  fill: none !important;
}

// Animated flow effect (subtle)
:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  animation: flow-animation 2s linear infinite;
}

@keyframes flow-animation {
  from {
    stroke-dashoffset: 16;
  }
  to {
    stroke-dashoffset: 0;
  }
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #2C6ECB !important;
  stroke-width: 1.5 !important;
}

// Arrow marker styling - lighter
:deep(.vue-flow__arrowhead) {
  fill: #B5B5B5;
}

:deep(.vue-flow__edge.selected .vue-flow__arrowhead) {
  fill: #2C6ECB;
}

:deep(.react-flow__arrowhead polyline),
:deep(.vue-flow__arrowhead polyline) {
  stroke: #B5B5B5;
  fill: #B5B5B5;
}

// Edge labels
:deep(.vue-flow__edge-text) {
  font-size: 11px;
  fill: #8C9196;
  font-weight: 500;
}

:deep(.vue-flow__edge-textbg) {
  fill: #F6F6F7;
  rx: 4;
  ry: 4;
}

// Controls styling - using Polaris card style
:deep(.vue-flow__controls) {
  box-shadow: var(--p-shadow-200);
  border-radius: var(--p-border-radius-200);
  overflow: hidden;
  border: var(--p-border-width-025) solid var(--p-color-border);
}

:deep(.vue-flow__controls-button) {
  background: var(--p-color-bg-surface);
  border: none;
  width: 32px;
  height: 32px;
  color: var(--p-color-text-secondary);

  &:hover {
    background: var(--p-color-bg-surface-hover);
    color: var(--p-color-text);
  }
}

// Background pattern
:deep(.vue-flow__background) {
  background: var(--p-color-bg-surface-secondary);
}

// Responsive
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .workflow-builder {
    grid-template-columns: 1fr;
  }
}
</style>

