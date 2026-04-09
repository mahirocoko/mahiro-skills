# Best Practices

This page is blueprint-allowed. It should preserve the house coding posture strongly enough to guide a new repo, while still staying honest about which layers are or are not established yet.

## Code Quality

### Always Run Verification Commands

```bash
[verified verification command sequence]
```

### Type Exports

Always export types alongside implementations:

```tsx
// Correct
export { MyComponent, type IMyComponentProps }

// Incorrect
export { MyComponent }
```

If the repo follows Mahiro-style interface naming, keep the `I` prefix in examples instead of flattening the type posture away.

### Avoid `any`

Prefer `unknown` or proper types:

```ts
// Avoid
const data: any = fetchData()

// Better
const data: unknown = fetchData()

// Best
const data: IMyData = fetchData()
```

## Component Best Practices

### Keep Components Small

```tsx
// Too large
const DashboardPage = () => {
  // 500+ lines mixing layout, cards, filters, and actions
}

// Better
const DashboardPage = () => {
  return (
    <div>
      <DashboardHeader />
      <DashboardMetrics />
      <DashboardContent />
    </div>
  )
}
```

### Prefer Composition

```tsx
// Too many props
interface IComplexCardProps extends ComponentProps<'div'> {
  showHeader?: boolean
  headerTitle?: string
  showFooter?: boolean
}

// Better composition
const Card = ({ children }: ICardProps) => <div>{children}</div>
const CardHeader = ({ children }: ICardHeaderProps) => <header>{children}</header>
const CardFooter = ({ children }: ICardFooterProps) => <footer>{children}</footer>
```

Keep examples aligned with the repo's intended component typing posture, including `I`-prefixed interface props when that is part of the house style.

### Keep Shared UI Conservative

Repetition alone is not enough to justify a shared component, variant helper, or styling abstraction.

- Prefer owner-local composition, styling, and small local helpers first.
- Extract shared UI only after the same need appears across real owners and the boundary is clearly domain-neutral.
- If reuse is still confined to one owner or one route cluster, keep it local.

## Service Best Practices

### Keep Transport Out of Components

```tsx
// Avoid ad hoc direct calls once a shared query pattern exists
const handleSubmit = async () => {
  await EmployeeService.update(id, payload)
}

// Prefer the repo's query or mutation pattern
const mutation = useMutation({
  mutationFn: (payload) => EmployeeService.update(id, payload),
})
```

## Styling Best Practices

### Use `cn()` for Class Merging

Document this only when the repo actually has `cn()` or an equivalent helper. If not, replace the section with the real class-merging or styling posture instead of leaving a generic pattern.

```tsx
import { cn } from '@/utils/cn'

<div className={cn('base-class', className)} />
```

### Semantic Tokens Over Raw Palette

If the repo does not use tokenized utility classes, adapt this example to the real styling system while preserving the doctrine of semantic naming over raw values.

```tsx
// Avoid
<div className="bg-white text-black">Content</div>

// Prefer
<div className="bg-card text-card-foreground">Content</div>
```

## State Management Best Practices

### Server State in the Server-State Layer

```tsx
[repo-faithful query example]
```

### Client State in the Client-State Layer

```tsx
[repo-faithful selector example]
```

If the repo does not have a server-state or client-state layer yet, say so directly and keep the guidance in `Preferred Direction` language instead of pretending the layers already exist.

## Development Workflow

1. Make changes
2. Run the repo's verification commands
3. Run i18n extraction if the repo actually has an i18n workflow and copy changed
4. Run build when the task requires it
5. Commit changes

## Common Pitfalls to Avoid

### Forgetting to Export Types

```tsx
// Type not exported
export { MyComponent }

// Type exported
export { MyComponent, type IMyComponentProps }
```

## Summary Checklist

Before committing:

- [ ] Ran the repo's verification commands
- [ ] Ran i18n extraction if the repo has that workflow and copy changed
- [ ] Exported types alongside implementations
- [ ] Used the repo's class-merging utility when needed
- [ ] Used selectors for client-state stores if that layer exists

## Preferred Direction

- Keep this page opinionated enough to transfer house style into early repos.
- Prefer repo-faithful examples, but do not erase useful blueprint guidance just because the repo is still small.
- Separate established repo behavior from suggested best-practice posture whenever the codebase is still immature.
- Keep owner-local code as the default posture until cross-owner need and a clearly generic boundary justify extraction.
