<template>
  <div class="workflow-builder" :style="rootStyle">
    <!-- Sidebar Node Palette -->
    <div
      v-if="!isReadOnly"
      class="sidebar"
      :style="sidebarStyle"
    >
      <div class="sidebar-title">Nodes</div>
      <div class="node-palette">
        <div
          v-for="nodeType in nodeTypes"
          :key="nodeType.type"
          class="palette-node"
          :style="{ '--node-color': getNodeColor(nodeType.type) }"
          draggable="true"
          @dragstart="onDragStart($event, nodeType.type)"
        >
          <span class="node-icon">{{ nodeType.icon }}</span>
          <span class="node-label">{{ nodeType.label }}</span>
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
        <Background :color="gridColorValue" :gap="20" />
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

// Custom Node Components
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
          class: ['custom-node', 'condition-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#3B82F6' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input' }),
          h('div', { class: 'node-content' }, [
            h('span', { class: 'node-icon' }, '🔀'),
            h('span', { class: 'node-text' }, props.data?.label || 'Condition'),
          ]),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-true',
            style: { top: '30%' },
          }),
          h(Handle, {
            type: 'source',
            position: Position.Right,
            id: 'output-false',
            style: { top: '70%' },
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
          class: ['custom-node', 'message-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#10B981' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input' }),
          h('div', { class: 'node-content' }, [
            h('span', { class: 'node-icon' }, '✉️'),
            h('span', { class: 'node-text' }, props.data?.label || 'Send Message'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output' }),
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
          class: ['custom-node', 'wait-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#F59E0B' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input' }),
          h('div', { class: 'node-content' }, [
            h('span', { class: 'node-icon' }, '⏱️'),
            h('span', { class: 'node-text' }, props.data?.duration || props.data?.label || 'Wait'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output' }),
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
          class: ['custom-node', 'api-node', { selected: props.selected }],
          style: { '--node-color': props.data?.color || '#8B5CF6' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input' }),
          h('div', { class: 'node-content' }, [
            h('span', { class: 'node-icon' }, '🔌'),
            h('span', { class: 'node-text' }, props.data?.label || 'API Call'),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output' }),
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
          class: ['custom-node', 'test-node', { selected: props.selected }],
          style: { '--node-color': '#EC4899', background: '#FDF2F8', border: '3px dashed #EC4899' },
        },
        [
          createNodeActions(props, showEdit.value, showDelete.value),
          h(Handle, { type: 'target', position: Position.Left, id: 'input' }),
          h('div', { class: 'node-content' }, [
            h('span', { class: 'node-icon' }, '🧪'),
            h('span', { class: 'node-text', style: { color: '#EC4899', fontWeight: 'bold' } }, 'TEST - ' + (props.data?.label || 'Working!')),
          ]),
          h(Handle, { type: 'source', position: Position.Right, id: 'output' }),
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
      test: markRaw(TestNode),
    };

    // Node palette configuration
    const nodeTypes = [
      { type: 'condition', label: 'Condition', icon: '🔀' },
      { type: 'message', label: 'Message', icon: '✉️' },
      { type: 'wait', label: 'Wait', icon: '⏱️' },
      { type: 'api', label: 'API Call', icon: '🔌' },
      { type: 'test', label: 'TEST NODE', icon: '🧪' },
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
        condition: props.content?.conditionNodeColor || '#3B82F6',
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
        condition: {
          label: 'New Condition',
          groups_operator: 'AND',
          groups: [],
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
    const dbToVueFlow = (dbNodes, dbEdges) => {
      const vfNodes = (dbNodes || []).map((node) => ({
        id: node?.id || crypto.randomUUID(),
        type: node?.node_type || 'message',
        position: {
          x: Number(node?.position_x) || 100,
          y: Number(node?.position_y) || 100,
        },
        data: {
          ...(node?.node_config || {}),
          color: getNodeColor(node?.node_type || 'message'),
          showEditAction: showEditAction.value,
          showDeleteAction: showDeleteAction.value,
          onEdit: handleNodeEdit,
          onDelete: handleNodeDelete,
        },
      }));

      const vfEdges = (dbEdges || []).map((edge) => ({
        id: edge?.id || crypto.randomUUID(),
        source: edge?.source || '',
        target: edge?.target || '',
        sourceHandle: edge?.sourceHandle || edge?.source_handle || 'output',
        targetHandle: edge?.targetHandle || edge?.target_handle || 'input',
      }));

      return { nodes: vfNodes, edges: vfEdges };
    };

    // Data format conversion: Vue Flow → Database
    const vueFlowToDb = (vfNodes, vfEdges) => {
      const dbNodes = (vfNodes || []).map((node) => ({
        id: node?.id,
        node_type: node?.type,
        position_x: node?.position?.x || 0,
        position_y: node?.position?.y || 0,
        node_config: {
          label: node?.data?.label,
          ...Object.fromEntries(
            Object.entries(node?.data || {}).filter(([key]) => key !== 'color')
          ),
        },
      }));

      const dbEdges = (vfEdges || []).map((edge) => ({
        id: edge?.id,
        source: edge?.source,
        target: edge?.target,
        sourceHandle: edge?.sourceHandle || 'output',
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
  grid-template-columns: 160px 1fr;
  width: 100%;
  height: 500px;
  min-height: 500px;
  overflow: hidden;
  font-family: var(--p-font-family-sans);
}

// Sidebar using Polaris card subdued style
.sidebar {
  @include polaris-card-subdued;
  grid-column: 1;
  border-radius: 0;
  border-right: var(--p-border-width-025) solid var(--p-color-border);
  display: flex;
  flex-direction: column;
  gap: var(--p-space-400);
  overflow-y: auto;
}

// Sidebar title using Polaris text style
.sidebar-title {
  @include polaris-text-heading-sm;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-color-text-secondary);
}

// Node palette layout
.node-palette {
  @include polaris-block-stack;
  gap: var(--p-space-300);
}

// Palette nodes - custom styling with Polaris variables
// (can't use polaris-button because each needs unique border color)
.palette-node {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
  padding: var(--p-space-300);
  background: var(--p-color-bg-surface);
  border: 2px solid var(--node-color);
  border-radius: var(--p-border-radius-200);
  cursor: grab;
  transition: all 0.2s ease;
  font-size: var(--p-font-size-325);
  font-weight: var(--p-font-weight-medium);
  color: var(--p-color-text);

  &:hover {
    background: color-mix(in srgb, var(--node-color) 10%, white);
    transform: translateY(-2px);
    box-shadow: var(--p-shadow-300);
  }

  &:active {
    cursor: grabbing;
    transform: translateY(0);
  }
}

.node-icon {
  font-size: 18px;
}

.node-label {
  flex: 1;
}

// Canvas container
.canvas-container {
  grid-column: 2;
  min-width: 300px;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--p-color-bg);
}

// ============================================
// Vue Flow specific styles (local, not Polaris)
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

// Custom node styles
:deep(.custom-node) {
  padding: 12px 16px;
  border-radius: var(--p-border-radius-200);
  background: var(--p-color-bg-surface);
  border: 2px solid var(--node-color);
  box-shadow: var(--p-shadow-200);
  min-width: 140px;
  transition: all 0.2s ease;
  position: relative;

  &.selected {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--node-color) 30%, transparent),
      var(--p-shadow-300);
  }

  &:hover {
    box-shadow: var(--p-shadow-300);
  }
  
  // Show action toolbar on hover
  &:hover .node-actions-toolbar {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }
}

// Node actions toolbar (appears on hover)
:deep(.node-actions-toolbar) {
  position: absolute;
  top: -36px;
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  display: flex;
  gap: 4px;
  background: var(--p-color-bg-surface);
  border: 1px solid var(--p-color-border);
  border-radius: var(--p-border-radius-200);
  padding: 4px;
  box-shadow: var(--p-shadow-300);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 10;
}

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
  background: color-mix(in srgb, #3B82F6 15%, transparent);
  color: #3B82F6;
}

:deep(.node-action-delete:hover) {
  background: color-mix(in srgb, #EF4444 15%, transparent);
  color: #EF4444;
}

:deep(.node-content) {
  display: flex;
  align-items: center;
  gap: var(--p-space-200);
}

:deep(.node-icon) {
  font-size: 18px;
}

:deep(.node-text) {
  font-size: var(--p-font-size-325);
  font-weight: var(--p-font-weight-medium);
  color: var(--p-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

// Handle styles
:deep(.vue-flow__handle) {
  width: 12px;
  height: 12px;
  background: var(--p-color-bg-surface);
  border: 2px solid var(--p-color-border);
  transition: all 0.2s ease;

  &:hover {
    background: var(--node-color, var(--p-color-bg-fill-brand));
    border-color: var(--node-color, var(--p-color-bg-fill-brand));
    transform: scale(1.2);
  }
}

:deep(.vue-flow__handle-left) {
  left: -6px;
}

:deep(.vue-flow__handle-right) {
  right: -6px;
}

// Edge styles
:deep(.vue-flow__edge-path) {
  stroke: var(--p-color-border);
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--p-color-bg-fill-brand);
  stroke-width: 3;
}

// Controls styling
:deep(.vue-flow__controls) {
  box-shadow: var(--p-shadow-200);
  border-radius: var(--p-border-radius-200);
  overflow: hidden;
}

:deep(.vue-flow__controls-button) {
  background: var(--p-color-bg-surface);
  border: none;
  width: 32px;
  height: 32px;

  &:hover {
    background: var(--p-color-bg-surface-hover);
  }
}

// Responsive
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
