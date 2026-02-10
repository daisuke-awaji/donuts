import { z } from 'zod';
import { zodToJsonSchema } from '../utils/schema-converter.js';
import type { ToolDefinition } from '../types.js';

const statisticalAnalysisSchema = z.object({
  action: z
    .enum(['descriptive_stats', 't_test'])
    .describe(
      'The statistical analysis method to perform. Must be one of: descriptive_stats (compute summary statistics for numeric columns), t_test (compare means between two groups or paired observations)'
    ),

  filePath: z
    .string()
    .describe(
      'Absolute path to the data file to analyze. Supported formats: CSV (.csv, .tsv) and Excel (.xlsx, .xls). The file must exist on the local filesystem (e.g., /tmp/ws/data.csv or /tmp/ws/report.xlsx). The file must have a header row with column names.'
    ),

  // For descriptive_stats
  columns: z
    .array(z.string())
    .optional()
    .describe(
      'Array of column names to analyze (optional for descriptive_stats). If omitted, all numeric columns will be analyzed. Each name must match a CSV header exactly.'
    ),

  groupBy: z
    .string()
    .optional()
    .describe(
      'Column name to group data by (optional for descriptive_stats). When specified, statistics are computed separately for each unique value in this column.'
    ),

  // For t_test
  variable: z
    .string()
    .optional()
    .describe(
      'The numeric column to test (REQUIRED for t_test). This is the measurement variable whose means will be compared between groups.'
    ),

  groupByColumn: z
    .string()
    .optional()
    .describe(
      'Column name that defines the two groups (REQUIRED for independent t_test). Must contain exactly 2 unique values. Not used for paired t_test.'
    ),

  paired: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to perform a paired t-test (optional for t_test, default: false). For paired tests, data must have equal-length groups with matched observations.'
    ),

  alternative: z
    .enum(['two-sided', 'less', 'greater'])
    .optional()
    .default('two-sided')
    .describe(
      'Alternative hypothesis direction (optional for t_test, default: "two-sided"). "less" = group1 mean < group2 mean, "greater" = group1 mean > group2 mean.'
    ),

  sheetName: z
    .string()
    .optional()
    .describe(
      'Sheet name to read from Excel files (optional). Only used for .xlsx and .xls files. If omitted, the first sheet is used. Ignored for CSV files.'
    ),
});

export const statisticalAnalysisDefinition: ToolDefinition<typeof statisticalAnalysisSchema> = {
  name: 'statistical_analysis',
  description: `Statistical Analysis tool for performing deterministic, reproducible statistical tests on CSV and Excel data files.

This tool reads data directly from files on the filesystem — the AI agent specifies ONLY the file path, column names, and analysis parameters. The actual data is never passed through the AI, eliminating hallucination risk and ensuring reproducibility.

KEY FEATURES:

1. Multi-Format File Input:
   • CSV files (.csv, .tsv): parsed with automatic delimiter detection
   • Excel files (.xlsx, .xls): parsed via SheetJS, first sheet by default (use sheetName to select)
   • Automatic header detection, type inference (numeric vs categorical)
   • Missing value detection and reporting
   • Supports up to 100,000 rows and 50MB file size

2. Deterministic Results:
   • Same input file + same parameters = identical output every time
   • No AI-generated data — all values come directly from the CSV
   • Structured output with p-values, confidence intervals, effect sizes

AVAILABLE METHODS:

1. descriptive_stats — Summary Statistics
   Required: filePath
   Optional: columns (default: all numeric), groupBy
   Output: count, mean, std, min, Q1, median, Q3, max, skewness, kurtosis, missing count
   Use when: You need to understand data distribution, detect outliers, or get an overview

2. t_test — Student's t-Test (Independent or Paired)
   Required: filePath, variable, groupByColumn (for independent test)
   Optional: paired (default: false), alternative (default: "two-sided")
   Output: t-statistic, p-value, degrees of freedom, Cohen's d (effect size),
           95% confidence interval, Levene's test for equal variances,
           group means and standard deviations
   Use when: Comparing means between two groups (A/B test, treatment vs control)

DATA REQUIREMENTS:

• File must have a header row as the first line (first row in Excel, first line in CSV)
• Supported formats: .csv, .tsv, .xlsx, .xls
• Numeric columns: values parseable as numbers (empty cells treated as missing)
• Categorical columns: string values used for grouping
• Missing values: empty cells, "NA", "NaN", "null", "" are treated as missing
• CSV encoding: UTF-8 (BOM-tolerant)
• Excel: first sheet is used by default; specify sheetName for multi-sheet workbooks

RESULT FORMAT:

Every result includes:
• dataInfo: file path, total rows, used rows, excluded rows
• summary: human-readable result summary
• details: structured numeric results for further processing
• diagnostics: warnings (small sample size, high missing rate, etc.)
• interpretation: statistical interpretation guidance

USAGE PATTERNS:

GOOD — Get data overview (CSV):
{
  "action": "descriptive_stats",
  "filePath": "/tmp/ws/sales_data.csv"
}

GOOD — Get data overview (Excel):
{
  "action": "descriptive_stats",
  "filePath": "/tmp/ws/report.xlsx"
}

GOOD — Read specific Excel sheet:
{
  "action": "descriptive_stats",
  "filePath": "/tmp/ws/report.xlsx",
  "sheetName": "Q4 Sales"
}

GOOD — Compare groups with specific columns:
{
  "action": "descriptive_stats",
  "filePath": "/tmp/ws/experiment.csv",
  "columns": ["score", "duration"],
  "groupBy": "treatment_group"
}

GOOD — A/B test analysis:
{
  "action": "t_test",
  "filePath": "/tmp/ws/ab_test.csv",
  "variable": "conversion_rate",
  "groupByColumn": "variant"
}

GOOD — One-sided test:
{
  "action": "t_test",
  "filePath": "/tmp/ws/experiment.csv",
  "variable": "score",
  "groupByColumn": "group",
  "alternative": "greater"
}

BAD — Missing filePath:
{
  "action": "descriptive_stats",
  "columns": ["age", "income"]
}
→ Error: filePath is required

BAD — t_test without variable:
{
  "action": "t_test",
  "filePath": "/tmp/ws/data.csv",
  "groupByColumn": "group"
}
→ Error: variable is required for t_test

IMPORTANT NOTES:

• Always verify the data file exists before calling this tool (use file_editor or s3_list_files)
• Supported formats: .csv, .tsv, .xlsx, .xls
• Column names are case-sensitive and must match headers exactly
• For Excel files with multiple sheets, use sheetName to select the target sheet
• For t_test, the groupByColumn must contain exactly 2 unique non-missing values
• Results include automatic diagnostic warnings for common issues
• Large files (>10,000 rows) may take a few seconds to process`,
  zodSchema: statisticalAnalysisSchema,
  jsonSchema: zodToJsonSchema(statisticalAnalysisSchema),
};
