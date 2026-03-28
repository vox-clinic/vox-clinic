# 09 - UX & Accessibility

## 9.1 Loading States

**9 `loading.tsx` files found** covering most routes.

🟠 **Missing loading states:**
- `patients/page.tsx` — main patient list, no loading.tsx
- `prescriptions/[id]/page.tsx` — no loading.tsx
- `prescriptions/` directory — no loading.tsx at all
- No `<Suspense>` boundaries found anywhere in the app

## 9.2 Error States

✅ **7 `error.tsx` files** covering all major route groups:
- `(dashboard)/error.tsx` — catch-all for entire dashboard
- `onboarding/error.tsx`, `booking/[token]/error.tsx`, `nps/[token]/error.tsx`
- `(admin)/error.tsx`, `sala/[token]/error.tsx`, `teleconsulta/[id]/error.tsx`

## 9.3 Empty States

✅ Dashboard shows proper empty states:
- "Nenhuma consulta para hoje" with icon
- "Nenhum atendimento registrado."
- "Nenhum paciente cadastrado."

All in pt-BR with helpful messages.

## 9.4 ARIA & Accessibility

32 ARIA attributes across 12 files:
- `nav-sidebar.tsx`: `aria-label="Navegacao principal"` ✅
- Dashboard: 9 ARIA attributes ✅
- Calendar: Accessible form controls ✅

🟡 **Missing:**
- No `aria-live` regions for dynamic updates (search results, toasts)
- No `aria-busy` on loading states
- No skip-navigation link for keyboard users
- Lucide icons may lack `aria-hidden`

## 9.5 data-testid Attributes

✅ 24 `data-testid` occurrences across 9 files, used by E2E tests.

## 9.6 Keyboard Navigation

🟡 Relies entirely on shadcn/Radix built-in keyboard support. No custom keyboard handlers for interactive elements (click-handler cards, DnD calendar).

## 9.7 Responsive Design

✅ Mobile-first patterns:
- Desktop sidebar hidden on mobile (`hidden md:flex`)
- Separate bottom nav for mobile
- Actions hidden on small screens (`hidden sm:inline-flex`)
- `responsive.spec.ts` E2E test exists

## 9.8 Form Labels

✅ 224 `<Label>` / `htmlFor` occurrences. All error messages in pt-BR.

## 9.9 Summary

| Category | Severity | Action |
|----------|----------|--------|
| Missing loading.tsx for patients list, prescriptions | 🟠 | Add loading.tsx to those routes |
| No Suspense boundaries | 🟠 | Add Suspense for streaming SSR |
| No aria-live regions | 🟡 | Add for search results, notifications |
| No skip-nav link | 🟡 | Add `<a href="#main-content" class="sr-only focus:not-sr-only">` |
| No aria-busy on loading | 🟡 | Add to skeleton containers |
| Error boundaries present | ✅ | Layout-level catch-all |
| Empty states present | ✅ | pt-BR messages with icons |
| Responsive layout | ✅ | Mobile nav + breakpoints |
| Form labels | ✅ | 224 label instances |
| data-testid | ✅ | Key elements covered |
