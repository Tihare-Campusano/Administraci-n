import { SupabaseService } from "../services/SupabaseService";

async function main() {

    const db = new SupabaseService();

    const product = {

        id: crypto.randomUUID(),

        name: "Pizza Napolitana",

        description: "Producto de prueba",

        price: 12990,

        cost: 6500,

        category: "Pizzas",

        available: true,

        image: "",

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString(),

        deleted: false

    };

    await db.saveProduct(product);

    console.log("✅ Producto insertado");

    const products = await db.getProducts();

    console.table(products);

    const encontrado = products.find(p => p.id === product.id);

    if (encontrado) {
        console.log("✅ Se verificó correctamente la inserción.");
    } else {
        console.log("❌ El producto no existe en la base de datos.");
    }

}

main();