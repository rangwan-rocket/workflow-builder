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
        en: 'Returns {nodes, edges} for saving to database',
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
  ],
  triggerEvents: [
    {
      name: 'workflow-saved',
      label: { en: 'On Workflow Saved' },
      event: { nodes: [], edges: [] },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ nodes: [{id: "test", node_type: "message"}], edges: [] })',
      /* wwEditor:end */
    },
    {
      name: 'node-selected',
      label: { en: 'On Node Selected' },
      event: { node_id: '', node_type: '', node_data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ node_id: "test-id", node_type: "message", node_data: {label: "Test"} })',
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
    {
      name: 'node-edit',
      label: { en: 'On Node Edit' },
      event: { node_id: '', node_type: '', node_data: {} },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ node_id: "test-id", node_type: "message", node_data: {label: "Test"} })',
      /* wwEditor:end */
    },
    {
      name: 'node-deleted',
      label: { en: 'On Node Deleted' },
      event: { node_id: '', node_type: '' },
      default: true,
      /* wwEditor:start */
      getTestEvent: '() => ({ node_id: "test-id", node_type: "message" })',
      /* wwEditor:end */
    },
  ],
  properties: {
    // Data Binding
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
      label: { en: 'Show Edit Action' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show edit button on nodes',
      },
      propertyHelp: 'Show edit button when hovering over nodes. Triggers "On Node Edit" event.',
      /* wwEditor:end */
    },
    showDeleteAction: {
      label: { en: 'Show Delete Action' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
      bindable: true,
      hidden: content => content?.readOnly,
      /* wwEditor:start */
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Show delete button on nodes',
      },
      propertyHelp: 'Show delete button when hovering over nodes. Triggers "On Node Deleted" event.',
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
