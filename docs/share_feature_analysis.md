# Feasibility Analysis: Shareable Memories URL

## 1. Feasibility Verdict: **Highly Feasible**
You can absolutely achieve this on Vercel. There are two primary architectural approaches to implement the "Upload -> Generate URL -> Share" workflow.

## Option A: The "Serverless" URL (Recommended for Simplicity)
**Concept**: Encode the list of Photo IDs/URLs directly into the share link.
*   **Mechanism**: `myapp.com/?data=eyJwaG90b3MiOlWy...` (Base64 encoded JSON)
*   **Pros**:
    *   **Zero Database**: No need to set up Redis/SQL.
    *   **Zero Cost**: Free forever.
    *   **Instant**: Works immediately in your current codebase.
    *   **Permanent**: The link never expires (because the data is *in* the link).
*   **Cons**:
    *   **Long URLs**: With 5 photos, the URL might be 300-500 characters long. (Can be solved by using a free URL shortener like bit.ly if needed).

## Option B: Vercel KV (Redis) Database (Professional Approach)
**Concept**: Save the photo list to a database and give it a short ID.
*   **Mechanism**: 
    1. App sends photos to API -> API saves to Redis -> Returns ID `tree-8842`.
    2. Share link: `myapp.com/?id=tree-8842`.
*   **Pros**:
    *   **Clean, Short URLs**: Looks very professional.
    *   **Analytics**: You can track how many times a tree is viewed.
*   **Cons**:
    *   **Setup**: Requires creating a Vercel KV store (1-click) and explaining backend API routes.
    *   **Local Dev Friction**: Testing API routes locally requires `vercel dev` instead of just `npm run dev`.

## Recommendation
Given your project state:
1.  **Immediate Step**: Implement **Option A (URL State)** first. It requires **no infrastructure changes** and fulfills 100% of the functional requirement immediately.
2.  **Future Upgrade**: Upgrade to Option B only if you find the URLs are becoming too long or you need view statistics.

## Implementation Plan (Option A)

### 1. Serialize State
Create a function to pack the current scene state (Photo URLs, Tree Color, Config) into a compact string.
```typescript
{
  p: ["url1", "url2"], // Photos
  c: "#ff0000",        // Color
  s: 1.2               // Scale
}
```

### 2. Update URL
When the user clicks "Share", generate the link and update the browser bar or copy to clipboard.

### 3. Hydrate at Startup
Modify `useStore` or `Experience` to check for `?data=...` on load. If found, restore the photos and configuration.
