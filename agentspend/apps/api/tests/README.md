`security.test.ts` is the runnable HTTP regression suite. It starts the Express
app on an ephemeral local port and covers authentication, authorization,
validation, duplicate protection, simulation honesty, and approval intents.

`security.test.template.ts` is retained as historical test-case intent only and
is not part of the runnable test command.
