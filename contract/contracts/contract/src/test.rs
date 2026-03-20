#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger;
use soroban_sdk::{Env, String};

#[test]
fn test_send_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let secret = String::from_str(&env, "1234");
    let amount: i128 = 1000;
    let expiry: u64 = 600;

    client.send(&sender, &recipient, &secret, &(amount, expiry));

    let claimed = client.claim(&recipient, &secret, &sender, &(amount * 2,));
    assert!(claimed);

    let rem = client.get_remittance(&sender, &recipient, &secret);
    assert_eq!(rem.claimed, amount * 2);
    assert_eq!(rem.amount, amount);
    assert!(rem.is_claimed);
}

#[test]
fn test_wrong_secret_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let secret = String::from_str(&env, "1234");
    let wrong_secret = String::from_str(&env, "0000");
    let amount: i128 = 500;
    let expiry: u64 = 600;

    client.send(&sender, &recipient, &secret, &(amount, expiry));

    let claimed = client.claim(&recipient, &wrong_secret, &sender, &(amount * 2,));
    assert!(!claimed);
}

#[test]
fn test_cancel_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let secret = String::from_str(&env, "5678");
    let amount: i128 = 2000;
    let expiry: u64 = 1;

    client.send(&sender, &recipient, &secret, &(amount, expiry));
    env.ledger().set_timestamp(100);

    let cancelled = client.cancel(&sender, &recipient, &secret);
    assert!(cancelled);

    let rem = client.get_remittance(&sender, &recipient, &secret);
    assert!(rem.is_cancelled);
}

#[test]
fn test_cancel_before_expiry_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let secret = String::from_str(&env, "9999");
    let amount: i128 = 500;
    let expiry: u64 = 999999999;

    client.send(&sender, &recipient, &secret, &(amount, expiry));

    let cancelled = client.cancel(&sender, &recipient, &secret);
    assert!(!cancelled);
}

#[test]
fn test_claim_after_cancel_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let secret = String::from_str(&env, "4321");
    let amount: i128 = 1000;
    let expiry: u64 = 1;

    client.send(&sender, &recipient, &secret, &(amount, expiry));
    env.ledger().set_timestamp(100);

    client.cancel(&sender, &recipient, &secret);

    let claimed = client.claim(&recipient, &secret, &sender, &(amount * 2,));
    assert!(!claimed);
}

#[test]
fn test_not_found() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let secret = String::from_str(&env, "0000");

    let rem = client.get_remittance(&sender, &recipient, &secret);
    assert_eq!(rem.amount, 0);
}
