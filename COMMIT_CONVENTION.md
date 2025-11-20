# Conventional Commits Guide

This project uses conventional commits to maintain a consistent commit history.

## Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

## Examples
```
feat: add freight offer bulk creation
fix: resolve TIMOCOM API authentication issue
docs: update README with installation instructions
refactor: split TIMOCOM API routes into modules
test: add unit tests for freight offer generation
chore: add commitlint for conventional commits
```

## Rules
- Type must be lowercase
- Subject must be lowercase
- Subject cannot be empty
- Subject cannot end with a period
- Use imperative mood ("add" not "adds" or "added")

## Testing Your Commit Message
```bash
echo "your commit message" | npx commitlint
```
