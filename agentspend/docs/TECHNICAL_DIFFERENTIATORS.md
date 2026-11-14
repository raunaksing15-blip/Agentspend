# Technical differentiators

## Enforcement is not a UI feature

The dashboard is a control surface, not the security boundary. The intended
contract owns policy changes, agent authorization, recipient allowlists,
reservations, settlement transitions, and emergency pause behavior.

## Reservations address concurrency

An accepted request reserves budget before asynchronous settlement. Daily
spend calculations include both settled spend and outstanding reservations, so
multiple requests cannot each observe the same remaining balance. Reservations
must remain accounted for across day rollover until settled or refunded.

## Explicit state transitions

Requests move through named states rather than a boolean success flag. This
allows pending approval, executing, executed, and failed outcomes to remain
distinguishable and prevents duplicate settlement.

## Honest integration boundary

Simulation is deliberately separate from testnet execution. The API refuses
to start in TESTNET mode without a reviewed adapter, and simulation never
creates a transaction hash. This is less flashy than a fake receipt, but it
makes the security claims auditable.

## Agent economies

Scoped agent capabilities can support recurring procurement and service
payments without granting an agent unrestricted owner authority. The model
leaves room for owner rotation, multisig, vendor policy, and autonomous
budget management as future contract capabilities.
