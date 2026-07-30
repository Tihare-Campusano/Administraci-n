/**********************************************************************
 * FOODADMIN
 * Suite de pruebas automatizadas
 *
 * Parte 1/5
 * - Imports
 * - Helpers
 * - TestRunner
 * - Datos de prueba
 * - Funciones utilitarias
 *********************************************************************/

import { SecurityService } from "../services/SecurityService";
import { ProductService } from "../services/ProductService";
import { CustomerService } from "../services/CustomerService";
import { OrderService } from "../services/OrderService";
import { ExpenseService } from "../services/ExpenseService";
import { NoteService } from "../services/NoteService";
import { BackupService } from "../services/BackupService";

/**********************************************************************
 * COLORES
 *********************************************************************/

const COLORS = {
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#f59e0b",
  gray: "#6b7280",
  cyan: "#06b6d4",
  purple: "#9333ea"
};

function logGreen(text: string) {
  console.log(`%c${text}`, `color:${COLORS.green};font-weight:bold`);
}

function logRed(text: string) {
  console.log(`%c${text}`, `color:${COLORS.red};font-weight:bold`);
}

function logBlue(text: string) {
  console.log(`%c${text}`, `color:${COLORS.blue};font-weight:bold`);
}

function logYellow(text: string) {
  console.log(`%c${text}`, `color:${COLORS.yellow};font-weight:bold`);
}

function separator() {
  console.log(
    "────────────────────────────────────────────────────────────"
  );
}

/**********************************************************************
 * INTERFACES
 *********************************************************************/

interface ModuleResult {
  name: string;
  passed: number;
  failed: number;
  duration: number;
}

interface AssertOptions {
  stopModule?: boolean;
}

/**********************************************************************
 * TEST RUNNER
 *********************************************************************/

class TestRunner {

  private totalTests = 0;

  private passedTests = 0;

  private failedTests = 0;

  private moduleResults: ModuleResult[] = [];

  private suiteStart = performance.now();

  /**************************
   * ASSERT
   **************************/

  public assert(
    condition: boolean,
    message: string,
    options?: AssertOptions
  ) {

    this.totalTests++;

    if (condition) {

      this.passedTests++;

      logGreen(`   ✔ ${message}`);

      return;
    }

    this.failedTests++;

    logRed(`   ✖ ${message}`);

    if (options?.stopModule) {
      throw new Error(message);
    }
  }

  /**************************
   * EJECUTAR MÓDULO
   **************************/

  public async runModule(
    name: string,
    callback: () => Promise<void>
  ) {

    separator();

    logBlue(`🧪 ${name}`);

    separator();

    const beforePassed = this.passedTests;
    const beforeFailed = this.failedTests;

    const start = performance.now();

    try {

      await callback();

    } catch (error: any) {

      logRed(`\n❌ Error en módulo ${name}`);

      console.error(error);

    }

    const duration = Math.round(
      performance.now() - start
    );

    const passed =
      this.passedTests - beforePassed;

    const failed =
      this.failedTests - beforeFailed;

    this.moduleResults.push({

      name,

      passed,

      failed,

      duration

    });

    if (failed === 0) {

      logGreen(`\n✅ ${name} completado`);

    } else {

      logYellow(
        `\n⚠ ${name} terminó con ${failed} error(es)`
      );

    }

    console.log(
      `⏱ Tiempo: ${duration} ms\n`
    );
  }

  /**************************
   * RESUMEN
   **************************/

  public finish() {

    separator();

    console.log("");

    logBlue("📊 RESUMEN GENERAL");

    console.log("");

    this.moduleResults.forEach(module => {

      const icon =
        module.failed === 0
          ? "✅"
          : "❌";

      console.log(

        `${icon} ${module.name.padEnd(20, ".")}` +
        `${module.passed} OK / ${module.failed} FAIL` +
        `   (${module.duration} ms)`

      );

    });

    console.log("");

    separator();

    const totalTime = Math.round(

      performance.now() - this.suiteStart

    );

    const success =
      this.totalTests === 0
        ? 0
        : (
          this.passedTests /
          this.totalTests
        ) * 100;

    logBlue("RESULTADO FINAL");

    console.log("");

    console.log(`✔ Pruebas exitosas : ${this.passedTests}`);

    console.log(`✖ Pruebas fallidas : ${this.failedTests}`);

    console.log(`📋 Total pruebas   : ${this.totalTests}`);

    console.log(
      `📈 Éxito           : ${success.toFixed(1)} %`
    );

    console.log(
      `⏱ Tiempo total    : ${totalTime} ms`
    );

    console.log("");

    if (this.failedTests === 0) {

      logGreen(
        "🎉 TODAS LAS PRUEBAS FINALIZARON CORRECTAMENTE"
      );

    } else {

      logYellow(
        `⚠ Existen ${this.failedTests} pruebas fallidas`
      );

    }

    separator();
  }

}

/**********************************************************************
 * DATOS DE PRUEBA
 *********************************************************************/

function randomId() {

  return crypto.randomUUID();

}

function nowISO() {

  return new Date().toISOString();

}

function fakeProduct() {

  return {

    id: randomId(),

    name: `Producto Test ${Date.now()}`,

    description: "Producto creado automáticamente",

    price: 8500,

    cost: 4200,

    category: "General",

    available: true

  };

}

function fakeCustomer() {

  return {

    id: randomId(),

    name: `Cliente ${Date.now()}`,

    phone: "+56912345678",

    address: "Dirección Test",

    notes: "Cliente automático"

  };

}

function fakeExpense() {

  return {

    id: randomId(),

    title: "Gasto Automático",

    amount: 12000,

    category: "Test",

    date: nowISO(),

    createdAt: nowISO(),

    updatedAt: nowISO()

  };

}

function fakeNote() {

  return {

    title: "Nota Test",

    content: "Contenido generado automáticamente",

    category: "General",

    color: "#ec4899",

    isPinned: true,

    items: [

      {

        id: "task1",

        text: "Comprar harina",

        completed: false

      },

      {

        id: "task2",

        text: "Comprar azúcar",

        completed: false

      }

    ]

  };

}

/**********************************************************************
 * PARTE 2/5
 * - Seguridad
 * - Productos
 *********************************************************************/

/**********************************************************************
 * TEST SECURITY
 *********************************************************************/

async function testSecurity(runner: TestRunner) {

  const securityService = new SecurityService();

  const pin = "1234";

  const hash = await securityService.hashPassword(pin);

  runner.assert(
    typeof hash === "string",
    "Hash generado"
  );

  runner.assert(
    hash.length > 20,
    "Hash posee longitud válida"
  );

  runner.assert(
    hash !== pin,
    "El hash no es igual al PIN"
  );

  // Guardar contraseña

  await securityService.setPassword(pin);

  const valid = await securityService.validatePassword(pin);

  runner.assert(
    valid === true,
    "Contraseña correcta"
  );

  const invalid = await securityService.validatePassword("0000");

  runner.assert(
    invalid === false,
    "Contraseña incorrecta rechazada"
  );

  // Distintos hashes

  const hash2 = await securityService.hashPassword("5678");

  runner.assert(
    hash !== hash2,
    "Cada contraseña genera hash diferente"
  );

  // Hash consistente

  const hash3 = await securityService.hashPassword(pin);

  runner.assert(
    hash === hash3,
    "Hash determinístico"
  );

  console.log("");

}

/**********************************************************************
 * TEST PRODUCTOS
 *********************************************************************/

async function testProducts(runner: TestRunner) {

  const productService = new ProductService();

  const product = fakeProduct();

  /**************************
   * CREAR
   **************************/

  const created =
    await productService.saveProduct(product);

  runner.assert(
    created.id.length > 0,
    "Producto creado"
  );

  runner.assert(
    created.name === product.name,
    "Nombre almacenado"
  );

  runner.assert(
    created.price === product.price,
    "Precio almacenado"
  );

  /**************************
   * BUSCAR
   **************************/

  const byId =
    await productService.getProductById(created.id);

  runner.assert(
    byId != null,
    "Buscar por ID"
  );

  runner.assert(
    byId?.id === created.id,
    "ID coincide"
  );

  /**************************
   * LISTAR
   **************************/

  const products =
    await productService.getAllProducts();

  runner.assert(
    products.some(p => p.id === created.id),
    "Producto aparece en listado"
  );

  /**************************
   * ACTUALIZAR
   **************************/

  created.price = 9999;

  created.description =
    "Producto actualizado automáticamente";

  await productService.saveProduct(created);

  const updated =
    await productService.getProductById(created.id);

  runner.assert(
    updated?.price === 9999,
    "Actualización de precio"
  );

  runner.assert(
    updated?.description ===
    "Producto actualizado automáticamente",
    "Actualización de descripción"
  );

  /**************************
   * VALIDACIONES
   **************************/

  runner.assert(
    updated!.cost < updated!.price,
    "Costo menor que precio"
  );

  runner.assert(
    updated!.available === true,
    "Producto disponible"
  );

  /**************************
   * BORRADO
   **************************/

  await productService.deleteProduct(created.id);

  const afterDelete =
    await productService.getAllProducts();

  runner.assert(

    !afterDelete.some(
      p => p.id === created.id
    ),

    "Soft delete correcto"

  );

  const deleted =
    await productService.getProductById(created.id);

  runner.assert(

    deleted == null ||

    deleted.available === false ||

    (deleted as any).deleted === true,

    "Producto ya no puede utilizarse"

  );

  /**************************
   * PRODUCTO INEXISTENTE
   **************************/

  const fake =
    await productService.getProductById(
      crypto.randomUUID()
    );

  runner.assert(

    fake == null,

    "Consulta inexistente devuelve null"

  );

  console.log("");

}

/**********************************************************************
 * PARTE 3/5
 * - Clientes
 * - Pedidos
 *********************************************************************/

/**********************************************************************
 * TEST CLIENTES
 *********************************************************************/

async function testCustomers(runner: TestRunner) {

  const customerService = new CustomerService();

  const customer = fakeCustomer();

  // CREAR

  const created =
    await customerService.saveCustomer(customer);

  runner.assert(
    created.id.length > 0,
    "Cliente creado"
  );

  runner.assert(
    created.name === customer.name,
    "Nombre correcto"
  );

  runner.assert(
    created.phone === customer.phone,
    "Teléfono correcto"
  );

  // BUSCAR

  const byId =
    await customerService.getCustomerById(created.id);

  runner.assert(
    byId != null,
    "Buscar cliente por ID"
  );

  runner.assert(
    byId?.address === customer.address,
    "Dirección correcta"
  );

  // LISTAR

  const customers =
    await customerService.getAllCustomers();

  runner.assert(
    customers.some(c => c.id === created.id),
    "Cliente aparece en listado"
  );

  // ACTUALIZAR

  created.phone = "+56999999999";
  created.notes = "Cliente actualizado";

  await customerService.saveCustomer(created);

  const updated =
    await customerService.getCustomerById(created.id);

  runner.assert(
    updated?.phone === "+56999999999",
    "Actualizar teléfono"
  );

  runner.assert(
    updated?.notes === "Cliente actualizado",
    "Actualizar notas"
  );

  // ELIMINAR

  await customerService.deleteCustomer(created.id);

  const afterDelete =
    await customerService.getAllCustomers();

  runner.assert(
    !afterDelete.some(c => c.id === created.id),
    "Soft delete cliente"
  );

  // CLIENTE INEXISTENTE

  const fake =
    await customerService.getCustomerById(
      crypto.randomUUID()
    );

  runner.assert(
    fake == null,
    "Cliente inexistente devuelve null"
  );

  console.log("");

}

/**********************************************************************
 * TEST PEDIDOS
 *********************************************************************/

async function testOrders(runner: TestRunner) {

  const customerService = new CustomerService();
  const orderService = new OrderService();

  const customer =
    await customerService.saveCustomer(
      fakeCustomer()
    );

  const subtotal =
    (2500 * 2) +
    (3500 * 1);

  const delivery = 1500;

  const total =
    subtotal + delivery;

  // CREAR PEDIDO

  const order =
    await orderService.createOrder({

      customerId: customer.id,

      items: [

        {
          productId: "prod01",
          name: "Cupcake Chocolate",
          price: 2500,
          quantity: 2
        },

        {
          productId: "prod02",
          name: "Cheesecake",
          price: 3500,
          quantity: 1
        }

      ],

      discount: 0,

      deliveryFee: delivery,

      paymentMethod: "Efectivo",

      paymentStatus: "unpaid",

      notes: "Pedido automático"

    });

  runner.assert(
    order.id.length > 0,
    "Pedido creado"
  );

  runner.assert(
    order.customerId === customer.id,
    "Cliente asociado"
  );

  runner.assert(
    order.products.length === 2,
    "Cantidad de productos"
  );

  runner.assert(
    order.total === total,
    "Cálculo del total"
  );

  runner.assert(
    order.status === "pending",
    "Estado inicial pendiente"
  );

  runner.assert(
    order.paymentStatus === "unpaid",
    "Pago inicial pendiente"
  );

  // BUSCAR

  const byId =
    await orderService.getOrderById(order.id);

  runner.assert(
    byId != null,
    "Buscar pedido"
  );

  // COMPLETAR

  await orderService.completeOrder(order.id);

  const completed =
    await orderService.getOrderById(order.id);

  runner.assert(
    completed?.status === "completed",
    "Pedido completado"
  );

  // PAGAR

  await orderService.togglePaymentStatus(order.id);

  const paid =
    await orderService.getOrderById(order.id);

  runner.assert(
    paid?.paymentStatus === "paid",
    "Pago actualizado"
  );

  // VOLVER A PENDIENTE

  await orderService.togglePaymentStatus(order.id);

  const unpaid =
    await orderService.getOrderById(order.id);

  runner.assert(
    unpaid?.paymentStatus === "unpaid",
    "Pago vuelve a pendiente"
  );

  // LISTADO

  const orders =
    await orderService.getAllOrders();

  runner.assert(
    orders.some(o => o.id === order.id),
    "Pedido aparece en listado"
  );

  // ELIMINAR

  await orderService.deleteOrderRecord(order.id);

  const afterDelete =
    await orderService.getAllOrders();

  runner.assert(
    !afterDelete.some(o => o.id === order.id),
    "Eliminar pedido"
  );

  // LIMPIEZA

  await customerService.deleteCustomer(customer.id);

  console.log("");

}

/**********************************************************************
 * PARTE 4/5
 * - Gastos
 * - Notas
 * - Backup
 *********************************************************************/

/**********************************************************************
 * TEST GASTOS
 *********************************************************************/

async function testExpenses(runner: TestRunner) {

  const expenseService = new ExpenseService();

  const expense = fakeExpense();

  // CREAR

  const created =
    await expenseService.saveExpense(expense);

  runner.assert(
    !!created.id,
    "Gasto creado"
  );

  runner.assert(
    created.amount === expense.amount,
    "Monto correcto"
  );

  runner.assert(
    created.category === expense.category,
    "Categoría correcta"
  );

  // LISTAR

  const expenses =
    await expenseService.getAllExpenses();

  runner.assert(
    expenses.some(e => e.id === created.id),
    "Gasto aparece en listado"
  );

  // ACTUALIZAR

  created.amount = 18000;
  created.title = "Compra Insumos Actualizada";

  await expenseService.saveExpense(created);

  const updated =
    (await expenseService.getAllExpenses())
      .find(e => e.id === created.id);

  runner.assert(
    updated?.amount === 18000,
    "Actualizar monto"
  );

  runner.assert(
    updated?.title === "Compra Insumos Actualizada",
    "Actualizar título"
  );

  // ELIMINAR

  await expenseService.deleteExpense(created.id);

  const afterDelete =
    await expenseService.getAllExpenses();

  runner.assert(
    !afterDelete.some(e => e.id === created.id),
    "Eliminar gasto"
  );

  console.log("");

}

/**********************************************************************
 * TEST NOTAS
 *********************************************************************/

async function testNotes(runner: TestRunner) {

  const noteService = new NoteService();

  const note = fakeNote();

  // CREAR

  const created =
    await noteService.saveNote(note);

  runner.assert(
    !!created.id,
    "Nota creada"
  );

  runner.assert(
    created.items.length === 2,
    "Checklist creado"
  );

  runner.assert(
    created.isPinned === true,
    "Nota fijada"
  );

  // OBTENER

  const saved =
    await noteService.getNoteById(created.id);

  runner.assert(
    saved != null,
    "Buscar nota"
  );

  // COMPLETAR ITEM

  await noteService.toggleCheckItem(
    created.id,
    "task1"
  );

  const checked =
    await noteService.getNoteById(created.id);

  const task =
    checked?.items.find(
      i => i.id === "task1"
    );

  runner.assert(
    task?.completed === true,
    "Completar tarea"
  );

  // DESMARCAR

  await noteService.toggleCheckItem(
    created.id,
    "task1"
  );

  const unchecked =
    await noteService.getNoteById(created.id);

  const task2 =
    unchecked?.items.find(
      i => i.id === "task1"
    );

  runner.assert(
    task2?.completed === false,
    "Desmarcar tarea"
  );

  // ELIMINAR

  await noteService.deleteNote(created.id);

  const deleted =
    await noteService.getNoteById(created.id);

  runner.assert(
    deleted == null,
    "Eliminar nota"
  );

  console.log("");

}

/**********************************************************************
 * TEST BACKUP
 *********************************************************************/

async function testBackup(runner: TestRunner) {

  const backupService =
    new BackupService();

  const json =
    await backupService.exportData();

  runner.assert(
    typeof json === "string",
    "Exportar JSON"
  );

  runner.assert(
    json.length > 20,
    "JSON no vacío"
  );

  const parsed =
    JSON.parse(json);

  runner.assert(
    typeof parsed.version === "number" || typeof parsed.version === "string",
    "Versión incluida"
  );

  runner.assert(
    Array.isArray(parsed.products),
    "Productos presentes"
  );

  runner.assert(
    Array.isArray(parsed.customers),
    "Clientes presentes"
  );

  runner.assert(
    Array.isArray(parsed.orders),
    "Pedidos presentes"
  );

  runner.assert(
    Array.isArray(parsed.expenses),
    "Gastos presentes"
  );

  // IMPORTAR

  try {

    await backupService.importData(json);

    runner.assert(
      true,
      "Importación correcta"
    );

  } catch {

    runner.assert(
      false,
      "Importación correcta"
    );

  }

  // JSON INVÁLIDO

  try {

    await backupService.importData(
      "{json_invalido}"
    );

    runner.assert(
      false,
      "JSON inválido rechazado"
    );

  } catch {

    runner.assert(
      true,
      "JSON inválido detectado"
    );

  }

  console.log("");

}

/**********************************************************************
 * PARTE 5/5
 * MAIN
 *
 * ✔ runFullAppTestSuite()
 * ✔ Banner profesional
 * ✔ Ejecución de módulos
 * ✔ Resumen final
 * ✔ Estadísticas
 * ✔ Tiempo total
 *********************************************************************/

async function runFullAppTestSuite(): Promise<void> {

  console.clear();

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                    ║");
  console.log("║              🍰 FOODADMIN AUTOMATED TEST SUITE                     ║");
  console.log("║                                                                    ║");
  console.log("║        Validación completa de todos los módulos del sistema         ║");
  console.log("║                                                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");
  console.log("");

  console.log("🚀 Iniciando pruebas...\n");

  const suiteStart = performance.now();

  const runner = new TestRunner();

  await runner.runModule(
    "🔐 Módulo de Seguridad",
    () => testSecurity(runner)
  );

  await runner.runModule(
    "📦 Módulo de Productos",
    () => testProducts(runner)
  );

  await runner.runModule(
    "👤 Módulo de Clientes",
    () => testCustomers(runner)
  );

  await runner.runModule(
    "🛍️ Módulo de Pedidos",
    () => testOrders(runner)
  );

  await runner.runModule(
    "💸 Módulo de Gastos",
    () => testExpenses(runner)
  );

  await runner.runModule(
    "📝 Módulo de Notas",
    () => testNotes(runner)
  );

  await runner.runModule(
    "💾 Módulo de Backup",
    () => testBackup(runner)
  );

  console.log("");

  console.log("════════════════════════════════════════════════════════════════════");
  console.log("                    🏁 EJECUCIÓN FINALIZADA");
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("");

  runner.finish();

  const totalTime = Math.round(
    performance.now() - suiteStart
  );

  console.log("");

  console.log("════════════════════════════════════════════════════════════════════");
  console.log("                    INFORMACIÓN GENERAL");
  console.log("════════════════════════════════════════════════════════════════════");

  console.log("");

  console.log(
    `📅 Fecha : ${new Date().toLocaleDateString()}`
  );

  console.log(
    `🕒 Hora  : ${new Date().toLocaleTimeString()}`
  );

  console.log(
    `⚡ Tiempo Total : ${totalTime} ms`
  );

  console.log("");

  console.log("════════════════════════════════════════════════════════════════════");
  console.log("              FOODADMIN TEST SUITE FINALIZADA");
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("");

}

runFullAppTestSuite()
  .then(() => {

    console.log("✅ Suite ejecutada correctamente.");

  })
  .catch(error => {

    console.error("");
    console.error("❌ ERROR GENERAL DE LA SUITE");
    console.error(error);
    console.error("");

  });

export {
  runFullAppTestSuite
};