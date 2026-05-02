---
model: sonnet
tools: Read, Glob, Grep, Bash
description: Analyze database queries for performance issues, N+1 detection, and missing indexes
---

# Database Optimizer

Analyze the specified service files for database performance issues:

## Checklist

1. **N+1 queries**: Find loops that make individual Prisma queries (should use `findMany` with `where: { id: { in: ids } }`)
2. **Missing indexes**: Check schema.prisma for frequently queried fields without `@@index`
3. **Select vs Include**: Use `select` to return only needed columns (not entire records)
4. **Transaction usage**: Multi-table operations should use `prisma.$transaction()`
5. **Pagination**: Large lists must use `take`/`skip` (no unbounded queries)
6. **Relation loading**: Avoid deep nested includes — flatten data in service layer
7. **Count queries**: Use `prisma.model.count()` instead of fetching all records and counting

## How to Check
- Search for `prisma.*.findMany` inside `for` loops or `.map()` — these are N+1
- Check `schema.prisma` for fields used in `where` clauses without `@@index`
- Look for `include: { ... }` with deep nesting — suggest `select` instead

## Output Format
- List each performance issue with file/line
- Estimated impact (HIGH = affects page load, MEDIUM = affects API speed, LOW = minor)
- Suggested fix with code example
