#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct Remittance {
    pub sender: Address,
    pub recipient: Address,
    pub secret: String,
    pub amount: i128,
    pub claimed: i128,
    pub expiry: u64,
    pub is_claimed: bool,
    pub is_cancelled: bool,
}

#[contracttype]
pub enum DataKey {
    Registry,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn send(
        env: Env,
        sender: Address,
        recipient: Address,
        secret: String,
        params: (i128, u64),
    ) -> bool {
        sender.require_auth();
        let (amount, expiry) = params;

        let remittance = Remittance {
            sender: sender.clone(),
            recipient: recipient.clone(),
            secret: secret.clone(),
            amount,
            claimed: 0,
            expiry: env.ledger().timestamp() + expiry,
            is_claimed: false,
            is_cancelled: false,
        };

        let key = Self::make_key(&env, &sender, &recipient, &secret);
        env.storage().persistent().set(&key, &remittance);

        true
    }

    pub fn claim(
        env: Env,
        recipient: Address,
        secret: String,
        sender: Address,
        params: (i128,),
    ) -> bool {
        recipient.require_auth();
        let (amount,) = params;

        let key = Self::make_key(&env, &sender, &recipient, &secret);
        let mut rem: Remittance = match env.storage().persistent().get(&key) {
            Some(r) => r,
            None => return false,
        };

        if rem.is_claimed || rem.is_cancelled {
            return false;
        }
        if rem.expiry <= env.ledger().timestamp() {
            return false;
        }

        rem.claimed = amount;
        rem.is_claimed = true;
        env.storage().persistent().set(&key, &rem);

        true
    }

    pub fn cancel(env: Env, sender: Address, recipient: Address, secret: String) -> bool {
        sender.require_auth();

        let key = Self::make_key(&env, &sender, &recipient, &secret);
        let mut rem: Remittance = match env.storage().persistent().get(&key) {
            Some(r) => r,
            None => return false,
        };

        if rem.is_cancelled || rem.is_claimed {
            return false;
        }
        if rem.expiry > env.ledger().timestamp() {
            return false;
        }

        rem.is_cancelled = true;
        env.storage().persistent().set(&key, &rem);

        true
    }

    pub fn get_remittance(
        env: Env,
        sender: Address,
        recipient: Address,
        secret: String,
    ) -> Remittance {
        let key = Self::make_key(&env, &sender, &recipient, &secret);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Remittance {
                sender,
                recipient,
                secret,
                amount: 0,
                claimed: 0,
                expiry: 0,
                is_claimed: false,
                is_cancelled: false,
            })
    }

    fn make_key(_env: &Env, sender: &Address, recipient: &Address, secret: &String) -> String {
        let mut key = sender.to_string().to_bytes();
        key.push_back(58u8); // ':'
        key.append(&recipient.to_string().to_bytes());
        key.push_back(58u8); // ':'
        key.append(&secret.to_bytes());
        key.to_string()
    }
}

mod test;
