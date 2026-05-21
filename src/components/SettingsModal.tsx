import React, { useState } from 'react';
import { useFirebase, type Profile } from '../context/FirebaseContext';
import { X, Save, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile, saveProfile } = useFirebase();
  
  const [brandName, setBrandName] = useState(profile.brandName);
  const [email, setEmail] = useState(profile.email);
  const [bankName, setBankName] = useState(profile.bankName);
  const [accountNumber, setAccountNumber] = useState(profile.accountNumber);
  const [routingNumber, setRoutingNumber] = useState(profile.routingNumber);
  const [swiftCode, setSwiftCode] = useState(profile.swiftCode);
  const [address, setAddress] = useState(profile.address);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    const updatedProfile: Profile = {
      brandName,
      email,
      bankName,
      accountNumber,
      routingNumber,
      swiftCode,
      address,
    };

    try {
      await saveProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to save settings profile:", err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Remittance & Profile Settings</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-grid">
            <div className="form-group">
              <label htmlFor="modal-brand">Freelancer Brand</label>
              <input
                type="text"
                id="modal-brand"
                required
                className="form-input"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="modal-email">Remittance Email</label>
              <input
                type="email"
                id="modal-email"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modal-address">Business Address</label>
            <input
              type="text"
              id="modal-address"
              required
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ margin: '0.5rem 0', borderBottom: '1px solid var(--border-ops)' }}></div>

          <div className="input-grid">
            <div className="form-group">
              <label htmlFor="modal-bank">Bank Name</label>
              <input
                type="text"
                id="modal-bank"
                required
                className="form-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="modal-account">Account Number</label>
              <input
                type="text"
                id="modal-account"
                required
                className="form-input"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="modal-routing">Routing Number (ABA)</label>
              <input
                type="text"
                id="modal-routing"
                required
                className="form-input"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="modal-swift">SWIFT / BIC Code</label>
              <input
                type="text"
                id="modal-swift"
                required
                className="form-input"
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            {saveSuccess ? (
              <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: 'auto', fontSize: '0.85rem' }}>
                <ShieldCheck size={18} /> Settings saved successfully
              </span>
            ) : null}
            
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
