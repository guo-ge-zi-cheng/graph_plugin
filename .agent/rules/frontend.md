---
trigger: always_on
---

# Frontend Web Development Rules

## Tech Stack
- **Core**: TypeScript, React (Functional Components)
- **Styling**: Tailwind CSS
- **State**: React Hooks (Context API or lightweight stores like Zustand)

## Code Style & Structure
- **Functional**: Use functional components only. No class components.
- **Naming**:
  - Components: `PascalCase` (e.g., `UserProfile.tsx`)
  - Functions/Hooks: `camelCase` (e.g., `useAuth`, `handleSubmit`)
  - Types/Interfaces: `PascalCase` (e.g., `UserProps`)
- **Strict Typing**: No `any`. Use `React.FC` or explicit props interfaces. Type API responses using Zod or interfaces.

## Tailwind CSS Best Practices
- **Utility-First**: Apply classes directly in JSX. Do not use `@apply` unless strictly necessary for global styles.
- **Responsiveness**: Mobile-first approach. (e.g., `flex-col md:flex-row`).
- **Organization**: Sort classes: Layout → Box Model → Typography → Visuals → Misc.
- **Arbitrary Values**: Avoid `w-[14px]`. Use theme values (e.g., `w-3.5`) to maintain consistency.

## Component Architecture
- **Composition**: Prefer small, composable components over large monolithic ones.
- **Logic Separation**: Extract complex logic into custom hooks (`use...`). Keep the UI layer clean.
- **Performance**: Use `useMemo` and `useCallback` only when props/dependencies change frequently or calculation is expensive.

## Security & A11y
- **XSS Prevention**: Never use `dangerouslySetInnerHTML` unless input is sanitized.
- **Accessibility**: Ensure all interactive elements have `aria-label` or visible labels. Use semantic HTML (buttons for actions, links for navigation).