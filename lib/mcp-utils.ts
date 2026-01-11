/**
 * Utility functions for working with MCP tools
 */

export async function use_mcp_tool(args: {
  server_name: string;
  tool_name: string;
  arguments: Record<string, any>;
}) {
  // This is a placeholder - in a real implementation, this would call the MCP tool
  // For now, we'll use the global use_mcp_tool function that's available in the environment
  // @ts-ignore - Global function provided by MCP environment
  return await global.use_mcp_tool(args);
}