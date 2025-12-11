export default {
  editor: {
    label: {
      en: 'Workflow Builder',
    },
    icon: 'workflow',
  },
  actions: [
    {
      name: 'save',
      label: { en: 'Save Workflow' },
      action: 'save',
      /* wwEditor:start */
      actionDescription: {
        en: 'Validates and returns full workflow payload {p_workflow, p_nodes, p_edges} for upsert API',
      },
      /* wwEditor:end */
    },
    {
      name: 'validate',
      label: { en: 'Validate Workflow' },
      action: 'validate',
      /* wwEditor:start */
      actionDescription: {
        en: 'Returns {valid, errors} validation result',
      },
      /* wwEditor:end */
    },
    {
      name: 'clear',
      label: { en: 'Clear Canvas' },
      action: 'clear',
      /* wwEditor:start */
      actionDescription: {
        en: 'Clears all nodes and edges from canvas',
      },
      /* wwEditor:end */
    },
    {
      name: 'updateNodeConfig',
      label: { en: 'Update Node Config' },
      action: 'updateNodeConfig',
      args: [
        {
          name: 'nodeId',
          label: { en: 'Node ID' },
          type: 'Text',
          required: true,
        },
        {
          name: 'config',
          label: { en: 'Config Data' },
          type: 'Object',
          required: true,
        },
      ],
      /* wwEditor:start */
      actionDescription: {
        en: 'Updates the config data for a specific node by ID',
      },
      /* wwEditor:end */
    },
  ],
  triggerEvents: [
    {
      name: 'workflow-saved',
      label: { en: 'On Workflow Saved' },
      event: { p_workflow: {}, p_nodes: [], p_edges: [] },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ p_workflow: {id: "test"}, p_nodes: [{id: "n1", node_type: "message"}], p_edges: [] })',
      /* wwEditor:end */
    },
    {
      name: 'node-selected',
      label: { en: 'On Node Selected' },
      event: { id: '', type: '', position: { x: 0, y: 0 }, data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ id: "node-123", type: "message", position: { x: 100, y: 100 }, data: { label: "Test Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'node-edit',
      label: { en: 'On Node Edit' },
      event: { id: '', type: '', position: { x: 0, y: 0 }, data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ id: "node-123", type: "condition", position: { x: 100, y: 100 }, data: { label: "Edit Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'node-deleted',
      label: { en: 'On Node Deleted' },
      event: { id: '', type: '', position: { x: 0, y: 0 }, data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ id: "node-123", type: "message", position: { x: 100, y: 100 }, data: { label: "Deleted Node" } })',
      /* wwEditor:end */
    },
    {
      name: 'workflow-changed',
      label: { en: 'On Workflow Changed' },
      event: { is_dirty: true },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ is_dirty: true })',
      /* wwEditor:end */
    },
    {
      name: 'validation-failed',
      label: { en: 'On Validation Failed' },
      event: { errors: [] },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ errors: ["No nodes in workflow"] })',
      /* wwEditor:end */
    },
  ],
  properties: {
    // Data Binding
    initialWorkflow: {
      label: { en: 'Workflow Data' },
      type: 'Object',
      section: 'settings',
      bindable: true,
      defaultValue: {},
      /* wwEditor:start */
      bindingValidation: {
        type: 'object',
        tooltip: 'Workflow metadata object (id, merchant_id, name, description, is_active, etc.)',
      },
      propertyHelp:
        'Bind to workflow record. Used to build the p_workflow payload for upsert API.',
      /* wwEditor:end */
    },
    initialNodes: {
      label: { en: 'Initial Nodes' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return item?.node_config?.label || item?.node_type || 'Node';
        },
        item: {
          type: 'Object',
          defaultValue: {
            id: '',
            node_type: 'message',
            position_x: 100,
            position_y: 100,
            node_config: { label: 'New Node' },
          },
          options: {
            item: {
              id: {
                label: { en: 'ID' },
                type: 'Text',
                options: { placeholder: 'Auto-generated if empty' },
              },
              node_type: {
                label: { en: 'Node Type' },
                type: 'TextSelect',
                options: {
                  options: [
                    { value: 'condition', label: 'Condition' },
                    { value: 'message', label: 'Message' },
                    { value: 'wait', label: 'Wait' },
                    { value: 'api', label: 'API Call' },
                  ],
                },
                defaultValue: 'message',
              },
              position_x: {
                label: { en: 'Position X' },
                type: 'Number',
                options: { min: 0, max: 5000, step: 10 },
                defaultValue: 100,
              },
              position_y: {
                label: { en: 'Position Y' },
                type: 'Number',
                options: { min: 0, max: 5000, step: 10 },
                defaultValue: 100,
              },
              node_config: {
                label: { en: 'Config' },
                type: 'Object',
                defaultValue: { label: 'New Node' },
                options: {
                  item: {
                    label: {
                      label: { en: 'Label' },
                      type: 'Text',
                      defaultValue: 'New Node',
                    },
                  },
                },
              },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of node objects from database',
      },
      propertyHelp:
        'Bind to Supabase collection of workflow nodes. Each node should have: id, node_type, position_x, position_y, node_config {label}',
      /* wwEditor:end */
    },
    initialEdges: {
      label: { en: 'Initial Edges' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return `${item?.source || '?'} → ${item?.target || '?'}`;
        },
        item: {
          type: 'Object',
          defaultValue: { id: '', source: '', target: '', sourceHandle: 'output' },
          options: {
            item: {
              id: {
                label: { en: 'ID' },
                type: 'Text',
                options: { placeholder: 'Auto-generated if empty' },
              },
              source: {
                label: { en: 'Source Node ID' },
                type: 'Text',
                defaultValue: '',
              },
              target: {
                label: { en: 'Target Node ID' },
                type: 'Text',
                defaultValue: '',
              },
              sourceHandle: {
                label: { en: 'Source Handle' },
                type: 'Text',
                defaultValue: 'output',
              },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of edge objects from database',
      },
      propertyHelp:
        'Bind to Supabase collection of workflow edges. Each edge should have: id, source, target, sourceHandle',
      /* wwEditor:end */
    },
    readOnly: {
      label: { en: 'Read Only' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: false,
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Enable/disable editing mode',
      },
      propertyHelp: 'Disable editing for view-only mode in analytics pages',
      /* wwEditor:end */
    },
    showEditAction: {
      label: { en: 'Show Edit Button' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show edit button on selected nodes',
      },
      /* wwEditor:end */
    },
    showDeleteAction: {
      label: { en: 'Show Delete Button' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show delete button on selected nodes',
      },
      /* wwEditor:end */
    },

    // Styling
    sidebarWidth: {
      label: { en: 'Sidebar Width' },
      type: 'Length',
      section: 'style',
      defaultValue: '150px',
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Width of the node palette sidebar',
      },
      /* wwEditor:end */
    },
    sidebarBackground: {
      label: { en: 'Sidebar Background' },
      type: 'Color',
      section: 'style',
      defaultValue: '#F9FAFB',
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Background color of sidebar',
      },
      /* wwEditor:end */
    },
    canvasBackground: {
      label: { en: 'Canvas Background' },
      type: 'Color',
      section: 'style',
      defaultValue: '#FFFFFF',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Background color of canvas',
      },
      /* wwEditor:end */
    },
    gridColor: {
      label: { en: 'Grid Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#E5E7EB',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Color of background grid',
      },
      /* wwEditor:end */
    },

    // Node Colors
    conditionNodeColor: {
      label: { en: 'Condition Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#3B82F6',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for condition nodes' },
      /* wwEditor:end */
    },
    messageNodeColor: {
      label: { en: 'Message Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#10B981',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for message nodes' },
      /* wwEditor:end */
    },
    waitNodeColor: {
      label: { en: 'Wait Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#F59E0B',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for wait nodes' },
      /* wwEditor:end */
    },
    apiNodeColor: {
      label: { en: 'API Node Color' },
      type: 'Color',
      section: 'style',
      defaultValue: '#8B5CF6',
      bindable: true,
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Color for API nodes' },
      /* wwEditor:end */
    },
  },
};