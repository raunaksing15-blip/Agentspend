//! AgentSpend — on-chain financial policy enforcement for autonomous agents.
//! Self-reviewed; NOT externally audited. See docs/SECURITY.md for residual risks.
//!
//! State machine (persisted states only):
//!   PendingApproval -> Executing -> Executed | Failed
//!   PendingApproval -> Rejected
//!   Executing       -> NeedsReconciliation -> Executed | Failed   (owner-attested)
//! All terminal states are immutable. Transaction IDs are never reusable.

use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, UnorderedSet};
use near_sdk::{
    env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseResult,
};

const NO_DEPOSIT: NearToken = NearToken::from_yoctonear(0);
const GAS_TRANSFER: Gas = Gas::from_tgas(10);
const GAS_CALLBACK: Gas = Gas::from_tgas(10);
/// headroom for the current receipt's own execution + state writes
const GAS_HEADROOM: Gas = Gas::from_tgas(10);
const MIN_PREPAID: Gas = Gas::from_tgas(30);

const DAY_NS: u64 = 86_400_000_000_000;
const MAX_TTL_NS: u64 = DAY_NS;
/// callbacks settle in seconds; 5 minutes means the callback is lost
const STUCK_TIMEOUT_NS: u64 = 300_000_000_000;
/// never spend the storage stake; keep 0.05 NEAR liquid headroom
const LIQUID_BUFFER: u128 = 50_000_000_000_000_000_000_000; // 0.05 NEAR
const MAX_STORAGE_BYTES: u64 = 200_000; // ~2 NEAR stake ceiling
const MAX_ID_LEN: usize = 64;
const MAX_PURPOSE_LEN: usize = 256;
const MAX_RECIPIENTS: u32 = 64;

// ---------------------------------------------------------------- types

#[near(serializers=[borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum TxStatus {
    PendingApproval,
    Executing,
    Executed,
    Rejected,
    Failed,
    NeedsReconciliation,
}

impl TxStatus {
    fn is_terminal(self) -> bool {
        matches!(self, TxStatus::Executed | TxStatus::Rejected | TxStatus::Failed)
    }
}

#[near(serializers=[borsh, json])]
#[derive(Clone, Debug)]
pub struct Transaction {
    pub id: String,
    pub agent: AccountId,
    pub recipient: AccountId,
    pub amount: U128,
    pub purpose: String,
    pub status: TxStatus,
    pub created_at_ns: u64,
    pub expires_at_ns: u64,
    pub reserved_day: u64,
    pub spent_day: Option<u64>,
    pub execution_started_ns: Option<u64>,
    pub decided_by: Option<AccountId>,
    pub reason: String,
}

#[near(serializers=[borsh, json])]
#[derive(Clone, Debug)]
pub struct Agent {
    pub name: String,
    pub active: bool,
    /// 0 = inherit global policy
    pub max_per_tx: U128,
    pub daily_limit: U128,
    pub always_require_approval: bool,
    pub max_pending: u32,
    pub max_requests_per_day: u32,
    pub day: u64,
    pub spent_today: U128,
    /// carried across day rollover on purpose (fail-closed)
    pub reserved: U128,
    pub requests_today: u32,
    pub pending_count: u32,
    pub lifetime_executed: U128,
}

#[near(serializers=[borsh])]
pub struct Policy {
    pub max_per_tx: u128,
    pub daily_limit: u128,
    pub approval_threshold: u128,
    pub recipients: UnorderedSet<AccountId>,
}

#[near(serializers=[json])]
pub struct PolicyView {
    pub max_per_tx: U128,
    pub daily_limit: U128,
    pub approval_threshold: U128,
    pub recipients: Vec<AccountId>,
    pub paused: bool,
}

#[near(serializers=[json])]
pub struct StatsView {
    pub day: U64Alias,
    pub spent_today: U128,
    pub reserved_total: U128,
    pub remaining_daily: U128,
    pub total_spent: U128,
    pub tx_count: u64,
    pub blocked_count: u64,
    pub pending_count: u32,
    pub usable_balance: U128,
    pub storage_bytes: u64,
    pub paused: bool,
}
type U64Alias = u64;

#[near(serializers=[json])]
pub enum RequestOutcome {
    Executing { id: String },
    PendingApproval { id: String, reason: String },
    Rejected { id: String, reason: String },
}

#[near(serializers=[json])]
pub struct InvariantReport {
    pub reserved_total: U128,
    pub pending_sum: U128,
    pub pending_matches: bool,
    pub pending_count: u32,
}

// ---------------------------------------------------------------- state

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct AgentSpend {
    owner: AccountId,
    proposed_owner: Option<AccountId>,
    paused: bool,
    policy: Policy,
    agents: LookupMap<AccountId, Agent>,
    transactions: LookupMap<String, Transaction>,
    /// IDs survive payload pruning => replay stays blocked forever
    seen_ids: LookupMap<String, bool>,
    pending: UnorderedSet<String>,
    day: u64,
    spent_today: u128,
    reserved_total: u128,
    total_spent: u128,
    tx_count: u64,
    blocked_count: u64,
}

fn today() -> u64 {
    env::block_timestamp() / DAY_NS
}

fn emit(event: &str, data: serde_json::Value) {
    env::log_str(
        &serde_json::json!({
            "standard": "agentspend", "version": "1.0.0",
            "event": event, "data": [data],
        })
        .to_string()
        .prepend_event_json(),
    );
}

trait EventJson {
    fn prepend_event_json(self) -> String;
}
impl EventJson for String {
    fn prepend_event_json(self) -> String {
        format!("EVENT_JSON:{self}")
    }
}

#[near]
impl AgentSpend {
    // ---------------------------------------------------------- lifecycle

    /// Must be invoked by the contract account itself inside the SAME batch
    /// transaction as the deployment. Prevents initialization front-running.
    #[init]
    #[private]
    pub fn new(owner: AccountId) -> Self {
        require!(!env::state_exists(), "ERR_ALREADY_INITIALIZED");
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "ERR_INIT_MUST_BE_SELF_BATCHED"
        );
        Self {
            owner,
            proposed_owner: None,
            paused: false,
            policy: Policy {
                max_per_tx: NearToken::from_near(2).as_yoctonear(),
                daily_limit: NearToken::from_near(5).as_yoctonear(),
                approval_threshold: NearToken::from_near(1).as_yoctonear(),
                recipients: UnorderedSet::new(b"r"),
            },
            agents: LookupMap::new(b"a"),
            transactions: LookupMap::new(b"t"),
            seen_ids: LookupMap::new(b"s"),
            pending: UnorderedSet::new(b"p"),
            day: today(),
            spent_today: 0,
            reserved_total: 0,
            total_spent: 0,
            tx_count: 0,
            blocked_count: 0,
        }
    }

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner,
            "ERR_OWNER_ONLY"
        );
    }

    pub fn propose_owner(&mut self, new_owner: AccountId) {
        self.assert_owner();
        self.proposed_owner = Some(new_owner.clone());
        emit("owner_proposed", serde_json::json!({ "new_owner": new_owner }));
    }

    pub fn accept_ownership(&mut self) {
        let proposed = self.proposed_owner.clone().expect("ERR_NO_PROPOSAL");
        require!(
            env::predecessor_account_id() == proposed,
            "ERR_NOT_PROPOSED_OWNER"
        );
        self.owner = proposed;
        self.proposed_owner = None;
        emit("owner_changed", serde_json::json!({ "owner": self.owner }));
    }

    // ---------------------------------------------------------- admin

    #[payable]
    pub fn fund(&mut self) {
        // Anyone may fund. Deposits cannot be redirected by the depositor.
        require!(
            env::attached_deposit().as_yoctonear() > 0,
            "ERR_NO_DEPOSIT"
        );
        emit(
            "funded",
            serde_json::json!({
                "from": env::predecessor_account_id(),
                "amount": env::attached_deposit().as_yoctonear().to_string(),
            }),
        );
    }

    pub fn set_paused(&mut self, paused: bool) {
        self.assert_owner();
        self.paused = paused;
        emit("pause_changed", serde_json::json!({ "paused": paused }));
    }

    pub fn update_policy(
        &mut self,
        max_per_tx: Option<U128>,
        daily_limit: Option<U128>,
        approval_threshold: Option<U128>,
    ) {
        self.assert_owner();
        if let Some(v) = max_per_tx {
            require!(v.0 > 0, "ERR_ZERO_MAX");
            self.policy.max_per_tx = v.0;
        }
        if let Some(v) = daily_limit {
            require!(v.0 > 0, "ERR_ZERO_DAILY");
            self.policy.daily_limit = v.0;
        }
        if let Some(v) = approval_threshold {
            self.policy.approval_threshold = v.0;
        }
        emit(
            "policy_changed",
            serde_json::json!({
                "max_per_tx": self.policy.max_per_tx.to_string(),
                "daily_limit": self.policy.daily_limit.to_string(),
                "approval_threshold": self.policy.approval_threshold.to_string(),
                "by": env::predecessor_account_id(),
            }),
        );
    }

    pub fn add_recipient(&mut self, recipient: AccountId) {
        self.assert_owner();
        require!(
            self.policy.recipients.len() < MAX_RECIPIENTS,
            "ERR_RECIPIENT_CAP"
        );
        require!(recipient != env::current_account_id(), "ERR_SELF_RECIPIENT");
        self.policy.recipients.insert(recipient.clone());
        emit("recipient_added", serde_json::json!({ "recipient": recipient }));
    }

    pub fn remove_recipient(&mut self, recipient: AccountId) {
        self.assert_owner();
        self.policy.recipients.remove(&recipient);
        emit("recipient_removed", serde_json::json!({ "recipient": recipient }));
    }

    pub fn upsert_agent(
        &mut self,
        agent_id: AccountId,
        name: String,
        active: bool,
        max_per_tx: U128,
        daily_limit: U128,
        always_require_approval: bool,
        max_pending: u32,
        max_requests_per_day: u32,
    ) {
        self.assert_owner();
        require!(name.len() <= 64, "ERR_NAME_TOO_LONG");
        require!(max_pending > 0 && max_pending <= 32, "ERR_BAD_PENDING_CAP");
        require!(
            max_requests_per_day > 0 && max_requests_per_day <= 500,
            "ERR_BAD_REQUEST_CAP"
        );
        let mut a = self.agents.get(&agent_id).cloned().unwrap_or(Agent {
            name: name.clone(),
            active,
            max_per_tx,
            daily_limit,
            always_require_approval,
            max_pending,
            max_requests_per_day,
            day: today(),
            spent_today: U128(0),
            reserved: U128(0),
            requests_today: 0,
            pending_count: 0,
            lifetime_executed: U128(0),
        });
        a.name = name;
        a.active = active;
        a.max_per_tx = max_per_tx;
        a.daily_limit = daily_limit;
        a.always_require_approval = always_require_approval;
        a.max_pending = max_pending;
        a.max_requests_per_day = max_requests_per_day;
        self.agents.insert(agent_id.clone(), a);
        emit(
            "agent_changed",
            serde_json::json!({ "agent": agent_id, "active": active }),
        );
    }

    // ---------------------------------------------------------- accounting

    fn roll_day(&mut self) {
        let d = today();
        if d > self.day {
            self.day = d;
            self.spent_today = 0;
            // reserved_total intentionally NOT reset: pending approvals stay funded
        }
    }

    fn roll_agent(a: &mut Agent, day: u64) {
        if a.day != day {
            a.day = day;
            a.spent_today = U128(0);
            a.requests_today = 0;
            // a.reserved carried, fail-closed
        }
    }

    fn usable_balance() -> u128 {
        let stake = u128::from(env::storage_usage()) * env::storage_byte_cost().as_yoctonear();
        env::account_balance()
            .as_yoctonear()
            .saturating_sub(stake)
            .saturating_sub(LIQUID_BUFFER)
    }

    // ---------------------------------------------------------- requests

    pub fn request_payment(
        &mut self,
        id: String,
        recipient: AccountId,
        amount: U128,
        purpose: String,
        expires_at_ns: u64,
    ) -> RequestOutcome {
        let agent_id = env::predecessor_account_id();
        let now = env::block_timestamp();

        // --- shape validation (panics: no state written, no storage griefing)
        require!(!id.is_empty() && id.len() <= MAX_ID_LEN, "ERR_BAD_ID");
        require!(
            id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_'),
            "ERR_BAD_ID_CHARS"
        );
        require!(purpose.len() <= MAX_PURPOSE_LEN, "ERR_PURPOSE_TOO_LONG");
        require!(amount.0 > 0, "ERR_ZERO_AMOUNT");
        require!(expires_at_ns > now, "ERR_EXPIRED");
        require!(expires_at_ns <= now + MAX_TTL_NS, "ERR_TTL_TOO_LONG");
        require!(!self.paused, "ERR_PAUSED");
        require!(
            env::storage_usage() <= MAX_STORAGE_BYTES,
            "ERR_STORAGE_CAP"
        );

        self.roll_day();
        let mut agent = self.agents.get(&agent_id).cloned().expect("ERR_UNAUTHORIZED_AGENT");
        Self::roll_agent(&mut agent, self.day);

        // every well-formed attempt consumes quota, including duplicates
        require!(
            agent.requests_today < agent.max_requests_per_day,
            "ERR_AGENT_REQUEST_CAP"
        );
        agent.requests_today += 1;
        self.agents.insert(agent_id.clone(), agent.clone());

        // --- policy evaluation. Rejections are recorded (bounded by quota).
        let rejection = self.evaluate(&id, &agent, &agent_id, &recipient, amount.0);
        if let Some(reason) = rejection {
            self.blocked_count += 1;
            self.seen_ids.insert(id.clone(), true);
            let tx = Transaction {
                id: id.clone(),
                agent: agent_id.clone(),
                recipient: recipient.clone(),
                amount,
                purpose,
                status: TxStatus::Rejected,
                created_at_ns: now,
                expires_at_ns,
                reserved_day: self.day,
                spent_day: None,
                execution_started_ns: None,
                decided_by: None,
                reason: reason.clone(),
            };
            self.transactions.insert(id.clone(), tx);
            emit(
                "payment_blocked",
                serde_json::json!({
                    "id": id, "agent": agent_id, "recipient": recipient,
                    "amount": amount.0.to_string(), "reason": reason,
                }),
            );
            return RequestOutcome::Rejected { id, reason };
        }

        // --- reserve budget BEFORE any async work or human decision
        self.seen_ids.insert(id.clone(), true);
        self.reserved_total = self.reserved_total.checked_add(amount.0).expect("ERR_OVERFLOW");
        agent.reserved = U128(agent.reserved.0.checked_add(amount.0).expect("ERR_OVERFLOW"));

        let needs_approval =
            amount.0 > self.policy.approval_threshold || agent.always_require_approval;

        let mut tx = Transaction {
            id: id.clone(),
            agent: agent_id.clone(),
            recipient,
            amount,
            purpose,
            status: TxStatus::PendingApproval,
            created_at_ns: now,
            expires_at_ns,
            reserved_day: self.day,
            spent_day: None,
            execution_started_ns: None,
            decided_by: None,
            reason: if needs_approval {
                "Amount exceeds human approval threshold".into()
            } else {
                "All policy checks passed".into()
            },
        };

        if needs_approval {
            require!(
                agent.pending_count < agent.max_pending,
                "ERR_AGENT_PENDING_CAP"
            );
            agent.pending_count += 1;
            self.pending.insert(id.clone());
            self.transactions.insert(id.clone(), tx);
            self.agents.insert(agent_id.clone(), agent);
            emit(
                "approval_required",
                serde_json::json!({
                    "id": id, "agent": agent_id, "amount": amount.0.to_string(),
                    "threshold": self.policy.approval_threshold.to_string(),
                }),
            );
            return RequestOutcome::PendingApproval {
                id,
                reason: tx.reason,
            };
        }

        tx.status = TxStatus::Executing;
        self.agents.insert(agent_id, agent);
        self.transactions.insert(id.clone(), tx);
        self.begin_execution(&id);
        RequestOutcome::Executing { id }
    }

    /// Pure-ish evaluation. Order matters: cheapest/most decisive first.
    fn evaluate(
        &self,
        id: &str,
        agent: &Agent,
        agent_id: &AccountId,
        recipient: &AccountId,
        amount: u128,
    ) -> Option<String> {
        if !agent.active {
            return Some("Agent is deactivated".into());
        }
        if self.seen_ids.get(id).copied().unwrap_or(false) {
            return Some("Duplicate transaction ID (replay blocked)".into());
        }
        if !self.policy.recipients.contains(recipient) {
            return Some(format!("Recipient {recipient} is not on the approved allowlist"));
        }
        if recipient == agent_id {
            return Some("Agent cannot pay itself".into());
        }
        let cap = if agent.max_per_tx.0 == 0 {
            self.policy.max_per_tx
        } else {
            self.policy.max_per_tx.min(agent.max_per_tx.0)
        };
        if amount > cap {
            return Some(format!(
                "Amount exceeds maximum transaction limit of {cap} yoctoNEAR"
            ));
        }
        let committed = self
            .spent_today
            .checked_add(self.reserved_total)
            .expect("ERR_OVERFLOW");
        if committed.checked_add(amount).expect("ERR_OVERFLOW") > self.policy.daily_limit {
            return Some("Amount exceeds remaining daily budget (pending reservations included)".into());
        }
        if agent.daily_limit.0 > 0 {
            let a_committed = agent.spent_today.0.checked_add(agent.reserved.0).expect("ERR_OVERFLOW");
            if a_committed.checked_add(amount).expect("ERR_OVERFLOW") > agent.daily_limit.0 {
                return Some("Amount exceeds this agent's daily budget".into());
            }
        }
        None
    }

    // ---------------------------------------------------------- execution

    /// Caller must already have reserved `amount` and set status = Executing.
    fn begin_execution(&mut self, id: &str) {
        require!(
            env::prepaid_gas() >= MIN_PREPAID,
            "ERR_INSUFFICIENT_GAS_FOR_TRANSFER_AND_CALLBACK"
        );
        let mut tx = self.transactions.get(id).cloned().expect("ERR_NO_TX");
        require!(tx.status == TxStatus::Executing, "ERR_BAD_STATE");

        let amount = tx.amount.0;
        require!(
            Self::usable_balance() >= amount,
            "ERR_INSUFFICIENT_LIQUID_BALANCE"
        );

        // reservation -> spent (same day bucket)
        self.reserved_total = self.reserved_total.saturating_sub(amount);
        self.spent_today = self.spent_today.checked_add(amount).expect("ERR_OVERFLOW");
        let mut agent = self.agents.get(&tx.agent).cloned().expect("ERR_NO_AGENT");
        agent.reserved = U128(agent.reserved.0.saturating_sub(amount));
        agent.spent_today = U128(agent.spent_today.0.checked_add(amount).expect("ERR_OVERFLOW"));
        self.agents.insert(tx.agent.clone(), agent);

        tx.spent_day = Some(self.day);
        tx.execution_started_ns = Some(env::block_timestamp());
        self.pending.remove(id);
        self.transactions.insert(id.to_string(), tx.clone());

        emit(
            "payment_executing",
            serde_json::json!({
                "id": id, "recipient": tx.recipient, "amount": amount.to_string(),
            }),
        );

        Promise::new(tx.recipient.clone())
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "resolve_transfer".to_string(),
                    serde_json::to_vec(&serde_json::json!({ "id": id })).unwrap(),
                    NO_DEPOSIT,
                    GAS_CALLBACK,
                ),
            );
        // Not returned: settlement is authoritative via callback + events.
        let _ = GAS_TRANSFER;
    }

    /// Settlement. `#[private]` => only this contract can call it.
    /// Guarded on `Executing` so a duplicate/late callback cannot double-settle.
    #[private]
    pub fn resolve_transfer(&mut self, id: String) {
        require!(env::promise_results_count() == 1, "ERR_EXPECT_ONE_PROMISE");
        let mut tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(tx.status == TxStatus::Executing, "ERR_NOT_EXECUTING");

        let succeeded = matches!(env::promise_result(0), PromiseResult::Successful(_));
        let amount = tx.amount.0;

        if succeeded {
            tx.status = TxStatus::Executed;
            self.total_spent = self.total_spent.checked_add(amount).expect("ERR_OVERFLOW");
            self.tx_count += 1;
            let mut agent = self.agents.get(&tx.agent).cloned().expect("ERR_NO_AGENT");
            agent.lifetime_executed =
                U128(agent.lifetime_executed.0.checked_add(amount).expect("ERR_OVERFLOW"));
            self.agents.insert(tx.agent.clone(), agent);
            emit(
                "payment_executed",
                serde_json::json!({
                    "id": id, "agent": tx.agent, "recipient": tx.recipient,
                    "amount": amount.to_string(),
                }),
            );
        } else {
            tx.status = TxStatus::Failed;
            self.refund_spent(&mut tx);
            emit(
                "payment_failed",
                serde_json::json!({
                    "id": id, "recipient": tx.recipient,
                    "amount": amount.to_string(), "budget_restored": true,
                }),
            );
        }
        self.transactions.insert(id, tx);
    }

    /// Only refund into the same day bucket the spend was charged to.
    fn refund_spent(&mut self, tx: &mut Transaction) {
        let amount = tx.amount.0;
        if tx.spent_day == Some(self.day) {
            self.spent_today = self.spent_today.saturating_sub(amount);
            if let Some(mut agent) = self.agents.get(&tx.agent).cloned() {
                if agent.day == self.day {
                    agent.spent_today = U128(agent.spent_today.0.saturating_sub(amount));
                    self.agents.insert(tx.agent.clone(), agent);
                }
            }
        }
        tx.spent_day = None;
    }

    // ---------------------------------------------------------- owner decisions

    pub fn approve_payment(&mut self, id: String) {
        self.assert_owner();
        require!(!self.paused, "ERR_PAUSED");
        self.roll_day();
        let mut tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(tx.status == TxStatus::PendingApproval, "ERR_NOT_PENDING");
        require!(
            env::block_timestamp() <= tx.expires_at_ns,
            "ERR_REQUEST_EXPIRED"
        );
        require!(
            self.policy.recipients.contains(&tx.recipient),
            "ERR_RECIPIENT_DELISTED"
        );
        let cap = self.policy.max_per_tx;
        require!(tx.amount.0 <= cap, "ERR_EXCEEDS_CURRENT_POLICY");

        let mut agent = self.agents.get(&tx.agent).cloned().expect("ERR_NO_AGENT");
        require!(agent.active, "ERR_AGENT_DEACTIVATED");
        agent.pending_count = agent.pending_count.saturating_sub(1);
        self.agents.insert(tx.agent.clone(), agent);

        tx.status = TxStatus::Executing;
        tx.decided_by = Some(env::predecessor_account_id());
        self.transactions.insert(id.clone(), tx);
        emit("payment_approved", serde_json::json!({ "id": id, "by": self.owner }));
        self.begin_execution(&id);
    }

    pub fn reject_payment(&mut self, id: String) {
        self.assert_owner();
        let mut tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(tx.status == TxStatus::PendingApproval, "ERR_NOT_PENDING");

        self.reserved_total = self.reserved_total.saturating_sub(tx.amount.0);
        if let Some(mut agent) = self.agents.get(&tx.agent).cloned() {
            agent.reserved = U128(agent.reserved.0.saturating_sub(tx.amount.0));
            agent.pending_count = agent.pending_count.saturating_sub(1);
            self.agents.insert(tx.agent.clone(), agent);
        }
        self.pending.remove(&id);
        tx.status = TxStatus::Rejected;
        tx.decided_by = Some(env::predecessor_account_id());
        tx.reason = "Rejected by owner".into();
        self.transactions.insert(id.clone(), tx);
        emit("payment_rejected", serde_json::json!({ "id": id, "by": self.owner }));
    }

    /// Expire a stale pending request. Permissionless: can only ever *reduce*
    /// spend authority, never grant it.
    pub fn expire_pending(&mut self, id: String) {
        let mut tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(tx.status == TxStatus::PendingApproval, "ERR_NOT_PENDING");
        require!(
            env::block_timestamp() > tx.expires_at_ns,
            "ERR_NOT_EXPIRED_YET"
        );
        self.reserved_total = self.reserved_total.saturating_sub(tx.amount.0);
        if let Some(mut agent) = self.agents.get(&tx.agent).cloned() {
            agent.reserved = U128(agent.reserved.0.saturating_sub(tx.amount.0));
            agent.pending_count = agent.pending_count.saturating_sub(1);
            self.agents.insert(tx.agent.clone(), agent);
        }
        self.pending.remove(&id);
        tx.status = TxStatus::Rejected;
        tx.reason = "Expired before owner decision".into();
        self.transactions.insert(id.clone(), tx);
        emit("payment_expired", serde_json::json!({ "id": id }));
    }

    // -------------------------------------------------- fail-closed recovery

    /// If a callback was lost (out of gas), the tx is stuck `Executing`.
    /// Moves it to NeedsReconciliation and KEEPS the budget consumed.
    pub fn mark_stuck(&mut self, id: String) {
        self.assert_owner();
        let mut tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(tx.status == TxStatus::Executing, "ERR_NOT_EXECUTING");
        let started = tx.execution_started_ns.expect("ERR_NO_START");
        require!(
            env::block_timestamp() > started + STUCK_TIMEOUT_NS,
            "ERR_TOO_EARLY"
        );
        tx.status = TxStatus::NeedsReconciliation;
        self.transactions.insert(id.clone(), tx);
        emit("needs_reconciliation", serde_json::json!({ "id": id }));
    }

    /// Owner attests the real receipt outcome after checking an explorer/RPC.
    /// Fail-closed: nothing is refunded unless the owner asserts failure.
    pub fn settle_stuck(&mut self, id: String, transfer_succeeded: bool, receipt_ref: String) {
        self.assert_owner();
        require!(!receipt_ref.is_empty() && receipt_ref.len() <= 128, "ERR_BAD_RECEIPT_REF");
        let mut tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(
            tx.status == TxStatus::NeedsReconciliation,
            "ERR_NOT_RECONCILING"
        );
        if transfer_succeeded {
            tx.status = TxStatus::Executed;
            self.total_spent = self.total_spent.checked_add(tx.amount.0).expect("ERR_OVERFLOW");
            self.tx_count += 1;
        } else {
            tx.status = TxStatus::Failed;
            self.refund_spent(&mut tx);
        }
        self.transactions.insert(id.clone(), tx);
        emit(
            "reconciled",
            serde_json::json!({
                "id": id, "succeeded": transfer_succeeded,
                "receipt_ref": receipt_ref, "attested_by": self.owner,
            }),
        );
    }

    /// Reclaim storage from terminal records. `seen_ids` is retained, so
    /// pruning can NEVER re-enable replay of that ID.
    pub fn prune_terminal(&mut self, id: String) {
        self.assert_owner();
        let tx = self.transactions.get(&id).cloned().expect("ERR_NO_TX");
        require!(tx.status.is_terminal(), "ERR_NOT_TERMINAL");
        require!(self.seen_ids.get(&id).copied().unwrap_or(false), "ERR_ID_NOT_RECORDED");
        self.transactions.remove(&id);
        emit("pruned", serde_json::json!({ "id": id }));
    }

    // ---------------------------------------------------------- views

    pub fn get_policy(&self) -> PolicyView {
        PolicyView {
            max_per_tx: U128(self.policy.max_per_tx),
            daily_limit: U128(self.policy.daily_limit),
            approval_threshold: U128(self.policy.approval_threshold),
            recipients: self.policy.recipients.iter().cloned().collect(),
            paused: self.paused,
        }
    }

    pub fn get_transaction(&self, id: String) -> Option<Transaction> {
        self.transactions.get(&id).cloned()
    }

    pub fn get_agent(&self, id: AccountId) -> Option<Agent> {
        self.agents.get(&id).cloned()
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn list_pending(&self, from: u32, limit: u32) -> Vec<Transaction> {
        self.pending
            .iter()
            .skip(from as usize)
            .take(limit.min(100) as usize)
            .filter_map(|id| self.transactions.get(id).cloned())
            .collect()
    }

    pub fn get_stats(&self) -> StatsView {
        StatsView {
            day: self.day,
            spent_today: U128(self.spent_today),
            reserved_total: U128(self.reserved_total),
            remaining_daily: U128(
                self.policy.daily_limit
                    .saturating_sub(self.spent_today.saturating_add(self.reserved_total)),
            ),
            total_spent: U128(self.total_spent),
            tx_count: self.tx_count,
            blocked_count: self.blocked_count,
            pending_count: self.pending.len(),
            usable_balance: U128(Self::usable_balance()),
            storage_bytes: env::storage_usage(),
            paused: self.paused,
        }
    }

    /// Cheap consistency check used by tests and the dashboard health chip.
    pub fn audit_invariants(&self) -> InvariantReport {
        let mut sum = 0u128;
        let mut n = 0u32;
        for id in self.pending.iter() {
            if let Some(tx) = self.transactions.get(id) {
                if tx.status == TxStatus::PendingApproval {
                    sum = sum.saturating_add(tx.amount.0);
                    n += 1;
                }
            }
        }
        InvariantReport {
            reserved_total: U128(self.reserved_total),
            pending_sum: U128(sum),
            pending_matches: sum == self.reserved_total && n == self.pending.len(),
            pending_count: n,
        }
    }
}
