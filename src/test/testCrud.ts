import { SupabaseService } from "../services/SupabaseService";

async function main() {

    console.clear();

    console.log("==========================================");
    console.log("      FOODADMIN - CRUD TEST PRODUCTS");
    console.log("==========================================\n");

    console.time("CRUD");

    const db = new SupabaseService();

    try {

        //---------------------------------------------------
        // CREATE
        //---------------------------------------------------

        const product = {

            id: crypto.randomUUID(),

            name: "Pizza Napolitana",

            description: "Producto creado desde el test",

            price: 12990,

            cost: 6500,

            category: "Pizzas",

            available: true,

            image: "",

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString(),

            deleted: false

        };

        console.log("➜ Creando producto...");

        await db.saveProduct(product);

        console.log("✅ CREATE OK\n");

        //---------------------------------------------------
        // READ
        //---------------------------------------------------

        console.log("➜ Leyendo productos...");

        let products = await db.getProducts();

        const inserted = products.find(p => p.id === product.id);

        if (!inserted) {

            throw new Error("No se encontró el producto recién creado.");

        }

        console.log("✅ READ OK");
        console.table([inserted]);

        //---------------------------------------------------
        // UPDATE
        //---------------------------------------------------

        console.log("\n➜ Actualizando producto...");

        inserted.name = "Pizza Napolitana XXL";
        inserted.price = 14990;
        inserted.cost = 7000;
        inserted.description = "Producto actualizado desde CRUD Test";

        inserted.updatedAt = new Date().toISOString();

        await db.saveProduct(inserted);

        products = await db.getProducts();

        const updated = products.find(p => p.id === product.id);

        if (!updated) {

            throw new Error("No se encontró el producto actualizado.");

        }

        console.log("✅ UPDATE OK");
        console.table([updated]);

        //---------------------------------------------------
        // DELETE (Soft Delete)
        //---------------------------------------------------

        console.log("\n➜ Eliminando producto (Soft Delete)...");

        updated.deleted = true;
        updated.updatedAt = new Date().toISOString();

        await db.saveProduct(updated);

        products = await db.getProducts();

        const deleted = products.find(p => p.id === product.id);

        if (deleted) {

            throw new Error("El producto sigue apareciendo después del borrado lógico.");

        }

        console.log("✅ DELETE OK");

        //---------------------------------------------------
        // FINAL
        //---------------------------------------------------

        console.log("\n==========================================");
        console.log("🎉 CRUD COMPLETADO CORRECTAMENTE");
        console.log("==========================================");

    }
    catch (error) {

        console.error("\n❌ ERROR EN EL CRUD");
        console.error(error);

    }
    finally {

        console.timeEnd("CRUD");

    }

}

main();