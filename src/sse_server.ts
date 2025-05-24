import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { z } from 'zod';
import configuration from './config.js';
import {
  createDocumentPageTool,
  createDocumentTool,
  getDocumentPagesTool,
  getDocumentTool,
  handleCreateDocument,
  handleCreateDocumentPage,
  handleGetDocument,
  handleGetDocumentPages,
  handleListDocumentPages,
  handleListDocuments,
  handleUpdateDocumentPage,
  listDocumentPagesTool,
  listDocumentsTool,
  updateDocumentPageTool,
} from './tools/documents.js';
import {
  createFolderTool,
  deleteFolderTool,
  getFolderTool,
  handleCreateFolder,
  handleDeleteFolder,
  handleGetFolder,
  handleUpdateFolder,
  updateFolderTool,
} from './tools/folder.js';
import {
  addTimeEntryTool,
  attachTaskFileTool,
  createBulkTasksTool,
  createTaskCommentTool,
  createTaskTool,
  deleteBulkTasksTool,
  deleteTaskTool,
  deleteTimeEntryTool,
  duplicateTaskTool,
  getCurrentTimeEntryTool,
  getTaskCommentsTool,
  getTasksTool,
  getTaskTimeEntriesTool,
  getTaskTool,
  getWorkspaceTasksTool,
  handleAddTimeEntry,
  handleAttachTaskFile,
  handleCreateBulkTasks,
  handleCreateTask,
  handleCreateTaskComment,
  handleDeleteBulkTasks,
  handleDeleteTask,
  handleDeleteTimeEntry,
  handleDuplicateTask,
  handleGetCurrentTimeEntry,
  handleGetTask,
  handleGetTaskComments,
  handleGetTasks,
  handleGetTaskTimeEntries,
  handleGetWorkspaceTasks,
  handleMoveBulkTasks,
  handleMoveTask,
  handleStartTimeTracking,
  handleStopTimeTracking,
  handleUpdateBulkTasks,
  handleUpdateTask,
  moveBulkTasksTool,
  moveTaskTool,
  startTimeTrackingTool,
  stopTimeTrackingTool,
  updateBulkTasksTool,
  updateTaskTool,
} from './tools/index.js';
import {
  createListInFolderTool,
  createListTool,
  deleteListTool,
  getListTool,
  handleCreateList,
  handleCreateListInFolder,
  handleDeleteList,
  handleGetList,
  handleUpdateList,
  updateListTool,
} from './tools/list.js';
import {
  addTagToTaskTool,
  getSpaceTagsTool,
  handleAddTagToTask,
  handleGetSpaceTags,
  handleRemoveTagFromTask,
  removeTagFromTaskTool,
} from './tools/tag.js';
import { handleGetWorkspaceHierarchy } from './tools/workspace.js';

const server = new McpServer({
  name: 'clickup-mcp-server',
  version: '0.7.2',
});

const app = express();
app.use(express.json());

server.tool(
  'get_workspace_hierarchy',
  'Get Workspace Hierarchy',
  {},
  async () => {
    const hierarchy = (await handleGetWorkspaceHierarchy()) as Tool;
    return hierarchy;
  }
);

server.tool(
  getTaskTool.name,
  getTaskTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of task to retrieve (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234'). The system automatically detects the ID format."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of task to retrieve. Can be used alone for a global search, or with listName for faster lookup.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'Name of list containing the task. Optional but recommended when using taskName.'
      ),
    customTaskId: z
      .string()
      .optional()
      .describe(
        "Custom task ID (e.g., 'DEV-1234'). Only use this if you want to explicitly force custom ID lookup. In most cases, you can just use taskId which auto-detects ID format."
      ),
    subtasks: z
      .boolean()
      .optional()
      .describe(
        'Whether to include subtasks in the response. Set to true to retrieve full details of all subtasks.'
      ),
  },
  async (params) => {
    return (await handleGetTask(params)) as Tool;
  }
);

server.tool(
  getTasksTool.name,
  getTasksTool.description,
  {
    listId: z
      .string()
      .optional()
      .describe(
        'ID of list to get tasks from (preferred). Use this instead of listName if you have it.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        "Name of list to get tasks from. Only use if you don't have listId."
      ),
    subtasks: z.boolean().optional().describe('Include subtasks'),
    statuses: z
      .array(z.string())
      .optional()
      .describe("Filter by status names (e.g. ['To Do', 'In Progress'])"),
    archived: z.boolean().optional().describe('Include archived tasks'),
    page: z
      .number()
      .optional()
      .describe('Page number for pagination (starts at 0)'),
    order_by: z
      .string()
      .optional()
      .describe('Sort field: due_date, created, updated'),
    reverse: z.boolean().optional().describe('Reverse sort order (descending)'),
  },
  async (params) => {
    return (await handleGetTasks(params)) as Tool;
  }
);

server.tool(
  createTaskTool.name,
  createTaskTool.description,
  {
    name: z
      .string()
      .describe(
        'REQUIRED: Name of the task. Put a relevant emoji followed by a blank space before the name.'
      ),
    listId: z
      .string()
      .optional()
      .describe(
        'REQUIRED (unless listName provided): ID of the list to create the task in. If you have this ID from a previous response, use it directly rather than looking up by name.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'REQUIRED (unless listId provided): Name of the list to create the task in - will automatically find the list by name.'
      ),
    description: z
      .string()
      .optional()
      .describe('Optional plain text description for the task'),
    markdown_description: z
      .string()
      .optional()
      .describe(
        'Optional markdown formatted description for the task. If provided, this takes precedence over description'
      ),
    status: z
      .string()
      .optional()
      .describe(
        'Optional: Override the default ClickUp status. In most cases, you should omit this to use ClickUp defaults'
      ),
    priority: z
      .number()
      .optional()
      .describe(
        'Optional priority of the task (1-4), where 1 is urgent/highest priority and 4 is lowest priority. Only set this when explicitly requested.'
      ),
    dueDate: z
      .string()
      .optional()
      .describe(
        "Optional due date. Supports Unix timestamps (ms) or natural language like '1 hour from now', 'tomorrow', 'next week', etc."
      ),
    startDate: z
      .string()
      .optional()
      .describe(
        "Optional start date. Supports Unix timestamps (ms) or natural language like 'now', 'start of today', etc."
      ),
    parent: z
      .string()
      .optional()
      .describe(
        'Optional ID of the parent task. When specified, this task will be created as a subtask of the specified parent task.'
      ),
    tags: z
      .array(z.string())
      .optional()
      .describe(
        'Optional array of tag names to assign to the task. The tags must already exist in the space.'
      ),
    custom_fields: z
      .array(
        z.object({
          id: z.string().describe('ID of the custom field'),
          value: z
            .any()
            .describe(
              'Value for the custom field. Type depends on the field type.'
            ),
        })
      )
      .optional()
      .describe(
        "Optional array of custom field values to set on the task. Each object must have an 'id' and 'value' property."
      ),
    check_required_custom_fields: z
      .boolean()
      .optional()
      .describe(
        'Optional flag to check if all required custom fields are set before saving the task.'
      ),
  },
  async (params) => {
    return (await handleCreateTask(params)) as Tool;
  }
);

server.tool(
  updateTaskTool.name,
  updateTaskTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of task to update (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of task to update. The tool will search for tasks with this name across all lists unless listName is specified.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'Optional: Name of list containing the task. Providing this narrows the search to a specific list, improving performance and reducing ambiguity.'
      ),
    name: z
      .string()
      .optional()
      .describe('New name for the task. Include emoji prefix if appropriate.'),
    description: z
      .string()
      .optional()
      .describe(
        'New plain text description. Will be ignored if markdown_description is provided.'
      ),
    markdown_description: z
      .string()
      .optional()
      .describe(
        'New markdown description. Takes precedence over plain text description.'
      ),
    status: z
      .string()
      .optional()
      .describe("New status. Must be valid for the task's current list."),
    priority: z
      .number()
      .optional()
      .describe(
        'New priority: 1 (urgent) to 4 (low). Set null to clear priority.'
      ),
    dueDate: z
      .string()
      .optional()
      .describe(
        "New due date. Supports both Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', 'next week', or '3 days from now'."
      ),
    startDate: z
      .string()
      .optional()
      .describe(
        'New start date. Supports both Unix timestamps (in milliseconds) and natural language expressions.'
      ),
    time_estimate: z
      .string()
      .optional()
      .describe(
        "Time estimate for the task. For best compatibility with the ClickUp API, use a numeric value in minutes (e.g., '150' for 2h 30m)"
      ),
    custom_fields: z
      .array(
        z.object({
          id: z.string().describe('ID of the custom field'),
          value: z
            .any()
            .describe(
              'Value for the custom field. Type depends on the field type.'
            ),
        })
      )
      .optional()
      .describe(
        "Optional array of custom field values to set on the task. Each object must have an 'id' and 'value' property."
      ),
  },
  async (params) => {
    return (await handleUpdateTask(params)) as Tool;
  }
);

server.tool(
  moveTaskTool.name,
  moveTaskTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of the task to move (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of the task to move. When using this, you MUST also provide sourceListName.'
      ),
    sourceListName: z
      .string()
      .optional()
      .describe('REQUIRED with taskName: Current list containing the task.'),
    listId: z
      .string()
      .optional()
      .describe(
        'ID of the destination list (preferred). Use this if you have the list ID from a previous response.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'Name of the destination list. Will be used to look up the list if listId is not provided.'
      ),
  },
  async (params) => {
    return (await handleMoveTask(params)) as Tool;
  }
);

server.tool(
  duplicateTaskTool.name,
  duplicateTaskTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of task to duplicate (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of task to duplicate. When using this, you MUST provide sourceListName.'
      ),
    sourceListName: z
      .string()
      .optional()
      .describe('REQUIRED with taskName: List containing the original task.'),
    listId: z
      .string()
      .optional()
      .describe(
        'ID of list for the duplicate (optional). Defaults to same list as original.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        "Name of list for the duplicate. Only use if you don't have listId."
      ),
  },
  async (params) => {
    return (await handleDuplicateTask(params)) as Tool;
  }
);

server.tool(
  deleteTaskTool.name,
  deleteTaskTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of task to delete (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of task to delete. The tool will search for tasks with this name across all lists unless listName is specified.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'Optional: Name of list containing the task. Providing this narrows the search to a specific list, improving performance and reducing ambiguity.'
      ),
  },
  async (params) => {
    return (await handleDeleteTask(params)) as Tool;
  }
);

server.tool(
  getTaskCommentsTool.name,
  getTaskCommentsTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of task to retrieve comments for (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of task to retrieve comments for. Warning: Task names may not be unique.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'Name of list containing the task. Helps find the right task when using taskName.'
      ),
    start: z
      .number()
      .optional()
      .describe(
        'Timestamp (in milliseconds) to start retrieving comments from. Used for pagination.'
      ),
    startId: z
      .string()
      .optional()
      .describe(
        'Comment ID to start from. Used together with start for pagination.'
      ),
  },
  async (params) => {
    return (await handleGetTaskComments(params)) as Tool;
  }
);

server.tool(
  createTaskCommentTool.name,
  createTaskCommentTool.description,
  {
    taskId: z
      .string()
      .optional()
      .describe(
        "ID of task to comment on (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      ),
    taskName: z
      .string()
      .optional()
      .describe(
        'Name of task to comment on. When using this parameter, you MUST also provide listName.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        'Name of list containing the task. REQUIRED when using taskName.'
      ),
    commentText: z
      .string()
      .describe('REQUIRED: Text content of the comment to create.'),
    notifyAll: z
      .boolean()
      .optional()
      .describe('Whether to notify all assignees. Default is false.'),
    assignee: z
      .number()
      .optional()
      .describe('Optional user ID to assign the comment to.'),
  },
  async (params) => {
    return (await handleCreateTaskComment(params)) as Tool;
  }
);

server.tool(
  attachTaskFileTool.name,
  attachTaskFileTool.description,
  {
    taskId: z.string().describe('ID of the task to attach the file to.'),
    filePath: z.string().describe('Path to the file to attach.'),
    fileName: z
      .string()
      .optional()
      .describe('Name of the file. Defaults to the original file name.'),
  },
  async (params) => {
    // Note: handleAttachTaskFile in server.ts might need adjustment
    // if it expects a different structure for file path/content in SSE context.
    // For now, assuming it can handle a file path.
    return (await handleAttachTaskFile(params)) as Tool;
  }
);

server.tool(
  createBulkTasksTool.name,
  createBulkTasksTool.description,
  {
    tasks: z
      .array(
        z.object({
          name: z.string().describe('Task name with emoji prefix'),
          description: z.string().optional().describe('Plain text description'),
          markdown_description: z
            .string()
            .optional()
            .describe('Markdown description (overrides plain text)'),
          status: z
            .string()
            .optional()
            .describe('Task status (uses list default if omitted)'),
          priority: z
            .number()
            .optional()
            .describe('Priority 1-4 (1=urgent, 4=low)'),
          dueDate: z
            .string()
            .optional()
            .describe(
              "Due date. Supports Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', 'next week', etc."
            ),
          tags: z
            .array(z.string())
            .optional()
            .describe(
              'Optional array of tag names to assign to the task. The tags must already exist in the space.'
            ),
          custom_fields: z
            .array(
              z.object({
                id: z.string().describe('ID of the custom field'),
                value: z
                  .any()
                  .describe(
                    'Value for the custom field. Type depends on the field type.'
                  ),
              })
            )
            .optional()
            .describe(
              'Optional array of custom field values to set on the task.'
            ),
        })
      )
      .describe(
        'Array of tasks to create. Each task must have at least a name.'
      ),
    listId: z
      .string()
      .optional()
      .describe(
        'ID of list for new tasks (preferred). Use this instead of listName if you have it.'
      ),
    listName: z
      .string()
      .optional()
      .describe(
        "Name of list for new tasks. Only use if you don't have listId."
      ),
    options: z
      .union([
        z
          .object({
            batchSize: z
              .number()
              .optional()
              .describe('Tasks per batch (default: 10)'),
            concurrency: z
              .number()
              .optional()
              .describe('Parallel operations (default: 3)'),
            continueOnError: z
              .boolean()
              .optional()
              .describe('Continue if some tasks fail'),
            retryCount: z
              .number()
              .optional()
              .describe('Retry attempts for failures'),
          })
          .optional(),
        z.string().optional(),
      ])
      .optional()
      .describe('Processing options (or JSON string representing options)'),
  },
  async (params) => {
    return (await handleCreateBulkTasks(params)) as Tool;
  }
);

server.tool(
  updateBulkTasksTool.name,
  updateBulkTasksTool.description,
  {
    tasks: z
      .array(
        z.object({
          taskId: z
            .string()
            .optional()
            .describe(
              "Task ID (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
            ),
          taskName: z
            .string()
            .optional()
            .describe('Task name. Requires listName when used.'),
          listName: z
            .string()
            .optional()
            .describe('REQUIRED with taskName: List containing the task.'),
          customTaskId: z
            .string()
            .optional()
            .describe(
              "Custom task ID (e.g., 'DEV-1234'). Only use if you want to explicitly force custom ID lookup. In most cases, use taskId which auto-detects ID format."
            ),
          name: z.string().optional().describe('New name with emoji prefix'),
          description: z
            .string()
            .optional()
            .describe('New plain text description'),
          markdown_description: z
            .string()
            .optional()
            .describe('New markdown description'),
          status: z.string().optional().describe('New status'),
          priority: z
            .number()
            .optional()
            .describe('New priority (1-4 or null)'),
          dueDate: z
            .string()
            .optional()
            .describe(
              "New due date. Supports Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', etc."
            ),
          custom_fields: z
            .array(
              z.object({
                id: z.string().describe('ID of the custom field'),
                value: z
                  .any()
                  .describe(
                    'Value for the custom field. Type depends on the field type.'
                  ),
              })
            )
            .optional()
            .describe(
              'Optional array of custom field values to set on the task.'
            ),
        })
      )
      .describe('Array of tasks to update'),
    options: z
      .union([
        z
          .object({
            batchSize: z
              .number()
              .optional()
              .describe('Tasks per batch (default: 10)'),
            concurrency: z
              .number()
              .optional()
              .describe('Parallel operations (default: 3)'),
            continueOnError: z
              .boolean()
              .optional()
              .describe('Continue if some tasks fail'),
            retryCount: z
              .number()
              .optional()
              .describe('Retry attempts for failures'),
          })
          .optional(),
        z.string().optional(),
      ])
      .optional()
      .describe('Processing options (or JSON string representing options)'),
  },
  async (params) => {
    return (await handleUpdateBulkTasks(params)) as Tool;
  }
);

server.tool(
  moveBulkTasksTool.name,
  moveBulkTasksTool.description,
  {
    tasks: z
      .array(
        z.object({
          taskId: z
            .string()
            .optional()
            .describe(
              "Task ID (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
            ),
          taskName: z
            .string()
            .optional()
            .describe('Task name. Requires listName when used.'),
          listName: z
            .string()
            .optional()
            .describe('REQUIRED with taskName: List containing the task.'),
          customTaskId: z
            .string()
            .optional()
            .describe(
              "Custom task ID (e.g., 'DEV-1234'). Only use if you want to explicitly force custom ID lookup. In most cases, use taskId which auto-detects ID format."
            ),
        })
      )
      .describe('Array of tasks to move'),
    targetListId: z
      .string()
      .optional()
      .describe(
        'ID of destination list (preferred). Use instead of targetListName if available.'
      ),
    targetListName: z
      .string()
      .optional()
      .describe(
        "Name of destination list. Only use if you don't have targetListId."
      ),
    options: z
      .union([
        z
          .object({
            batchSize: z
              .number()
              .optional()
              .describe('Tasks per batch (default: 10)'),
            concurrency: z
              .number()
              .optional()
              .describe('Parallel operations (default: 3)'),
            continueOnError: z
              .boolean()
              .optional()
              .describe('Continue if some tasks fail'),
            retryCount: z
              .number()
              .optional()
              .describe('Retry attempts for failures'),
          })
          .optional(),
        z.string().optional(),
      ])
      .optional()
      .describe('Processing options (or JSON string representing options)'),
  },
  async (params) => {
    return (await handleMoveBulkTasks(params)) as Tool;
  }
);

server.tool(
  deleteBulkTasksTool.name,
  deleteBulkTasksTool.description,
  {
    tasks: z
      .array(
        z.object({
          taskId: z
            .string()
            .optional()
            .describe(
              "Task ID (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
            ),
          taskName: z
            .string()
            .optional()
            .describe('Task name. Requires listName when used.'),
          listName: z
            .string()
            .optional()
            .describe('REQUIRED with taskName: List containing the task.'),
          customTaskId: z
            .string()
            .optional()
            .describe(
              "Custom task ID (e.g., 'DEV-1234'). Only use if you want to explicitly force custom ID lookup. In most cases, use taskId which auto-detects ID format."
            ),
        })
      )
      .describe('Array of tasks to delete'),
    options: z
      .union([
        z
          .object({
            batchSize: z
              .number()
              .optional()
              .describe('Tasks per batch (default: 10)'),
            concurrency: z
              .number()
              .optional()
              .describe('Parallel operations (default: 3)'),
            continueOnError: z
              .boolean()
              .optional()
              .describe('Continue if some tasks fail'),
            retryCount: z
              .number()
              .optional()
              .describe('Retry attempts for failures'),
          })
          .optional(),
        z.string().optional(),
      ])
      .optional()
      .describe('Processing options (or JSON string representing options)'),
  },
  async (params) => {
    return (await handleDeleteBulkTasks(params)) as Tool;
  }
);

server.tool(
  getWorkspaceTasksTool.name,
  getWorkspaceTasksTool.description,
  {
    tags: z
      .array(z.string())
      .optional()
      .describe(
        'Filter tasks by tag names. Only tasks with ALL specified tags will be returned.'
      ),
    list_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Filter tasks by list IDs. Narrows the search to specific lists.'
      ),
    folder_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Filter tasks by folder IDs. Narrows the search to specific folders.'
      ),
    space_ids: z
      .array(z.string())
      .optional()
      .describe(
        'Filter tasks by space IDs. Narrows the search to specific spaces.'
      ),
    statuses: z
      .array(z.string())
      .optional()
      .describe(
        "Filter tasks by status names (e.g., ['To Do', 'In Progress'])."
      ),
    assignees: z
      .array(z.string())
      .optional()
      .describe('Filter tasks by assignee IDs.'),
    date_created_gt: z
      .number()
      .optional()
      .describe('Filter for tasks created after this timestamp.'),
    date_created_lt: z
      .number()
      .optional()
      .describe('Filter for tasks created before this timestamp.'),
    date_updated_gt: z
      .number()
      .optional()
      .describe('Filter for tasks updated after this timestamp.'),
    date_updated_lt: z
      .number()
      .optional()
      .describe('Filter for tasks updated before this timestamp.'),
    due_date_gt: z
      .number()
      .optional()
      .describe('Filter for tasks with due date greater than this timestamp.'),
    due_date_lt: z
      .number()
      .optional()
      .describe('Filter for tasks with due date less than this timestamp.'),
    include_closed: z
      .boolean()
      .optional()
      .describe('Include closed tasks in the results.'),
    include_archived_lists: z
      .boolean()
      .optional()
      .describe('Include tasks from archived lists.'),
    include_closed_lists: z
      .boolean()
      .optional()
      .describe('Include tasks from closed lists.'),
    archived: z
      .boolean()
      .optional()
      .describe('Include archived tasks in the results.'),
    order_by: z
      .string()
      .optional()
      .describe('Sort field for ordering results.'),
    reverse: z
      .boolean()
      .optional()
      .describe('Reverse sort order (descending).'),
    page: z
      .number()
      .optional()
      .describe('Page number for pagination (0-based).'),
    detail_level: z
      .string()
      .optional()
      .describe(
        'Level of detail to return. Use summary for lightweight responses or detailed for full task data. If not specified, defaults to "detailed".'
      ),
  },
  async (params) => {
    return (await handleGetWorkspaceTasks(params)) as Tool;
  }
);

server.tool(
  getTaskTimeEntriesTool.name,
  getTaskTimeEntriesTool.description,
  {
    taskId: z.string().describe('ID of the task to get time entries for.'),
    startDate: z
      .string()
      .optional()
      .describe('Filter time entries starting after this date (YYYY-MM-DD).'),
    endDate: z
      .string()
      .optional()
      .describe('Filter time entries ending before this date (YYYY-MM-DD).'),
    assignee: z.string().optional().describe('Filter time entries by user ID.'),
  },
  async (params) => {
    return (await handleGetTaskTimeEntries(params)) as Tool;
  }
);

server.tool(
  startTimeTrackingTool.name,
  startTimeTrackingTool.description,
  {
    taskId: z.string().describe('ID of the task to start time tracking for.'),
    assignee: z
      .string()
      .optional()
      .describe(
        'User ID to start time tracking for. Defaults to the authenticated user.'
      ),
  },
  async (params) => {
    return (await handleStartTimeTracking(params)) as Tool;
  }
);

server.tool(
  stopTimeTrackingTool.name,
  stopTimeTrackingTool.description,
  {
    assignee: z
      .string()
      .optional()
      .describe(
        'User ID to stop time tracking for. Defaults to the authenticated user.'
      ),
  },
  async (params) => {
    return (await handleStopTimeTracking(params)) as Tool;
  }
);

server.tool(
  addTimeEntryTool.name,
  addTimeEntryTool.description,
  {
    taskId: z.string().describe('ID of the task to add time entry to.'),
    duration: z
      .number()
      .describe('Duration of the time entry in milliseconds.'),
    description: z
      .string()
      .optional()
      .describe('Description of the time entry.'),
    start: z
      .string()
      .optional()
      .describe('Start time of the entry (Unix timestamp in milliseconds).'),
    end: z
      .string()
      .optional()
      .describe('End time of the entry (Unix timestamp in milliseconds).'),
    assignee: z
      .string()
      .optional()
      .describe(
        'User ID for the time entry. Defaults to the authenticated user.'
      ),
    billable: z
      .boolean()
      .optional()
      .describe('Whether the time entry is billable.'),
  },
  async (params) => {
    return (await handleAddTimeEntry(params)) as Tool;
  }
);

server.tool(
  deleteTimeEntryTool.name,
  deleteTimeEntryTool.description,
  {
    timeEntryId: z.string().describe('ID of the time entry to delete.'),
  },
  async (params) => {
    return (await handleDeleteTimeEntry(params)) as Tool;
  }
);

server.tool(
  getCurrentTimeEntryTool.name,
  getCurrentTimeEntryTool.description,
  {
    assignee: z
      .string()
      .optional()
      .describe(
        'User ID to get current time entry for. Defaults to the authenticated user.'
      ),
  },
  async (params) => {
    return (await handleGetCurrentTimeEntry(params)) as Tool;
  }
);

server.tool(
  createListTool.name,
  createListTool.description,
  {
    spaceId: z.string().describe('ID of the space to create the list in.'),
    listName: z.string().describe('Name of the list to create.'),
    status: z.string().optional().describe('Status for the list.'),
    priority: z.number().optional().describe('Priority for the list.'),
    dueDate: z
      .string()
      .optional()
      .describe('Due date for the list (YYYY-MM-DD).'),
  },
  async (params) => {
    return (await handleCreateList(params)) as Tool;
  }
);

server.tool(
  createListInFolderTool.name,
  createListInFolderTool.description,
  {
    folderId: z.string().describe('ID of the folder to create the list in.'),
    listName: z.string().describe('Name of the list to create.'),
    status: z.string().optional().describe('Status for the list.'),
    priority: z.number().optional().describe('Priority for the list.'),
    dueDate: z
      .string()
      .optional()
      .describe('Due date for the list (YYYY-MM-DD).'),
  },
  async (params) => {
    return (await handleCreateListInFolder(params)) as Tool;
  }
);

server.tool(
  getListTool.name,
  getListTool.description,
  {
    listId: z.string().describe('ID of the list to retrieve.'),
  },
  async (params) => {
    return (await handleGetList(params)) as Tool;
  }
);

server.tool(
  updateListTool.name,
  updateListTool.description,
  {
    listId: z.string().describe('ID of the list to update.'),
    listName: z.string().optional().describe('New name for the list.'),
    status: z.string().optional().describe('New status for the list.'),
    priority: z.number().optional().describe('New priority for the list.'),
    dueDate: z
      .string()
      .optional()
      .describe('New due date for the list (YYYY-MM-DD).'),
    unsetStatus: z
      .boolean()
      .optional()
      .describe('Set to true to remove the status from the list.'),
  },
  async (params) => {
    return (await handleUpdateList(params)) as Tool;
  }
);

server.tool(
  deleteListTool.name,
  deleteListTool.description,
  {
    listId: z.string().describe('ID of the list to delete.'),
  },
  async (params) => {
    return (await handleDeleteList(params)) as Tool;
  }
);

server.tool(
  createFolderTool.name,
  createFolderTool.description,
  {
    spaceId: z.string().describe('ID of the space to create the folder in.'),
    folderName: z.string().describe('Name of the folder to create.'),
  },
  async (params) => {
    return (await handleCreateFolder(params)) as Tool;
  }
);

server.tool(
  getFolderTool.name,
  getFolderTool.description,
  {
    folderId: z.string().describe('ID of the folder to retrieve.'),
  },
  async (params) => {
    return (await handleGetFolder(params)) as Tool;
  }
);

server.tool(
  updateFolderTool.name,
  updateFolderTool.description,
  {
    folderId: z.string().describe('ID of the folder to update.'),
    folderName: z.string().optional().describe('New name for the folder.'),
  },
  async (params) => {
    return (await handleUpdateFolder(params)) as Tool;
  }
);

server.tool(
  deleteFolderTool.name,
  deleteFolderTool.description,
  {
    folderId: z.string().describe('ID of the folder to delete.'),
  },
  async (params) => {
    return (await handleDeleteFolder(params)) as Tool;
  }
);

server.tool(
  getSpaceTagsTool.name,
  getSpaceTagsTool.description,
  {
    spaceId: z.string().describe('ID of the space to get tags from.'),
  },
  async (params) => {
    return (await handleGetSpaceTags(params)) as Tool;
  }
);

server.tool(
  addTagToTaskTool.name,
  addTagToTaskTool.description,
  {
    taskId: z.string().describe('ID of the task to add the tag to.'),
    tagName: z.string().describe('Name of the tag to add.'),
  },
  async (params) => {
    return (await handleAddTagToTask(params)) as Tool;
  }
);

server.tool(
  removeTagFromTaskTool.name,
  removeTagFromTaskTool.description,
  {
    taskId: z.string().describe('ID of the task to remove the tag from.'),
    tagName: z.string().describe('Name of the tag to remove.'),
  },
  async (params) => {
    return (await handleRemoveTagFromTask(params)) as Tool;
  }
);

server.tool(
  createDocumentTool.name,
  createDocumentTool.description,
  {
    spaceId: z.string().describe('ID of the space to create the document in.'),
    name: z.string().describe('Name of the document.'),
    content: z.string().optional().describe('Initial content of the document.'),
    parentType: z
      .enum(['list', 'folder', 'space'])
      .optional()
      .describe('Type of the parent entity.'),
    parentId: z.string().optional().describe('ID of the parent entity.'),
  },
  async (params) => {
    return (await handleCreateDocument(params)) as Tool;
  }
);

server.tool(
  getDocumentTool.name,
  getDocumentTool.description,
  {
    documentId: z.string().describe('ID of the document to retrieve.'),
  },
  async (params) => {
    return (await handleGetDocument(params)) as Tool;
  }
);

server.tool(
  listDocumentsTool.name,
  listDocumentsTool.description,
  {
    spaceId: z
      .string()
      .optional()
      .describe(
        'ID of the space to list documents from. Defaults to all accessible documents.'
      ),
    includeArchived: z
      .boolean()
      .optional()
      .describe('Include archived documents.'),
  },
  async (params) => {
    return (await handleListDocuments(params)) as Tool;
  }
);

server.tool(
  listDocumentPagesTool.name,
  listDocumentPagesTool.description,
  {
    documentId: z.string().describe('ID of the document to list pages from.'),
  },
  async (params) => {
    return (await handleListDocumentPages(params)) as Tool;
  }
);

server.tool(
  getDocumentPagesTool.name,
  getDocumentPagesTool.description,
  {
    documentId: z.string().describe('ID of the document to get pages from.'),
    pageIds: z
      .array(z.string())
      .optional()
      .describe(
        'Array of page IDs to retrieve. If not provided, all pages are retrieved.'
      ),
  },
  async (params) => {
    return (await handleGetDocumentPages(params)) as Tool;
  }
);

server.tool(
  createDocumentPageTool.name,
  createDocumentPageTool.description,
  {
    documentId: z.string().describe('ID of the document to add the page to.'),
    title: z.string().describe('Title of the new page.'),
    content: z.string().optional().describe('Content of the new page.'),
    orderIndex: z
      .number()
      .optional()
      .describe('Order index of the page within the document.'),
  },
  async (params) => {
    return (await handleCreateDocumentPage(params)) as Tool;
  }
);

server.tool(
  updateDocumentPageTool.name,
  updateDocumentPageTool.description,
  {
    pageId: z.string().describe('ID of the page to update.'),
    title: z.string().optional().describe('New title for the page.'),
    content: z.string().optional().describe('New content for the page.'),
    orderIndex: z.number().optional().describe('New order index for the page.'),
  },
  async (params) => {
    return (await handleUpdateDocumentPage(params)) as Tool;
  }
);

export function startSSEServer() {
  const transports = {
    streamable: {} as Record<string, StreamableHTTPServerTransport>,
    sse: {} as Record<string, SSEServerTransport>,
  };

  app.get('/sse', async (req, res) => {
    const transport = new SSEServerTransport('/messages', res);
    transports.sse[transport.sessionId] = transport;

    console.log(
      `New SSE connection established with sessionId: ${transport.sessionId}`
    );

    res.on('close', () => {
      delete transports.sse[transport.sessionId];
    });

    await server.connect(transport);
  });

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.sse[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  const PORT = Number(configuration.port ?? '3231');
  app.listen(PORT, () => {
    console.log(`Connect to sse with http://localhost:${PORT}/sse`);
  });
}
