import { SupabaseService } from "../services/SupabaseService";

async function main() {

    console.clear();

    console.log("================================");
    console.log(" FOODADMIN CLOUD TEST");
    console.log("================================");

    const db = new SupabaseService();

    try {

        console.log("\nConectando...");

        const products = await db.getProducts();

        console.log("✅ Conexión correcta");

        console.log("Productos encontrados:", products.length);

    }

    catch (e) {

        console.error("❌ Error");

        console.error(e);

    }

}

main();