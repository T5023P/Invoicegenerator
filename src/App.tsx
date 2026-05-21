import React, { useState, useEffect } from 'react';
import { useFirebase } from './context/FirebaseContext';
import { Login } from './components/Login';
import { ClientCard } from './components/ClientCard';
import { InvoicePreview } from './components/InvoicePreview';
import { SettingsModal } from './components/SettingsModal';
import { compileInvoicePDF } from './services/pdfService';
import { 
  Plus, LogOut, Settings, Globe, 
  FileCheck2, PlusCircle, Briefcase, FileDigit, Cpu 
} from 'lucide-react';

export const App: React.FC = () => {
  const { 
    isFirebase, user, loading, clients, profile, invoices,
    logout, addClient, addInvoice 
  } = useFirebase();

  // Authentication bypass state (for local storage offline mode)
  const [bypassAuth, setBypassAuth] = useState(false);

  // Tab navigation state (for responsive mobile viewports)
  const [activeTab, setActiveTab] = useState<'control-center' | 'invoice-builder'>('control-center');

  // Modal open states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);

  // Selected client state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Form states for Invoice Scope Editor (updates in real-time)
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceNumber, setInvoiceNumber] = useState('101');
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; rate: number }>>([]);

  // Client addition states
  const [newBrandName, setNewBrandName] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newPrefix, setNewPrefix] = useState('INV-');

  // PDF compiling status
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileSuccess, setCompileSuccess] = useState(false);

  // 1. Resolve selected client reference
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // 2. Autofill form values when a client card is selected
  useEffect(() => {
    if (selectedClient) {
      setClientName(selectedClient.brandName);
      setClientEmail(selectedClient.email);
      setInvoicePrefix(selectedClient.invoiceNumberPrefix);
      setInvoiceNumber(String(selectedClient.lastInvoiceNumber + 1));

      // Auto-populate completed tasks as invoice line items
      const completedTasks = selectedClient.tasks.filter(t => t.completed);
      
      // If there are completed tasks, bill for them
      if (completedTasks.length > 0) {
        // Distribute the total budget evenly among tasks for billing demo,
        // or let user customize. We'll set a standard billing rate
        const ratePerMilestone = Math.round(selectedClient.budget / selectedClient.tasks.length);
        const items = completedTasks.map(t => ({
          description: t.text,
          quantity: 1,
          rate: ratePerMilestone
        }));
        setLineItems(items);
      } else {
        // Fallback: Populate a general item for project progress
        setLineItems([
          {
            description: `Milestone Deliverable: ${selectedClient.projectTitle}`,
            quantity: 1,
            rate: Math.round(selectedClient.budget * 0.5) // default 50% milestone billing
          }
        ]);
      }
    } else {
      // Clear forms if no client is selected
      setClientName('');
      setClientEmail('');
      setInvoicePrefix('INV-');
      setInvoiceNumber('101');
      setLineItems([]);
    }
  }, [selectedClientId, clients]);

  // Handle adding custom items to the active invoice preview
  const addCustomLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, rate: 0 }
    ]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = lineItems.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [field]: field === 'description' ? value : Number(value)
        };
      }
      return item;
    });
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, idx) => idx !== index);
    setLineItems(updated);
  };

  // Add a new client card to the control grid
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName || !newProjectTitle || !newBudget) return;

    const budgetVal = Number(newBudget);
    const newClientData = {
      brandName: newBrandName,
      projectTitle: newProjectTitle,
      budget: budgetVal,
      status: 'In Progress' as const,
      email: newClientEmail || 'billing@company.com',
      invoiceNumberPrefix: newPrefix || 'INV-',
      lastInvoiceNumber: 100,
      tasks: [
        {
          id: 'task-' + Math.random().toString(36).substring(2, 9),
          text: 'Kickoff meeting & scope review',
          completed: false,
          dueDate: new Date().toISOString().split('T')[0]
        }
      ]
    };

    const newId = await addClient(newClientData);
    
    // Select newly created client card
    setSelectedClientId(newId);

    // Reset fields
    setNewBrandName('');
    setNewProjectTitle('');
    setNewBudget('');
    setNewClientEmail('');
    setNewPrefix('INV-');
    setIsAddClientOpen(false);
  };

  // Compile PDF & sync invoice log
  const handleCompileInvoice = async () => {
    if (lineItems.length === 0) return;
    setIsCompiling(true);
    setCompileSuccess(false);

    const fullInvoiceNum = `${invoicePrefix}${invoiceNumber}`;
    const filename = `Invoice_${fullInvoiceNum}_${clientName.replace(/\s+/g, '_')}.pdf`;

    try {
      // Trigger browser compile & download
      const pdfBlob = await compileInvoicePDF('invoice-paper', filename);

      // Save historical invoice metadata, uploading blob to Storage if firebase enabled
      const totalAmount = lineItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0) * 1.05;
      
      const invoiceRecord = {
        clientId: selectedClient?.id || 'manual',
        clientName: clientName,
        invoiceNumber: fullInvoiceNum,
        date: new Date().toISOString().split('T')[0],
        amount: Math.round(totalAmount),
      };

      await addInvoice(invoiceRecord, pdfBlob);

      setCompileSuccess(true);
      setTimeout(() => {
        setCompileSuccess(false);
      }, 3000);
    } catch (error) {
      alert("Failed to generate PDF invoice. Check console log for details.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Authentication gate logic
  const showAuthGate = isFirebase && !user && !bypassAuth;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-ops)' }}>
        <Cpu className="animate-pulse" size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-ops-secondary)', fontSize: '0.9rem' }}>Synchronizing Apex Console...</p>
      </div>
    );
  }

  if (showAuthGate) {
    return <Login onBypass={() => setBypassAuth(true)} />;
  }

  return (
    <div className="app-container">
      {/* SideNavBar (Desktop Only) */}
      <aside className="side-nav">
        <div className="side-nav-brand">
          <h1>Operational HQ</h1>
          <p>Independent Professional</p>
        </div>
        <div className="side-nav-links">
          <button 
            className={`side-nav-link ${activeTab === 'control-center' ? 'active' : ''}`}
            onClick={() => setActiveTab('control-center')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Control Center</span>
          </button>
          <button 
            className={`side-nav-link ${activeTab === 'invoice-builder' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice-builder')}
          >
            <span className="material-symbols-outlined">description</span>
            <span>Invoice Builder</span>
          </button>
          <button className="side-nav-link">
            <span className="material-symbols-outlined">group</span>
            <span>Client Archive</span>
          </button>
          <button className="side-nav-link">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span>Financial Reports</span>
          </button>
          <button className="side-nav-link">
            <span className="material-symbols-outlined">help_outline</span>
            <span>Support</span>
          </button>
        </div>
        <button 
          className="btn-primary" 
          style={{ width: '100%', marginBottom: '1.5rem' }}
          onClick={() => {
            setActiveTab('invoice-builder');
            const input = document.getElementById('client-name');
            if (input) input.focus();
          }}
        >
          New Invoice
        </button>
        <div className="side-nav-footer">
          {isFirebase && user && (
            <button className="side-nav-link" onClick={logout}>
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile TopAppBar */}
      <header className="mobile-top-bar">
        <div className="mobile-brand">
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-ops-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-ops)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-ops-secondary)', fontSize: '18px' }}>person</span>
          </div>
          <h1>Freelance Portal</h1>
        </div>
        <div className="mobile-actions">
          {isFirebase && user && (
            <button className="btn-secondary" style={{ padding: '0.4rem' }} onClick={logout} title="Sign Out">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-danger)' }}>logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Left Panel: Operations Control Center */}
        <div className={`ops-panel ${activeTab !== 'control-center' ? 'mobile-hidden' : ''}`}>
        <div className="ops-header">
          <div className="ops-title-group">
            <h1>Apex Console</h1>
            <p>
              {isFirebase && user ? (
                <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }}></span>
                  Cloud Synced: {user.email}
                </span>
              ) : (
                <span style={{ color: 'var(--text-ops-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-ops-secondary)' }}></span>
                  Offline Sandbox Workspace
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)} title="Billing Remittance Settings">
              <Settings size={15} />
              <span>Remittance</span>
            </button>
            <button className="btn-secondary" onClick={() => setIsAddClientOpen(true)} title="Add Client Contract">
              <Plus size={15} />
              <span>Add Client</span>
            </button>
            {isFirebase && user && (
              <button className="btn-secondary" onClick={logout} title="Sign Out">
                <LogOut size={15} style={{ color: 'var(--color-danger)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Client Grid list */}
        <div className="section-title">
          <Briefcase size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Active Operations Grid</span>
        </div>

        <div className="clients-grid">
          {clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-ops-card)', borderRadius: '12px', border: '1px dashed var(--border-ops)' }}>
              <p style={{ color: 'var(--text-ops-secondary)', fontSize: '0.85rem' }}>No clients registered.</p>
              <button 
                onClick={() => setIsAddClientOpen(true)}
                className="btn-primary" 
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', marginTop: '1rem', marginInline: 'auto' }}
              >
                Create First Contract
              </button>
            </div>
          ) : (
            clients.map(client => (
              <ClientCard 
                key={client.id}
                client={client}
                isSelected={client.id === selectedClientId}
                onSelect={() => setSelectedClientId(client.id)}
              />
            ))
          )}
        </div>

        {/* Invoice Scope Editor Form */}
        <div className="scope-editor">
          <div className="section-title">
            <FileCheck2 size={16} style={{ color: 'var(--color-primary)' }} />
            <span>Scope & Billing Compiler</span>
          </div>

          <div className="input-grid">
            <div className="form-group">
              <label htmlFor="client-name">Billing Client Name</label>
              <input
                type="text"
                id="client-name"
                className="form-input"
                placeholder="Client Brand / Corp Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="client-email">Billing Email</label>
              <input
                type="email"
                id="client-email"
                className="form-input"
                placeholder="billing@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="inv-prefix">Invoice Prefix</label>
              <input
                type="text"
                id="inv-prefix"
                className="form-input"
                placeholder="e.g. SF-"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="inv-num">Invoice Number</label>
              <input
                type="number"
                id="inv-num"
                className="form-input"
                placeholder="101"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Line items modifier */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-ops-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Milestones to Bill
            </label>
            <button 
              onClick={addCustomLineItem}
              className="btn-rollover" 
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            >
              <PlusCircle size={12} /> Add Item
            </button>
          </div>

          <div className="line-items-editor">
            {lineItems.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-ops-muted)', textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-ops)', borderRadius: '6px' }}>
                No active scope items. Click "Add Item" or select a client card to load completed tasks.
              </p>
            ) : (
              lineItems.map((item, idx) => (
                <div key={idx} className="line-item-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Milestone description"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Qty"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Rate"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    value={item.rate}
                    onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                  />
                  <button 
                    onClick={() => removeLineItem(idx)}
                    className="btn-icon-danger"
                  >
                    <PlusCircle size={14} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoice Compile History logs */}
        {invoices.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-ops)', paddingTop: '1.5rem' }}>
            <div className="section-title">
              <FileDigit size={16} style={{ color: 'var(--color-primary)' }} />
              <span>Invoice Compilation Logs</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {invoices.slice(0, 3).map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-ops)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-ops-primary)' }}>#{inv.invoiceNumber}</span>
                    <span style={{ color: 'var(--text-ops-secondary)', marginLeft: '0.5rem' }}>{inv.clientName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-ops-primary)' }}>${inv.amount.toLocaleString()}</span>
                    {inv.pdfUrl ? (
                      <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Globe size={12} /> Link
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-ops-muted)' }}>Local Only</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Interactive Invoice Preview */}
      <InvoicePreview
        selectedClient={selectedClient}
        profile={profile}
        invoiceNumber={`${invoicePrefix}${invoiceNumber}`}
        clientName={clientName}
        clientEmail={clientEmail}
        lineItems={lineItems}
        onCompile={handleCompileInvoice}
        isCompiling={isCompiling}
        compileSuccess={compileSuccess}
        className={activeTab !== 'invoice-builder' ? 'mobile-hidden' : ''}
      />
      </main>

      {/* Mobile BottomNavBar */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-btn ${activeTab === 'control-center' ? 'active' : ''}`}
          onClick={() => setActiveTab('control-center')}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span>Control Center</span>
        </button>
        <button 
          className={`mobile-nav-btn ${activeTab === 'invoice-builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoice-builder')}
        >
          <span className="material-symbols-outlined">description</span>
          <span>Invoice Builder</span>
        </button>
      </nav>

      {/* Settings Modal (Overlay) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Add Client Modal */}
      {isAddClientOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Register New Contract</h2>
              <button className="btn-close" onClick={() => setIsAddClientOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateClient} className="auth-form">
              <div className="form-group">
                <label htmlFor="add-brand">Client Brand / Name</label>
                <input
                  type="text"
                  id="add-brand"
                  required
                  placeholder="e.g. Zenith Media"
                  className="form-input"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-project">Project Title</label>
                <input
                  type="text"
                  id="add-project"
                  required
                  placeholder="e.g. Core App Development"
                  className="form-input"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                />
              </div>

              <div className="input-grid">
                <div className="form-group">
                  <label htmlFor="add-budget">Project Budget ($)</label>
                  <input
                    type="number"
                    id="add-budget"
                    required
                    placeholder="5000"
                    className="form-input"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="add-prefix">Invoice Prefix</label>
                  <input
                    type="text"
                    id="add-prefix"
                    required
                    placeholder="ZM-"
                    className="form-input"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="add-email">Billing Email</label>
                <input
                  type="email"
                  id="add-email"
                  placeholder="finance@zenithmedia.com"
                  className="form-input"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddClientOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default App;
