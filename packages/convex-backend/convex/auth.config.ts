const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
const mcpIssuer = process.env.WISH_MCP_JWT_ISSUER;
const mcpJwks = process.env.WISH_MCP_JWKS;

if (!clerkJwtIssuerDomain) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN is required");
}

export default {
  providers: [
    {
      // Replace with your own Clerk Issuer URL from your "convex" JWT template
      // or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
      // and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
    ...(mcpIssuer && mcpJwks
      ? [
          {
            type: "customJwt" as const,
            issuer: mcpIssuer,
            applicationID: "wish-mcp",
            jwks: `data:application/json;base64,${btoa(mcpJwks)}`,
            algorithm: "ES256" as const,
          },
        ]
      : []),
  ],
};
