#!/usr/bin/env node

/**
 * GIMS MCP Server
 * 
 * Exposes GIMS capabilities as Model Context Protocol (MCP) tools.
 * Usage: node mcp/index.js
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { tools } = require('../bin/lib/ai/interface');

// Create the server
const server = new Server(
    {
        name: "gims-mcp-server",
        version: require('../package.json').version,
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        })),
    };
});

/**
 * Handler for calling tools
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const toolArgs = request.params.arguments;

    const tool = tools.find((t) => t.name === toolName);

    if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
        const result = await tool.handler(toolArgs);

        // MCP expects content to be an array of text/image objects
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error executing ${toolName}: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

/**
 * Start the server
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GIMS MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
