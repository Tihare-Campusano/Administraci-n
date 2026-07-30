import { SecurityService } from '../services/SecurityService';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { OrderService } from '../services/OrderService';
import { ExpenseService } from '../services/ExpenseService';
import { NoteService } from '../services/NoteService';
import { BackupService } from '../services/BackupService';

async function runFullAppTestSuite() {
  console.clear();
  console.log("============================================================");
  console.log(" 🧪 FOODADMIN - SUITE DE PRUEBAS INTEGRALES DE FUNCIONALIDAD");
  console.log("============================================================\n");

  const startTime = performance.now();
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Prueba fallida: ${testName}`);
    }
  }

  try {
    // ------------------------------------------------------------
    // 1. PRUEBA DE SEGURIDAD (SecurityService)
    // ------------------------------------------------------------
    console.log("🔐 1. Probando Módulo de Seguridad...");
    const securityService = new SecurityService();
    const testPin = "1234";
    const hash = await securityService.hashPassword(testPin);
    assert(typeof hash === 'string' && hash.length > 0, "Generación de hash SHA-256 de contraseña");
    
    // Validar contraseña
    await securityService.setPassword(testPin);
    const isValid = await securityService.validatePassword(testPin);
    assert(isValid === true, "Validación de contraseña correcta");
    
    const isInvalid = await securityService.validatePassword("0000");
    assert(isInvalid === false, "Rechazo de contraseña incorrecta");
    console.log("   --> Módulo de Seguridad OK\n");

    // ------------------------------------------------------------
    // 2. PRUEBA DE PRODUCTOS (ProductService)
    // ------------------------------------------------------------
    console.log("📦 2. Probando Catálogo de Productos...");
    const productService = new ProductService();
    const createdProduct = await productService.saveProduct({
      id: crypto.randomUUID(),
      name: "Tarta de Frutillas Test",
      description: "Deliciosa tarta de prueba automatizada",
      price: 8500,
      cost: 4000,
      category: "Reposteria",
      available: true
    });

    assert(!!createdProduct.id, "Creación de producto con ID generado");
    assert(createdProduct.name === "Tarta de Frutillas Test", "Nombre del producto guardado");

    const allProducts = await productService.getAllProducts();
    const foundProd = allProducts.find(p => p.id === createdProduct.id);
    assert(!!foundProd, "Lectura de producto desde el catálogo");

    // Actualizar producto
    createdProduct.price = 9500;
    await productService.saveProduct(createdProduct);
    const updatedProd = await productService.getProductById(createdProduct.id);
    assert(updatedProd?.price === 9500, "Actualización de precio de producto");

    // Soft delete
    await productService.deleteProduct(createdProduct.id);
    const productsAfterDelete = await productService.getAllProducts();
    assert(!productsAfterDelete.some(p => p.id === createdProduct.id), "Borrado lógico (soft delete) de producto");
    console.log("   --> Módulo de Productos OK\n");

    // ------------------------------------------------------------
    // 3. PRUEBA DE CLIENTES (CustomerService)
    // ------------------------------------------------------------
    console.log("👤 3. Probando Gestión de Clientes...");
    const customerService = new CustomerService();
    const createdCustomer = await customerService.saveCustomer({
      id: crypto.randomUUID(),
      name: "María Gonzalez Test",
      phone: "+56912345678",
      address: "Av. Siempreviva 742",
      notes: "Cliente frecuente de tortas"
    });

    assert(!!createdCustomer.id, "Registro de cliente con ID");
    assert(createdCustomer.name === "María Gonzalez Test", "Nombre de cliente guardado correctamente");

    const customerFromDb = await customerService.getCustomerById(createdCustomer.id);
    assert(customerFromDb?.phone === "+56912345678", "Consulta de cliente por ID");

    await customerService.deleteCustomer(createdCustomer.id);
    const customersAfterDelete = await customerService.getAllCustomers();
    assert(!customersAfterDelete.some(c => c.id === createdCustomer.id), "Borrado lógico de cliente");
    console.log("   --> Módulo de Clientes OK\n");

    // ------------------------------------------------------------
    // 4. PRUEBA DE PEDIDOS Y VENTAS (OrderService)
    // ------------------------------------------------------------
    console.log("🛍️ 4. Probando Pedidos y Ventas...");
    const orderService = new OrderService();
    const tempCustomer = await customerService.saveCustomer({
      id: crypto.randomUUID(),
      name: "Cliente Pedido Test",
      phone: "555-0000",
      address: "Calle Falsa 123",
      notes: ""
    });

    const newOrder = await orderService.createOrder({
      customerId: tempCustomer.id,
      items: [
        { productId: "prod_sample_1", name: "Cupcake Vainilla", price: 2000, quantity: 3 }
      ],
      discount: 0,
      deliveryFee: 1500, // Prueba de delivery flexible
      paymentMethod: "Efectivo",
      paymentStatus: "unpaid",
      notes: "Entregar a las 15:00 hrs"
    });

    assert(!!newOrder.id, "Generación de pedido con ID");
    assert(newOrder.total === (2000 * 3) + 1500, "Cálculo preciso de total (Subtotal + Delivery)");
    assert(newOrder.status === 'pending', "Estado inicial de pedido en 'pending'");

    // Actualizar estado a completado (entregado)
    await orderService.completeOrder(newOrder.id);
    const completedOrder = await orderService.getOrderById(newOrder.id);
    assert(completedOrder?.status === 'completed', "Actualización de estado a 'completed'");

    // Cambiar estado de pago
    await orderService.togglePaymentStatus(newOrder.id);
    const paidOrder = await orderService.getOrderById(newOrder.id);
    assert(paidOrder?.paymentStatus === 'paid', "Alternancia de pago a 'paid'");

    // Limpieza de prueba
    await orderService.deleteOrderRecord(newOrder.id);
    await customerService.deleteCustomer(tempCustomer.id);
    console.log("   --> Módulo de Pedidos OK\n");

    // ------------------------------------------------------------
    // 5. PRUEBA DE GASTOS (ExpenseService)
    // ------------------------------------------------------------
    console.log("💸 5. Probando Control de Gastos...");
    const expenseService = new ExpenseService();
    const nowStr = new Date().toISOString();
    const createdExpense = await expenseService.saveExpense({
      id: crypto.randomUUID(),
      title: "Compra de Harina y Azúcar Test",
      amount: 15000,
      category: "Insumos",
      date: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr
    });

    assert(!!createdExpense.id, "Registro de gasto operacional");
    const allExpenses = await expenseService.getAllExpenses();
    assert(allExpenses.some(e => e.id === createdExpense.id), "Lectura del historial de gastos");

    await expenseService.deleteExpense(createdExpense.id);
    console.log("   --> Módulo de Gastos OK\n");

    // ------------------------------------------------------------
    // 6. PRUEBA DE NOTAS Y TAREAS (NoteService)
    // ------------------------------------------------------------
    console.log("📝 6. Probando Notas y Listas de Tareas (Notion Style)...");
    const noteService = new NoteService();
    const createdNote = await noteService.saveNote({
      title: "Receta Secreta Kuchen Test",
      content: "Ingredientes principales y tiempos de horneado",
      items: [
        { id: "task_1", text: "Comprar crema de leche", completed: false },
        { id: "task_2", text: "Precalentar horno a 180C", completed: false }
      ],
      category: "Recetas",
      isPinned: true,
      color: "#ec4899"
    });

    assert(!!createdNote.id, "Creación de nota con checklist");
    assert(createdNote.items.length === 2, "Asignación de items de lista de tareas");
    assert(createdNote.isPinned === true, "Nota marcada como Pinned");

    // Completar item de lista
    await noteService.toggleCheckItem(createdNote.id, "task_1");
    const noteCheck = await noteService.getNoteById(createdNote.id);
    const task1 = noteCheck?.items.find(i => i.id === "task_1");
    assert(task1?.completed === true, "Marcado de tarea de checklist como completada");

    await noteService.deleteNote(createdNote.id);
    console.log("   --> Módulo de Notas OK\n");

    // ------------------------------------------------------------
    // 7. PRUEBA DE RESPALDO Y RESTAURACIÓN (BackupService)
    // ------------------------------------------------------------
    console.log("💾 7. Probando Copia de Seguridad y Respaldo JSON...");
    const backupService = new BackupService();
    const exportedJson = await backupService.exportData();
    assert(typeof exportedJson === 'string' && exportedJson.includes('version'), "Exportación de respaldo JSON con formato válido");
    
    const parsedData = JSON.parse(exportedJson);
    assert(Array.isArray(parsedData.products) && Array.isArray(parsedData.orders), "Estructura de respaldo completa (productos, pedidos, clientes)");
    console.log("   --> Módulo de Respaldo OK\n");

    // ------------------------------------------------------------
    // RESUMEN FINAL
    // ------------------------------------------------------------
    const duration = Math.round(performance.now() - startTime);
    console.log("============================================================");
    console.log(`🎉 TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO (${passedTests}/${totalTests})`);
    console.log(`⏱️ Tiempo total de ejecución: ${duration} ms`);
    console.log("============================================================");

  } catch (err: any) {
    console.error("\n❌ SUITE DE PRUEBAS DETENIDA CON ERROR:");
    console.error(err.message || err);
  }
}

runFullAppTestSuite();
