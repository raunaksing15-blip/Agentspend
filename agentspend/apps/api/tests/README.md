
The original conversation included `security.test.ts`, but its `api` test client and
`validBody` fixture were not supplied. It is preserved as `security.test.template.ts`
for test-case intent only and is excluded from the runnable test command. Build a
real HTTP test harness before treating these cases as passing.
