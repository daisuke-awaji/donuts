import path from "path";

/**
 * Validates that a target path is within a base directory to prevent path traversal attacks.
 * 
 * @param basePath - The base directory that should contain the target path
 * @param targetPath - The path to validate (can be relative or absolute)
 * @returns The resolved absolute path if valid
 * @throws Error if the target path is outside the base directory
 * 
 * @example
 * ```typescript
 * // Valid path
 * validatePathWithinBase('/app/workspace', 'files/document.txt')
 * // Returns: '/app/workspace/files/document.txt'
 * 
 * // Invalid path (traversal attempt)
 * validatePathWithinBase('/app/workspace', '../../../etc/passwd')
 * // Throws: Error
 * ```
 */
export function validatePathWithinBase(
  basePath: string,
  targetPath: string
): string {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(basePath, targetPath);

  // Ensure the resolved target starts with the base path
  // Add path.sep to prevent false positives like:
  // base: /app/work, target: /app/workspace (would pass without sep check)
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error(
      `Path traversal detected: "${targetPath}" resolves outside base directory "${basePath}"`
    );
  }

  return resolvedTarget;
}

/**
 * Sanitizes a filename by removing path separators and dangerous characters.
 * Useful for file uploads or user-provided filenames.
 * 
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for filesystem operations
 * 
 * @example
 * ```typescript
 * sanitizeFilename('../../../etc/passwd') // Returns: 'etcpasswd'
 * sanitizeFilename('my file.txt') // Returns: 'my file.txt'
 * ```
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[/\\]/g, "") // Remove path separators
    .replace(/\.\./g, "") // Remove parent directory references
    .replace(/^\.+/, "") // Remove leading dots
    .trim();
}
