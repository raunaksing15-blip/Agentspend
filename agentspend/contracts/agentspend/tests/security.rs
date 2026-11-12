use agentspend::{AgentSpend, RequestOutcome, TxStatus};
use near_sdk::json_types::U128;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{testing_env, NearToken};

const N: u128 = 1_000_000_000_000_000_000_000_000;
const OWNER: &str = "owner.test.near";
const AGENT: &str = "agent.test.near";
const VENDOR: &str = "vendor.test.near";
const SELF_: &str = "firewall.test.near";

fn ctx(who: &str, balance: u128, ts_ns: u64, gas_tgas: u64) -> VMContextBuilder {
    let mut b = VMContextBuilder::new();
    b.current_account_id(SELF_.parse().unwrap())
        .predecessor_account_id(who.parse().unwrap())
        .account_balance(NearToken::from_yoctonear(balance))
        .block_timestamp(ts_ns)
        .prepaid_gas(near_sdk::Gas::from_tgas(gas_tgas));
    b
}

fn ttl(now: u64) -> u64 { now + 3_600_000_000_000 }

fn setup() -> AgentSpend {
    let mut b = ctx(SELF_, 20 * N, 0, 100);
    testing_env!(b.build());
    let mut c = AgentSpend::new(OWNER.parse().unwrap());

    testing_env!(ctx(OWNER, 20 * N, 0, 100).build());
    c.add_recipient(VENDOR.parse().unwrap());
    c.upsert_agent(
        AGENT.parse().unwrap(), "procurement".into(), true,
        U128(0), U128(0), false, 8, 50,
    );
    let _ = &mut b;
    c
}

fn request(c: &mut AgentSpend, id: &str, to: &str, amount: u128, now: u64) -> RequestOutcome {
    testing_env!(ctx(AGENT, 20 * N, now, 100).build());
    c.request_payment(id.into(), to.parse().unwrap(), U128(amount), "test".into(), ttl(now))
}

// ---- #3 init front-run
#[test]
#[should_panic(expected = "ERR_INIT_MUST_BE_SELF_BATCHED")]
fn init_by_stranger_fails() {
    testing_env!(ctx("attacker.test.near", 0, 0, 100).build());
    AgentSpend::new("attacker.test.near".parse().unwrap());
}

// ---- #4 day rollover must NOT release pending reservations
#[test]
fn rollover_keeps_reservations_and_blocks_overspend() {
    let mut c = setup();
    let day1 = 0;
    // 1.5 NEAR pending (threshold 1)
    assert!(matches!(request(&mut c, "p1", VENDOR, 3 * N / 2, day1),
        RequestOutcome::PendingApproval { .. }));
    assert_eq!(c.get_stats().reserved_total.0, 3 * N / 2);

    // jump 2 days; spent resets, reservation must survive
    let day3 = 2 * 86_400_000_000_000;
    testing_env!(ctx(AGENT, 20 * N, day3, 100).build());
    let s = c.get_stats(); // views don't roll; force a roll via a request
    let _ = s;
    let out = request(&mut c, "p2", VENDOR, 4 * N, day3); // 4 + 1.5 > 5
    assert!(matches!(out, RequestOutcome::Rejected { .. }));
    assert_eq!(c.audit_invariants().pending_matches, true);
}

// ---- #4 reject refunds exactly once, into the right bucket
#[test]
fn reject_refunds_reservation_once() {
    let mut c = setup();
    request(&mut c, "p1", VENDOR, 3 * N / 2, 0);
    testing_env!(ctx(OWNER, 20 * N, 1, 100).build());
    c.reject_payment("p1".into());
    assert_eq!(c.get_stats().reserved_total.0, 0);
    assert!(c.audit_invariants().pending_matches);
    assert_eq!(c.get_transaction("p1".into()).unwrap().status, TxStatus::Rejected);
}

#[test]
#[should_panic(expected = "ERR_NOT_PENDING")]
fn double_reject_panics() {
    let mut c = setup();
    request(&mut c, "p1", VENDOR, 3 * N / 2, 0);
    testing_env!(ctx(OWNER, 20 * N, 1, 100).build());
    c.reject_payment("p1".into());
    c.reject_payment("p1".into());
}

// ---- #5 callback cannot double-settle
#[test]
#[should_panic(expected = "ERR_NOT_EXECUTING")]
fn resolve_on_non_executing_panics() {
    let mut c = setup();
    request(&mut c, "p1", VENDOR, 3 * N / 2, 0); // PendingApproval
    testing_env!(ctx(SELF_, 20 * N, 1, 100).build());
    c.resolve_transfer("p1".into());
}

// ---- #5 gas floor: never mutate into a stuck state
#[test]
#[should_panic(expected = "ERR_INSUFFICIENT_GAS")]
fn low_gas_rejects_before_reserving_spend() {
    let mut c = setup();
    testing_env!(ctx(AGENT, 20 * N, 0, 5).build());
    c.request_payment("g1".into(), VENDOR.parse().unwrap(), U128(N / 2),
        "test".into(), ttl(0));
}

// ---- #5 storage-stake-aware balance
#[test]
#[should_panic(expected = "ERR_INSUFFICIENT_LIQUID_BALANCE")]
fn balance_check_respects_liquid_buffer() {
    let mut c = setup();
    testing_env!(ctx(AGENT, N / 10, 0, 100).build()); // 0.1 NEAR, buffer 0.05
    c.request_payment("b1".into(), VENDOR.parse().unwrap(), U128(N / 2),
        "test".into(), ttl(0));
}

// ---- core policy matrix
#[test]
fn blocks_over_max_per_tx() {
    let mut c = setup();
    assert!(matches!(request(&mut c, "x1", VENDOR, 3 * N, 0), RequestOutcome::Rejected { .. }));
}

#[test]
fn blocks_unapproved_recipient() {
    let mut c = setup();
    assert!(matches!(request(&mut c, "x2", "attacker.test.near", N / 2, 0),
        RequestOutcome::Rejected { .. }));
}

#[test]
fn blocks_duplicate_id_even_after_rejection() {
    let mut c = setup();
    request(&mut c, "dup", "attacker.test.near", N / 2, 0); // rejected, id burned
    assert!(matches!(request(&mut c, "dup", VENDOR, N / 2, 0), RequestOutcome::Rejected { .. }));
}

#[test]
fn pruning_cannot_re_enable_replay() {
    let mut c = setup();
    request(&mut c, "dup", "attacker.test.near", N / 2, 0);
    testing_env!(ctx(OWNER, 20 * N, 1, 100).build());
    c.prune_terminal("dup".into());
    assert!(matches!(request(&mut c, "dup", VENDOR, N / 2, 2), RequestOutcome::Rejected { .. }));
}

#[test]
#[should_panic(expected = "ERR_UNAUTHORIZED_AGENT")]
fn unknown_agent_panics() {
    let mut c = setup();
    testing_env!(ctx("rogue.test.near", 20 * N, 0, 100).build());
    c.request_payment("u1".into(), VENDOR.parse().unwrap(), U128(N / 2),
        "t".into(), ttl(0));
}

#[test]
#[should_panic(expected = "ERR_OWNER_ONLY")]
fn agent_cannot_approve() {
    let mut c = setup();
    request(&mut c, "p1", VENDOR, 3 * N / 2, 0);
    testing_env!(ctx(AGENT, 20 * N, 1, 100).build());
    c.approve_payment("p1".into());
}

#[test]
#[should_panic(expected = "ERR_OWNER_ONLY")]
fn agent_cannot_change_policy() {
    let mut c = setup();
    testing_env!(ctx(AGENT, 20 * N, 1, 100).build());
    c.update_policy(Some(U128(100 * N)), Some(U128(100 * N)), Some(U128(100 * N)));
}

#[test]
#[should_panic(expected = "ERR_OWNER_ONLY")]
fn agent_cannot_allowlist_itself() {
    let mut c = setup();
    testing_env!(ctx(AGENT, 20 * N, 1, 100).build());
    c.add_recipient(AGENT.parse().unwrap());
}

#[test]
#[should_panic(expected = "ERR_PAUSED")]
fn pause_blocks_requests() {
    let mut c = setup();
    testing_env!(ctx(OWNER, 20 * N, 1, 100).build());
    c.set_paused(true);
    request(&mut c, "z1", VENDOR, N / 2, 2);
}

#[test]
#[should_panic(expected = "ERR_RECIPIENT_DELISTED")]
fn approval_rechecks_allowlist() {
    let mut c = setup();
    request(&mut c, "p1", VENDOR, 3 * N / 2, 0);
    testing_env!(ctx(OWNER, 20 * N, 1, 100).build());
    c.remove_recipient(VENDOR.parse().unwrap());
    c.approve_payment("p1".into());
}

#[test]
#[should_panic(expected = "ERR_REQUEST_EXPIRED")]
fn approval_rejects_expired_request() {
    let mut c = setup();
    request(&mut c, "p1", VENDOR, 3 * N / 2, 0);
    testing_env!(ctx(OWNER, 20 * N, ttl(0) + 1, 100).build());
    c.approve_payment("p1".into());
}

#[test]
fn per_agent_daily_cap_is_independent() {
    let mut c = setup();
    testing_env!(ctx(OWNER, 20 * N, 0, 100).build());
    c.upsert_agent(AGENT.parse().unwrap(), "capped".into(), true,
        U128(0), U128(N), false, 8, 50); // agent cap 1 NEAR < global 5
    assert!(matches!(request(&mut c, "a1", VENDOR, N / 2, 1), RequestOutcome::Executing { .. }));
    assert!(matches!(request(&mut c, "a2", VENDOR, N, 2), RequestOutcome::Rejected { .. }));
}

#[test]
fn failed_request_does_not_consume_budget() {
    let mut c = setup();
    request(&mut c, "bad", "attacker.test.near", 2 * N, 0);
    let s = c.get_stats();
    assert_eq!(s.spent_today.0, 0);
    assert_eq!(s.reserved_total.0, 0);
    assert_eq!(s.blocked_count, 1);
}
