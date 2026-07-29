import { DashboardPage } from './pages/DashboardPage';
import { ActiveOrdersPage } from './pages/ActiveOrdersPage';
import { HistoryPage } from './pages/HistoryPage';
import { CatalogPage } from './pages/CatalogPage';
import { ClientsPage } from './pages/ClientsPage';
import { NotesPage } from './pages/NotesPage';
import { BackupPage } from './pages/BackupPage';
import { OrderModal } from './components/OrderModal';
import { ProductRepository } from './repositories/ProductRepository';
import { CustomerRepository } from './repositories/CustomerRepository';
import { Customer } from './models/Customer';
import { showToast } from './components/Toast';
import { PinLogin } from './components/PinLogin';
import { SecurityService } from './services/SecurityService';
import { SyncService } from './services/SyncService';

// Global Instances
const syncService = new SyncService();
const dashboardPage = new DashboardPage();
const activeOrdersPage = new ActiveOrdersPage();
const historyPage = new HistoryPage();
const catalogPage = new CatalogPage();
const clientsPage = new ClientsPage();
const notesPage = new NotesPage();
const backupPage = new BackupPage();
const orderModal = new OrderModal();
const pinLogin = new PinLogin();
const securityService = new SecurityService();

let currentTab = 'dashboard';

function setupTabNavigation() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab') || 'dashboard';
      switchTab(tab);
    });
  });
}

function switchTab(tabId: string) {
  currentTab = tabId;
  
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) link.classList.add('active');
    else link.classList.remove('active');
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === tabId) content.classList.add('active');
    else content.classList.remove('active');
  });

  loadTabData(tabId);
}

function loadTabData(tabId: string) {
  updateBadge();
  switch (tabId) {
    case 'dashboard':
      dashboardPage.load();
      break;
    case 'active-orders':
      activeOrdersPage.load();
      break;
    case 'sales-history':
      historyPage.load();
      break;
    case 'catalog':
      catalogPage.load();
      break;
    case 'clients':
      clientsPage.load();
      break;
    case 'notes':
      notesPage.load();
      break;
    case 'documentation':
      break;
  }
}

async function updateBadge() {
  const orderRepo = new (await import('./repositories/OrderRepository')).OrderRepository();
  try {
    const orders = await orderRepo.getAll();
    const activeCount = orders.filter(o => o.status === 'pending').length;
    const badge = document.getElementById('active-orders-badge');
    if (badge) {
      badge.textContent = activeCount.toString();
      badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.error('Badge update error', err);
  }
}

async function seedDatabaseIfEmpty() {
  const prodRepo = new ProductRepository();
  const custRepo = new CustomerRepository();
  const noteRepo = new (await import('./repositories/NoteRepository')).NoteRepository();

  const products = await prodRepo.getAll();
  const customers = await custRepo.getAll();
  const notes = await noteRepo.getAll();

  if (products.length === 0) {
    const dummyProducts = [
      { id: 'prod_seed_1', name: 'Brownie de Chocolate Fudge', price: 2000, cost: 800, category: 'Brownies', available: true, description: 'Brownie húmedo con chocolate premium y trozos de nuez.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'prod_seed_2', name: 'Queque Zanahoria-Nuez', price: 4500, cost: 1800, category: 'Queques', available: true, description: 'Esponjoso queque de zanahoria, nueces y frosting de queso crema.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'prod_seed_3', name: 'Cupcake de Red Velvet', price: 1800, cost: 600, category: 'Cupcakes', available: true, description: 'Cupcake clásico aterciopelado con crema batida de vainilla.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'prod_seed_4', name: 'Caja de 6 Mini Donitas', price: 3500, cost: 1200, category: 'Donas', available: true, description: 'Seis mini donas horneadas con cobertura glaseada de colores.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    for (const p of dummyProducts) await prodRepo.save(p);
  }

  if (customers.length === 0) {
    const dummyCustomers: Customer[] = [
      { id: 'cli_seed_1', name: 'Claudio Martínez', phone: '+569 8765 4321', address: 'Los Aromos 442', notes: 'Portón de madera.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deleted: false },
      { id: 'cli_seed_2', name: 'Tihare Campusano', phone: '+569 9876 5432', address: 'Av. Providencia 1202', notes: 'Dejar en conserjería.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deleted: false }
    ];
    for (const c of dummyCustomers) await custRepo.save(c);
  }

  if (notes.length === 0) {
    const dummyNotes = [
      {
        id: 'note_seed_1',
        title: 'Lista de Insumos Semanales',
        category: 'Compras',
        color: '#ec4899',
        content: 'Recordar pedir la harina antes del jueves.',
        isPinned: true,
        items: [
          { id: 'item_1', text: '20kg Harina de repostería', completed: true },
          { id: 'item_2', text: '5kg Manjar pastelero', completed: false },
          { id: 'item_3', text: '2kg Chocolate belga 70%', completed: false }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false
      },
      {
        id: 'note_seed_2',
        title: 'Receta Frosting Queso Crema',
        category: 'Recetas',
        color: '#3b82f6',
        content: '250g queso crema helado\n120g mantequilla sin sal\n400g azúcar flor tamizada\n1 cda extracto de vainilla pura.',
        isPinned: false,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false
      }
    ];
    for (const n of dummyNotes) await noteRepo.save(n);
  }
}

async function init() {
  try {
    await seedDatabaseIfEmpty();
    
    // Initialize components and pages
    dashboardPage.init(() => orderModal.open());
    activeOrdersPage.init((id) => orderModal.open(id), () => loadTabData(currentTab));
    historyPage.init(() => loadTabData(currentTab));
    catalogPage.init();
    clientsPage.init();
    notesPage.init();
    
    // Link quick add client inside order modal
    document.getElementById('link-quick-add-client')?.addEventListener('click', () => {
      orderModal.quickAddClientTrigger(clientsPage);
    });

    orderModal.init(() => loadTabData(currentTab));
    pinLogin.init(() => {
      backupPage.updateSecurityStatusUI();
    });
    
    backupPage.init(() => loadTabData(currentTab), pinLogin);
    
    // Enlazar botón de bloqueo manual del sidebar
    document.getElementById('btn-lock-app')?.addEventListener('click', () => {
      securityService.lockSession();
      pinLogin.show('lock');
    });

    // Validar seguridad al iniciar
    const isSecurityActive = await securityService.isSecurityEnabled();
    if (isSecurityActive) {
      pinLogin.show('lock');
    }
    
    // Iniciar sincronización automática si está habilitada
    const isSyncActive = await syncService.isSyncEnabled();
    if (isSyncActive) {
      syncService.startAutoSync();
      syncService.syncNow().catch(err => console.warn('Error al sincronizar al iniciar:', err));
    }

    // Escuchar evento de sincronización para actualizar la interfaz
    window.addEventListener('db-synced', () => {
      loadTabData(currentTab);
    });

    setupTabNavigation();
    loadTabData('dashboard');
  } catch (err) {
    showToast('Fallo al iniciar base de datos', 'danger');
  }
}

window.addEventListener('DOMContentLoaded', init);
