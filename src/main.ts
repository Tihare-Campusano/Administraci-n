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
import { NoteRepository } from './repositories/NoteRepository';
import { OrderRepository } from './repositories/OrderRepository';
import { showToast } from './components/Toast';
import { AuthLogin } from './components/AuthLogin';
import { SecurityService } from './services/SecurityService';

// Global Instances
const dashboardPage = new DashboardPage();
const activeOrdersPage = new ActiveOrdersPage();
const historyPage = new HistoryPage();
const catalogPage = new CatalogPage();
const clientsPage = new ClientsPage();
const notesPage = new NotesPage();
const backupPage = new BackupPage();
const orderModal = new OrderModal();
const authLogin = new AuthLogin();
const securityService = new SecurityService();

const orderRepository = new OrderRepository();
const productRepository = new ProductRepository();
const customerRepository = new CustomerRepository();
const noteRepository = new NoteRepository();

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
  try {
    const orders = await orderRepository.getAll();
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

async function cleanupOldSeedData() {
  try {
    const customers = await customerRepository.getAll();
    for (const c of customers) {
      if (c.id.startsWith('cli_seed_')) await customerRepository.delete(c.id);
    }

    const products = await productRepository.getAll();
    for (const p of products) {
      if (p.id.startsWith('prod_seed_')) await productRepository.delete(p.id);
    }

    const notes = await noteRepository.getAll();
    for (const n of notes) {
      if (n.id.startsWith('note_seed_')) await noteRepository.delete(n.id);
    }
  } catch (e) {
    // Silent fail if clean
  }
}

async function init() {
  try {
    await cleanupOldSeedData();
    
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
    authLogin.init(() => {
      backupPage.updateSecurityStatusUI();
      loadTabData(currentTab);
    });
    
    backupPage.init(() => loadTabData(currentTab), authLogin);
    
    // Enlazar botón de bloqueo manual del sidebar
    document.getElementById('btn-lock-app')?.addEventListener('click', () => {
      securityService.lockSession();
      authLogin.show('lock');
    });

    const hasPassword = await securityService.hasPasswordSet();

    if (!hasPassword) {
      // Si la base de datos de Supabase no tiene contraseña, pedir crear una
      authLogin.show('setup');
    } else {
      // Si la contraseña ya fue creada en Supabase, dar acceso directo a la app
      securityService.setAuthenticatedSession(true);
    }

    setupTabNavigation();
    loadTabData('dashboard');
  } catch (err) {
    showToast('Fallo al iniciar base de datos', 'danger');
  }
}

window.addEventListener('DOMContentLoaded', init);
