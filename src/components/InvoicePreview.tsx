import React from 'react';
import { type Client, type Profile } from '../context/FirebaseContext';
import { FileText, Download, CheckCircle } from 'lucide-react';

interface InvoicePreviewProps {
  selectedClient: Client | null;
  profile: Profile;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  lineItems: Array<{ description: string; quantity: number; rate: number }>;
  onCompile: () => Promise<void>;
  isCompiling: boolean;
  compileSuccess: boolean;
  className?: string;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  selectedClient,
  profile,
  invoiceNumber,
  clientName,
  clientEmail,
  lineItems,
  onCompile,
  isCompiling,
  compileSuccess,
  className,
}) => {
  // Format current date
  const today = new Date();
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Due date (default +14 days)
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 14);

  // Compute Invoice Totals
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const tax = subtotal * 0.05; // Default 5% service tax or processing fee
  const grandTotal = subtotal + tax;

  return (
    <div className={`invoice-panel ${className || ''}`}>
      <div className="invoice-paper-container">
        
        {/* Physical Paper Sheet Mockup */}
        <div id="invoice-paper" className="invoice-paper">
          
          {/* Header Branding */}
          <div className="paper-header">
            <div className="paper-brand">
              <h2>{profile.brandName || 'My Freelancer Brand'}</h2>
              <p>{profile.address || 'Address not configured'}</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>{profile.email}</p>
            </div>
            <div className="paper-meta">
              <h3>INVOICE</h3>
              <p style={{ fontWeight: 600 }}>#{invoiceNumber || 'INV-000'}</p>
              <p style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--text-paper-secondary)' }}>Date:</span> {formatDate(today)}</p>
              <p><span style={{ color: 'var(--text-paper-secondary)' }}>Due Date:</span> {formatDate(dueDate)}</p>
            </div>
          </div>

          {/* Billing metadata */}
          <div className="paper-billing-details">
            <div className="billing-col">
              <h4>BILLED TO</h4>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{clientName || 'Client Brand / Name'}</p>
              <p className="sub-info">{clientEmail || 'billing@client.com'}</p>
              {selectedClient && (
                <p className="sub-info" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  Project: {selectedClient.projectTitle}
                </p>
              )}
            </div>
            <div className="billing-col" style={{ textAlign: 'right' }}>
              <h4>PAYMENT METHOD</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-paper-secondary)' }}>Bank Remittance Transfer</p>
              <p className="sub-info" style={{ fontSize: '0.75rem' }}>Details printed in footer below</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: '55%' }}>Milestone / Scope Description</th>
                <th style={{ width: '15%', textAlign: 'right' }} className="text-right">Qty / Hrs</th>
                <th style={{ width: '15%', textAlign: 'right' }} className="text-right">Rate</th>
                <th style={{ width: '15%', textAlign: 'right' }} className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-paper-muted)', padding: '2rem 0' }}>
                    No milestones populated in active scope.
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 500 }}>{item.description || 'Untitled Milestone'}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">${item.rate.toLocaleString()}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      ${(item.quantity * item.rate).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals Calculation */}
          <div className="paper-totals-container">
            <div className="paper-totals">
              <div className="totals-row">
                <span style={{ color: 'var(--text-paper-secondary)' }}>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>${subtotal.toLocaleString()}</span>
              </div>
              <div className="totals-row">
                <span style={{ color: 'var(--text-paper-secondary)' }}>Service Tax (5%):</span>
                <span style={{ fontWeight: 500 }}>${tax.toLocaleString()}</span>
              </div>
              <div className="totals-row grand-total">
                <span>Total Due:</span>
                <span>${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Remittance Block */}
          <div className="paper-remittance">
            <div className="remittance-col">
              <h5>Wire Remittance Instructions</h5>
              <div className="remittance-grid">
                <span className="remittance-label">Bank Name:</span>
                <span className="remittance-val">{profile.bankName || 'Not configured'}</span>
                
                <span className="remittance-label">Account #:</span>
                <span className="remittance-val">{profile.accountNumber || 'Not configured'}</span>
              </div>
            </div>
            <div className="remittance-col" style={{ borderLeft: '1px solid var(--border-paper)', paddingLeft: '1.5rem' }}>
              <h5>Routing details</h5>
              <div className="remittance-grid">
                <span className="remittance-label">ABA/Routing:</span>
                <span className="remittance-val">{profile.routingNumber || 'Not configured'}</span>

                <span className="remittance-label">SWIFT Code:</span>
                <span className="remittance-val">{profile.swiftCode || 'Not configured'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Compile PDF Action Button */}
        <div className="compile-actions">
          <button 
            onClick={onCompile} 
            disabled={isCompiling || lineItems.length === 0} 
            className="btn-primary"
            style={{ 
              background: compileSuccess ? 'var(--color-success)' : 'var(--color-primary)',
              boxShadow: compileSuccess ? '0 4px 14px var(--color-success-glow)' : '0 4px 14px var(--color-primary-glow)'
            }}
          >
            {isCompiling ? (
              <>
                <Download className="animate-spin" size={18} />
                <span>Compiling High-Res PDF...</span>
              </>
            ) : compileSuccess ? (
              <>
                <CheckCircle size={18} />
                <span>Invoice Compiled & Downloaded!</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>Compile Official Invoice</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
