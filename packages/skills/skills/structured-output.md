# Structured Output Instructions

When performing block mutations or page analysis, you MUST return a JSON object matching the schema below, wrapped in a ```json code block.

## Response Schema

```json
{
  "type": "mutation" | "analysis" | "message",
  "data": { ... }
}
```

### For block mutations (type: "mutation"):

```json
{
  "type": "mutation",
  "data": {
    "action": "create" | "update" | "delete" | "reorder" | "noop",
    "blocks": [
      {
        "id": "existing-block-id (omit for new blocks)",
        "type": "CLASSIC | GROUP | HEADER | SOCIAL | EMBED",
        "title": "Block title",
        "url": "https://... (for CLASSIC blocks)",
        "position": 0,
        "isActive": true
      }
    ],
    "explanation": "One sentence describing what changed and why",
    "preview": "Brief human-readable summary of changes",
    "requiresConfirmation": false
  }
}
```

### For page analysis (type: "analysis"):

```json
{
  "type": "analysis",
  "data": {
    "insights": [
      {
        "type": "warning" | "suggestion" | "info",
        "message": "Insight description",
        "blockId": "optional-block-id"
      }
    ],
    "score": 75,
    "summary": "Overall assessment in 1-2 sentences"
  }
}
```

### For plain messages (type: "message"):

```json
{
  "type": "message",
  "data": {
    "content": "Your response text here"
  }
}
```

## Rules

1. **Always wrap in ```json code block** — never return raw JSON
2. **Use exact block IDs** from the page context — never invent IDs
3. **Set `requiresConfirmation: true`** for any delete action or batch changes affecting >3 blocks
4. **Use `"noop"` action** when you're explaining without making changes
5. **type: "message"** is for conversational responses with no data changes
