module supplychain::supplychain {
    use sui::event::emit;
    use sui::tx_context;
    use sui::sui::SUI;
    use sui::transfer;
    use std::string;
    use std::vector;
    use sui::object::UID;
    use sui::coin::Coin;
    use sui::balance::Balance;
    use sui::clock::Clock;

    //
    // ERROR CODES
    //
    const E_ITEM_NOT_FOUND: u64 = 1;
    const E_INSUFFICIENT_QUANTITY: u64 = 2;
    const E_ONLY_OWNER: u64 = 3;
    const E_RESTOCK_NOT_NEEDED: u64 = 4;
    const E_INVALID_SUPPLIER: u64 = 5;
    const E_DELIVERY_NOT_READY: u64 = 6;
    const E_INVALID_ESCROW: u64 = 7;

    //
    // SUPPLIERS
    //
    const SUPPLIER_APPLE: u64 = 1;
    const SUPPLIER_SAMSUNG: u64 = 2;
    const SUPPLIER_NIKE: u64 = 3;

    fun is_valid_supplier(id: u64): bool {
        id == SUPPLIER_APPLE || id == SUPPLIER_SAMSUNG || id == SUPPLIER_NIKE
    }

    //
    // OBJECTS
    //
    public struct AdminCap has key { id: UID }



    public struct Item has key, store {
        id: UID,
        name: vector<u8>,
        supplier_id: u64,
        price: u64,
        quantity: u64,
        threshold: u64,
        restock_amount: u64,
    }

    public struct Shelf has key, store {
        id: UID,
        items: vector<Item>,
    }

    public struct Shop has key, store {
        id: UID,
        name: string::String,
        owner: address,
        shelves: vector<Shelf>,
    }

    public struct ShopRegistry has key {
        id: UID,
        stores: vector<Shop>,
    }

    // Escrow Order for DeFi supplier financing
    public struct Order has key, store {
        id: UID,
        store_address: address,
        supplier_id: u64,
        item_name: vector<u8>,
        quantity: u64,
        total_price: u64,
        escrow_balance: Balance<SUI>,
        created_at: u64,
        release_delay: u64,  // in milliseconds (e.g., 10000 = 10 seconds)
    }

    //
    // EVENTS
    //
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

    public struct OrderCreatedEvent has store, copy, drop {
        order_id: address,
        store_address: address,
        supplier_id: u64,
        item_name: vector<u8>,
        quantity: u64,
        total_price: u64,
        created_at: u64,
    }

    public struct EscrowReleasedEvent has store, copy, drop {
        order_id: address,
        supplier_id: u64,
        total_price: u64,
    }

    //
    // HELPERS
    //
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

    fun clone_u8_vec(v: &vector<u8>): vector<u8> {
        let len = vector::length(v);
        let mut out = vector::empty<u8>();
        let mut i = 0;
        while (i < len) {
            vector::push_back(&mut out, *vector::borrow(v, i));
            i = i + 1;
        };
        out
    }

    fun find_item_index(items: &vector<Item>, name: &vector<u8>): u64 {
        let len = vector::length(items);
        let mut i = 0;
        while (i < len) {
            let it = vector::borrow(items, i);
            if (it.name == *name) { return i };
            i = i + 1;
        };
        abort E_ITEM_NOT_FOUND
    }

    fun assert_only_owner(shop: &Shop, user: address) {
        assert!(shop.owner == user, E_ONLY_OWNER);
    }

    //
    // OBJECT CREATION
    //
    public fun create_admin(ctx: &mut TxContext): AdminCap {
        AdminCap { id: sui::object::new(ctx) }
    }

    public fun create_shelf(ctx: &mut TxContext): Shelf {
        Shelf { id: object::new(ctx), items: vector::empty<Item>() }
    }

    public fun create_item(
        name: string::String,
        supplier_id: u64,
        price: u64,
        quantity: u64,
        threshold: u64,
        restock_amount: u64,
        ctx: &mut TxContext
    ): Item {
        Item {
            id: object::new(ctx),
            name: string_to_bytes(&name),
            supplier_id,
            price,
            quantity,
            threshold,
            restock_amount,
        }
    }

    public fun create_shop_internal(
        name: string::String,
        shelvesnr: u64,
        ctx: &mut TxContext
    ): Shop {
        let mut shelves = vector::empty<Shelf>();
        let mut i = 0;
        while (i < shelvesnr) {
            let shelf = create_shelf(ctx);
            vector::push_back(&mut shelves, shelf);
            i = i + 1;
        };
        Shop {
            id: object::new(ctx),
            name,
            owner: sui::tx_context::sender(ctx),
            shelves,
        }
    }

    entry fun create_shop(
        name: string::String,
        shelvesnr: u64,
        ctx: &mut TxContext
    ) {
        
        let shop = create_shop_internal(name, shelvesnr, ctx);
        transfer::transfer(shop, sui::tx_context::sender(ctx));
    }

    //
    // MODIFY SHOP
    //
    entry fun add_item(
        shop: &mut Shop,
        shelf_index: u64,
        name: string::String,
        supplier_id: u64,
        price: u64,
        quantity: u64,
        threshold: u64,
        restock_amount: u64,
        ctx: &mut TxContext
    ) {
        assert_only_owner(shop, sui::tx_context::sender(ctx));
        assert!(is_valid_supplier(supplier_id), E_INVALID_SUPPLIER);

        let item = create_item(name, supplier_id, price, quantity, threshold, restock_amount, ctx);
        let shelf_ref = vector::borrow_mut(&mut shop.shelves, shelf_index);
        vector::push_back(&mut shelf_ref.items, item);
    }

    entry fun buy_item(
        shop: &mut Shop,
        shelf_index: u64,
        name: string::String,
        qty: u64,
        ctx: &mut TxContext
    ) {
        let shelf_ref = vector::borrow_mut(&mut shop.shelves, shelf_index);
        let name_bytes = string_to_bytes(&name);
        let idx = find_item_index(&shelf_ref.items, &name_bytes);
        let item_ref = vector::borrow_mut(&mut shelf_ref.items, idx);

        assert!(item_ref.quantity >= qty, E_INSUFFICIENT_QUANTITY);
        item_ref.quantity = item_ref.quantity - qty;
        let total = item_ref.price * qty;

        emit(PurchaseEvent {
            shop_addr: shop.owner,
            buyer: sui::tx_context::sender(ctx),
            item_name: name_bytes,
            quantity: qty,
            total_price: total
        });

        if (needs_restock(item_ref)) {
            emit(RestockEvent {
                shop_addr: shop.owner,
                item_name: string_to_bytes(&name),
                new_quantity: item_ref.quantity
            });
        }
    }

    public fun restock_manual(
        shop: &mut Shop,
        shelf_index: u64,
        name: string::String,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert_only_owner(shop, sui::tx_context::sender(ctx));
        let shelf_ref = vector::borrow_mut(&mut shop.shelves, shelf_index);
        let name_bytes = string_to_bytes(&name);
        let idx = find_item_index(&shelf_ref.items, &name_bytes);
        let item_ref = vector::borrow_mut(&mut shelf_ref.items, idx);

        item_ref.quantity = item_ref.quantity + amount;

        emit(RestockEvent {
            shop_addr: shop.owner,
            item_name: name_bytes,
            new_quantity: item_ref.quantity
        });
    }

    public fun auto_restock(
        shop: &mut Shop,
        shelf_index: u64,
        name: string::String,
        ctx: &mut TxContext
    ) {
        assert_only_owner(shop, sui::tx_context::sender(ctx));
        let shelf_ref = vector::borrow_mut(&mut shop.shelves, shelf_index);
        let name_bytes = string_to_bytes(&name);
        let idx = find_item_index(&shelf_ref.items, &name_bytes);
        let item_ref = vector::borrow_mut(&mut shelf_ref.items, idx);

        assert!(needs_restock(item_ref), E_RESTOCK_NOT_NEEDED);
        assert!(is_valid_supplier(item_ref.supplier_id), E_INVALID_SUPPLIER);

        item_ref.quantity = item_ref.quantity + item_ref.restock_amount;

        emit(RestockEvent {
            shop_addr: shop.owner,
            item_name: name_bytes,
            new_quantity: item_ref.quantity
        });
    }

    //
    // GETTERS
    //
    public fun get_shop_name(shop: &Shop): &string::String {
        &shop.name
    }

    public fun get_shop_owner(shop: &Shop): address {
        shop.owner
    }

    public fun get_shelves_count(shop: &Shop): u64 {
        vector::length(&shop.shelves)
    }

    public fun get_shelf(shop: &Shop, shelf_index: u64): &Shelf {
        vector::borrow(&shop.shelves, shelf_index)
    }

    public fun get_items_count(shelf: &Shelf): u64 {
        vector::length(&shelf.items)
    }

    public fun get_item(shelf: &Shelf, item_index: u64): &Item {
        vector::borrow(&shelf.items, item_index)
    }

    public fun get_item_by_name(shelf: &Shelf, name: string::String): &Item {
        let name_bytes = string_to_bytes(&name);
        let idx = find_item_index(&shelf.items, &name_bytes);
        vector::borrow(&shelf.items, idx)
    }

    //
    // ESCROW & DEFI FUNCTIONS
    //
    /// Create an escrow order for supplier financing
    /// The SUI is locked (as a balance, not a coin) until the release timer expires
        public fun create_order(
        store_address: address,
        supplier_id: u64,
        item_name: vector<u8>,
        quantity: u64,
        total_price: u64,
        payment_coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ): Order {
        assert!(is_valid_supplier(supplier_id), E_INVALID_SUPPLIER);

        let coin_value = sui::coin::value(&payment_coin);
        assert!(coin_value >= total_price, E_INVALID_ESCROW);

        // 🔹 Convert coin → balance
        let mut balance = sui::coin::into_balance(payment_coin);

        // 🔹 Split escrow amount FROM BALANCE
        let escrow_balance = sui::balance::split(&mut balance, total_price);

        // 🔹 Return remaining balance (if any)
        if (sui::balance::value(&balance) > 0) {
            let remainder_coin = sui::coin::from_balance(balance, ctx);
            transfer::public_transfer(remainder_coin, store_address);
        } else {
            sui::balance::destroy_zero(balance);
        };

        let item_name_for_event = clone_u8_vec(&item_name);

        let order = Order {
            id: object::new(ctx),
            store_address,
            supplier_id,
            item_name,
            quantity,
            total_price,
            escrow_balance,
            created_at: sui::clock::timestamp_ms(clock),
            release_delay: 10_000,
        };

        emit(OrderCreatedEvent {
            order_id: object::id_address(&order),
            store_address,
            supplier_id,
            item_name: item_name_for_event,
            quantity,
            total_price,
            created_at: order.created_at,
        });

        order
    }


        /// Release escrowed funds once timer expires
    /// Transfers the escrowed SUI back to the caller
    public fun release_escrow(
        order: Order,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let elapsed = sui::clock::timestamp_ms(clock) - order.created_at;
        assert!(elapsed >= order.release_delay, E_DELIVERY_NOT_READY);

        // capture order id BEFORE destructuring
        let oid = object::id_address(&order);

        let Order {
            id,
            store_address: _,
            supplier_id,
            item_name: _,
            quantity: _,
            total_price,
            escrow_balance,
            created_at: _,
            release_delay: _,
        } = order;

        object::delete(id);

        let escrow_coin = sui::coin::from_balance(escrow_balance, ctx);

        sui::transfer::public_transfer(
            escrow_coin,
            sui::tx_context::sender(ctx)
        );

        emit(EscrowReleasedEvent {
            order_id: oid,
            supplier_id,
            total_price,
        });
    }

    /// Get order details
    public fun order_store_address(order: &Order): address {
        order.store_address
    }

    public fun order_supplier_id(order: &Order): u64 {
        order.supplier_id
    }

    public fun order_total_price(order: &Order): u64 {
        order.total_price
    }

    public fun order_created_at(order: &Order): u64 {
        order.created_at
    }

    public fun order_release_delay(order: &Order): u64 {
        order.release_delay
    }

    public fun order_quantity(order: &Order): u64 {
        order.quantity
    }

    public fun order_item_name(order: &Order): vector<u8> {
        clone_u8_vec(&order.item_name)
    }

}
