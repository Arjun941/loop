/**
 * POST /api/mcp — Loop's MCP server (Streamable HTTP), for LLM clients like Claude.
 * Authenticate with an API key from Settings → API: `Authorization: Bearer loop_sk_…`.
 */
import { registerTools } from "@/server/mcp/tools";
import { verifyApiKey } from "@/server/mcp/keys";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "loop-billing", version: "1.0.0" },
  instructions:
    "Loop runs this business's subscription billing. Amounts are in INR. Look things up before changing them: get_subscription and get_invoice list the actions allowed right now. preview_billing is a safe dry run; run_billing never bills a period twice.",
});

const authed = withMcpAuth(
  handler,
  async (_req, token) => {
    if (!token) return undefined;
    const user = await verifyApiKey(token);
    if (!user) return undefined;
    return { token, clientId: user.keyId, scopes: [user.role], extra: { user } };
  },
  { required: true },
);

export { authed as DELETE, authed as GET, authed as POST };
