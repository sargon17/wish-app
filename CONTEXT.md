# Wish App

Wish App is a product feedback workspace where project owners collect requests and organize them on project boards.

## Language

**Project Board**:
A project-owned workflow board where requests are grouped into ordered statuses.
_Avoid_: board when the project context is unclear

**Status**:
A project-owned workflow stage that requests can occupy on a project board, shown in the same order everywhere in the project.
_Avoid_: column, state

**Starter Status**:
One of the initial statuses automatically created for a new project board: Open, Under Review, Planned, In Progress, and Done.
_Avoid_: default status, system status, locked status

## Relationships

- A **Project Board** must have at least one **Status**
- The first **Status** in a **Project Board** is the starting **Status** for every new **Request** that does not specify a valid **Status**
- A **Starter Status** is created with a new **Project Board** and then treated as a normal **Status**
- A **Status** belongs to exactly one **Project Board**
- Status names are unique within a **Project Board**
- A **Request** belongs to exactly one **Status** on its **Project Board**
- Removing a **Status** that has **Requests** requires moving those **Requests** to another **Status** on the same **Project Board**

## Example dialogue

> **Dev:** "Are default statuses locked across every project?"
> **Domain expert:** "No — default statuses are just the starting workflow for a new project board; the owner can change them later."

## Flagged ambiguities

- "default status" previously meant a shared locked system status in code, but the resolved term is **Starter Status**: a creation-time seed that becomes an ordinary **Status**.
