/**
 * CodeInterpreter Strands ツール定義
 */

import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { logger } from '../../config/index.js';
import { AgentCoreCodeInterpreterClient } from './client.js';
import type {
  InitSessionAction,
  ExecuteCodeAction,
  ExecuteCommandAction,
  ReadFilesAction,
  ListFilesAction,
  RemoveFilesAction,
  WriteFilesAction,
  DownloadFilesAction,
} from './types.js';

/**
 * ファイルコンテンツのスキーマ
 */
const fileContentSchema = z.object({
  path: z.string().describe('File path'),
  text: z.string().describe('File content'),
});

/**
 * CodeInterpreter ツールのスキーマ定義
 * Bedrock API互換のためz.object()形式を使用
 */
const codeInterpreterSchema = z.object({
  // アクション種別（必須）
  action: z
    .enum([
      'initSession',
      'executeCode',
      'executeCommand',
      'readFiles',
      'listFiles',
      'removeFiles',
      'writeFiles',
      'downloadFiles',
      'listLocalSessions',
    ])
    .describe(
      'The operation type to perform. Must be one of: initSession (create new session), executeCode (run code), executeCommand (run shell command), readFiles (read file contents), listFiles (list directory), removeFiles (delete files), writeFiles (create/update files), downloadFiles (download to local), listLocalSessions (list all sessions)'
    ),

  // 共通パラメータ
  sessionName: z
    .string()
    .optional()
    .describe(
      'Session name for persistent code execution environment. Auto-generated if omitted. Not used for listLocalSessions action.'
    ),

  // initSession 専用
  description: z
    .string()
    .optional()
    .describe(
      'Session description (REQUIRED for initSession action). Describes the purpose of this code execution session.'
    ),

  // executeCode 専用
  language: z
    .enum(['python', 'javascript', 'typescript'])
    .optional()
    .describe(
      'Programming language (REQUIRED for executeCode action). Supported languages: python (with data science packages), javascript (Node.js), typescript (Node.js with TypeScript support)'
    ),
  code: z
    .string()
    .optional()
    .describe(
      'Source code to execute (REQUIRED for executeCode action). Can be multi-line code with full program logic.'
    ),
  clearContext: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Clear session context before execution (optional for executeCode). Set to true to start with fresh environment, false to preserve variables and state.'
    ),

  // executeCommand 専用
  command: z
    .string()
    .optional()
    .describe(
      'Shell command to execute (REQUIRED for executeCommand action). Can include pipes, redirects, and command chaining.'
    ),

  // readFiles / removeFiles 共通
  paths: z
    .array(z.string())
    .optional()
    .describe(
      'Array of file paths (REQUIRED for readFiles and removeFiles actions). Paths are relative to session working directory.'
    ),

  // listFiles 専用
  path: z
    .string()
    .optional()
    .describe(
      'Directory path to list (REQUIRED for listFiles action). Use "/" for root of sandbox, or relative paths.'
    ),

  // writeFiles 専用
  content: z
    .array(fileContentSchema)
    .optional()
    .describe(
      'Array of file objects with path and text properties (REQUIRED for writeFiles action). Each object must have {path: string, text: string}. Creates or overwrites files.'
    ),

  // downloadFiles 専用
  sourcePaths: z
    .array(z.string())
    .optional()
    .describe(
      'Array of source file paths in sandbox (REQUIRED for downloadFiles action). Files to download from the code execution environment.'
    ),
  destinationDir: z
    .string()
    .optional()
    .describe(
      'Absolute local filesystem path for downloads (REQUIRED for downloadFiles action). Must be an absolute path like /tmp/downloads or /Users/username/downloads.'
    ),
});

/**
 * CodeInterpreter Tool
 */
export const codeInterpreterTool = tool({
  name: 'code_interpreter',
  description: `Code Interpreter tool for executing code in isolated sandbox environments.

This tool provides a comprehensive code execution platform that supports multiple programming languages with persistent session management, file operations, and shell command execution. Built on Amazon Bedrock AgentCore Code Sandbox, it offers secure, isolated environments for code execution with full lifecycle management.

KEY FEATURES:

1. Multi-Language Support:
   • Python: Full standard library + data science packages (pandas, numpy, matplotlib, etc.)
   • JavaScript/TypeScript: Node.js runtime with common packages
   • Shell commands: Execute system commands and scripts

2. Session Management:
   • Create named, persistent sessions for stateful code execution
   • Automatic session creation when session_name is omitted
   • Session isolation for security and resource separation
   • Sessions persist across multiple tool calls

3. File System Operations:
   • Read, write, list, and remove files in the sandbox
   • Multi-file operations in a single request
   • Download files from sandbox to local filesystem

4. Advanced Execution:
   • Context preservation across executions within sessions
   • Optional context clearing for fresh environments
   • Real-time output capture and error handling
   • Support for long-running processes (up to 8 hours)

OPERATION TYPES:

1. initSession - Create a new isolated code execution session
   Required: description
   Optional: session_name (auto-generated if omitted)

2. executeCode - Run code in a specified programming language
   Required: language, code
   Optional: session_name, clearContext
   Languages: python | javascript | typescript

3. executeCommand - Execute shell commands in the sandbox
   Required: command
   Optional: session_name

4. readFiles - Read file contents from the sandbox
   Required: paths (array of file paths)
   Optional: session_name

5. writeFiles - Create or update files in the sandbox
   Required: content (array of {path, text} objects)
   Optional: session_name

6. listFiles - Browse directory contents
   Required: path (directory to list)
   Optional: session_name

7. removeFiles - Delete files from the sandbox
   Required: paths (array of file paths)
   Optional: session_name

8. downloadFiles - Download files to local filesystem
   Required: sourcePaths (array), destinationDir (absolute path)
   Optional: session_name

9. listLocalSessions - View all active sessions

COMMON USAGE SCENARIOS:

✓ Data Analysis: Execute Python for data processing and visualization
✓ Web Development: Run JavaScript/TypeScript for frontend/backend tasks
✓ System Administration: Execute shell commands for environment setup
✓ File Processing: Read, transform, and write files programmatically
✓ API Testing: Run code to test external services
✓ Educational Coding: Provide safe learning environments

USAGE PATTERNS:

GOOD Pattern - Simple one-off execution (no session management needed):
{
  "action": "executeCode",
  "language": "python",
  "code": "print('Hello World')"
}

GOOD Pattern - Multi-step workflow with named session:
Step 1: Create session
{
  "action": "initSession",
  "sessionName": "data-analysis",
  "description": "Customer data analysis"
}

Step 2: Upload data
{
  "action": "writeFiles",
  "sessionName": "data-analysis",
  "content": [
    {"path": "data.csv", "text": "id,name,value\\n1,Alice,100"}
  ]
}

Step 3: Process data
{
  "action": "executeCode",
  "sessionName": "data-analysis",
  "language": "python",
  "code": "import pandas as pd\\ndf = pd.read_csv('data.csv')\\nprint(df.describe())"
}

Step 4: Download results
{
  "action": "downloadFiles",
  "sessionName": "data-analysis",
  "sourcePaths": ["results.png", "summary.csv"],
  "destinationDir": "/tmp/analysis-results"
}

GOOD Pattern - Data visualization workflow:
{
  "action": "executeCode",
  "language": "python",
  "code": "import matplotlib.pyplot as plt\\nimport numpy as np\\n\\nx = np.linspace(0, 10, 100)\\ny = np.sin(x)\\n\\nplt.figure(figsize=(10, 6))\\nplt.plot(x, y)\\nplt.title('Sin Wave')\\nplt.savefig('plot.png')\\nprint('Plot saved')"
}

GOOD Pattern - Environment setup with shell commands:
{
  "action": "executeCommand",
  "command": "pip install requests && python -c \\"import requests; print(requests.__version__)\\""
}

BAD Pattern - Forgetting to specify required action:
{
  "language": "python",
  "code": "print('test')"
}
→ Error: Missing required 'action' field

BAD Pattern - Using invalid language:
{
  "action": "executeCode",
  "language": "ruby",
  "code": "puts 'test'"
}
→ Error: Invalid language. Must be: python, javascript, or typescript

BAD Pattern - Relative path for download destination:
{
  "action": "downloadFiles",
  "sourcePaths": ["file.txt"],
  "destinationDir": "./downloads"
}
→ Error: destinationDir must be absolute path

BAD Pattern - Forgetting paths array for file operations:
{
  "action": "readFiles",
  "path": "file.txt"
}
→ Error: 'paths' must be an array, not a string

IMPORTANT NOTES:

• Session names must be unique per user/conversation for proper isolation
• Context is preserved within sessions unless clearContext=true
• File paths in sandbox are relative to session working directory (/)
• Downloaded files use absolute local paths
• Shell commands execute in bash environment
• Maximum file size: 100MB inline, 5GB via S3
• Session timeout: 15 minutes default, up to 8 hours maximum

TIPS FOR BEST RESULTS:

1. Use descriptive session names for complex workflows
2. Clear context when starting fresh analysis in same session
3. Check file existence before reading with listFiles
4. Use writeFiles to prepare data before code execution
5. Download important results before session cleanup
6. Handle errors gracefully - check status field in responses
7. Use shell commands for system operations (pip install, etc.)`,
  inputSchema: codeInterpreterSchema,
  callback: async (input: z.infer<typeof codeInterpreterSchema>) => {
    logger.info(`🧮 CodeInterpreter実行開始: ${input.action}`);

    try {
      // クライアントを作成（デフォルト設定）
      const client = new AgentCoreCodeInterpreterClient({
        autoCreate: true,
        persistSessions: true,
      });

      // アクション別に処理を分岐
      let result;
      switch (input.action) {
        case 'initSession': {
          result = await client.initSession(input as InitSessionAction);
          break;
        }

        case 'executeCode': {
          result = await client.executeCode(input as ExecuteCodeAction);
          break;
        }

        case 'executeCommand': {
          result = await client.executeCommand(input as ExecuteCommandAction);
          break;
        }

        case 'readFiles': {
          result = await client.readFiles(input as ReadFilesAction);
          break;
        }

        case 'listFiles': {
          result = await client.listFiles(input as ListFilesAction);
          break;
        }

        case 'removeFiles': {
          result = await client.removeFiles(input as RemoveFilesAction);
          break;
        }

        case 'writeFiles': {
          result = await client.writeFiles(input as WriteFilesAction);
          break;
        }

        case 'downloadFiles': {
          result = await client.downloadFiles(input as DownloadFilesAction);
          break;
        }

        case 'listLocalSessions': {
          result = client.listLocalSessions();
          break;
        }

        default: {
          // TypeScriptの網羅性チェック
          const exhaustiveCheck: never = input.action;
          throw new Error(`Unknown action: ${exhaustiveCheck}`);
        }
      }

      // 結果をフォーマット
      if (result.status === 'success') {
        logger.info(`✅ CodeInterpreter実行成功: ${input.action}`);

        // コンテンツを適切にフォーマット
        const content = result.content[0];
        if (content.json) {
          return `実行結果:\n操作: ${input.action}\n結果: ${JSON.stringify(content.json, null, 2)}`;
        } else if (content.text) {
          return `実行結果:\n操作: ${input.action}\n出力:\n${content.text}`;
        } else {
          return `実行結果:\n操作: ${input.action}\n結果: ${JSON.stringify(content)}`;
        }
      } else {
        logger.error(`❌ CodeInterpreter実行エラー: ${input.action}`);
        const errorText = result.content[0]?.text || JSON.stringify(result.content);
        return `実行エラー:\n操作: ${input.action}\nエラー: ${errorText}`;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ CodeInterpreter予期しないエラー: ${input.action}`, errorMessage);
      return `予期しないエラーが発生しました:\n操作: ${input.action}\nエラー: ${errorMessage}`;
    }
  },
});
