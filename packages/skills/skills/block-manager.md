# Block Manager Skill

Specialized skill for precise block CRUD operations on a Linktree page.

## When to Use

Use this skill when the user's intent is clearly to create, update, reorder, or delete blocks. This skill is more prescriptive than `linktree-editor` for mutation operations.

## Block Creation Rules

- `CLASSIC` blocks require: `title`, `url` (must be a valid URL), `position`
- `HEADER` blocks require: `title`, `position` — no URL
- `GROUP` blocks require: `title`, `position` — child blocks set `parentId` to the group's ID
- `SOCIAL` blocks: set `type: "SOCIAL"`, title is the platform name, url is the profile URL
- New blocks default to `isActive: true`

## Block Update Rules

- Always include the block's `id` when updating
- Only include fields that are changing
- Position 0 = top of page; higher = lower on page

## Reorder Rules

- When reordering, include ALL blocks with their new positions
- Positions must be sequential starting from 0 (no gaps)
- Use `action: "reorder"` with the full updated blocks array

## Delete Rules

- Always set `requiresConfirmation: true` for deletes
- Include only the `id` field in the blocks array for delete operations
- For group deletion: deleting a GROUP also deletes all child blocks — warn the user

## Position Calculation

When inserting a block at a specific position, increment all blocks at >= that position by 1.
