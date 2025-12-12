module supplychain::supplychain; 
use sui::object::{ new as new_uid};
use sui::tx_context::{sender};
use sui::event::emit;
use std::string;


const E_ITEM_NOT_FOUND: u64 = 1;
const E_INSUFFICIENT_QUANTITY: u64 = 2;
const E_ONLY_OWNER: u64 = 3;
const E_RESTOCK_NOT_NEEDED: u64 = 4;
const E_INVALID_SUPPLIER: u64 = 5;


const SUPPLIER_APPLE: u64 = 1;
const SUPPLIER_SAMSUNG: u64 = 2;
const SUPPLIER_NIKE: u64 = 3;

fun is_valid_supplier(id: u64): bool {
    id == SUPPLIER_APPLE || id == SUPPLIER_SAMSUNG || id == SUPPLIER_NIKE
}


public struct AdminCap has key {
    id: UID,
}

public struct Item has store, copy, drop {
    name: vector<u8>,
    supplier_id: u64,
    price: u64,
    quantity: u64,
    threshold: u64,
    restock_amount: u64,
}

public struct Inventory has store {
    items: vector<Item>
}

public struct Shop has key {
    id: UID,
    name: string::String,
    owner: address,
    inventory: Inventory,
}


public struct PurchaseEvent has store, copy, drop {
    shop_addr: address,
    buyer: address,
    item_name: vector<u8>,
    quantity: u64,
    total_price: u64,
}

public struct RestockEvent has store, copy, drop {
    shop_addr: address,
    item_name: vector<u8>,
    new_quantity: u64,
}


fun string_to_bytes(s: &string::String): vector<u8> {
    let bytes_ref = string::as_bytes(s); 
    let len = vector::length(bytes_ref);
    let mut v = vector::empty<u8>();
    let mut i = 0;
    while (i < len) {
        let b = *vector::borrow(bytes_ref, i);
        vector::push_back(&mut v, b);
        i = i + 1;
    };
    v
}



fun needs_restock(item: &Item): bool {
    item.quantity < item.threshold
}

fun find_item_index(items: &vector<Item>, name: &vector<u8>): u64 {
    let len = vector::length(items);
    let mut i = 0;

    while (i < len) {
        let it = vector::borrow(items, i);
        if (it.name == *name) {
            return i
        };
        i = i + 1;
    };

    abort E_ITEM_NOT_FOUND
}

fun assert_only_owner(shop: &Shop, user: address) {
    assert!(shop.owner == user, E_ONLY_OWNER);
}


public fun create_admin(ctx: &mut TxContext): AdminCap {
    AdminCap { id: new_uid(ctx) }
}

public fun create_shop(name: string::String, ctx: &mut TxContext): Shop {
    Shop {
        id: new_uid(ctx),
        name,
        owner: sender(ctx),
        inventory: Inventory { items: vector::empty<Item>() }
    }
}

public fun add_item(
    shop: &mut Shop,
    name: &string::String,
    supplier_id: u64,
    price: u64,
    quantity: u64,
    threshold: u64,
    restock_amount: u64,
    ctx: &mut TxContext
) {
    assert_only_owner(shop, sender(ctx));
    assert!(is_valid_supplier(supplier_id), E_INVALID_SUPPLIER);

    let item = Item {
        name: string_to_bytes(name),
        supplier_id,
        price,
        quantity,
        threshold,
        restock_amount
    };

    vector::push_back(&mut shop.inventory.items, item);
}

public fun buy_item(
    shop: &mut Shop,
    name: &string::String,
    qty: u64,
    ctx: &mut TxContext
) {
    let name_bytes = string_to_bytes(name);
    let idx = find_item_index(&shop.inventory.items, &name_bytes);

    let item_ref = vector::borrow_mut(&mut shop.inventory.items, idx);
    assert!(item_ref.quantity >= qty, E_INSUFFICIENT_QUANTITY);

    item_ref.quantity = item_ref.quantity - qty;
    let total = item_ref.price * qty;

    emit(PurchaseEvent {
        shop_addr: shop.owner,
        buyer: sender(ctx),
        item_name: name_bytes,
        quantity: qty,
        total_price: total
    });

    if (needs_restock(item_ref)) {
        emit(RestockEvent {
            shop_addr: shop.owner,
            item_name: string_to_bytes(name),
            new_quantity: item_ref.quantity
        });
    }
}

public fun restock_manual(
    shop: &mut Shop,
    name: &string::String,
    amount: u64,
    ctx: &mut TxContext
) {
    assert_only_owner(shop, sender(ctx));

    let name_bytes = string_to_bytes(name);
    let idx = find_item_index(&shop.inventory.items, &name_bytes);

    let item_ref = vector::borrow_mut(&mut shop.inventory.items, idx);
    item_ref.quantity = item_ref.quantity + amount;

    emit(RestockEvent {
        shop_addr: shop.owner,
        item_name: name_bytes,
        new_quantity: item_ref.quantity
    });
}

public fun auto_restock(
    shop: &mut Shop,
    name: &string::String,
    ctx: &mut TxContext
) {
    assert_only_owner(shop, sender(ctx));

    let name_bytes = string_to_bytes(name);
    let idx = find_item_index(&shop.inventory.items, &name_bytes);

    let item_ref = vector::borrow_mut(&mut shop.inventory.items, idx);
    assert!(needs_restock(item_ref), E_RESTOCK_NOT_NEEDED);
    assert!(is_valid_supplier(item_ref.supplier_id), E_INVALID_SUPPLIER);

    item_ref.quantity = item_ref.quantity + item_ref.restock_amount;

    emit(RestockEvent {
        shop_addr: shop.owner,
        item_name: name_bytes,
        new_quantity: item_ref.quantity
    });
}
