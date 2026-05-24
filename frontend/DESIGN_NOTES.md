# TaskFlow Frontend Design Diagnosis

## Current Issues
- The Material You pass made the app feel too much like a rounded bento dashboard: large soft panels, pill controls, decorative atmosphere, and oversized content blocks.
- The user wants a more conventional enterprise project-management UI similar in spirit to Jira: structured, dense, neutral, and operational.

## Replacement Direction
- Use an enterprise work-management system: persistent left navigation, compact top app bar, neutral surfaces, blue action color, smaller radii, restrained borders, dense forms, and task rows that read like issue lists.
- Avoid oversized bento cards, decorative blobs, excessive roundness, and app panels that feel like marketing surfaces.

## Components Refactored
- App shell and top bar now use a Jira-style product frame instead of floating rounded Material surfaces.
- Workspace, project, task, and activity sections are flatter bordered panels with list-oriented content.
- Task creation and task rows are denser and contained, with issue-list spacing and compact chips.

## Token System
- Global CSS variables now use Atlassian-inspired neutral surfaces, blue accents, low-radius geometry, compact spacing, and light/dark enterprise variants.
