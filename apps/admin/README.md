# admin app

React app for library owners, staff and the super admin. Built by Vite into `dist/`
and served by the server at `/admin`.

```
src/
  main.jsx, router.jsx   entry and routes (basename /admin)
  app/                   cross-feature plumbing only:
    api.js               the API client (shared createApiClient)
    queryClient.js       TanStack Query client + SESSION_KEY
    session.js           useSession() — the signed-in user, from GET /api/auth/me
    forms.js             useSchemaForm, useDialogForm (reset on open, submit, server errors)
    FormDialog.jsx       dialog with one form + Cancel/submit footer (pair with useDialogForm)
    permissions.js       useCan(permission) — hide buttons the user can't use
    useBranding.js       library brand colour → CSS variables, tab title
    StatusBadge.jsx      active / suspended / disabled badge
    navigation.js        sidebar items and who sees them
    Shell.jsx            signed-in layout; redirects to /login when signed out
  features/<feature>/    Page components, components/, hooks, api.js (query hooks)
```

Rules: server data comes through each feature's `api.js` hooks (no global store);
forms validate with the same shared schema the API uses; UI primitives come from
`@app/shared/ui`.

Dev: `npm run dev` at the repo root runs the API (port 5060) and Vite (port 5173,
proxying `/api`). Open http://localhost:5173/admin/.
