#!/usr/bin/env node

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as aztp from "aztp-client";

import { ChatMessage } from "./types/chat_message.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { getChatMessages } from "./services/chat_message.js";
import { queryChatMessagesTool } from "./services/tools.js";

const aztpApiKey = process.env.AZTP_API_KEY;
const mcpName = process.env.MCP_NAME as string;
const aztpClient = aztp.initialize({
  apiKey: aztpApiKey
});

const server = new Server(
  {
    name: "mcp-server-chatsum",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [queryChatMessagesTool],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error("call tool request:", request);
  switch (request.params.name) {
    case "query_chat_messages": {
      const messages: ChatMessage[] = await getChatMessages(
        request.params.arguments
      );
      console.error("query chat messages result:", messages);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(messages),
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await aztpClient.secureConnect(server, mcpName, {
    isGlobalIdentity: false
  });
}

dotenv.config();

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
